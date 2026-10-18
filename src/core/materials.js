// 三渲二材质库：MeshToonMaterial + 阶梯渐变贴图 + 边缘光注入 + 无光照自发光材质
import * as THREE from 'three';

/* ---------------------------------- 调色板 --------------------------------- */
export const C = {
  // 底座
  baseSide: 0x14161f,
  baseTop: 0x1b1f2b,
  baseTrim: 0x6b5637,
  // 地面
  asphalt: 0x2a2e3a,
  asphaltLot: 0x2f333f,
  sidewalk: 0x8f939d,
  sidewalkLine: 0x7b7f89,
  curb: 0xb0b3ba,
  tactile: 0xd2ac3c,
  paintWhite: 0xdfe4ea,
  paintYellow: 0xd8b23a,
  // 便利店
  wall: 0xf1e7d6,
  wallShade: 0xd8cebd,
  pillar: 0xdfe3e9,
  trim: 0xb9c2cc,
  aluminum: 0xaab3be,
  signCream: 0xfff6e4,
  signRed: 0xc8392f,
  signOrange: 0xef8f3c,
  signGreen: 0x4f9457,
  signBlue: 0x3570b5,
  roof: 0x3a414e,
  roofDark: 0x262c37,
  // 店内
  floorTile: 0xeeece4,
  shelfWhite: 0xf2f3f0,
  shelfEdge: 0xc9ccd0,
  counterBody: 0xd9d4c8,
  counterTop: 0xcdc6b8,
  counterBand: 0x3f7d5a,
  ceiling: 0xf6f2e8,
  lightPanel: 0xfff3d6,
  backWall: 0xe7e3d9,
  // 街道设施
  poleConcrete: 0x9c9a94,
  poleDark: 0x5a5f68,
  metalDark: 0x3b414c,
  metalMid: 0x5c6572,
  guardrail: 0xd5dbe2,
  lampWarm: 0xffd8a2,
  lampCool: 0xcfe1ff,
  signalRed: 0xff3b30,
  signalGreen: 0x2ee08a,
  signalYellow: 0xffc531,
  vendingBlue: 0x2b62b4,
  vendingRed: 0xbe3a30,
  binBody: 0xd9d3c6,
  binCan: 0x3f6fb0,
  binBottle: 0xd9a13c,
  binGlass: 0x4f9060,
  bikeFrame: 0x3f4d66,
  bikeFrame2: 0x6e4a52,
  benchWood: 0x8a6647,
  cone: 0xe8622a,
  coneWhite: 0xe9e4da,
  posterPaper: 0xf3eee2,
  cork: 0xb08355,
  wood: 0x7a5a3e,
  crate: 0x9b6b3f,
  awning: 0xdfe3e8,
  awningEdge: 0xc8392f,
  interiorGlow: 0xffe8c4,
  fridgeGlow: 0xdff0ff,
  puddle: 0x101723,
  // 光
  lightWarm: 0xffd9a3,
  lightCool: 0x9fc3ff,
  lightSign: 0xff6a4e,
  lightAlley: 0xffc98a,
  lightBlue: 0x8fc9ff,
  rim: 0x3f5f9e,
};

/* ------------------------------- 阶梯渐变贴图 ------------------------------- */
const gradientMap = (() => {
  const steps = [0.0, 0.22, 0.52, 0.8, 1.0];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => {
    const c = Math.round(v * 255);
    data.set([c, c, c, 255], i * 4);
  });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();
export { gradientMap };

/* ------------------------------- 边缘光注入 -------------------------------- */
const RIM_GLSL = `
  #include <dithering_fragment>
  {
    vec3 rimN = normalize( normal );
    vec3 rimV = normalize( vViewPosition );
    float rim = 1.0 - clamp( dot( rimN, rimV ), 0.0, 1.0 );
    rim = smoothstep( 0.55, 0.98, rim );
    gl_FragColor.rgb += vec3( 0.085, 0.12, 0.22 ) * rim;
  }
`;

function injectRim(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', RIM_GLSL);
  };
  mat.customProgramCacheKey = () => 'toon-rim-v2';
}

/* --------------------------------- 材质缓存 -------------------------------- */
const cache = new Map();

function keyOf(prefix, color, o) {
  return prefix + '|' + color + '|' + (o.map ? o.map.uuid : '') + '|' + (o.emissive || '') + '|' +
    (o.emissiveIntensity || '') + '|' + (o.side || '') + '|' + (o.transparent ? 1 : 0) + '|' +
    (o.opacity === undefined ? 1 : o.opacity) + '|' + (o.vertexColors ? 1 : 0) + '|' +
    (o.depthWrite === false ? 'n' : '') + '|' + (o.blending || '');
}

/** 三渲二主要材质 */
export function toon(color, o = {}) {
  const key = keyOf('t', color, o);
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap }, o));
  injectRim(m);
  cache.set(key, m);
  return m;
}

/** 自发光/灯箱材质（不受光，亮度可 > 1 触发泛光） */
export function glowMat(color, o = {}) {
  const key = keyOf('g', color, o);
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial(Object.assign({ color, toneMapped: false }, o));
  cache.set(key, m);
  return m;
}

/** 透明玻璃 */
export function glassMat(color = 0xbfd8e8, opacity = 0.1, o = {}) {
  const key = keyOf('gl', color, Object.assign({ opacity, transparent: true }, o));
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial(Object.assign({
    color, transparent: true, opacity,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }, o));
  // 玻璃加一点菲涅尔边缘反光靠 envMap / 灯光即可
  cache.set(key, m);
  return m;
}

/** 地面湿滑覆盖层（半透明，露出下方反射） */
export function wetMat(color, opacity) {
  const key = keyOf('w', color, { opacity });
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  cache.set(key, m);
  return m;
}

/** 贴花/海报（透明贴图，双面） */
export function decalMat(map, o = {}) {
  const key = keyOf('d', 0xffffff, Object.assign({ map }, o));
  let m = cache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial(Object.assign({
    map, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }, o));
  cache.set(key, m);
  return m;
}

/** 灯箱贴图材质（自发光，可整体调亮度用于闪烁） */
export function signMat(map, brightness = 1.45) {
  const m = new THREE.MeshBasicMaterial({ map, toneMapped: false });
  m.color.setScalar(brightness);
  return m;
}

/** 加法混合光晕/光池 */
export function additiveMat(map, color = 0xffffff, opacity = 1, o = {}) {
  const m = new THREE.MeshBasicMaterial(Object.assign({
    map, color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  }, o));
  return m;
}
