/* Runs the geometry algorithm without requiring a GPU or network access. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
class Vector3 {
  constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
  set(x,y,z){Object.assign(this,{x,y,z});return this;}
  clone(){return new Vector3(this.x,this.y,this.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z;}
  length(){return Math.sqrt(this.lengthSq());}
  normalize(){let n=this.length()||1;return this.multiplyScalar(1/n);}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
  lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this;}
  crossVectors(a,b){this.set(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);return this;}
}
class BufferGeometry {constructor(){this.attributes={};this.index=[];}setAttribute(k,v){this.attributes[k]=v;}setIndex(v){this.index=v;}computeBoundingSphere(){}dispose(){}}
class Float32BufferAttribute{constructor(values,size){this.array=new Float32Array(values);this.itemSize=size;}}
class CanvasTexture {constructor(canvas){this.image=canvas;}dispose(){}}
class MeshStandardMaterial {constructor(options){Object.assign(this,options);}dispose(){}}
class Mesh{constructor(geometry,material){Object.assign(this,{geometry,material,isMesh:true});}}
class Group{constructor(){this.children=[];this.position={y:0};this.scale={x:1,y:1,z:1,setScalar(s){this.x=this.y=this.z=s}};}add(item){this.children.push(item);}traverse(cb){for(const child of this.children)cb(child);}}
class Box3{constructor(){this.min=new Vector3(Infinity,Infinity,Infinity);this.max=new Vector3(-Infinity,-Infinity,-Infinity);}setFromObject(group){for(const mesh of group.children){const points=mesh.geometry.attributes.position?.array||[];for(let i=0;i<points.length;i+=3){const p=[points[i]*group.scale.x,points[i+1]*group.scale.y+group.position.y,points[i+2]*group.scale.z];for(let d=0;d<3;d++){const k=['x','y','z'][d];this.min[k]=Math.min(this.min[k],p[d]);this.max[k]=Math.max(this.max[k],p[d]);}}}return this;}}
const THREE={Vector3,BufferGeometry,Float32BufferAttribute,CanvasTexture,MeshStandardMaterial,Mesh,Group,Box3,Vector2:class{constructor(x,y){this.x=x;this.y=y;}},RepeatWrapping:1,SRGBColorSpace:1,NoColorSpace:0,DoubleSide:2};
globalThis.THREEMOCK=THREE;
let canvasCount=0;
globalThis.document={createElement(type){assert.equal(type,'canvas');const canvas={width:0,height:0, getContext(){return{createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData() {}}},toDataURL(){return `data:image/png;base64,TEST${canvasCount++}`}};return canvas;}};
const source=fs.readFileSync(new URL('../src/tree.js',import.meta.url),'utf8').replace("import * as THREE from 'three';",'const THREE = globalThis.THREEMOCK;');
const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function assertTree(tree,cfg){
  const s=tree.stats;
  assert(Math.abs(s.height-(cfg.height||6.10))<=0.006,`Expected height ${cfg.height||6.10}, received ${s.height}`);
  assert(s.branches>50&&s.terminalTwigs>10);
  assert(s.triangles>2500&&s.vertices>3500,`Geometry too sparse: ${s.triangles} triangles / ${s.vertices} verts`);
  assert(s.width>2&&s.depth>2);
  assert.equal(tree.group.children.length,s.flowerPetals>0?3:2);
  for(const mesh of tree.group.children){
    assert(mesh.geometry.index.length%3===0);
    const g=mesh.geometry.attributes;
    assert.equal(g.position.array.length,g.normal.array.length);
    assert.equal(g.position.array.length,g.color.array.length);
    assert.equal(g.position.array.length/3,g.uv.array.length/2);
    for(const v of g.position.array)assert(Number.isFinite(v),'non-finite vertex coordinate');
  }
  return s;
}

function outwardRatio(g){
  const p=g.attributes.position.array,n=g.attributes.normal.array,ix=g.index;
  let positive=0,negative=0;
  for(let i=0;i<ix.length;i+=3){
    const a=ix[i]*3,b=ix[i+1]*3,c=ix[i+2]*3;
    const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2];
    const vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
    const dot=(uy*vz-uz*vy)*(n[a]+n[b]+n[c])+
              (uz*vx-ux*vz)*(n[a+1]+n[b+1]+n[c+1])+
              (ux*vy-uy*vx)*(n[a+2]+n[b+2]+n[c+2]);
    if(dot>1e-12)positive++;else if(dot< -1e-12)negative++;
  }
  return positive/(positive+negative);
}
const scenarios=[
  {name:'T2 standard',opts:{seed:241106,trunks:3,quality:'presentation',foliage:.58}},
  {name:'T2 bare',opts:{seed:241106,trunks:3,quality:'presentation',foliage:0}},
  {name:'T2 lush',opts:{seed:241106,trunks:3,quality:'presentation',foliage:1}},
  {name:'T2 flowering',opts:{seed:241106,trunks:3,quality:'presentation',foliage:.58,bloom:1}},
  {name:'T2 dry',opts:{seed:241106,trunks:3,quality:'presentation',foliage:.58,season:'dry'}},
  {name:'Single trunk',opts:{seed:1045,trunks:1,height:5.25,foliage:.56}},
  {name:'High detail',opts:{seed:9921,trunks:4,height:7.5,quality:'high',foliage:.75,bloom:.25}},
  {name:'Draft',opts:{seed:87002,trunks:2,height:4.30,quality:'draft',foliage:.4}},
  {name:'Max stress',opts:{seed:66513,trunks:5,height:9,quality:'high',branchDensity:1.55,complexity:1.5,foliage:1,bloom:1}}
];
const rows=[];
for(const test of scenarios){
  const tree=mod.generateTree(test.opts);
  assert(Math.abs(tree.stats.height-(test.opts.height||6.10))<.006,'height: '+test.name);
  assert(tree.stats.branches>50,'branches: '+test.name);
  assert(tree.stats.width>1.5 && tree.stats.depth>1.5,'bounding box: '+test.name);
  assert(outwardRatio(tree.group.children[0].geometry)>.995,'inward tube faces: '+test.name);
  // SketchUp importer compatibility: foliage has opaque shaped geometry,
  // not rectangular alpha-cutout cards.
  const foliage=tree.group.children.find(x=>x.name==='Compound_Leaflets');
  if(tree.stats.leaflets>0){
    assert(foliage, 'missing shaped foliage mesh');
    assert.equal(foliage.geometry.attributes.position.array.length/3,tree.stats.leaflets*5,'leaf silhouette vertex count');
    assert.equal(foliage.geometry.index.length/3,tree.stats.leaflets*4,'leaf silhouette triangle count');
    assert.equal(foliage.material.transparent,false,'foliage should be opaque');
    assert.equal(foliage.material.alphaTest,0,'foliage should not rely on alpha cutouts');
  }
  for(const mesh of tree.group.children){
    const g=mesh.geometry,pos=g.attributes.position.array;
    assert(g.index.length%3===0 && g.index.every(i=>i>=0&&i<pos.length/3),'bad mesh indexing: '+test.name);
    assert(Array.from(pos).every(Number.isFinite),'nonfinite vertices: '+test.name);
  }
  rows.push({name:test.name,stats:{...tree.stats}});
  console.log(test.name+'  branches='+tree.stats.branches+' leaflets='+tree.stats.leaflets+' triangles='+tree.stats.triangles);
  tree.dispose();
}
for(const i of [1,2,3,4]){
  assert.equal(rows[0].stats.branches,rows[i].stats.branches,'foliage/bloom changed skeleton');
  assert.equal(rows[0].stats.terminalTwigs,rows[i].stats.terminalTwigs,'foliage/bloom changed twig structure');
  assert.equal(rows[0].stats.thorns,rows[i].stats.thorns,'foliage/bloom changed thorns');
}
assert.equal(rows[1].stats.leaflets,0);
assert(rows[2].stats.leaflets>rows[0].stats.leaflets);
assert(rows[4].stats.leaflets<rows[0].stats.leaflets);
assert(rows[3].stats.flowerPetals>0);
assert(rows[8].stats.triangles<300000,'extreme settings too heavy');
assert(rows[8].stats.densityBudget<1,'adaptive density cap missing');
console.log('PASS nine T2 procedural QA variants');
