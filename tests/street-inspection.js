import * as THREE from 'three';

export function inspectStreet(scene, parts) {
  scene.updateMatrixWorld(true);
  const bounds=(p)=>{p.geometry.computeBoundingBox();return p.geometry.boundingBox.clone().applyMatrix4(p.matrix)};
  const records=parts.map(p=>({...p,b:bounds(p)}));
  const pixel=(p,x,y)=>p.material.map?.image?.getContext?.('2d').getImageData(x,y,1,1).data;
  const overlap2=(a,b)=>Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x)>.001 && Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)>.001;
  const planes=records.filter(p=>p.geometry.type==='PlaneGeometry' && p.b.min.y>.01 && p.b.max.y<.025);
  const tactile=planes.filter(p=>{const c=pixel(p,0,0);return c && c[0]===201 && c[1]===168 && c[2]===56});
  const poles=records.filter(p=>p.geometry.type==='CylinderGeometry' && p.geometry.parameters.height>.7 && p.b.min.y<.15 && p.b.max.y>.75);
  const blocked=poles.filter(p=>tactile.some(t=>overlap2(p.b.clone().expandByScalar(.015),t.b))).map(p=>p.b.getCenter(new THREE.Vector3()).toArray());
  const crosswalks=planes.filter(p=>p.material.color?.getHex()===0xd6dde8 && (p.b.min.z>1.4 || p.b.min.x>1.65));
  const manholes=planes.filter(p=>{const c=pixel(p,128,28);return p.material.map?.image.width===256 && p.material.map?.image.height===256 && c && c[3]>250 && c[0]<120 && c[2]<140});
  const covers=manholes.filter(p=>crosswalks.some(c=>overlap2(p.b,c.b))).map(p=>p.b.getCenter(new THREE.Vector3()).toArray());
  const wires=records.filter(p=>p.geometry.type==='TubeGeometry' && p.material.color.getHex()===0x14161c);
  const supports=records.filter(p=>p.geometry.type==='CylinderGeometry' && p.material.color.getHex()===0xd8dce2 && p.geometry.parameters.height<.08).map(p=>new THREE.Vector3(0,p.geometry.parameters.height/2,0).applyMatrix4(p.matrix));
  const loose=[];const cableHits=[];
  const solids=records.filter(p=>p.geometry.type==='BoxGeometry' && !p.material.transparent && p.b.max.y>1.5);
  for(const [i,w] of wires.entries()) {
    const points=w.geometry.parameters.path.getPoints(160).map(v=>v.applyMatrix4(w.matrix));
    for(const end of [points[0],points.at(-1)]) if(!supports.some(s=>s.distanceTo(end)<.012))loose.push({wire:i,end:end.toArray()});
    for(const solid of solids) if(points.some(v=>solid.b.clone().expandByScalar(.003).containsPoint(v)))cableHits.push({wire:i,part:solid.name||solid.material.color.getHexString()});
  }
  const roofBoxes=solids.filter(p=>p.b.min.y>=1.60 && p.b.max.x<.8 && p.b.min.x> -2.8 && p.b.max.z<-.4);
  const roofFaces=[];
  for(let i=0;i<roofBoxes.length;i++)for(let j=i+1;j<roofBoxes.length;j++)for(const axis of ['x','y','z'])for(const side of ['min','max']) {
    const a=roofBoxes[i],b=roofBoxes[j];
    if(Math.abs(a.b[side][axis]-b.b[side][axis])>1e-5)continue;
    const other=['x','y','z'].filter(k=>k!==axis);
    if(other.every(k=>Math.min(a.b.max[k],b.b.max[k])-Math.max(a.b.min[k],b.b.min[k])>.001))roofFaces.push({a:a.name||a.material.color.getHexString(),b:b.name||b.material.color.getHexString(),axis,side});
  }
  const fanDiscs=records.filter(p=>p.geometry.type==='CylinderGeometry' && p.geometry.parameters.radiusTop>.07 && p.geometry.parameters.height<.03 && p.b.min.y>1.6 && Math.abs(new THREE.Vector3(0,1,0).transformDirection(p.matrix).z)>.99);
  const fanFaces=[];
  for(const disc of fanDiscs)for(const box of roofBoxes)for(const side of ['min','max'])if(Math.abs(disc.b[side].z-box.b[side].z)<1e-5 && Math.min(disc.b.max.x,box.b.max.x)-Math.max(disc.b.min.x,box.b.min.x)>.001 && Math.min(disc.b.max.y,box.b.max.y)-Math.max(disc.b.min.y,box.b.min.y)>.001)fanFaces.push({z:disc.b[side].z});
  const signIssues=[], signSilhouettes=[];
  scene.traverse(o=>{
    if(!o.isMesh || !o.material.map || o.position.y<.7 || o.position.y>1.0)return;
    const image=o.material.map.image;
    if(image?.width!==256 || image?.height!==256 || !image.getContext)return;
    const c=image.getContext('2d').getImageData(0,0,1,1).data;
    if(c[3]!==0)return;
    const p=o.geometry.attributes.position, index=o.geometry.index;
    let area=0;
    for(let i=0;i<(index?index.count:p.count);i+=3) {
      const vertices=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k));
      area+=vertices[1].sub(vertices[0]).cross(vertices[2].sub(vertices[0])).length()/2;
    }
    o.geometry.computeBoundingBox();
    const size=o.geometry.boundingBox.getSize(new THREE.Vector3());
    signSilhouettes.push(area/(size.x*size.y));
    if(c[3]===0 && !o.material.transparent && o.material.alphaTest===0 && area/(size.x*size.y)>.9)signIssues.push({geometry:o.geometry.type,opaque:true});
  });
  return {wireCount:wires.length,unsupportedEnds:loose,cableHits,blockedPoles:blocked,tactileCount:tactile.length,manholeCount:manholes.length,crosswalkCovers:covers,roofCoplanar:roofFaces,fanCoplanar:fanFaces,signIssues,signSilhouettes};
}
