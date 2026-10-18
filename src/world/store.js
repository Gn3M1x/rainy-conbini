// 便利店建筑 + 店内陈设 + 招牌 + 玻璃门
import * as THREE from 'three';
import { C, toon, glowMat, glassMat, signMat, decalMat } from '../core/materials.js';
import { Kit } from '../core/kit.js';
import {
  storeFrontSign, sideSign, windowDecal, poster, hangingSign, glassRain,
  screenFace, coffeeFace, floorTile, manhole, roofTex, glassSheen,
} from '../core/tex.js';

/* 便利店几何参数（世界单位，底座顶面 y=0） */
export const S = {
  x0: -2.56, x1: 0.62, z0: -2.58, z1: -0.48,
  xin0: -2.48, xin1: 0.54,      // 内墙面
  zback: -2.50, zfront: -0.52,  // 内后墙/内前沿
  floorY: 0.05,
  ceilY: 1.06,
  wallTop: 1.16,
  signTop: 1.56,
  roofTop: 1.62,
  gy0: 0.14, gy1: 1.04,         // 玻璃上下沿
  doorX0: -0.64, doorX1: 0.28,
};

/* 任意两点之间的细杆（拉索/斜撑） */
function strut(K, mat, ax, ay, az, bx, by, bz, r = 0.008) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  K.group.add(m);
}

const SNACK = [0xe8745a, 0xf2c14e, 0x67a8d8, 0x8fc47a, 0xd8839c, 0xf2efe4, 0x7d6bb0, 0xe9a05a, 0x5f9fa8];
const DRINK = [0xdfe9f5, 0xf4d9a0, 0xcfe6c8, 0xe8b0a8, 0xbcd8ef, 0xf2f0e6, 0xd8c36a];
const MAG = [0xd24a3f, 0x2f6fa8, 0xe0a83c, 0x4a8f5e, 0xb44a6e, 0xeae6da, 0x6a5aa8, 0xd97a35];

