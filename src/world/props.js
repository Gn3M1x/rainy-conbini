// 街道道具：街灯 / 电线杆 / 信号灯 / 立柱灯箱 / 自动贩卖机 / 自行车 / 护栏 / 垃圾桶 / 雨伞架 / 公告栏 / 路牌 …
import * as THREE from 'three';
import { C, toon, glowMat, signMat, decalMat, additiveMat, GROUND_LAYER } from '../core/materials.js';
import { Kit } from '../core/kit.js';
import { buildBicycle } from './bicycle.js';
import {
  poleSign, sideSign, streetSign, stopSign, parkingSign, vendingFront,
  noticeBoard, aFrame, poolTex, windowDecal, trashLabel, poster,
} from '../core/tex.js';

/* 关键道具位置（供灯光/动效对齐） */
export const POS = {
  streetLamp: [-1.5, 1.16],
  poleSign: [-2.4, 0.74],
  poleA: [1.3, 0.36],
  poleB: [-2.3, 1.18],
  signal: [1.6, 1.3],
  vend: [[0.8, -0.78], [0.8, -1.5]],
  bins: [0.9, 0.62],
  umbrella: [-0.94, -0.36],
};

/* 两点之间的圆柱（杆件） */
function rod(K, mat, ax, ay, az, bx, by, bz, r, seg = 8) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  K.group.add(m);
  return m;
}

/* 地面光晕 */
function pool(x, z, size, color, opacity, y = 0.019) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), additiveMat(poolTex(), color, opacity));
  m.renderOrder = GROUND_LAYER.light;
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

