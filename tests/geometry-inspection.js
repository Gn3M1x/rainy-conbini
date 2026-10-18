// Test-only inspection of the actual meshes captured before static batching.
import * as THREE from 'three';

export function inspectGeometry(scene, world, parts) {
  scene.updateMatrixWorld(true);
  const box = (part) => {
    part.geometry.computeBoundingBox();
    return part.geometry.boundingBox.clone().applyMatrix4(part.matrix);
  };
  const boxes = parts.filter((p) => p.geometry.type === 'BoxGeometry' && !p.material.transparent)
    .map((p) => ({ ...p, bounds: box(p) }));
  const structures = boxes.filter(({bounds:b}) => b.max.y-b.min.y>.8 && b.max.z>-.7 && b.min.z<-.4 && (b.max.x-b.min.x<.13 || b.max.z-b.min.z<.13));
  const collisions=[];
  for (const [side,leaf] of [['left',world.anim.door.left],['right',world.anim.door.right]]) {
    leaf.traverse((mesh) => {
      if (!mesh.isMesh || mesh.geometry.type!=='BoxGeometry') return;
      const bounds=new THREE.Box3().setFromObject(mesh);
      for(const p of structures) {
        const overlap = new THREE.Vector3().subVectors(
          bounds.max.clone().min(p.bounds.max), bounds.min.clone().max(p.bounds.min));
        if (Math.min(overlap.x,overlap.y,overlap.z)>.002) collisions.push({side,overlap:overlap.toArray(),part:p.name||p.material.color.getHexString()});
      }
    });
  }
  // Front-left exterior: positive-area, same-facing coplanar box faces cause Z-fighting.
  const corner=boxes.filter(({bounds:b}) => Math.abs(b.min.x+2.56)<.00001 && b.max.z>-.65 && b.min.z<-.40 && b.max.y>.01 && b.min.y<.30);
  const coplanar=[];
  for(let i=0;i<corner.length;i++) for(let j=i+1;j<corner.length;j++) {
    const a=corner[i].bounds,b=corner[j].bounds;
    const dy=Math.min(a.max.y,b.max.y,.30)-Math.max(a.min.y,b.min.y,0);
    const dz=Math.min(a.max.z,b.max.z,-.40)-Math.max(a.min.z,b.min.z,-.65);
    if(dy>.001 && dz>.001) coplanar.push({a:corner[i].name||corner[i].material.color.getHexString(),b:corner[j].name||corner[j].material.color.getHexString(),area:dy*dz});
  }
  const wheelGroups=new Map();
  for(const p of parts.filter(p=>p.geometry.type==='TorusGeometry' && p.geometry.parameters.tube>.01)) {
    const list=wheelGroups.get(p.parent)||[];
    list.push({center:new THREE.Vector3().setFromMatrixPosition(p.matrix),axis:new THREE.Vector3(0,0,1).transformDirection(p.matrix),radius:p.geometry.parameters.radius});
    wheelGroups.set(p.parent,list);
  }
  const wheels=[...wheelGroups.values()].map(([a,b])=>{
    if(!b)return {valid:false};
    const direction=b.center.clone().sub(a.center),length=direction.length();
    return {valid:true,axisAlignment:Math.abs(a.axis.dot(direction.normalize())),diameterToWheelbase:2*a.radius/length};
  });
  const bikeParents=new Set(wheelGroups.keys());
  const obstacles=boxes.filter(p=>!bikeParents.has(p.parent) && p.bounds.max.y>.035);
  const bikeCollisions=[];
  const outsideBase=[];
  for(const p of parts.filter(p=>bikeParents.has(p.parent))) {
    const bounds=box(p);
    if(bounds.min.x< -2.6 || bounds.max.x>2.6 || bounds.min.z< -2.6 || bounds.max.z>2.6) outsideBase.push(p.name);
    for(const obstacle of obstacles) {
      const overlap=new THREE.Vector3().subVectors(
        bounds.max.clone().min(obstacle.bounds.max), bounds.min.clone().max(obstacle.bounds.min));
      if(Math.min(overlap.x,overlap.y,overlap.z)>.003) bikeCollisions.push({bikePart:p.name||p.geometry.type,obstacle:obstacle.material.color.getHexString(),overlap:overlap.toArray()});
    }
  }
  return {doorCollisions:collisions,cornerCoplanar:coplanar,wheels,bikeCollisions,outsideBase};
}
