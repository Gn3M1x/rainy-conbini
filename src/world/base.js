// 底座 + 地面分区 + 路缘 + 标线 + 地面细节
import * as THREE from 'three';
import { C, toon, decalMat, gradientMap, GROUND_LAYER } from '../core/materials.js';
import { Kit } from '../core/kit.js';
import { makeTex, manhole, roadPaint, parkingStencil } from '../core/tex.js';

export const BASE = { size: 5.2, half: 2.6 };

/* 地面分区（[x0,x1,z0,z1]，互不重叠，完整铺满 5.2×5.2） */
export const Z = {
  building: [-2.6, 0.62, -2.6, -0.48],
  alley: [0.62, 1.15, -2.6, 0.9],
  sidewalkE: [1.15, 1.65, -2.6, 0.9],
  plaza: [-2.6, 0.62, -0.48, 0.9],
  sidewalkS: [-2.6, 1.65, 0.9, 1.4],
  roadS: [-2.6, 2.6, 1.4, 2.6],
  roadE: [1.65, 2.6, -2.6, 1.4],
};

/* ------------------------------ 局部纹理生成 ------------------------------ */
function tactileTex() {
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = '#c9a838'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        x.beginPath();
        x.arc(16 + i * 32, 16 + j * 32, 9, 0, Math.PI * 2);
        x.fillStyle = '#e0bf52'; x.fill();
        x.beginPath();
        x.arc(16 + i * 32, 15 + j * 32, 9, 0.2, Math.PI - 0.2);
        x.strokeStyle = 'rgba(120,96,26,.55)'; x.lineWidth = 2.4; x.stroke();
      }
    }
  }, { repeat: [1, 1] });
}

function grateTex() {
  return makeTex(128, 64, (x, w, h) => {
    x.fillStyle = '#1d232c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      x.fillStyle = '#0d1117';
      x.fillRect(6 + i * 16, 10, 9, h - 20);
      x.fillStyle = 'rgba(150,168,190,.18)';
      x.fillRect(6 + i * 16, 10, 2, h - 20);
    }
    x.fillStyle = 'rgba(160,175,195,.30)';
    x.fillRect(0, 0, w, 3); x.fillRect(0, h - 3, w, 3);
  }, { repeat: [1, 1] });
}

function pavingTex() {
  return makeTex(256, 256, (x, w, h) => {
    x.fillStyle = '#8b8f99'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const v = 0.86 + ((i * 7 + j * 11) % 5) * 0.028;
        x.fillStyle = `rgba(${Math.round(150 * v)},${Math.round(154 * v)},${Math.round(164 * v)},1)`;
        x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
        x.fillStyle = 'rgba(255,255,255,.10)';
        x.fillRect(i * 64 + 2, j * 64 + 2, 60, 2);
      }
    }
  }, { repeat: [1, 1] });
}

let TEX = null;
function texSet() {
  if (!TEX) TEX = { tactile: tactileTex(), grate: grateTex(), paving: pavingTex() };
  return TEX;
}

/* 带贴图的平面材质（每个区域 clone 一份以设定 repeat） */
function flatMat({ color = 0xffffff, opacity = 1, light = false, map = null, rep = null, order = 1 }) {
  let m = map;
  if (map && rep) {
    m = map.clone();
    m.needsUpdate = true;
    m.wrapS = m.wrapT = THREE.RepeatWrapping;
    m.repeat.set(rep[0], rep[1]);
  }
  const opts = {
    color, map: m, transparent: true, opacity, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -order, polygonOffsetUnits: -order,
  };
  return light ? new THREE.MeshBasicMaterial(opts) : new THREE.MeshToonMaterial(
    Object.assign({ gradientMap }, opts)
  );
}