function localFloorArrow() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  // 蓝色地贴箭头
  x.save();
  x.translate(128, 128); x.rotate(Math.PI);
  x.fillStyle = 'rgba(58,118,190,.85)';
  x.beginPath();
  x.moveTo(0, -96); x.lineTo(56, -20); x.lineTo(22, -20); x.lineTo(22, 96);
  x.lineTo(-22, 96); x.lineTo(-22, -20); x.lineTo(-56, -20); x.closePath();
  x.fill();
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '700 30px sans-serif';
  x.textAlign = 'center'; x.fillText('入口', 0, 62);
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildStore(batch, ctx) {
  const { products: P, glassGroup, anim, hidden } = ctx;
  const K = new Kit();
  const T = {
    sign: storeFrontSign(),
    side: sideSign(),
    mag: poster('snack'),
  };
  const M = {
    wall: toon(C.wall),
    wallIn: toon(0xefe9dc),
    pillar: toon(C.pillar),
    alu: toon(C.aluminum),
    aluD: toon(C.trim),
    kick: toon(0x3c424c),
    header: toon(0xf7f3e8),
    ceiling: toon(C.ceiling),
    floor: toon(C.floorTile),
    shelf: toon(C.shelfWhite),
    shelfE: toon(C.shelfEdge),
    counter: toon(C.counterBody),
    counterTop: toon(C.counterTop),
    green: toon(C.counterBand),
    steel: toon(0x9aa3ad),
    dark: toon(0x333a44),
    black: toon(0x191d24),
    roof: toon(C.roof),
    roofD: toon(C.roofDark),
    roofTop: new THREE.MeshBasicMaterial({ map: roofTex(), color: 0x59627a }),
    wallOut: new THREE.MeshBasicMaterial({ color: 0x2a3040, side: THREE.DoubleSide }),
    fridge: toon(0xe8eef4),
    acrylic: new THREE.MeshBasicMaterial({
      map: glassSheen(), transparent: true, opacity: 0.5,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }),
    iceGlow: glowMat(0xe6f5ff),
    fridgeGlow: glowMat(0xd6ecff),
    lightPanel: glowMat(0xf0dcb6),
    oden: toon(0xc9ccd2),
  };

  const x0 = S.x0, x1 = S.x1, z0 = S.z0, z1 = S.z1;
  const W = x1 - x0, D = z1 - z0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

  /* =============================== 地坪 =============================== */
  K.boxB(toon(0x8e8b83), W, S.floorY, D, cx, 0, cz);
  K.floorPlane(toon(0xffffff, { map: floorTile() }), W - 0.1, D - 0.1, cx, S.floorY + 0.002, cz);

  /* =============================== 墙体 =============================== */
  const wt = 0.08;
  // 西墙
  K.boxB(M.wall, wt, S.signTop, D, x0 + wt / 2, 0, cz);
  // 东墙
  K.boxB(M.wall, wt, S.signTop, D, x1 - wt / 2, 0, cz);
  // 后墙
  K.boxB(M.wall, W, S.signTop, wt, cx, 0, z0 + wt / 2);
  // 外侧哑光罩面：挡住室内点光穿墙（无阴影导致的漏光）
  K.boxB(M.wallOut, W + 0.02, S.signTop, 0.01, cx, 0, z0 - 0.005);
  K.boxB(M.wallOut, 0.01, S.signTop, D + 0.02, x0 - 0.005, 0, cz);
  // 室内墙裙（浅色）
  K.boxB(M.wallIn, 0.02, 0.06, D - 0.16, S.xin0 - 0.01, S.floorY, cz);
  K.boxB(M.wallIn, 0.02, 0.06, D - 0.16, S.xin1 + 0.01, S.floorY, cz);

  /* ============================== 天花板 ============================== */
  K.boxB(M.ceiling, W - 0.02, 0.1, D - 0.02, cx, S.ceilY, cz);
  // 灯板
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      K.box(M.lightPanel, 0.52, 0.012, 0.5, -2.0 + i * 0.86, S.ceilY - 0.008, -0.95 - j * 0.72);
      K.box(M.aluD, 0.56, 0.02, 0.54, -2.0 + i * 0.86, S.ceilY - 0.004, -0.95 - j * 0.72);
    }
  }

  /* ============================ 前立面结构 ============================ */
  const fz = z1; // 外墙面
  const postMat = M.pillar;
  // 立柱
  const posts = [
    [x0 + 0.04, 0.08], [-1.62, 0.06], [-0.70, 0.06], [0.30, 0.06], [x1 - 0.04, 0.08],
  ];
  posts.forEach(([px, pw]) => {
    K.box(postMat, pw, S.wallTop, 0.15, px, S.wallTop / 2, fz - 0.02);
  });
  // 下部踢脚 + 上沿横梁
  K.boxB(M.kick, W, 0.10, 0.16, cx, 0, fz - 0.02);
  K.box(M.alu, W, 0.035, 0.17, cx, 0.125, fz - 0.02);
  K.box(M.alu, W, 0.12, 0.16, cx, S.gy1 + 0.06, fz - 0.02);
  // 门框横轨
  K.box(M.aluD, 0.94, 0.06, 0.1, -0.18, 1.01, fz - 0.03);
  K.box(M.aluD, 0.94, 0.05, 0.1, -0.18, 0.165, fz - 0.03);

  /* ============================ 玻璃与贴膜 ============================ */
  // 橱窗玻璃（A1/A2）
  const paneA1 = new THREE.Mesh(new THREE.PlaneGeometry(0.86, S.gy1 - S.gy0), M.acrylic);
  paneA1.position.set(-2.05, (S.gy0 + S.gy1) / 2, fz - 0.10);
  const paneA2 = paneA1.clone();
  paneA2.position.x = -1.13;
  const paneB = new THREE.Mesh(new THREE.PlaneGeometry(0.18, S.gy1 - S.gy0), M.acrylic);
  paneB.position.set(0.42, (S.gy0 + S.gy1) / 2, fz - 0.10);
  glassGroup.add(paneA1, paneA2, paneB);
  hidden.push(paneA1, paneA2, paneB);
  // 玻璃雨痕
  const rainTex = glassRain();
  const rainMat = new THREE.MeshBasicMaterial({
    map: rainTex, transparent: true, opacity: 0.16, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const rainPane = new THREE.Mesh(new THREE.PlaneGeometry(0.86, S.gy1 - S.gy0), rainMat);
  rainPane.position.set(-2.05, (S.gy0 + S.gy1) / 2, fz - 0.085);
  const rainPane2 = rainPane.clone();
  rainPane2.position.x = -1.13;
  glassGroup.add(rainPane, rainPane2);
  hidden.push(rainPane, rainPane2);
  anim.rainTex = rainTex;

  // 橱窗文字贴膜
  K.plane(decalMat(windowDecal('おにぎり 100円', '#c8392f', '#fff6e4', 512, 128)), 0.78, 0.14, -2.05, 0.92, fz - 0.075);
  K.plane(decalMat(windowDecal('からあげ 20%OFF', '#ef8f3c', '#ffffff', 512, 128)), 0.78, 0.13, -1.13, 0.9, fz - 0.075);

  /* ============================ 自动门（可动） ============================ */
  const doorGroup = new THREE.Group();
  const doorMat = glassMat(0xd8ecf8, 0.13);
  const mkPanel = (dir) => {
    const g = new THREE.Group();
    const gw = 0.45, gh = 0.86;
    // 门框：四条铝边（中间必须是空的，才能看见店内）
    const railMat = toon(C.aluminum);
    const railT = 0.045;
    [[0, gh / 2 - railT / 2, gw, railT], [0, -gh / 2 + railT / 2, gw, railT],
     [-gw / 2 + railT / 2, 0, railT, gh], [gw / 2 - railT / 2, 0, railT, gh]].forEach(([x, y, w, h]) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), railMat);
      r.position.set(x, y, 0);
      g.add(r);
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(gw - railT * 2, gh - railT * 2), doorMat);
    glass.position.z = 0.016;
    g.add(glass);
    hidden.push(glass);
    // 中缝胶条
    const seal = new THREE.Mesh(new THREE.BoxGeometry(0.02, gh - 0.05, 0.035), toon(0x30353d));
    seal.position.x = dir * (gw / 2 - 0.01);
    g.add(seal);
    // 门贴
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.075), decalMat(windowDecal('自動ドア', '#2f6fa8', '#ffffff', 320, 96)));
    dec.position.set(0, 0.16, 0.035);
    g.add(dec);
    return g;
  };
  const doorL = mkPanel(1);
  const doorR = mkPanel(-1);
  doorL.position.set(-0.42, (S.gy0 + S.gy1) / 2 + 0.02, fz - 0.055);
  doorR.position.set(0.06, (S.gy0 + S.gy1) / 2 + 0.02, fz - 0.055);
  doorGroup.add(doorL, doorR);
  anim.door = { left: doorL, right: doorR, baseX: { l: -0.42, r: 0.06 } };

  /* ============================ 招牌带 ============================ */
  // 招牌体
  K.boxB(M.header, W, S.signTop - S.wallTop, 0.16, cx, S.wallTop, fz + 0.06);
  // 主招牌面（自发光，可闪烁）
  const signTex = T.sign;
  const signFaceMat = signMat(signTex, 1.1);
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, S.signTop - S.wallTop - 0.06), signFaceMat);
  signFace.position.set(cx, (S.wallTop + S.signTop) / 2, fz + 0.145);
  glassGroup.add(signFace);
  hidden.push(signFace);
  anim.flicker.push({ mat: signFaceMat, base: 1.1, amount: 0.09, seed: 1.3 });
  // 招牌上下沿
  K.box(M.aluD, W + 0.04, 0.03, 0.2, cx, S.signTop + 0.01, fz + 0.06);
  K.box(M.aluD, W + 0.04, 0.03, 0.2, cx, S.wallTop + 0.005, fz + 0.06);
  // 侧面小招牌（东侧，面向小巷）
  const sideMat = signMat(T.side, 1.4);
  const sideFace = new THREE.Mesh(new THREE.PlaneGeometry(0.62, S.signTop - S.wallTop - 0.04), sideMat);
  sideFace.position.set(x1 + 0.005, (S.wallTop + S.signTop) / 2, cz + 0.55);
  sideFace.rotation.y = Math.PI / 2;
  glassGroup.add(sideFace);
  hidden.push(sideFace);

  /* ============================== 雨棚 ============================== */
  const canX0 = -1.0, canX1 = 0.58;
  K.box(toon(0xe9edf2), canX1 - canX0, 0.05, 0.36, (canX0 + canX1) / 2, 1.055, fz + 0.14);
  K.box(toon(C.awningEdge), canX1 - canX0, 0.035, 0.02, (canX0 + canX1) / 2, 1.05, fz + 0.325);
  // 雨棚支撑
  [-0.92, 0.5].forEach((px) => {
    K.box(M.aluD, 0.02, 0.22, 0.02, px, 0.95, fz + 0.02);
    K.box(M.aluD, 0.02, 0.02, 0.3, px, 1.05, fz + 0.14);
  });
  // 雨棚下小灯
  for (let i = 0; i < 3; i++) {
    K.cyl(glowMat(0xfff0cf), 0.028, 0.028, 0.012, 10, -0.72 + i * 0.62, 1.028, fz + 0.16);
  }

  /* ============================== 屋顶 ============================== */
  const pr = S.roofTop;
  K.boxB(M.roof, W + 0.08, pr - S.signTop, D + 0.06, cx, S.signTop, cz);
  // 屋面防水卷材
  K.floorPlane(M.roofTop, W, D, cx, pr + 0.003, cz);
  // 女儿墙（四周压顶）
  const pwt = 0.055, phg = 0.09;
  K.boxB(M.roofD, W + 0.16, phg, pwt, cx, pr, z1 - 0.005);
  K.boxB(M.roofD, W + 0.16, phg, pwt, cx, pr, z0 + 0.005);
  K.boxB(M.roofD, pwt, phg, D + 0.01, x0 + 0.005, pr, cz);
  K.boxB(M.roofD, pwt, phg, D + 0.01, x1 - 0.005, pr, cz);
  K.box(toon(0x8a929e), W + 0.15, 0.012, pwt + 0.01, cx, pr + phg, z1 - 0.005);
  K.box(toon(0x8a929e), W + 0.15, 0.012, pwt + 0.01, cx, pr + phg, z0 + 0.005);
  // 屋顶空调外机 + 风机
  const acY = pr + 0.02;
  K.boxB(M.steel, 0.34, 0.2, 0.26, -0.95, acY, -1.9);
  K.cyl(M.dark, 0.11, 0.11, 0.02, 14, -0.95, acY + 0.2, -1.78, { rx: Math.PI / 2 });
  K.cyl(M.roofD, 0.12, 0.12, 0.02, 14, -0.95, acY + 0.2, -1.88, { rx: Math.PI / 2 });
  // 高位水箱
  K.cylB(toon(0x8f97a2), 0.15, 0.15, 0.26, 14, 0.16, acY + 0.08, -2.06);
  K.cylB(M.dark, 0.155, 0.155, 0.02, 14, 0.16, acY + 0.34, -2.06);
  K.cylB(M.dark, 0.02, 0.02, 0.08, 8, 0.16, acY, -2.06);
  K.cylB(M.steel, 0.018, 0.018, 0.24, 8, 0.3, acY + 0.2, -1.98, { rz: 0.35 });
  // 通风管
  K.cylB(M.steel, 0.055, 0.055, 0.24, 10, -0.35, acY, -2.24);
  K.cylB(M.dark, 0.062, 0.062, 0.02, 10, -0.35, acY + 0.24, -2.24);
  K.cylB(M.steel, 0.04, 0.04, 0.16, 8, 0.42, acY, -0.9);
  // 检修口
  K.box(toon(0x7d8592), 0.36, 0.02, 0.32, -1.72, acY + 0.01, -1.15);
  K.box(M.roofD, 0.4, 0.012, 0.36, -1.72, acY + 0.022, -1.15);
  // 天线 + 拉索
  K.cylB(M.dark, 0.008, 0.01, 0.62, 6, -2.14, acY, -2.3);
  K.box(M.dark, 0.26, 0.008, 0.008, -2.14, acY + 0.54, -2.3, { ry: 0.35 });
  K.box(M.dark, 0.18, 0.007, 0.007, -2.14, acY + 0.44, -2.3, { ry: -0.5 });
  strut(K, M.dark, -2.14, acY + 0.3, -2.3, -1.55, acY, -1.75);
  // 屋顶杂物箱
  K.boxB(toon(0x5a6068), 0.2, 0.12, 0.16, -1.7, acY, -0.72, { ry: 0.2 });
  K.boxB(toon(0x6b7280), 0.15, 0.1, 0.14, -0.2, acY, -0.86, { ry: 0.55 });
  K.boxB(toon(0x4d5560), 0.12, 0.08, 0.12, 0.05, acY, -2.32, { ry: 0.15 });

  /* ============================== 店内 ============================== */
  const fy = S.floorY;
  const zB = S.zback;

  /* --- 后面饮料柜 --- */
  const fridgeZ0 = -2.48, fridgeZ1 = -2.16;
  const fridgeUnits = [[-2.44, -1.88], [-1.84, -1.28], [-1.24, -0.68]];
  fridgeUnits.forEach(([fx0, fx1]) => {
    const fw = fx1 - fx0, fcx = (fx0 + fx1) / 2;
    // 柜体
    K.boxB(M.fridge, fw, 0.96, fridgeZ1 - fridgeZ0, fcx, fy, (fridgeZ0 + fridgeZ1) / 2);
    // 内发光背板
    K.plane(M.fridgeGlow, fw - 0.04, 0.9, fcx, fy + 0.5, fridgeZ0 + 0.06);
    // 层板 + 饮料
    for (let r = 0; r < 4; r++) {
      const sy = fy + 0.2 + r * 0.19;
      K.box(M.shelfE, fw - 0.04, 0.012, 0.16, fcx, sy, fridgeZ1 - 0.1);
      for (let b = 0; b < 7; b++) {
        const bx = fx0 + 0.05 + b * ((fw - 0.1) / 6.5);
        P.bottle(bx, sy + 0.045, fridgeZ1 - 0.11, 0.019, 0.078, DRINK[(r * 3 + b) % DRINK.length]);
      }
    }
    // 玻璃门框
    K.box(M.alu, fw, 0.03, 0.02, fcx, fy + 0.955, fridgeZ1);
    K.box(M.alu, 0.03, 0.96, 0.02, fx0 + 0.015, fy + 0.48, fridgeZ1);
    K.box(M.alu, 0.03, 0.96, 0.02, fx1 - 0.015, fy + 0.48, fridgeZ1);
  });

  /* --- 后场门 --- */
  const bdX0 = -0.62, bdX1 = -0.28;
  K.boxB(M.steel, bdX1 - bdX0, 0.86, 0.03, (bdX0 + bdX1) / 2, fy, zB + 0.03);
  K.box(M.dark, bdX1 - bdX0 - 0.08, 0.4, 0.01, (bdX0 + bdX1) / 2, fy + 0.4, zB + 0.05);
  K.box(M.aluD, 0.02, 0.1, 0.02, bdX1 - 0.08, fy + 0.42, zB + 0.06);
  K.box(glowMat(0xf0f6ff, { opacity: 1 }), 0.16, 0.12, 0.005, (bdX0 + bdX1) / 2, fy + 0.62, zB + 0.048);

  /* --- 冰箱（冰淇淋柜） --- */
  K.boxB(toon(0xeceff3), 0.52, 0.4, 0.34, 0.2, fy, -2.34);
  K.box(M.iceGlow, 0.48, 0.02, 0.3, 0.2, fy + 0.4, -2.34);
  K.boxB(M.aluD, 0.02, 0.42, 0.34, -0.05, fy, -2.34);
  K.boxB(M.aluD, 0.02, 0.42, 0.34, 0.45, fy, -2.34);

  /* --- 冷藏开放柜（靠西墙） --- */
  K.boxB(toon(0xeef2f6), 0.3, 0.62, 0.62, S.xin0 + 0.16, fy, -1.15);
  K.box(M.fridgeGlow, 0.02, 0.5, 0.56, S.xin0 + 0.31, fy + 0.32, -1.15);
  for (let r = 0; r < 3; r++) {
    const sy = fy + 0.16 + r * 0.18;
    for (let b = 0; b < 9; b++) {
      P.bottle(S.xin0 + 0.2, sy + 0.045, -1.42 + b * 0.062, 0.019, 0.076, DRINK[(r + b) % DRINK.length]);
    }
  }

  /* --- 中岛货架 x2 --- */
  const gondola = (gx) => {
    const gw = 0.4, zz0 = -1.28, zz1 = -2.02;
    K.boxB(M.shelf, gw, 0.1, zz1 - zz0 + 0.02, gx + gw / 2, fy, (zz0 + zz1) / 2);
    const levels = [0.16, 0.34, 0.5];
    levels.forEach((ly, idx) => {
      K.box(M.shelf, gw, 0.016, zz1 - zz0, gx + gw / 2, fy + ly, (zz0 + zz1) / 2);
      K.box(M.shelfE, gw + 0.01, 0.02, 0.02, gx + gw / 2, fy + ly + 0.01, zz0);
      K.box(M.shelfE, gw + 0.01, 0.02, 0.02, gx + gw / 2, fy + ly + 0.01, zz1);
      // 两侧商品
      for (let side = 0; side < 2; side++) {
        const sgn = side ? 1 : -1;
        for (let i = 0; i < 7; i++) {
          const bx = gx + (sgn > 0 ? gw - 0.05 : 0.05);
          const bz = zz0 - 0.06 - i * 0.105;
          const h = 0.1 + ((i + idx) % 3) * 0.012;
          P.box(bx, fy + ly + 0.008 + h / 2, bz, 0.085, h, 0.075, SNACK[(i * 3 + idx + side) % SNACK.length]);
        }
      }
      // 顶面平铺
      if (idx === levels.length - 1) {
        for (let i = 0; i < 8; i++) {
          P.box(gx + 0.07 + (i % 2) * 0.13, fy + ly + 0.06, zz0 - 0.08 - Math.floor(i / 2) * 0.22,
            0.1, 0.1, 0.12, SNACK[(i + 4) % SNACK.length]);
        }
      }
    });
    // 价签
    K.box(glowMat(0xfff3d0, { opacity: 0.9 }), gw * 0.8, 0.035, 0.005, gx + gw / 2, fy + 0.28, zz0 + 0.005);
  };
  gondola(-1.98);
  gondola(-1.28);

  /* --- 杂志架（沿前窗内） --- */
  const magZ = -0.66;
  const magX0 = -2.44, magX1 = -1.34;
  const magCx = (magX0 + magX1) / 2;
  // 背板 + 两侧板（正面敞开，杂志才看得见）
  K.boxB(M.shelf, magX1 - magX0, 0.44, 0.03, magCx, fy, magZ - 0.205);
  K.boxB(M.shelf, 0.03, 0.44, 0.22, magX0 + 0.015, fy, magZ - 0.1);
  K.boxB(M.shelf, 0.03, 0.44, 0.22, magX1 - 0.015, fy, magZ - 0.1);
  for (let t = 0; t < 3; t++) {
    const ty = fy + 0.1 + t * 0.13;
    K.box(M.shelfE, magX1 - magX0, 0.012, 0.2, (magX0 + magX1) / 2, ty, magZ - 0.1);
    for (let i = 0; i < 9; i++) {
      const mx = magX0 + 0.06 + i * 0.116;
      P.box(mx, ty + 0.085, magZ - 0.03, 0.1, 0.17, 0.014, MAG[(i + t * 2) % MAG.length]);
      P.box(mx, ty + 0.135, magZ - 0.018, 0.09, 0.04, 0.006, 0xf7f4ea);
    }
  }
  // 杂志架顶部灯条
  K.box(glowMat(0xfff6e0, { opacity: 1 }), magX1 - magX0, 0.02, 0.12, (magX0 + magX1) / 2, fy + 0.47, magZ - 0.14);

  /* --- 饭团/便当开放柜（入口左侧） --- */
  const bX0 = -1.2, bX1 = -0.72, bZ = -0.72;
  K.boxB(M.shelf, bX1 - bX0, 0.26, 0.3, (bX0 + bX1) / 2, fy, bZ);
  K.box(M.shelfE, bX1 - bX0, 0.014, 0.32, (bX0 + bX1) / 2, fy + 0.26, bZ);
  K.box(glowMat(0xfff4dc, { opacity: 1 }), bX1 - bX0, 0.016, 0.06, (bX0 + bX1) / 2, fy + 0.265, bZ - 0.19);
  // 饭团
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 4; i++) {
      P.rice(bX0 + 0.07 + i * 0.105, fy + 0.3 + 0.008, bZ - 0.12 + r * 0.1, 0.038, 0.026, r % 2 ? 0xf7f4ec : 0xe9e4d6, (i) * 0.3);
    }
  }
  // 便当
  for (let i = 0; i < 3; i++) {
    P.box(bX0 + 0.09 + i * 0.13, fy + 0.32, bZ + 0.1, 0.12, 0.045, 0.1, i % 2 ? 0x3a4a5e : 0xd8b23a);
  }

  /* --- 收银台 --- */
  const cX0 = 0.1, cX1 = 0.5, cZ0 = -0.88, cZ1 = -1.92;
  K.boxB(M.counter, cX1 - cX0, 0.42, cZ0 - cZ1, (cX0 + cX1) / 2, fy, (cZ0 + cZ1) / 2);
  K.boxB(M.green, 0.02, 0.1, cZ0 - cZ1 - 0.06, cX0 + 0.005, fy + 0.3, (cZ0 + cZ1) / 2);
  K.boxB(M.counterTop, cX1 - cX0 + 0.04, 0.03, cZ0 - cZ1 + 0.04, (cX0 + cX1) / 2, fy + 0.42, (cZ0 + cZ1) / 2);
  const cTop = fy + 0.45;
  // 收银机
  K.boxB(M.dark, 0.2, 0.06, 0.14, 0.3, cTop, -1.0);
  K.box(M.black, 0.18, 0.12, 0.03, 0.3, cTop + 0.12, -1.0, { rx: -0.25 });
  K.plane(decalMat(screenFace('pos')), 0.16, 0.1, 0.3, cTop + 0.125, -0.977, { rx: -0.25 });
  // 咖啡机
  K.boxB(M.black, 0.22, 0.3, 0.2, 0.3, cTop, -1.45);
  K.plane(decalMat(coffeeFace()), 0.18, 0.16, 0.3, cTop + 0.17, -1.348);
  K.box(glowMat(0xffd0a0), 0.06, 0.02, 0.05, 0.3, cTop + 0.03, -1.36);
  // 关东煮锅
  K.boxB(M.oden, 0.2, 0.1, 0.16, 0.3, cTop, -1.72);
  for (let i = 0; i < 6; i++) {
    K.cyl(toon(i % 2 ? 0xd8a86a : 0xe8d8b8), 0.026, 0.026, 0.05, 8,
      0.24 + (i % 3) * 0.06, cTop + 0.08, -1.68 - Math.floor(i / 3) * 0.06);
  }
  K.box(glowMat(0xffe0b0, { opacity: 0.85 }), 0.2, 0.008, 0.16, 0.3, cTop + 0.1, -1.72);
  // 关东煮价牌
  K.plane(decalMat(windowDecal('おでん', '#c8392f', '#fff6e4', 256, 96)), 0.16, 0.06, 0.3, cTop + 0.2, -1.62);
  // 热食柜
  K.boxB(M.alu, 0.22, 0.28, 0.2, 0.3, cTop, -1.9);
  K.box(glowMat(0xffe4bc, { opacity: 0.9 }), 0.19, 0.2, 0.02, 0.3, cTop + 0.15, -1.79);
  // 收银台后烟草架
  K.boxB(M.shelf, 0.06, 0.5, 0.9, S.xin1 - 0.03, fy + 0.42, -1.4);
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 9; i++) {
      P.box(S.xin1 - 0.07, fy + 0.5 + r * 0.11, -1.8 + i * 0.09, 0.05, 0.07, 0.06, SNACK[(i + r) % SNACK.length]);
    }
  }

  /* --- ATM --- */
  K.boxB(M.dark, 0.24, 0.72, 0.3, 0.18, fy, -0.66);
  K.boxB(M.steel, 0.26, 0.06, 0.32, 0.18, fy + 0.72, -0.66);
  K.plane(decalMat(screenFace('atm')), 0.18, 0.13, 0.18, fy + 0.5, -0.508);

  /* --- 地面导视贴 --- */
  const arrowTex = localFloorArrow();
  K.floorPlane(new THREE.MeshBasicMaterial({
    map: arrowTex, transparent: true, depthWrite: false, toneMapped: false,
  }), 0.26, 0.26, -0.2, fy + 0.006, -0.78);

  /* --- 墙面海报 --- */
  K.plane(decalMat(poster('onigiri'), { side: THREE.FrontSide }), 0.34, 0.44, S.xin0 + 0.005, fy + 0.72, -1.75, { ry: Math.PI / 2 });
  K.plane(decalMat(poster('bento'), { side: THREE.FrontSide }), 0.3, 0.4, S.xin0 + 0.005, fy + 0.7, -0.95, { ry: Math.PI / 2 });
  K.plane(decalMat(poster('coffee'), { side: THREE.FrontSide }), 0.34, 0.3, -0.98, fy + 0.75, zB + 0.06);
  K.plane(decalMat(poster('ice'), { side: THREE.FrontSide }), 0.34, 0.3, 0.5, fy + 0.72, zB + 0.06);

  /* --- 吊旗 --- */
  const hang = (text, hx, hz, bg = '#c8392f') => {
    K.box(M.aluD, 0.004, 0.1, 0.004, hx, S.ceilY - 0.05, hz);
    const m = signMat(hangingSign(text, bg, '#ffffff'), 1.15);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.13), m);
    p.position.set(hx, S.ceilY - 0.17, hz);
    glassGroup.add(p);
    const p2 = p.clone();
    p2.rotation.y = Math.PI;
    p2.position.z = hz - 0.001;
    glassGroup.add(p2);
    anim.flicker.push({ mat: m, base: 1.15, amount: 0.05, seed: hx * 7 });
  };
  hang('おにぎり', -1.75, -1.0, '#c8392f');
  hang('レジ', -0.3, -1.35, '#3f7d5a');
  hang('ATM', 0.3, -0.95, '#2f6fa8');

  /* ========================= 立面细节 / 侧面 ========================= */
  // 西墙：通风百叶 + 海报
  for (let i = 0; i < 5; i++) {
    K.box(M.aluD, 0.02, 0.012, 0.32, x0 - 0.016, 0.62 + i * 0.03, -1.5);
  }
  K.plane(decalMat(poster('ice')), 0.3, 0.38, x0 - 0.016, 0.72, -0.95, { ry: -Math.PI / 2 });
  // 东墙（小巷侧）：海报 + 通风百叶
  K.plane(decalMat(poster('coffee')), 0.28, 0.36, x1 + 0.014, 1.02, -0.78, { ry: Math.PI / 2 });
  for (let i = 0; i < 6; i++) {
    K.box(M.aluD, 0.02, 0.012, 0.22, x1 + 0.012, 0.86 + i * 0.035, -2.22);
  }
  // 东墙（小巷侧）：后门 + 空调外机 + 壁灯
  K.boxB(M.steel, 0.03, 0.7, 0.4, x1 + 0.015, 0.06, -1.9);
  K.box(M.dark, 0.005, 0.28, 0.24, x1 + 0.032, 0.5, -1.9);
  K.boxB(M.aluD, 0.03, 0.06, 0.42, x1 + 0.02, 0.06, -1.9);
  // 空调外机（小巷）
  K.boxB(toon(0xe4e8ee), 0.16, 0.26, 0.34, x1 + 0.13, 0.28, -1.2);
  K.cyl(M.dark, 0.1, 0.1, 0.01, 14, x1 + 0.215, 0.41, -1.2, { rz: Math.PI / 2 });
  K.box(toon(0x9aa3ad), 0.02, 0.02, 0.3, x1 + 0.08, 0.26, -1.2);
  // 壁灯（暖）
  K.box(M.dark, 0.06, 0.04, 0.1, x1 + 0.05, 0.85, -1.62);
  K.box(glowMat(0xffd9a0), 0.04, 0.02, 0.08, x1 + 0.09, 0.83, -1.62);
  // 落水管
  K.cylB(M.aluD, 0.018, 0.018, S.roofTop - 0.1, 8, x1 + 0.04, 0.06, -0.62);
  K.cylB(M.aluD, 0.018, 0.018, 0.2, 8, x1 + 0.04, 0.06, -0.52, { rx: Math.PI / 2 });
  // 后墙（北侧）：服务门 + 通风口（贴在深色外罩上）
  K.boxB(M.steel, 0.44, 0.72, 0.03, -1.55, 0, z0 - 0.02);
  K.box(M.dark, 0.12, 0.3, 0.02, -1.55, 0.5, z0 - 0.035);
  K.box(M.aluD, 0.5, 0.05, 0.05, -1.55, 0.74, z0 - 0.025);
  for (let i = 0; i < 5; i++) {
    K.box(M.aluD, 0.3, 0.012, 0.02, 0.05, 0.9 + i * 0.035, z0 - 0.02);
  }
  // 台阶（入口）
  K.boxB(toon(0xb9bcc2), 0.94, 0.06, 0.2, -0.18, 0, z1 + 0.1);

  /* ============================ 门外地垫 ============================ */
  K.floorPlane(toon(0x3a4048), 0.86, 0.3, -0.18, 0.012, z1 + 0.26);

  K.bake(batch);
  ctx.scene.add(doorGroup);
  anim.hiddenDoor = doorGroup;
  return { doorGroup };
}
