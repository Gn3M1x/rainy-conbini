// 后处理：法线/深度描边（三渲二轮廓线）+ 泛光 + 暗角调色
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/* --------------------------- 法线 + 深度 预渲染通道 -------------------------- */
class NormalDepthPass extends Pass {
  constructor(scene, camera, hidden = []) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.hidden = hidden;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    this.rt.depthTexture = new THREE.DepthTexture(4, 4);
    this.rt.depthTexture.format = THREE.DepthFormat;
    this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.rt.depthTexture.minFilter = THREE.NearestFilter;
    this.rt.depthTexture.magFilter = THREE.NearestFilter;
    this.mat = new THREE.MeshNormalMaterial();
    this.needsSwap = false;
  }
  setSize(w, h) {
    this.rt.setSize(Math.max(2, Math.round(w)), Math.max(2, Math.round(h)));
  }
  render(renderer) {
    const vis = this.hidden.map((o) => o.visible);
    this.hidden.forEach((o) => { o.visible = false; });
    const old = this.scene.overrideMaterial;
    const oldBg = this.scene.background;
    this.scene.background = null;
    this.scene.overrideMaterial = this.mat;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(prev);
    this.scene.overrideMaterial = old;
    this.scene.background = oldBg;
    this.hidden.forEach((o, i) => { o.visible = vis[i]; });
  }
}

/* ------------------------------ 描边合成着色器 ------------------------------ */
const OutlineComposite = {
  uniforms: {
    tDiffuse: { value: null },
    tNormal: { value: null },
    tDepth: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uNear: { value: 0.1 },
    uFar: { value: 80 },
    uThickness: { value: 1.0 },
    uOutline: { value: 1.0 },
    uVignette: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 uResolution;
    uniform float uNear;
    uniform float uFar;
    uniform float uThickness;
    uniform float uOutline;
    uniform float uVignette;
    varying vec2 vUv;

    float linDepth( float d ) {
      float z = d * 2.0 - 1.0;
      return ( 2.0 * uNear * uFar ) / ( uFar + uNear - z * ( uFar - uNear ) );
    }

    void main() {
      vec2 texel = uThickness / uResolution;
      vec3 base = texture2D( tDiffuse, vUv ).rgb;

      float dC = linDepth( texture2D( tDepth, vUv ).x );
      vec3 nC = texture2D( tNormal, vUv ).xyz * 2.0 - 1.0;

      float edge = 0.0;

      // 右
      {
        vec2 uv = vUv + vec2( texel.x, 0.0 );
        float dN = linDepth( texture2D( tDepth, uv ).x );
        vec3 nN = texture2D( tNormal, uv ).xyz * 2.0 - 1.0;
        edge = max( edge, smoothstep( 0.010, 0.040, abs( dC - dN ) / max( dC, 0.0001 ) ) );
        edge = max( edge, smoothstep( 0.14, 0.40, 1.0 - dot( nC, nN ) ) );
      }
      // 左
      {
        vec2 uv = vUv - vec2( texel.x, 0.0 );
        float dN = linDepth( texture2D( tDepth, uv ).x );
        vec3 nN = texture2D( tNormal, uv ).xyz * 2.0 - 1.0;
        edge = max( edge, smoothstep( 0.010, 0.040, abs( dC - dN ) / max( dC, 0.0001 ) ) );
        edge = max( edge, smoothstep( 0.14, 0.40, 1.0 - dot( nC, nN ) ) );
      }
      // 上
      {
        vec2 uv = vUv + vec2( 0.0, texel.y );
        float dN = linDepth( texture2D( tDepth, uv ).x );
        vec3 nN = texture2D( tNormal, uv ).xyz * 2.0 - 1.0;
        edge = max( edge, smoothstep( 0.010, 0.040, abs( dC - dN ) / max( dC, 0.0001 ) ) );
        edge = max( edge, smoothstep( 0.14, 0.40, 1.0 - dot( nC, nN ) ) );
      }
      // 下
      {
        vec2 uv = vUv - vec2( 0.0, texel.y );
        float dN = linDepth( texture2D( tDepth, uv ).x );
        vec3 nN = texture2D( tNormal, uv ).xyz * 2.0 - 1.0;
        edge = max( edge, smoothstep( 0.010, 0.040, abs( dC - dN ) / max( dC, 0.0001 ) ) );
        edge = max( edge, smoothstep( 0.14, 0.40, 1.0 - dot( nC, nN ) ) );
      }

      // 远处弱化轮廓
      edge *= uOutline;

      vec3 lineColor = vec3( 0.018, 0.024, 0.042 );
      vec3 col = mix( base, lineColor, edge * 0.95 );

      // 冷暗部 / 暖亮部的小调色
      float luma = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
      col = mix( col, col * vec3( 0.88, 0.96, 1.12 ), 0.30 * ( 1.0 - smoothstep( 0.0, 0.42, luma ) ) );
      col = mix( vec3( luma ), col, 1.10 );

      // 暗角
      vec2 q = vUv - 0.5;
      float vig = smoothstep( 1.05, 0.28, length( q ) * 1.35 );
      col *= mix( 1.0, vig, 0.62 * uVignette );

      gl_FragColor = vec4( col, 1.0 );
    }
  `,
};

/* --------------------------------- 组装管线 -------------------------------- */
export function createPost(renderer, scene, camera, hidden = []) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const normalPass = new NormalDepthPass(scene, camera, hidden);
  composer.addPass(normalPass);

  const res = renderer.getDrawingBufferSize(new THREE.Vector2());
  const bloom = new UnrealBloomPass(new THREE.Vector2(res.x, res.y), 0.22, 0.28, 1.06);
  composer.addPass(bloom);

  const composite = new ShaderPass(OutlineComposite);
  composite.uniforms.tNormal.value = normalPass.rt.texture;
  composite.uniforms.tDepth.value = normalPass.rt.depthTexture;
  composite.uniforms.uNear.value = camera.near;
  composite.uniforms.uFar.value = camera.far;
  composite.uniforms.uResolution.value.copy(res);
  composer.addPass(composite);

  let smaa = null;
  try {
    smaa = new SMAAPass(res.x, res.y);
    composer.addPass(smaa);
  } catch (e) { console.warn('SMAA unavailable', e); }

  const output = new OutputPass();
  composer.addPass(output);

  function setSize(w, h) {
    const dbs = renderer.getDrawingBufferSize(new THREE.Vector2());
    composite.uniforms.uThickness.value = Math.max(1.15, dbs.y / 620);
    composite.uniforms.uResolution.value.copy(dbs);
    composite.uniforms.uNear.value = camera.near;
    composite.uniforms.uFar.value = camera.far;
    bloom.resolution.set(dbs.x, dbs.y);
  }

  return {
    composer,
    bloom,
    composite,
    normalPass,
    render(dt) {
      composer.render(dt);
    },
    setSize,
    setOutline(on) { composite.uniforms.uOutline.value = on ? 1 : 0; },
  };
}