export function buildProps(batch, ctx) {
  const K = new Kit();
  const { anim } = ctx;
  const pools = [];
  const metal = toon(C.metalMid);
  const dark = toon(C.metalDark);
  const steel = toon(0xc8cdd4);

  /* ============================== 街灯 ============================== */
  {
    const [x, z] = POS.streetLamp;
    K.cylB(metal, 0.03, 0.042, 1.42, 10, x, 0.05, z);
    K.boxB(dark, 0.12, 0.06, 0.12, x, 0.05, z);
    rod(K, metal, x, 1.44, z, x, 1.5, z + 0.34, 0.024);
    rod(K, metal, x, 1.5, z + 0.3, x, 1.46, z + 0.34, 0.02);
    // 灯头
    K.box(dark, 0.1, 0.06, 0.24, x, 1.44, z + 0.36);
    K.box(glowMat(0xffdca8), 0.07, 0.02, 0.19, x, 1.405, z + 0.36);
    pools.push(pool(x, z + 0.42, 1.9, 0xffcf92, 0.3));
  }

  /* ============================ 便利店立柱灯箱 ============================ */
  {
    const [x, z] = POS.poleSign;
    // 混凝土基座 + 短柱
    K.boxB(toon(0x8f8c86), 0.3, 0.1, 0.34, x, 0.02, z);
    K.cylB(steel, 0.04, 0.05, 0.2, 10, x, 0.11, z);
    // 灯箱体（矮而厚，像日本街角的袖看板）
    const bw = 0.6, bh = 0.5, bd = 0.2;
    const by = 0.3;
    K.boxB(toon(0xe8e2d6), bw, bh, bd, x, by, z);
    K.box(toon(C.signRed), bw + 0.03, 0.055, bd + 0.03, x, by + bh - 0.02, z);
    K.box(toon(0x9aa3ad), bw + 0.05, 0.04, bd + 0.05, x, by - 0.005, z);
    const st = poleSign();
    const side = signMat(st, 1.2);
    [-1, 1].forEach((sd) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.05, bh - 0.09), side);
      p.position.set(x, by + bh / 2 - 0.01, z + sd * (bd / 2 + 0.006));
      p.rotation.y = sd > 0 ? 0 : Math.PI;
      glassGroupPush(ctx, p);
    });
    anim.flicker.push({ mat: side, base: 1.2, amount: 0.06, seed: 4.1 });
    pools.push(pool(x, z + 0.2, 0.9, 0xff9a6a, 0.16));
  }

  /* ============================== 电线杆 ============================== */
  const poles = [POS.poleA, POS.poleB];
  poles.forEach(([x, z], i) => {
    K.cylB(toon(C.poleConcrete), 0.045, 0.06, 2.15, 10, x, 0.03, z);
    // 横担
    K.box(dark, 0.5, 0.035, 0.035, x, 1.86, z);
    K.box(dark, 0.34, 0.03, 0.03, x, 2.02, z);
    // 绝缘子
    for (let k = 0; k < 4; k++) {
      K.cylB(toon(0xd8dce2), 0.016, 0.02, 0.05, 6, x - 0.2 + k * 0.133, 1.88, z);
    }
    // 变压器（一根杆上）
    if (i === 0) {
      K.cylB(toon(0x8c929c), 0.07, 0.07, 0.18, 10, x + 0.12, 1.5, z);
      K.cylB(dark, 0.075, 0.075, 0.02, 10, x + 0.12, 1.68, z);
    }
    // 杆上小箱
    K.boxB(toon(0x7d848e), 0.1, 0.16, 0.08, x - 0.06, 1.2, z + 0.03);
    // 拉线
    if (i === 1) rod(K, dark, x, 1.75, z, x + 0.34, 0.05, z + 0.12, 0.008, 5);
  });
  // 电线：两杆之间 + 拉到便利店屋顶 + 出画面
  const wireMat = toon(0x14161c);
  const a = POS.poleA, b = POS.poleB;
  const sag = (p0, p1, h, n = 24) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(new THREE.Vector3(
        p0[0] + (p1[0] - p0[0]) * t,
        p0[1] + (p1[1] - p0[1]) * t - Math.sin(Math.PI * t) * h,
        p0[2] + (p1[2] - p0[2]) * t
      ));
    }
    return pts;
  };
  for (let k = 0; k < 3; k++) {
    K.tube(wireMat, sag([a[0] - 0.18 + k * 0.18, 1.9 - k * 0.015, a[1]], [b[0] - 0.18 + k * 0.18, 1.9 - k * 0.015, b[1]], 0.16), 0.006, 22, 4);
  }
  // 从 A 杆拉到便利店屋顶
  K.tube(wireMat, sag([a[0] - 0.1, 1.84, a[1]], [0.5, 1.7, -1.7], 0.12), 0.006, 20, 4);
  K.tube(wireMat, sag([a[0] + 0.1, 1.8, a[1]], [0.3, 1.66, -2.3], 0.14), 0.005, 20, 4);
  // 出画面方向的两根（拉到基座边缘外）
  K.tube(wireMat, sag([b[0] - 0.18, 1.9, b[1]], [-2.6, 1.86, 2.6], 0.18), 0.006, 20, 4);
  K.tube(wireMat, sag([a[0] + 0.18, 1.88, a[1]], [2.6, 1.8, -2.6], 0.2), 0.005, 20, 4);

  /* ============================== 交通信号灯 ============================== */
  {
    const [x, z] = POS.signal;
    K.cylB(metal, 0.028, 0.036, 1.5, 10, x, 0.06, z);
    K.boxB(dark, 0.12, 0.05, 0.12, x, 0.06, z);
    rod(K, metal, x, 1.5, z, x + 0.5, 1.56, z + 0.08, 0.022);
    // 信号灯箱
    const hx = x + 0.6, hy = 1.5, hz = z + 0.08;
    K.boxB(dark, 0.42, 0.15, 0.13, hx, hy - 0.075, hz);
    K.boxB(toon(0x2a3038), 0.44, 0.02, 0.15, hx, hy - 0.09, hz);
    const lamps = [];
    const lampCols = [0xff3b30, 0xffc531, 0x2ee08a];
    lampCols.forEach((col, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: col, toneMapped: false });
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), mat);
      bulb.rotation.x = Math.PI / 2;
      bulb.position.set(hx - 0.14 + i * 0.14, hy - 0.075, hz + 0.07);
      ctx.scene.add(bulb);
      glassGroupPush(ctx, bulb);
      // 遮阳罩
      K.box(dark, 0.11, 0.012, 0.06, hx - 0.14 + i * 0.14, hy - 0.05, hz + 0.09);
      lamps.push({ mat, i });
    });
    anim.signal = { lamps, phase: 0 };
    // 人行灯（小）
    K.boxB(dark, 0.07, 0.18, 0.07, x, 1.16, z);
    const pedMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false });
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.14), pedMat);
    pm.position.set(x, 1.25, z + 0.042);
    ctx.scene.add(pm);
    glassGroupPush(ctx, pm);
    anim.pedSignal = pedMat;
    pools.push(pool(hx + 0.05, hz + 0.5, 0.72, 0x7fe0b0, 0.07));
  }

  /* ============================== 护栏 ============================== */
  {
    const railMat = toon(C.guardrail);
    const railSeg = (x0, z0, x1, z1, n) => {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
        K.cylB(railMat, 0.017, 0.017, 0.44, 8, px, 0.02, pz);
      }
      rod(K, railMat, x0, 0.44, z0, x1, 0.44, z1, 0.017, 6);
      rod(K, railMat, x0, 0.26, z0, x1, 0.26, z1, 0.012, 6);
    };
    railSeg(-1.05, 1.34, 0.32, 1.34, 4);
    railSeg(1.7, 0.52, 1.7, -0.36, 3);
  }

  /* ============================== 自动贩卖机 ============================== */
  POS.vend.forEach(([x, z], i) => {
    const warm = i === 1;
    const bodyMat = toon(warm ? C.vendingRed : C.vendingBlue);
    const bw = 0.26, bh = 0.78, bd = 0.36;
    K.boxB(bodyMat, bw, bh, bd, x, 0.04, z);
    K.boxB(toon(0xdfe3e9), bw + 0.02, 0.04, bd + 0.02, x, 0.04, z);
    K.boxB(toon(0x232b36), bw + 0.01, 0.07, bd - 0.02, x, 0.04, z);
    // 正面灯箱
    const front = signMat(vendingFront(warm), 1.25);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(bd - 0.06, 0.5), front);
    p.position.set(x + bw / 2 + 0.005, 0.53, z);
    p.rotation.y = Math.PI / 2;
    glassGroupPush(ctx, p);
    // 取物口 + 投币
    K.boxB(toon(0x14181e), 0.03, 0.12, 0.2, x + bw / 2 - 0.005, 0.09, z);
    K.boxB(toon(0x9aa3ad), 0.02, 0.05, 0.06, x + bw / 2 + 0.005, 0.42, z + 0.16);
    // 顶部小灯
    K.box(glowMat(warm ? 0xffd0a0 : 0xcfe4ff), 0.16, 0.012, 0.28, x, bh + 0.05, z);
    pools.push(pool(x + 0.34, z, 0.9, warm ? 0xffbe86 : 0xbcd8ff, 0.24));
    if (warm) anim.flicker.push({ mat: front, base: 1.25, amount: 0.05, seed: 9.7 });
  });

  /* ============================== 自行车 ============================== */
  buildBicycle(batch, -2.10, 0.10, Math.PI / 2 + 0.12, 0x9b5364);
  buildBicycle(batch, 1.06, -2.06, Math.PI / 2 + 0.03, 0x428d89);
  buildBicycle(batch, 1.45, -2.06, Math.PI / 2 - 0.12, 0x667fb0);

  /* ============================== 垃圾桶 ============================== */
  {
    const [x, z] = POS.bins;
    const cols = [C.binCan, C.binBottle, C.binGlass];
    const names = ['かん', 'ペット', 'びん'];
    for (let i = 0; i < 3; i++) {
      const bz = z + (i - 1) * 0.2;
      K.boxB(toon(C.binBody), 0.22, 0.42, 0.18, x, 0.04, bz);
      K.boxB(toon(cols[i]), 0.23, 0.06, 0.19, x, 0.46, bz);
      K.boxB(toon(0x2a2f36), 0.16, 0.05, 0.02, x, 0.4, bz + 0.09);
      K.plane(decalMat(trashLabel(names[i], '#ffffff')), 0.16, 0.08, x + 0.116, 0.28, bz, { ry: Math.PI / 2 });
    }
    K.boxB(toon(0x3a4048), 0.26, 0.02, 0.62, x, 0.04, z);
  }

  /* ============================== 雨伞架 ============================== */
  {
    const [x, z] = POS.umbrella;
    K.boxB(toon(0x5a6068), 0.16, 0.26, 0.24, x, 0.02, z);
    K.boxB(toon(0x8d949e), 0.18, 0.02, 0.26, x, 0.28, z);
    // 湿伞
    const umbCols = [0x3a4f72, 0x6d4450, 0x2f5a48, 0x8a7a3f];
    for (let i = 0; i < 4; i++) {
      K.cylB(toon(umbCols[i]), 0.012, 0.02, 0.3, 8, x - 0.04 + (i % 2) * 0.08, 0.06, z - 0.06 + Math.floor(i / 2) * 0.11);
      K.cylB(toon(0x22262c), 0.008, 0.008, 0.1, 6, x - 0.04 + (i % 2) * 0.08, 0.36, z - 0.06 + Math.floor(i / 2) * 0.11);
    }
    K.box(toon(0x1a1f27), 0.2, 0.01, 0.3, x, 0.012, z);
  }

  /* ============================== A 字招牌 ============================== */
  {
    const x = -0.8, z = -0.12;
    const t = aFrame();
    const m = toon(0xffffff, { map: t });
    const back = toon(0xcfd4da);
    [-1, 1].forEach((s) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.34), m);
      p.position.set(x + s * 0.035, 0.24, z + s * 0.02);
      p.rotation.set(0, s > 0 ? 0 : Math.PI, s * 0.12);
      glassGroupPush(ctx, p);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.34), back);
      b.position.set(x + s * 0.035, 0.24, z + s * 0.02 - s * 0.005);
      b.rotation.copy(p.rotation);
      b.rotation.y += Math.PI;
      K.group.add(b);
    });
    // 边框
    K.box(toon(0x8d949e), 0.26, 0.35, 0.01, x, 0.25, z, { rx: 0.1 });
  }

  /* ============================== 公告栏 ============================== */
  {
    const x = 0.665, z = -2.02, ry = Math.PI / 2;
    const g = new Kit();
    g.box(toon(0x8a7a63), 0.42, 0.32, 0.02, 0, 0.62, 0, { ry: 0 });
    // 支柱
    g.box(toon(0x5a6068), 0.03, 0.6, 0.03, 0, 0.3, -0.14);
    g.box(toon(0x5a6068), 0.03, 0.6, 0.03, 0, 0.3, 0.14);
    g.bake(batch, x, 0.03, z, ry);
    const nb = noticeBoard();
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.28), decalMat(nb));
    p.position.set(x + 0.012, 0.65, z);
    p.rotation.y = Math.PI / 2;
    glassGroupPush(ctx, p);
  }

  /* ============================== 路牌 ============================== */
  {
    const x = 1.22, z = 1.16;
    K.cylB(steel, 0.022, 0.026, 1.24, 8, x, 0.04, z);
    const ss = streetSign();
    const m = signMat(ss, 1.1);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.13), m);
    p.position.set(x, 1.14, z + 0.03);
    p.rotation.y = 0.25;
    glassGroupPush(ctx, p);
    const p2 = p.clone();
    p2.rotation.y = 0.25 + Math.PI;
    p2.position.z = z - 0.03;
    glassGroupPush(ctx, p2);
    // 止まれ 圆牌
    const stop = signMat(stopSign(), 1.0);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), stop);
    sp.position.set(x, 0.86, z + 0.03);
    sp.rotation.y = 0.25;
    glassGroupPush(ctx, sp);
    const sp2 = sp.clone();
    sp2.rotation.y = 0.25 + Math.PI;
    sp2.position.z = z - 0.03;
    glassGroupPush(ctx, sp2);
    K.cylB(toon(0x9aa3ad), 0.006, 0.006, 0.1, 6, x, 1.18, z);
  }
  // 停车位指示牌
  {
    const x = -2.3, z = 0.92;
    K.cylB(steel, 0.018, 0.022, 0.86, 8, x, 0.05, z);
    const m = signMat(parkingSign(), 1.0);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), m);
    p.position.set(x, 0.78, z + 0.025);
    glassGroupPush(ctx, p);
  }

  /* ============================== 小巷杂物 ============================== */
  // 啤酒箱堆
  const crateMat = toon(C.crate);
  for (let i = 0; i < 3; i++) {
    K.boxB(crateMat, 0.2, 0.12, 0.28, 0.83, 0.04 + i * 0.125, -2.42, { ry: 0.08 * i });
  }
  K.boxB(toon(0x7a5a3e), 0.2, 0.12, 0.28, 0.83, 0.04, -2.2, { ry: 0.02 });
  // 拖把桶
  K.cylB(toon(0x5a7a68), 0.05, 0.045, 0.16, 8, 0.9, 0.04, 0.05);
  rod(K, toon(0x7a6a4a), 0.9, 0.2, 0.05, 0.94, 0.6, 0.02, 0.008);
  // 雪糕筒
  K.cylB(toon(C.cone), 0.01, 0.07, 0.26, 7, 1.06, 0.04, 0.12);
  K.cylB(toon(C.coneWhite), 0.024, 0.03, 0.05, 7, 1.06, 0.16, 0.12);
  K.boxB(toon(0x33383f), 0.2, 0.03, 0.2, 1.06, 0.04, 0.12);
  // 门口小物：报纸箱
  K.boxB(toon(0xc8463c), 0.16, 0.3, 0.12, 0.56, 0.02, -0.16);
  K.box(toon(0x24282e), 0.13, 0.14, 0.005, 0.56, 0.2, -0.098);

  /* ============================== 下水口盖 ============================== */
  // 小巷里的排水篦
  K.floorPlane(toon(0x2a2f38), 0.3, 0.16, 0.94, 0.014, 0.28);

  /* ============================== 光晕 ============================== */
  // 便利店门前暖光
  pools.push(pool(-0.35, 0.12, 2.4, 0xffc98a, 0.3));
  pools.push(pool(-0.5, -0.34, 1.5, 0xffd6a2, 0.34));
  // 小巷
  pools.push(pool(0.9, -1.1, 1.1, 0xbfd8ff, 0.16));
  // 广场
  pools.push(pool(-1.6, 0.4, 1.8, 0x9fc3ff, 0.07));

  K.bake(batch);
  pools.forEach((p) => { p.matrixAutoUpdate = false; p.updateMatrix(); ctx.scene.add(p); });
}

function glassGroupPush(ctx, mesh) {
  ctx.hidden.push(mesh);
  ctx.scene.add(mesh);
}
