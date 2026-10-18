import * as esbuild from 'esbuild';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

await mkdir('shots', { recursive: true });
const geometryRef = process.argv[2] === '--geometry-baseline' ? process.argv[3] : null;
const baseline = geometryRef ? null : process.argv[2];
const readSource = (path) => geometryRef
  ? execFileSync('git', ['show', `${geometryRef}:${path.slice(process.cwd().length + 1)}`], {encoding:'utf8'})
  : readFile(path,'utf8');
const plugins = baseline ? [{
  name: 'original-render-path',
  setup(build) {
    build.onLoad({ filter: /src\/(post\/composer|core\/kit)\.js$/ }, ({ path }) => ({
      contents: execFileSync('git', ['show', `${baseline}:${path.slice(process.cwd().length + 1)}`], { encoding: 'utf8' }),
      loader: 'js',
    }));
  },
}] : [];
const result = await esbuild.build({ entryPoints: ['tests/render-fixture.js'], bundle: true, format: 'iife', write: false, plugins });
const fixtureName = baseline ? 'render-fixture-before' : 'render-fixture';
await writeFile(`shots/${fixtureName}.html`, `<html><body><script>${result.outputFiles[0].text}</script></body></html>`);
if (!baseline) {
  const diagnostics = `
window.worldTest = {
  ceilingGap: () => {
    scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(-2,.9,-.95),new THREE.Vector3(0,1,0));
    const seen = new Set();
    const hits = ray.intersectObjects(world.statics).filter(({object}) => {
      if(seen.has(object.material)) return false;
      seen.add(object.material); return true;
    });
    return hits.slice(0,2).map(({distance,object}) => ({distance,color:object.material.color.getHexString()}));
  },
  snapshot: () => ({
    time: t,
    camera: camera.position.toArray(),
    target: controls.target.toArray(),
    door: world.anim.door.left.position.x,
    signal: world.anim.signal.lamps.map(({mat})=>mat.color.toArray()),
    rain: Array.from(world.fxGroup.children[0].instanceMatrix.array.slice(0,16)),
    normalSize: [post.normalPass.rt.width, post.normalPass.rt.height],
    resolution: post.composite.uniforms.uResolution.value.toArray(),
    drawingSize: renderer.getDrawingBufferSize(new THREE.Vector2()).toArray(),
  }),
  advance: (seconds) => {
    for (let elapsed=0; elapsed<seconds;) {
      const dt=Math.min(1/60,seconds-elapsed); elapsed+=dt; t+=dt;
      world.update(t,dt,camera);
    }
    post.render(1/60);
  },
};`;
  const world = await esbuild.build({
    entryPoints: ['src/main.js'], bundle: true, format: 'iife', write: false,
    plugins: [{ name: 'test-only-inspection', setup(build) {
      build.onLoad({filter:/src\/main\.js$/}, async ({path}) => ({contents: await readSource(path) + diagnostics + `\nimport { inspectGeometry } from '../tests/geometry-inspection.js';\nworldTest.geometry=()=>inspectGeometry(scene,world,globalThis.testParts);\nimport { inspectStreet } from '../tests/street-inspection.js';\nworldTest.street=()=>inspectStreet(scene,globalThis.testParts);`, loader:'js'}));
      build.onLoad({filter:/src\/core\/kit\.js$/}, async ({path}) => ({contents: await readSource(path) + `
const capturePush = Batcher.prototype.push;
Batcher.prototype.push = function(mesh) {
  (globalThis.testParts ||= []).push({geometry:mesh.geometry,matrix:mesh.matrixWorld.clone(),material:mesh.material,parent:mesh.parent.uuid,name:mesh.name});
  return capturePush.call(this,mesh);
};`, loader:'js'}));
      if(geometryRef) build.onLoad({filter:/src\/.*\.js$/}, async ({path}) => ({contents:await readSource(path),loader:'js'}));
    }}],
  });
  const template = await readFile('src/index.html','utf8');
  await writeFile(geometryRef ? 'shots/world-fixture-v2.html' : 'shots/world-fixture.html', template.replace('/*__BUNDLE__*/', () => world.outputFiles[0].text));
}
