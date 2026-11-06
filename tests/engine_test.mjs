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
const first=mod.generateTree({seed:241106,height:6.10,trunks:3,quality:'presentation'});
const s1=assertTree(first,{height:6.10});
const again=mod.generateTree({seed:241106,height:6.10,trunks:3,quality:'presentation'});
assert.deepEqual(again.stats,first.stats,'same seed should have identical stats');
assert.equal(first.group.children[0].geometry.attributes.position.array[42],again.group.children[0].geometry.attributes.position.array[42]);
const dry=mod.generateTree({seed:241106,height:6.10,trunks:3,quality:'draft',season:'dry'});
const sDry=assertTree(dry,{height:6.10});
assert(sDry.leaflets<s1.leaflets,'dry season should lose leaves');
const noLeaf=mod.generateTree({seed:42,height:8.1,trunks:1,quality:'draft',foliage:0,bloom:0});
assert(noLeaf.stats.leaflets===0,'zero foliage should mean zero leaves');
assert(Math.abs(noLeaf.stats.height-8.1)<.005);
const high=mod.generateTree({seed:8,height:6.1,trunks:4,quality:'high',bloom:0.5});
const sHigh=assertTree(high,{height:6.1});
assert(sHigh.flowerPetals>0,'flowers should be generated with bloom enabled');
for(const tree of [first,again,dry,noLeaf,high])tree.dispose();
console.log('PASS parametric geometry, seeds, height, dry state, flowers, attributes and finiteness');
console.log(JSON.stringify({presentation:s1,dry:sDry,high:sHigh},null,2));
