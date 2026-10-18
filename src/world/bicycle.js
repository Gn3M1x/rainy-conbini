// Procedural city bicycle. Frame and wheels share the XY plane; axles point Z.
import * as THREE from 'three';
import { toon } from '../core/materials.js';
import { Kit } from '../core/kit.js';

export function buildBicycle(batch, x, z, rotation, color) {
  const kit = new Kit();
  const frame = toon(color);
  const tire = toon(0x202735);
  const metal = toon(0xb8c4ce);
  const dark = toon(0x36414e);
  const mudguard = toon(0x9caeb9);
  const tube = (mat, a, b, radius = .008, segments = 8) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), mat);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), direction.normalize());
    kit.group.add(mesh);
    return mesh;
  };
  const rear = [-.25,.15,0], front = [.25,.15,0];
  const crank = [-.04,.17,0], seat = [-.10,.36,0];
  const headTop = [.16,.40,0], headBottom = [.18,.34,0];

  for (const [index,center] of [rear,front].entries()) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.125,.014,8,32),tire);
    wheel.name = `bicycle.wheel.${index}.tire`;
    wheel.position.set(...center);
    kit.group.add(wheel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.115,.004,6,32),metal);
    rim.position.copy(wheel.position);
    kit.group.add(rim);
    tube(metal,[center[0],center[1],-.025],[center[0],center[1],.025],.012);
    for (let i=0;i<10;i++) {
      const angle=i*Math.PI/5, spokeZ=i%2 ? .007 : -.007;
      tube(metal,[center[0],center[1],spokeZ],
        [center[0]+Math.cos(angle)*.113,center[1]+Math.sin(angle)*.113,0],.0018,5);
    }
    const points=[];
    for(let i=0;i<=20;i++) {
      const angle=.10*Math.PI+i/20*.80*Math.PI;
      points.push(new THREE.Vector3(center[0]+Math.cos(angle)*.148,center[1]+Math.sin(angle)*.148,0));
    }
    kit.tube(mudguard,points,.006,24,6);
  }

  // Full diamond frame, paired rear stays and a fork that straddles the axle.
  for(const [a,b] of [[crank,seat],[seat,headTop],[headTop,headBottom],[headBottom,crank]]) tube(frame,a,b,.010);
  for(const side of [-1,1]) {
    tube(frame,[rear[0],rear[1],side*.023],[crank[0],crank[1],side*.018],.007);
    tube(frame,[rear[0],rear[1],side*.023],[seat[0],seat[1],side*.013],.007);
    tube(frame,[headBottom[0],headBottom[1],side*.025],[front[0],front[1],side*.025],.008);
  }
  tube(metal,seat,[-.115,.416,0],.007);
  kit.box(toon(0x242d39),.12,.023,.066,-.12,.427,0);
  tube(metal,headTop,[.145,.457,0],.007);
  tube(metal,[.145,.457,-.095],[.145,.457,.095],.006);
  for(const side of [-1,1]) {
    tube(metal,[.145,.457,side*.095],[.115,.464,side*.108],.006);
    tube(dark,[.115,.464,side*.086],[.115,.464,side*.13],.009);
  }

  // Chainring, chain, cranks and pedals give the center a readable mechanism.
  kit.cyl(metal,.034,.034,.009,16,crank[0],crank[1],.037,{rx:Math.PI/2});
  tube(dark,[-.25,.173,.033],[-.04,.203,.033],.003,5);
  tube(dark,[-.25,.127,.033],[-.04,.137,.033],.003,5);
  for(const side of [-1,1]) {
    const pedalY=crank[1]+side*.048;
    tube(metal,[crank[0],crank[1],side*.045],[crank[0],pedalY,side*.045],.005);
    kit.box(dark,.042,.012,.043,crank[0],pedalY,side*.060);
  }
  tube(dark,crank,[-.085,.012,.105],.005);

  // Rear luggage rack, with visible air between its rails and the wheel.
  for(const side of [-1,1]) {
    tube(metal,[-.34,.332,side*.045],[-.13,.332,side*.045],.004);
    tube(metal,[-.30,.332,side*.045],[-.25,.15,side*.026],.004);
  }
  for(const rackX of [-.34,-.25,-.13]) tube(metal,[rackX,.332,-.045],[rackX,.332,.045],.0035);

  // Open basket: rim and sparse wire grid, rather than a solid cube.
  const basket=toon(0x859baa);
  for(const y of [.37,.415,.46]) {
    for(const side of [-1,1]) tube(basket,[.215,y,side*.083],[.36,y,side*.083],.0035,5);
    for(const basketX of [.215,.36]) tube(basket,[basketX,y,-.083],[basketX,y,.083],.0035,5);
  }
  for(const basketX of [.215,.29,.36]) {
    for(const side of [-1,1]) tube(basket,[basketX,.37,side*.083],[basketX,.46,side*.083],.003,5);
  }
  for(const basketZ of [-.055,0,.055]) {
    tube(basket,[.36,.37,basketZ],[.36,.46,basketZ],.003,5);
    tube(basket,[.215,.37,basketZ],[.36,.37,basketZ],.003,5);
  }
  tube(metal,headTop,[.215,.385,0],.005);
  kit.bake(batch,x,0,z,rotation);
}
