// 动效：降雨 / 地面涟漪 / 屋檐滴水 / 玻璃水痕 / 灯箱闪烁 / 自动门 / 信号灯
import * as THREE from 'three';

const STORE = { x0: -2.62, x1: 0.7, z0: -2.68, z1: -0.4 };

function streakTex() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 64;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 16, 64);
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(190,220,255,0)');
  g.addColorStop(0.25, 'rgba(205,230,255,.85)');
  g.addColorStop(0.7, 'rgba(225,240,255,.55)');
  g.addColorStop(1, 'rgba(190,220,255,0)');
  x.fillStyle = g;
  x.fillRect(5.5, 0, 5, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ringTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(200,230,255,.9)';
  x.lineWidth = 5;
  x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = 'rgba(220,240,255,.35)';
  x.lineWidth = 9;
  x.beginPath(); x.arc(64, 64, 46, 0, Math.PI * 2); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const SIGCOL = [new THREE.Color(0xff3b30), new THREE.Color(0xffc531), new THREE.Color(0x2ee08a)];

export function buildFx(ctx) {
  const { scene, anim } = ctx;
  const group = new THREE.Group();
  scene.add(group);
  const hiddenPush = (m) => { ctx.hidden.push(m); return m; };

  /* ------------------------------- 降雨 ------------------------------- */
  const N = 620;
  const rainGeo = new THREE.PlaneGeometry(0.008, 0.22);
  const rainMat = new THREE.MeshBasicMaterial({
    map: streakTex(), transparent: true, opacity: 0.62, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const rain = new THREE.InstancedMesh(rainGeo, rainMat, N);
  rain.frustumCulled = false;
  const drops = [];
  for (let i = 0; i < N; i++) {
    let x, z, guard = 0;
    do {
      x = rnd(-2.58, 2.58); z = rnd(-2.58, 2.58); guard++;
    } while (guard < 24 && x > STORE.x0 && x < STORE.x1 && z > STORE.z0 && z < STORE.z1);
    drops.push({ x, y: rnd(0, 3.4), z, v: rnd(2.4, 3.6), s: rnd(0.7, 1.5), ph: Math.random() * 6.28 });
  }
  group.add(hiddenPush(rain));

  /* ------------------------------ 地面涟漪 ------------------------------ */
  const RN = 42;
  const ringGeo = new THREE.PlaneGeometry(0.2, 0.2);
  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTex(), transparent: true, depthWrite: false, opacity: 0.55,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, RN);
  rings.frustumCulled = false;
  rings.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(RN * 3), 3);
  const ringData = [];
  for (let i = 0; i < RN; i++) {
    ringData.push({ x: rnd(-2.5, 2.5), z: rnd(-2.5, 2.5), t: Math.random() * 1.2, d: rnd(0.7, 1.3) });
  }
  const ringDummy = new THREE.Object3D();
  ringDummy.rotation.x = -Math.PI / 2;
  group.add(hiddenPush(rings));

  /* ------------------------------ 屋檐滴水 ------------------------------ */
  const dripMat = new THREE.MeshBasicMaterial({ color: 0xdceaff, toneMapped: false, transparent: true, opacity: 0.9 });
  const dripGeo = new THREE.SphereGeometry(0.009, 6, 5);
  const drips = [];
  const dripSrc = [
    [-0.72, 1.03, -0.14], [0.12, 1.03, -0.14], [0.52, 1.03, -0.14],
    [0.66, 0.9, -0.5], [0.66, 0.7, -0.5],
  ];
  dripSrc.forEach(([x, y, z], i) => {
    const m = new THREE.Mesh(dripGeo, dripMat);
    m.position.set(x, y, z);
    group.add(m);
    drips.push({ m, x, y0: y, z, y, t: Math.random() * 2.4, sp: rnd(1.3, 2.0), i });
  });

  /* ------------------------------ 自动门 ------------------------------ */
  const door = anim.door;
  const doorState = { phase: 'closed', t: 0, next: rnd(6, 12) };
  const ease = (v) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);

  /* ------------------------------ 信号灯 ------------------------------ */
  const sig = anim.signal;
  const SIG = { red: 8, green: 6.5, yellow: 1.8 };

  const tmp = new THREE.Object3D();
  const col = new THREE.Color();

  return {
    update(t, dt, camera) {
      /* ---- 雨 ---- */
      const camX = camera.position.x, camZ = camera.position.z;
      for (let i = 0; i < N; i++) {
        const d = drops[i];
        d.y -= d.v * dt;
        d.x += 0.16 * dt;
        if (d.y < -0.02) {
          d.y = rnd(3.0, 3.6);
          d.x = rnd(-2.58, 2.58);
          d.z = rnd(-2.58, 2.58);
        }
        tmp.position.set(d.x, d.y, d.z);
        tmp.rotation.set(0, Math.atan2(camX - d.x, camZ - d.z), -0.16);
        tmp.scale.set(1, d.s * (0.8 + 0.4 * Math.sin(t * 2 + d.ph)), 1);
        tmp.updateMatrix();
        rain.setMatrixAt(i, tmp.matrix);
      }
      rain.instanceMatrix.needsUpdate = true;

      /* ---- 涟漪 ---- */
      for (let i = 0; i < RN; i++) {
        const r = ringData[i];
        r.t += dt;
        if (r.t > r.d) {
          r.t = 0; r.d = rnd(0.7, 1.3);
          let g2 = 0;
          do {
            r.x = rnd(-2.45, 2.45); r.z = rnd(-2.45, 2.45); g2++;
          } while (g2 < 20 && r.x > STORE.x0 && r.x < STORE.x1 && r.z > STORE.z0 && r.z < STORE.z1);
        }
        const k = r.t / r.d;
        const sc = 0.25 + k * 1.15;
        ringDummy.position.set(r.x, 0.021, r.z);
        ringDummy.scale.set(sc, sc, sc);
        ringDummy.updateMatrix();
        rings.setMatrixAt(i, ringDummy.matrix);
        const a = Math.max(0, 1 - k) * 0.9;
        rings.setColorAt(i, col.setRGB(a * 0.75, a * 0.9, a));
      }
      rings.instanceMatrix.needsUpdate = true;
      if (rings.instanceColor) rings.instanceColor.needsUpdate = true;

      /* ---- 滴水 ---- */
      drips.forEach((d) => {
        d.t += dt * d.sp;
        if (d.t > 1) {
          d.t -= 1 + Math.random() * 0.4;
          d.m.visible = false;
          return;
        }
        const k = d.t;
        d.y = d.y0 - k * k * d.y0;
        d.m.visible = d.y > 0.03;
        d.m.position.set(d.x, Math.max(0.02, d.y), d.z);
        d.m.scale.set(1, 1.9, 1);
      });

      /* ---- 玻璃水痕 ---- */
      if (anim.rainTex) {
        anim.rainTex.offset.y = -t * 0.035;
        anim.rainTex.offset.x = Math.sin(t * 0.12) * 0.02;
      }

      /* ---- 灯箱闪烁 ---- */
      anim.flicker.forEach((f) => {
        const s = Math.sin(t * 1.7 + f.seed) * Math.sin(t * 4.3 + f.seed * 2.1) +
          0.3 * Math.sin(t * 19.0 + f.seed * 3.7);
        const dip = s > 0.95 ? -1.0 : 0;
        const v = f.base * (1 + (f.amount || 0.06) * (0.5 * Math.sin(t * 9 + f.seed) + dip));
        f.mat.color.setScalar(Math.max(0.35, v));
      });

      /* ---- 自动门 ---- */
      if (door) {
        doorState.t += dt;
        if (doorState.phase === 'closed') {
          if (doorState.t > doorState.next) { doorState.phase = 'open'; doorState.t = 0; }
        } else if (doorState.phase === 'open') {
          if (doorState.t > 0.95) { doorState.phase = 'hold'; doorState.t = 0; }
        } else if (doorState.phase === 'hold') {
          if (doorState.t > 2.4) { doorState.phase = 'close'; doorState.t = 0; }
        } else if (doorState.phase === 'close') {
          if (doorState.t > 1.25) {
            doorState.phase = 'closed'; doorState.t = 0; doorState.next = rnd(7, 15);
          }
        }
        let o = 0;
        if (doorState.phase === 'open') o = ease(Math.min(1, doorState.t / 0.95));
        else if (doorState.phase === 'hold') o = 1;
        else if (doorState.phase === 'close') o = 1 - ease(Math.min(1, doorState.t / 1.25));
        door.left.position.x = door.baseX.l - 0.3 * o;
        door.right.position.x = door.baseX.r + 0.3 * o;
      }

      /* ---- 信号灯 ---- */
      if (sig) {
        const cycle = SIG.red + SIG.green + SIG.yellow;
        const p = t % cycle;
        let act = 0;
        if (p < SIG.red) act = 0;
        else if (p < SIG.red + SIG.green) act = 2;
        else act = 1;
        sig.lamps.forEach(({ mat, i }) => {
          const on = i === act;
          mat.color.copy(SIGCOL[i]).multiplyScalar(on ? 1 : 0.05);
        });
        if (anim.pedSignal) {
          const walk = act === 2;
          anim.pedSignal.color.setRGB(walk ? 0.18 : 1.0, walk ? 1.0 : 0.16, walk ? 0.55 : 0.14);
        }
      }
    },
  };
}
