// 场景装配：地面反射 / 底座 / 便利店 / 街道道具 / 灯光 / 动效
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Batcher, Products } from '../core/kit.js';
import { toon } from '../core/materials.js';
import { BASE, buildBase } from './base.js';
import { buildStore } from './store.js';
import { buildProps } from './props.js';
import { buildFx } from './fx.js';

export function buildWorld(renderer, scene) {
  const batch = new Batcher();
  const products = new Products();
  const anim = { flicker: [] };
  const hidden = [];
  const glassGroup = new THREE.Group();
  scene.add(glassGroup);
  const ctx = { scene, products, anim, hidden, glassGroup };

  /* ------------------------------- 湿地面反射 ------------------------------- */
  const groundPlane = new THREE.PlaneGeometry(BASE.size, BASE.size);
  const reflector = new Reflector(groundPlane, {
    textureWidth: 768,
    textureHeight: 768,
    color: 0x66707f,
    clipBias: 0.004,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.y = 0.0015;
  scene.add(reflector);
  hidden.push(reflector);

  // 反射地面在描边/法线通道里被隐藏，用一块暗色背板提供深度与法线
  const backing = new THREE.Mesh(groundPlane, toon(0x0c1017));
  backing.rotation.x = -Math.PI / 2;
  backing.position.y = -0.006;
  backing.receiveShadow = true;
  scene.add(backing);

  /* --------------------------------- 建筑与道具 --------------------------------- */
  buildBase(batch);
  buildStore(batch, ctx);
  buildProps(batch, ctx);

  const statics = batch.flush(scene);
  statics.forEach((m) => { m.receiveShadow = true; });
  const prods = products.build(scene);

  /* --------------------------------- 灯光 --------------------------------- */
  const hemi = new THREE.HemisphereLight(0x2b3f60, 0x090b11, 0.46);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xa9c3ff, 0.9);
  key.position.set(4.2, 6.2, 4.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -3.8;
  key.shadow.camera.right = 3.8;
  key.shadow.camera.top = 3.8;
  key.shadow.camera.bottom = -3.8;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  scene.add(key.target);
  key.target.position.set(-0.3, 0, -0.6);

  // 冷色补光：让背光面呈现二次元夜景常见的蓝灰层次
  const fill = new THREE.DirectionalLight(0x6c8dc4, 0.42);
  fill.position.set(-5.5, 3.2, 2.4);
  scene.add(fill);
  scene.add(fill.target);
  fill.target.position.set(-0.2, 0.5, -0.8);

  const warm = (color, intensity, dist, decay, x, y, z) => {
    const l = new THREE.PointLight(color, intensity, dist, decay);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  };
  const lights = {
    inA: warm(0xffcb8e, 3.0, 2.6, 1.8, -1.25, 1.02, -1.15),
    inB: warm(0xffd8a8, 1.7, 2.2, 1.9, -0.15, 1.0, -1.95),
    fridge: warm(0xc2e0ff, 1.3, 1.6, 2.0, -1.6, 0.85, -2.15),
    canopy: warm(0xffb877, 1.5, 1.8, 1.9, -0.25, 0.9, -0.1),
    street: warm(0xd8e8ff, 3.2, 4.2, 1.6, -1.5, 1.5, 1.55),
    vend: warm(0xd8e8ff, 1.5, 1.9, 1.9, 1.02, 0.62, -1.12),
    spill: warm(0xff7a52, 1.2, 2.4, 1.9, -0.5, 1.35, 0.18),
  };

  /* --------------------------------- 动效 --------------------------------- */
  const fx = buildFx(ctx);

  return {
    update(t, dt, camera) { fx.update(t, dt, camera); },
    hidden,
    fxGroup: fx.group,
    glassGroup,
    reflector,
    lights,
    key,
    statics,
    prods,
    anim,
  };
}
