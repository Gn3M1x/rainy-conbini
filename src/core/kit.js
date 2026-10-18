// 静态几何合批 + 基础几何构造函数 + 商品实例化
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon } from './materials.js';

/* --------------------------------- 几何缓存 -------------------------------- */
const geoCache = new Map();
function cached(key, factory) {
  let g = geoCache.get(key);
  if (!g) { g = factory(); geoCache.set(key, g); }
  return g;
}
export function boxGeo(w, h, d) {
  return cached(`b${w.toFixed(4)},${h.toFixed(4)},${d.toFixed(4)}`, () => new THREE.BoxGeometry(w, h, d));
}
export function cylGeo(rt, rb, h, seg) {
  return cached(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}
export function sphGeo(r, seg = 12) {
  return cached(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)));
}
export function planeGeo(w, h) {
  return cached(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h));
}

/* --------------------------------- 合批器 --------------------------------- */
export class Batcher {
  constructor() {
    this.byMat = new Map();
    this.meshCount = 0;
  }
  bake(root) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (o.isMesh && !o.isInstancedMesh) this.push(o);
    });
  }
  push(mesh) {
    const mat = mesh.material;
    if (!mat || Array.isArray(mat)) return;
    let arr = this.byMat.get(mat);
    if (!arr) { arr = []; this.byMat.set(mat, arr); }
    const src = mesh.geometry;
    const g = src.index ? src.toNonIndexed() : src.clone();
    // 统一属性，避免合并失败
    for (const k of Object.keys(g.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    }
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    g.applyMatrix4(mesh.matrixWorld);
    arr.push(g);
    this.meshCount++;
  }
  flush(parent) {
    const made = [];
    for (const [mat, geos] of this.byMat) {
      if (!geos.length) continue;
      let merged;
      try {
        merged = mergeGeometries(geos, false);
      } catch (e) {
        console.warn('merge error', e);
      }
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      const basic = mat.isMeshBasicMaterial;
      mesh.castShadow = !basic && !mat.transparent;
      mesh.receiveShadow = !basic;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      made.push(mesh);
    }
    this.byMat.clear();
    return made;
  }
}

/* --------------------------------- 工具箱 --------------------------------- */
export class Kit {
  constructor() {
    this.group = new THREE.Group();
  }
  mesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    this.group.add(m);
    return m;
  }
  /** 中心定位的盒子 */
  box(mat, w, h, d, x = 0, y = 0, z = 0, rot) {
    const m = new THREE.Mesh(boxGeo(w, h, d), mat);
    m.position.set(x, y, z);
    if (rot) { m.rotation.set(rot.rx || 0, rot.ry || 0, rot.rz || 0); }
    this.group.add(m);
    return m;
  }
  /** 底部定位的盒子 */
  boxB(mat, w, h, d, x, y, z, rot) {
    return this.box(mat, w, h, d, x, y + h / 2, z, rot);
  }
  cyl(mat, rt, rb, h, seg, x = 0, y = 0, z = 0, rot) {
    const m = new THREE.Mesh(cylGeo(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    if (rot) { m.rotation.set(rot.rx || 0, rot.ry || 0, rot.rz || 0); }
    this.group.add(m);
    return m;
  }
  cylB(mat, rt, rb, h, seg, x, y, z, rot) {
    return this.cyl(mat, rt, rb, h, seg, x, y + h / 2, z, rot);
  }
  sphere(mat, r, x, y, z, scale, seg = 12) {
    const m = new THREE.Mesh(sphGeo(r, seg), mat);
    m.position.set(x, y, z);
    if (scale) m.scale.set(scale[0], scale[1], scale[2]);
    this.group.add(m);
    return m;
  }
  /** 竖直面片，默认朝 +Z */
  plane(mat, w, h, x, y, z, rot) {
    const m = new THREE.Mesh(planeGeo(w, h), mat);
    m.position.set(x, y, z);
    if (rot) { m.rotation.set(rot.rx || 0, rot.ry || 0, rot.rz || 0); }
    this.group.add(m);
    return m;
  }
  /** 水平面片，朝上 */
  floorPlane(mat, w, d, x, y, z, rot) {
    return this.plane(mat, w, d, x, y, z, Object.assign({ rx: -Math.PI / 2 }, rot || {}));
  }
  tube(mat, points, radius = 0.01, seg = 24, radial = 6) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, seg, radius, radial, false);
    const m = new THREE.Mesh(geo, mat);
    this.group.add(m);
    return m;
  }
  /** 把当前 group 合批到 batch，并应用整体变换 */
  bake(batch, x = 0, y = 0, z = 0, ry = 0) {
    this.group.position.set(x, y, z);
    this.group.rotation.y = ry;
    batch.bake(this.group);
    this.group.clear();
  }
}

/* -------------------------------- 商品实例化 -------------------------------- */
export class Products {
  constructor() {
    this.boxes = [];
    this.bottles = [];
    this.onigiri = [];
  }
  box(x, y, z, w, h, d, color, ry = 0) {
    this.boxes.push({ x, y, z, w, h, d, color, ry });
  }
  bottle(x, y, z, r, h, color) {
    this.bottles.push({ x, y, z, r, h, color });
  }
  rice(x, y, z, r, thick, color, ry = 0) {
    this.onigiri.push({ x, y, z, r, thick, color, ry });
  }
  build(parent) {
    const dummy = new THREE.Object3D();
    const made = [];
    const col = new THREE.Color();
    const mk = (list, geo, setScale) => {
      if (!list.length) return;
      const inst = new THREE.InstancedMesh(geo, toon(0xffffff, {}), list.length);
      inst.castShadow = true;
      inst.receiveShadow = true;
      list.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, it.ry || 0, 0);
        setScale(dummy.scale, it);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        inst.setColorAt(i, col.set(it.color));
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      parent.add(inst);
      made.push(inst);
    };
    mk(this.boxes, new THREE.BoxGeometry(1, 1, 1), (s, it) => s.set(it.w, it.h, it.d));
    mk(this.bottles, new THREE.CylinderGeometry(0.5, 0.5, 1, 8), (s, it) => s.set(it.r * 2, it.h, it.r * 2));
    const riceGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 3);
    riceGeo.rotateX(Math.PI / 2);
    mk(this.onigiri, riceGeo, (s, it) => s.set(it.r * 2, it.r * 2, it.thick));
    return made;
  }
}
