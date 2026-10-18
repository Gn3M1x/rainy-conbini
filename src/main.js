// 雨夜のコンビニ — 微縮街角模型
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld } from './world/index.js';
import { createPost } from './post/composer.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : d);
const vec = (k, d) => {
  if (!q.has(k)) return d;
  const a = q.get(k).split(',').map(Number);
  return a.length === 3 && a.every((n) => Number.isFinite(n)) ? a : d;
};

const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a12);
scene.fog = new THREE.FogExp2(0x080c16, 0.028);

const camera = new THREE.PerspectiveCamera(31, window.innerWidth / window.innerHeight, 0.1, 70);
camera.position.set(...vec('cam', [6.55, 5.95, 6.55]));

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...vec('tgt', [0.02, 0.48, 0.02]));
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.rotateSpeed = 0.85;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.7;
controls.minDistance = 3.0;
controls.maxDistance = 17;
controls.minPolarAngle = 0.18;
controls.maxPolarAngle = 1.46;
controls.autoRotate = q.get('rot') !== '0' && !q.has('cam');
controls.autoRotateSpeed = 0.32;
controls.update();

const world = buildWorld(renderer, scene);
if (q.get('shadow') === '0') {
  renderer.shadowMap.enabled = false;
  scene.traverse((o) => { if (o.isLight) o.castShadow = false; });
}
// 诊断：把场景信息写进 DOM
if (q.get('diag')) {
  const lines = [];
  scene.traverse((o) => {
    if (o.isLight) lines.push(`LIGHT ${o.type} pos=${o.position.toArray().map((v)=>v.toFixed(2)).join(',')} i=${o.intensity} d=${o.distance ?? '-'}`);
  });
  scene.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh) {
      const m = o.material;
      const bb = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
      const sz = bb ? bb.getSize(new THREE.Vector3()) : null;
      if (sz && sz.length() > 2.5) {
        lines.push(`MESH ${m.type} col=${m.color ? m.color.getHexString() : '-'} side=${m.side} size=${sz.toArray().map((v)=>v.toFixed(2)).join(',')} c=${bb.getCenter(new THREE.Vector3()).toArray().map((v)=>v.toFixed(2)).join(',')}`);
      }
    }
  });
  const pre = document.createElement('pre');
  pre.id = 'diag';
  pre.textContent = lines.join('\n');
  document.body.appendChild(pre);
}

// 诊断：隐藏所有加色混合网格（光池/雨痕等）
if (q.get('pools') === '0') {
  scene.traverse((o) => {
    if (o.isMesh && o.material && o.material.blending === THREE.AdditiveBlending) o.visible = false;
  });
}
if (q.get('pmag')) {
  scene.traverse((o) => { if (o.isPointLight) { o.color.setHex(0xff00ff); o.intensity = 4; o.distance = 6; } });
}
if (q.get('pts') === '0') {
  scene.traverse((o) => { if (o.isPointLight) o.intensity = 0; });
}

// 诊断：只留某类灯光
const lo = q.get('lights');
if (lo) {
  scene.traverse((o) => {
    if (o.isPointLight && lo !== 'point') o.intensity = 0;
    if (o.isDirectionalLight && lo !== 'dir') o.intensity = 0;
    if (o.isHemisphereLight && lo !== 'hemi') o.intensity = 0;
  });
}

// 诊断：扁平/法线覆盖渲染
const flat = q.get('flat');
if (flat) {
  world.hidden.forEach((o) => { if (o) o.visible = false; });
  scene.overrideMaterial = flat === 'normal'
    ? new THREE.MeshNormalMaterial()
    : new THREE.MeshBasicMaterial({ color: 0x99a0ae });
}

const post = createPost(renderer, scene, camera, world.hidden);
const usePost = q.get('post') !== '0';
if (q.get('bloom') === '0') post.bloom.enabled = false;

/* ------------------------------ 交互后暂停自转 ------------------------------ */
let idle = 0;
const wake = () => { idle = 0; controls.autoRotate = false; };
renderer.domElement.addEventListener('pointerdown', wake);
renderer.domElement.addEventListener('wheel', wake, { passive: true });
renderer.domElement.addEventListener('touchstart', wake, { passive: true });

/* --------------------------------- 主循环 --------------------------------- */
const clock = new THREE.Clock();
const fixedT = q.has('t');
let t = fixedT ? num('t', 0) : 0;
let first = true;

function frame() {
  const dt = fixedT ? 1 / 60 : Math.min(0.05, clock.getDelta());
  if (!fixedT) t += dt;

  world.update(t, dt, camera);

  idle += dt;
  if (!controls.autoRotate && idle > 5.5) controls.autoRotate = q.get('rot') !== '0';
  controls.update();

  if (usePost) post.render(dt); else renderer.render(scene, camera);

  if (first) {
    first = false;
    const veil = document.getElementById('veil');
    if (veil) veil.classList.add('gone');
  }
  requestAnimationFrame(frame);
}

/* ---------------------------------- resize ---------------------------------- */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  post.composer.setSize(w, h);
  post.setSize(w, h);
}
window.addEventListener('resize', onResize);

requestAnimationFrame(frame);
