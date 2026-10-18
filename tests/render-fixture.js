import * as THREE from 'three';
import { createPost } from '../src/post/composer.js';
import { Batcher, Kit } from '../src/core/kit.js';

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(320, 320);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = 0;
document.body.append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
camera.position.set(0, 0, 5);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x777777);
const material = new THREE.MeshBasicMaterial({ color: 0xdddddd });
const front = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), material);
front.position.z = 0.5;
scene.add(front);
const behind = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.4), material);
behind.rotation.z = 0.2;
scene.add(behind);
const hidden = [front];
const post = createPost(renderer, scene, camera, hidden);
post.bloom.enabled = false;
window.fixture = {
  render(withBehind) {
    behind.visible = withBehind;
    post.render(1/60);
  },
};
window.fixture.render(true);
// Same batching path as the wet ground: base tint and raised painted markings.
const groundScene = new THREE.Scene();
groundScene.background = new THREE.Color(0x000000);
const groundCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
const batch = new Batcher();
const kit = new Kit();
const wet = new THREE.MeshBasicMaterial({ color: 0x204080, transparent: true, opacity: 0.66, depthWrite: false, side: THREE.DoubleSide });
const paint = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94, depthWrite: false, side: THREE.DoubleSide });
kit.floorPlane(wet, 3, 3, 0, 0, 0).renderOrder = 1;
kit.floorPlane(paint, .5, .5, .7, .01, 0).renderOrder = 2;
kit.bake(batch);
batch.flush(groundScene);
window.fixture.ground = (x) => {
  groundCamera.position.set(x, 3, 3);
  groundCamera.lookAt(0, 0, 0);
  renderer.render(groundScene, groundCamera);
  const v = new THREE.Vector3(.7, .01, 0).project(groundCamera);
  return { x: Math.round((v.x+1)*160), y: Math.round((1-v.y)*160) };
};

const c = document.createElement('canvas');
c.width = c.height = 32;
const ctx = c.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(14, 14, 4, 4);
const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
decal.position.z = 0.8;
scene.add(decal);
decal.visible = false;
window.fixture.decal = (visible) => {
  behind.visible = false;
  decal.visible = visible;
  post.render(1/60);
};
window.fixture.stateRestored = () => {
  const target = renderer.getRenderTarget();
  const bg = scene.background;
  const original = renderer.render;
  let caught = false;
  renderer.render = () => { throw new Error('test render failure'); };
  try { post.normalPass.render(renderer); } catch { caught = true; }
  renderer.render = original;
  return caught && front.material === material && front.visible
    && scene.background === bg && renderer.getRenderTarget() === target
    && renderer.shadowMap.autoUpdate;
};