export function buildBase(batch) {
  const kit = new Kit();
  const T = texSet();

  /* ------------------------------- 1. 底座体 ------------------------------- */
  const S = BASE.size;
  // 主体
  kit.box(toon(C.baseSide), S, 0.4, S, 0, -0.2, 0);
  // 底部托板（收藏模型底座感）
  kit.box(toon(0x0d0f15), S + 0.16, 0.06, S + 0.16, 0, -0.43, 0);
  // 顶部边框（一圈略高于地面的镶边）
  const rimMat = toon(C.baseTrim);
  const rimH = 0.062, rimY = -0.019;
  const rimW = 0.08, outer = S + 0.08;
  kit.box(rimMat, outer + rimW, rimH, rimW, 0, rimY, -(S / 2 + 0.04) + rimW / 2 - rimW / 2);
  kit.box(rimMat, outer + rimW, rimH, rimW, 0, rimY, (S / 2 + 0.04));
  kit.box(rimMat, rimW, rimH, outer, -(S / 2 + 0.04), rimY, 0);
  kit.box(rimMat, rimW, rimH, outer, (S / 2 + 0.04), rimY, 0);
  // 边框内的一圈深色沟槽
  const grooveMat = toon(0x0a0b10);
  kit.box(grooveMat, S, 0.01, 0.02, 0, -0.004, -(S / 2 - 0.01));
  kit.box(grooveMat, S, 0.01, 0.02, 0, -0.004, (S / 2 - 0.01));
  kit.box(grooveMat, 0.02, 0.01, S, -(S / 2 - 0.01), -0.004, 0);
  kit.box(grooveMat, 0.02, 0.01, S, (S / 2 - 0.01), -0.004, 0);

  /* ------------------------------ 2. 地面分区 ------------------------------ */
  const detail = (...args) => {
    const mesh = kit.floorPlane(...args);
    mesh.renderOrder = GROUND_LAYER.detail;
    return mesh;
  };
  const pave = (x0, x1, z0, z1, mat, y = 0.004, layer = GROUND_LAYER.detail) => {
    const mesh = kit.floorPlane(mat, x1 - x0, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2);
    mesh.renderOrder = layer;
  };
  // 建筑下方（压暗、几乎不反射）
  pave(...Z.building, flatMat({ color: 0x191d26, opacity: 0.96 }), 0.006, GROUND_LAYER.surface);
  // 小巷（湿、暗）
  pave(...Z.alley, flatMat({ color: 0x2b303c, opacity: 0.62 }), 0.005, GROUND_LAYER.surface);
  // 店前广场 / 停车场
  pave(...Z.plaza, flatMat({ color: 0x333845, opacity: 0.66 }), 0.005, GROUND_LAYER.surface);
  // 东侧人行道
  pave(...Z.sidewalkE, flatMat({ color: 0x8b8f99, opacity: 0.82, map: T.paving, rep: [1, 13] }), 0.006, GROUND_LAYER.surface);
  // 南侧人行道
  pave(...Z.sidewalkS, flatMat({ color: 0x8b8f99, opacity: 0.82, map: T.paving, rep: [15, 1.6] }), 0.006, GROUND_LAYER.surface);
  // 车道（反射最强）
  pave(...Z.roadS, flatMat({ color: 0x272b36, opacity: 0.5 }), 0.0035, GROUND_LAYER.surface);
  pave(...Z.roadE, flatMat({ color: 0x272b36, opacity: 0.5 }), 0.0035, GROUND_LAYER.surface);

  /* ------------------------------- 3. 路缘石 ------------------------------- */
  const curbMat = toon(C.curb);
  const curbTop = toon(0x9fa3ab);
  // 南侧人行道边缘（含交叉口断开）
  kit.boxB(curbMat, 3.9, 0.05, 0.07, -0.6, 0, 1.395);
  kit.boxB(curbTop, 3.9, 0.012, 0.07, -0.6, 0.05, 1.395);
  // 东侧人行道边缘
  kit.boxB(curbMat, 0.07, 0.05, 3.86, 1.645, 0, -0.75);
  kit.boxB(curbTop, 0.07, 0.012, 3.86, 1.645, 0.05, -0.75);
  // 广场与建筑之间的小台阶（店面地坪）
  kit.boxB(toon(0xbcc0c8), 3.24, 0.028, 0.06, -0.99, 0, -0.47);

  /* ------------------------------- 4. 标线 -------------------------------- */
  const paint = flatMat({ color: 0xd6dde8, opacity: 0.94, light: false });
  const paintDim = flatMat({ color: 0xb9c2d0, opacity: 0.55, light: false });
  // 斑马线 A（南侧车道）
  for (let z = 1.46; z < 2.5; z += 0.165) {
    pave(0.55, 1.6, z, Math.min(z + 0.095, 2.55), paint, 0.012);
  }
  // 斑马线 B（东侧车道）
  for (let x = 1.72; x < 2.46; x += 0.165) {
    pave(x, Math.min(x + 0.095, 2.55), 0.06, 1.12, paint, 0.012);
  }
  // 停车位：两条车位线 + 边框
  const pz0 = -0.4, pz1 = 0.84;
  const lineW = 0.035;
  [-2.55, -1.7, -0.85].forEach((x) => {
    pave(x - lineW / 2, x + lineW / 2, pz0, pz1, paint, 0.012);
  });
  [pz0, pz1].forEach((z) => {
    pave(-2.55, -0.85, z - lineW / 2, z + lineW / 2, paint, 0.012);
  });
  // 车位 P 字
  const pStencil = decalMat(parkingStencil());
  detail(pStencil, 0.34, 0.34, -2.14, 0.014, 0.2);
  detail(pStencil, 0.34, 0.34, -1.28, 0.014, 0.2);
  // 车道中心虚线（南侧车道，靠外）
  for (let x = -2.5; x < 0.3; x += 0.42) pave(x, x + 0.22, 2.34, 2.38, paintDim, 0.012);
  // 止まれ 路面文字（东侧车道）
  const stopPaint = decalMat(roadPaint('止まれ'));
  detail(stopPaint, 0.9, 0.44, 2.12, 0.014, -0.95, { rz: 0 });
  detail(decalMat(roadPaint('徐行')), 0.62, 0.3, 2.12, 0.014, 2.05);

  /* ------------------------------ 5. 地面细节 ------------------------------ */
  // 盲道（黄）
  const tactileMat = flatMat({ opacity: 1, map: T.tactile, rep: [8, 1] });
  pave(-2.56, 1.16, 1.1, 1.22, tactileMat, 0.016);
  pave(1.18, 1.3, -2.56, 1.1, tactileMat, 0.016);
  pave(1.18, 1.3, 1.1, 1.22, tactileMat, 0.016);

  // 排水沟篦子
  const grateS = flatMat({ opacity: 1, map: T.grate, rep: [14, 1] });
  pave(-2.55, -0.15, 1.42, 1.53, grateS, 0.015);
  const grateE = flatMat({ opacity: 1, map: T.grate, rep: [1, 13] });
  pave(1.68, 1.79, -2.5, -0.15, grateE, 0.015);

  // 井盖
  const mh = decalMat(manhole());
  detail(mh, 0.36, 0.36, -1.45, 0.017, 1.95);
  detail(mh, 0.32, 0.32, 2.16, 0.017, 0.35);
  detail(mh, 0.3, 0.3, 0.28, 0.017, -0.2);

  // 人行道分缝线
  const jointMat = toon(C.sidewalkLine, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (let x = -2.4; x < 1.5; x += 0.5) {
    kit.boxB(jointMat, 0.014, 0.004, 0.5, x, 0.006, 1.15);
  }
  for (let z = -2.4; z < 0.8; z += 0.5) {
    kit.boxB(jointMat, 0.5, 0.004, 0.014, 1.4, 0.006, z);
  }

  // 沥青补丁（深色块，打破单调）
  const patch = flatMat({ color: 0x1c2029, opacity: 0.5 });
  detail(patch, 0.5, 0.34, -1.9, 0.014, 1.75, { rz: 0.2 });
  detail(patch, 0.34, 0.5, 1.95, 0.014, -1.6, { rz: -0.12 });
  detail(patch, 0.26, 0.3, -2.2, 0.014, 0.62, { rz: 0.35 });

  kit.bake(batch);
}
