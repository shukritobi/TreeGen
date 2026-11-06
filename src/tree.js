/*
 * Littleleaf Palo Verde | Species-specific procedural tree generator
 * Original implementation. Measurements use metres, Y-up. No external textures.
 * Geometry and PBR maps are exportable as glTF/GLB.
 */
import * as THREE from 'three';

export const SPECIES = Object.freeze({
  code: 'T2', name: 'Littleleaf Palo Verde', scientific: 'Parkinsonia microphylla',
  targetHeight: 6.10, source: 'Desert Palisades, Russell Proo planting selection 04 Nov 2026'
});

export const DEFAULTS = Object.freeze({
  seed: 241106, height: 6.10, trunks: 3, spread: 1.0,
  branchDensity: 1, complexity: 1, gnarl: 0.35,
  foliage: 0.58, leafletSize: 1.0, bloom: 0,
  quality: 'presentation', season: 'after-rain'
});

export const QUALITY = {
  draft: { twigFactor: 0.52, leafFactor: 0.48, tubeSides: 5, tubeSections: 5 },
  presentation: { twigFactor: 1.0, leafFactor: 1.0, tubeSides: 7, tubeSections: 7 },
  high: { twigFactor: 1.2, leafFactor: 1.42, tubeSides: 9, tubeSections: 10 }
};

function mulberry32(seed) {
  let s = (Number(seed) || 1) >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rand(rng, a, b) { return a + rng() * (b - a); }
function randomDirection(rng, rise = 0.2) {
  const a = rng() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a), rise, Math.sin(a)).normalize();
}
function hash(i, j, seed) {
  let h = Math.imul((i | 0) ^ (seed | 0), 374761393) + Math.imul(j | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const smooth = t => t * t * (3 - 2 * t);
function periodicNoise(x, y, nx, ny, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = smooth(x - x0), fy = smooth(y - y0);
  const m = (v,n) => (v % n + n) % n;
  const v00 = hash(m(x0,nx),m(y0,ny),seed), v10 = hash(m(x0+1,nx),m(y0,ny),seed);
  const v01 = hash(m(x0,nx),m(y0+1,ny),seed), v11 = hash(m(x0+1,nx),m(y0+1,ny),seed);
  return (v00*(1-fx)+v10*fx)*(1-fy) + (v01*(1-fx)+v11*fx)*fy;
}
function canvasPixels(w, h, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (!ctx) throw new Error('Canvas 2D is required to generate the plant textures.');
  const data = ctx.createImageData(w,h), p=data.data;
  for(let y=0; y<h; y++) for(let x=0; x<w; x++) {
    const c = paint(x,y,w,h); const i=(y*w+x)*4;
    p[i]=c[0];p[i+1]=c[1];p[i+2]=c[2];p[i+3]=c.length>3?c[3]:255;
  }
  ctx.putImageData(data,0,0); return canvas;
}
function canvasTexture(canvas, color=false) {
  const t=new THREE.CanvasTexture(canvas); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  t.anisotropy=8; t.needsUpdate=true; return t;
}
function makeBarkTextures(seed) {
  const w=512,h=1024, heights=new Float32Array(w*h);
  const bark=canvasPixels(w,h,(x,y)=>{
    const u=x/w,v=y/h;
    // Seamless directional streaks + fine pores on smooth living green bark.
    const broad=periodicNoise(u*8,v*16,8,16,seed), fine=periodicNoise(u*56,v*96,56,96,seed+3);
    const flow=Math.sin(2*Math.PI*(u*15 + 0.03*Math.sin(v*10*Math.PI))) * 0.5+0.5;
    const scars=periodicNoise(u*32,v*64,32,64,seed+19);
    const variation = 0.52*broad+0.26*fine+0.14*flow+0.08*scars;
    heights[y*w+x]=variation;
    const dark=clamp(variation,0,1);
    return [Math.round(97+58*dark),Math.round(117+51*dark),Math.round(48+40*dark),255];
  });
  const normal=canvasPixels(w,h,(x,y)=>{
    const xm=(x+w-1)%w, xp=(x+1)%w,ym=(y+h-1)%h,yp=(y+1)%h;
    const dx=(heights[y*w+xp]-heights[y*w+xm])*1.1;
    const dy=(heights[yp*w+x]-heights[ym*w+x])*1.1;
    const len=Math.hypot(dx,dy,1);return [127.5-dx/len*127,127.5-dy/len*127,127.5+1/len*127,255];
  });
  const roughness=canvasPixels(w,h,(x,y)=>{const a=0.77+heights[y*w+x]*0.21;const k=Math.round(a*255);return [k,k,k,255];});
  return {color:canvasTexture(bark,true),normal:canvasTexture(normal),roughness:canvasTexture(roughness),previews:{bark:bark.toDataURL('image/png')}};
}
function makeLeafTextures(seed) {
  const w=256,h=256;
  const leaf=canvasPixels(w,h,(x,y)=>{
    const u=(x-w*.5)/(w*.5), v=(y-h*.5)/(h*.5);
    // Symmetrical small elliptic leaflet with an analytic alpha silhouette.
    // An OPAQUE leaf-surface map. The silhouette is real polygon geometry,
    // never an alpha-cutout rectangle, because SketchUp's glTF importer may
    // discard foliage-card alpha and display the entire underlying quad.
    const r=u*u*1.03+v*v*1.12;
    const stripe=Math.exp(-Math.abs(u)*35)*(0.07+0.05*Math.cos(v*13));
    const n=periodicNoise(x/32,y/32,8,8,seed+51)-.5;
    const edge=0.09*Math.max(0,r-.4);
    return [Math.round(124+stripe*90+20*n-edge*70),Math.round(151+stripe*67+18*n-edge*60),Math.round(71+stripe*39+12*n),255];
  });
  const roughness=canvasPixels(w,h,(x,y)=>{const v=220+22*periodicNoise(x/32,y/32,8,8,seed);return [v,v,v,255];});
  return {color:canvasTexture(leaf,true),roughness:canvasTexture(roughness),previews:{leaf:leaf.toDataURL('image/png')}};
}

class GeometryWriter {
  constructor() {this.positions=[];this.normals=[];this.uv=[];this.colors=[];this.indices=[];}
  vert(p,n,uv,color){this.positions.push(p.x,p.y,p.z);this.normals.push(n.x,n.y,n.z);this.uv.push(uv[0],uv[1]);this.colors.push(color[0],color[1],color[2]);return this.positions.length/3-1;}
  tri(a,b,c){this.indices.push(a,b,c);}
  mesh(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(this.colors,3));g.setIndex(this.indices);g.computeBoundingSphere();return g;}
}
function appendTube(writer, points, startRadius, endRadius, sides, color, uvScale=1, rootFlare=0) {
  const base=writer.positions.length/3, n=points.length;
  if(n<2)return;
  let lengthAlong=0, previousRight=null;
  for(let i=0;i<n;i++) {
    const tangent=points[Math.min(n-1,i+1)].clone().sub(points[Math.max(0,i-1)]).normalize();
    if(tangent.lengthSq()<1e-8)tangent.set(0,1,0);
    // Parallel-transport the frame between rings. Recreating the basis from
    // an up-vector on every section caused 90-degree discontinuities,
    // twisted branch strips and faceted protrusions in SketchUp.
    let right;
    if(previousRight){
      right=previousRight.clone().addScaledVector(tangent,-(previousRight.x*tangent.x+previousRight.y*tangent.y+previousRight.z*tangent.z));
      if(right.lengthSq()<.00001)right=null;
    }
    if(!right){
      const helper=Math.abs(tangent.y)<.93?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0);
      right=new THREE.Vector3().crossVectors(tangent,helper);
    }
    right.normalize(); previousRight=right;
    const forward=new THREE.Vector3().crossVectors(tangent,right).normalize();
    const t=i/(n-1);
    const flare=1+rootFlare*Math.pow(1-t,7);
    const radius=Math.max(0.00025,(startRadius*(1-t)+endRadius*t)*flare);
    if(i>0) lengthAlong+=points[i].distanceTo(points[i-1]);
    for(let k=0;k<=sides;k++) {
      const a=2*Math.PI*k/sides;
      const normal=right.clone().multiplyScalar(Math.cos(a)).addScaledVector(forward,Math.sin(a));
      writer.vert(points[i].clone().addScaledVector(normal,radius),normal,[k/sides*1.8,lengthAlong/Math.max(.025,uvScale)],color);
    }
  }
  for(let i=0;i<n-1;i++)for(let k=0;k<sides;k++){
    const a=base+i*(sides+1)+k,b=a+sides+1;
    writer.tri(a,a+1,b);writer.tri(a+1,b+1,b);
  }
}
function makePath(start,dir,len,sections,gnarl,rng,upWeight=0.15) {
  const points=[start.clone()];let p=start.clone();let d=dir.clone().normalize();
  const twist=new THREE.Vector3(rand(rng,-1,1),rand(rng,-.3,.6),rand(rng,-1,1)).normalize();
  const bend=rand(rng,-gnarl,gnarl);
  for(let i=1;i<=sections;i++) {
    const t=i/sections;
    d.addScaledVector(twist,bend*0.10).add(new THREE.Vector3(rand(rng,-.04,.04)*gnarl,upWeight/sections,rand(rng,-.04,.04)*gnarl)).normalize();
    p=p.clone().addScaledVector(d,len/sections);points.push(p);
  }
  return points;
}
const pointAt=(points,t)=>{ const x=clamp(t,0,1)*(points.length-1);const k=Math.min(points.length-2,Math.floor(x));return points[k].clone().lerp(points[k+1],x-k); };
const tangentAt=(points,t)=>{const k=Math.min(points.length-2,Math.floor(clamp(t,0,1)*(points.length-1)));return points[k+1].clone().sub(points[k]).normalize();};
// Thin, gently curved ovate polygon: no transparency, no rectangular card.
// This outline remains intact after GLB import into SketchUp and D5.
function createLeafletMesh(writer, origin, direction, width, length, color, rng) {
  const dir=direction.clone().normalize();
  let reference=new THREE.Vector3(rand(rng,-1,1),rand(rng,-1,1),rand(rng,-1,1));
  let right=new THREE.Vector3().crossVectors(dir,reference);
  if(right.lengthSq()<.00001){reference=new THREE.Vector3(0,1,0);right=new THREE.Vector3().crossVectors(dir,reference);}
  if(right.lengthSq()<.00001)right.set(1,0,0);
  right.normalize();
  const normal=new THREE.Vector3().crossVectors(right,dir).normalize();
  const tip=origin.clone().addScaledVector(dir,length);
  const widest=width*.48;
  const left=origin.clone().addScaledVector(dir,length*.51).addScaledVector(right,-widest);
  const opposite=origin.clone().addScaledVector(dir,length*.51).addScaledVector(right,widest);
  const mid=origin.clone().addScaledVector(dir,length*.47).addScaledVector(normal,length*.055);
  const surfaceColor=[color[0]*.96,color[1]*.98,color[2]*.96];
  const a=writer.vert(origin,normal,[.5,0],surfaceColor);
  const b=writer.vert(left,normal,[0,.5],color);
  const c=writer.vert(tip,normal,[.5,1],color);
  const d=writer.vert(opposite,normal,[1,.5],color);
  const e=writer.vert(mid,normal,[.5,.48],color);
  writer.tri(a,b,e);writer.tri(b,c,e);writer.tri(c,d,e);writer.tri(d,a,e);
}
function attachToParent(points,t,outward,rootRadius,tipRadius){
  const center=pointAt(points,t),axis=tangentAt(points,t);
  let normal=outward.clone().addScaledVector(axis,-(outward.x*axis.x+outward.y*axis.y+outward.z*axis.z));
  if(normal.lengthSq()<.00001)normal=new THREE.Vector3().crossVectors(axis,new THREE.Vector3(1,0,0));
  if(normal.lengthSq()<.00001)normal.set(0,0,1);
  const r=rootRadius*(1-t)+tipRadius*t;
  // Enter slightly into the parent tube so the child root has a natural
  // overlapping shoulder, not a disconnected or end-capped cylinder.
  return center.addScaledVector(normal.normalize(),r*.76);
}
function disposeTextures(p){for(const k of ['color','normal','roughness'])p[k]?.dispose();}

export function generateTree(input={}) {
  const opts={...DEFAULTS,...input};
  const quality=QUALITY[opts.quality]||QUALITY.presentation;
  // Independent random streams keep the woody silhouette stable while changing
  // foliage density, bloom, or dry-season state for the *same seed*.
  const rng=mulberry32(opts.seed);
  const foliageRng=mulberry32((Number(opts.seed) ^ 0x9E3779B9) >>> 0);
  const flowerRng=mulberry32((Number(opts.seed) ^ 0x85EBCA6B) >>> 0);
  const wood=new GeometryWriter(),leaves=new GeometryWriter(),flowers=new GeometryWriter();
  const palettes={base:[0.96,0.99,0.81],large:[0.82,0.93,0.75],small:[0.75,0.97,0.75]};
  const stats={trunks:opts.trunks,branches:0,terminalTwigs:0,leaflets:0,flowerPetals:0,thorns:0,triangles:0,vertices:0,height:opts.height};
  const wantLeaves=opts.foliage*(opts.season==='dry'?0.22:1.0);
  const nTrunks=clamp(Math.round(opts.trunks),1,5);
  const complexity=clamp(opts.complexity,.5,1.5);
  // Keep the full parameter range available without allowing 5-trunk, max
  // density/high-detail combinations to grow into million-triangle meshes.
  const crowding=(nTrunks/3)*Math.max(.5,opts.branchDensity)*complexity*complexity*quality.twigFactor;
  const densityBudget=Math.min(1,Math.sqrt(2.25/Math.max(.001,crowding)));
  stats.densityBudget=Number(densityBudget.toFixed(3));
  const addBranch=(points,rad,rEnd,level)=>{
    const sides=Math.max(4,Math.round(quality.tubeSides*(level>2?.72:1)));
    appendTube(wood,points,rad,rEnd,sides,level<1?palettes.base:level<3?palettes.large:palettes.small,Math.max(.045,rad*4),level>0?.32:0);
    stats.branches++;
  };
  // A rachis carries 4–8 paired small leaflets, as documented for P. microphylla.
  function addFoliageSpray(origin,forward){
    if(foliageRng()>wantLeaves)return;
    const nPairs=Math.round(rand(foliageRng,4,8)), length=rand(foliageRng,.025,.052);
    const dir=forward.clone().add(new THREE.Vector3(rand(foliageRng,-.3,.3),rand(foliageRng,-.08,.35),rand(foliageRng,-.3,.3))).normalize();
    const end=origin.clone().addScaledVector(dir,length);
    appendTube(wood,[origin,origin.clone().lerp(end,.5),end],.0023,.0007,4,palettes.small,.12);
    const side=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,1,0)).normalize();
    if(side.lengthSq()<.001)side.set(1,0,0);
    for(let i=0;i<nPairs;i++){
      const t=(i+.7)/(nPairs+1),stem=origin.clone().lerp(end,t);
      for(const sign of [-1,1]){
        if(foliageRng()>clamp(wantLeaves*1.25,0,1))continue;
        const d=side.clone().multiplyScalar(sign).addScaledVector(dir,rand(foliageRng,.13,.46)).add(new THREE.Vector3(0,rand(foliageRng,-.24,.32),0)).normalize();
        // Approximate 3–5 mm leaflets at 100%, instead of the previous
        // billboard-like 12–22 mm rectangles. Slider allows art direction.
        const size=rand(foliageRng,.003,.005)*opts.leafletSize;
        const leafColor=[rand(foliageRng,.81,1.0),rand(foliageRng,.84,1.0),rand(foliageRng,.79,.96)];
        const st=stem.clone().addScaledVector(d,.004);
        createLeafletMesh(leaves,st,d,size*.72,size,leafColor,foliageRng);stats.leaflets++;
      }
    }
  }
  function addBlossom(origin,dir){
    if(opts.bloom<=.001||flowerRng()>opts.bloom*.13)return;
    const center=origin.clone().addScaledVector(dir,.014);const outward=dir.clone().normalize();
    const side=new THREE.Vector3().crossVectors(outward,new THREE.Vector3(0,1,0)).normalize();
    if(side.lengthSq()<.01)side.set(1,0,0);
    const up=new THREE.Vector3().crossVectors(side,outward).normalize();
    for(let i=0;i<5;i++){
      const a=i/5*Math.PI*2;
      const p=center.clone().addScaledVector(side,Math.cos(a)*.009).addScaledVector(up,Math.sin(a)*.009);
      const v=side.clone().multiplyScalar(Math.cos(a)).addScaledVector(up,Math.sin(a));
      createLeafletMesh(flowers,p,v,.014,.017,i===4?[1,1,.84]:[1,.91,.44],flowerRng);stats.flowerPetals++;
    }
  }
  // Growing from the base: individual stems spread organically, rather than a single cylindrical trunk.
  for(let s=0;s<nTrunks;s++){
    const a=(s/nTrunks)*Math.PI*2+rand(rng,-.5,.5);
    const origin=new THREE.Vector3(rand(rng,-.12,.12),0,rand(rng,-.12,.12));
    const dir=new THREE.Vector3(Math.cos(a)*rand(rng,.13,.42),1,Math.sin(a)*rand(rng,.13,.42)).normalize();
    const mainLen=rand(rng,3.15,3.8);
    const trunk=makePath(origin,dir,mainLen,quality.tubeSections+5,opts.gnarl*.6,rng,.45);
    const trunkRootRadius=rand(rng,.11,.18)/Math.sqrt(nTrunks/2);
    addBranch(trunk,trunkRootRadius,.032,0);
    const primaryCount=Math.max(2,Math.round(rand(rng,5,8)*opts.branchDensity*complexity*densityBudget));
    for(let i=0;i<primaryCount;i++){
      const t=.29+(i+rng()*.8)/primaryCount*.68;
      const radial=(i/primaryCount)*Math.PI*2 + a + rand(rng,-.56,.56);
      const tangent=tangentAt(trunk,t);
      const v=new THREE.Vector3(Math.cos(radial)*opts.spread,rand(rng,.27,.68),Math.sin(radial)*opts.spread)
        .addScaledVector(tangent,.24).normalize();
      const length=rand(rng,1.9,2.65)*opts.spread;
      const primaryBase=attachToParent(trunk,t,v,trunkRootRadius,.032);
      const primaryRadius=rand(rng,.032,.062);
      const primary=makePath(primaryBase,v,length,quality.tubeSections+1,opts.gnarl,rng,.10);
      addBranch(primary,primaryRadius,.008,1);
      const secondaries=Math.max(2,Math.round(rand(rng,3.5,5.8)*complexity*densityBudget));
      for(let j=0;j<secondaries;j++){
        const t2=.25+(j+rng()*.7)/secondaries*.69;
        const tan=tangentAt(primary,t2);
        const spin=(j/secondaries)*Math.PI*2+radial+rand(rng,-1.1,1.1);
        const out=new THREE.Vector3(Math.cos(spin),rand(rng,.15,.65),Math.sin(spin))
          .addScaledVector(tan,.7).normalize();
        const p2=attachToParent(primary,t2,out,primaryRadius,.008);
        const secondaryRadius=rand(rng,.011,.020);
        const secondary=makePath(p2,out,rand(rng,.78,1.36),Math.max(5,quality.tubeSections-1),opts.gnarl,rng,.07);
        addBranch(secondary,secondaryRadius,.0031,2);
        const twigs=Math.max(1,Math.round(rand(rng,2.3,4.8)*quality.twigFactor*complexity*densityBudget));
        for(let k=0;k<twigs;k++){
          const t3=.33+(k+rng()*.6)/twigs*.64;
          const tan3=tangentAt(secondary,t3);
          const turn=rand(rng,0,Math.PI*2);
          const b=new THREE.Vector3(Math.cos(turn)*.7,rand(rng,.12,.85),Math.sin(turn)*.7).addScaledVector(tan3,.85).normalize();
          const p3=attachToParent(secondary,t3,b,secondaryRadius,.0031);
          const twig=makePath(p3,b,rand(rng,.28,.67),Math.max(4,quality.tubeSections-2),opts.gnarl,rng,.05);
          addBranch(twig,.0048,.0007,3);stats.terminalTwigs++;
          // Thorns occasionally emerge near twig axils.
          if(rng()<.28){
            const thornBase=pointAt(twig,rand(rng,.15,.45));
            const thornDir=new THREE.Vector3(rand(rng,-1,1),rand(rng,.02,.45),rand(rng,-1,1)).normalize();
            appendTube(wood,[thornBase,thornBase.clone().addScaledVector(thornDir,rand(rng,.02,.06))],.002,.00015,4,palettes.small,.035);
            stats.thorns++;
          }
          const sprayCount=Math.round(rand(rng,1.5,4.2)*quality.leafFactor);
          for(let m=0;m<sprayCount;m++){
            const position=pointAt(twig,rand(rng,.54,1));
            const direct=tangentAt(twig,rand(rng,.65,.95));
            addFoliageSpray(position,direct);
            if(m===0)addBlossom(position,direct);
          }
        }
      }
    }
  }
  const bark=makeBarkTextures(opts.seed),leaf=makeLeafTextures(opts.seed);
  const woodGeometry=wood.mesh(),leafGeometry=leaves.mesh(),flowerGeometry=flowers.mesh();
  const barkMat=new THREE.MeshStandardMaterial({name:'PaloVerde_LivingBark_PBR',map:bark.color,normalMap:bark.normal,normalScale:new THREE.Vector2(.19,.19),roughnessMap:bark.roughness,roughness:1,vertexColors:true,metalness:0});
  const leafMat=new THREE.MeshStandardMaterial({name:'PaloVerde_Leaflet_OpaqueGeometry_PBR',map:leaf.color,roughnessMap:leaf.roughness,roughness:1,vertexColors:true,transparent:false,alphaTest:0,side:THREE.DoubleSide,metalness:0});
  const flowerMat=new THREE.MeshStandardMaterial({name:'PaloVerde_PaleYellow_Flowers',color:0xffffd2,roughness:.85,vertexColors:true,side:THREE.DoubleSide});
  const group=new THREE.Group();group.name=`T2_Littleleaf_Palo_Verde_${opts.seed}`;
  function mesh(geo,mat,name){const m=new THREE.Mesh(geo,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
  mesh(woodGeometry,barkMat,'Trunks_Branches_Twigs');
  if(stats.leaflets)mesh(leafGeometry,leafMat,'Compound_Leaflets');else leafGeometry.dispose();
  if(stats.flowerPetals)mesh(flowerGeometry,flowerMat,'Optional_Spring_Flowers');else flowerGeometry.dispose();
  const box=new THREE.Box3().setFromObject(group);const rawHeight=box.max.y-box.min.y;
  const scale=opts.height/Math.max(.01,rawHeight);
  group.scale.setScalar(scale);
  group.position.y=-box.min.y*scale;
  const finalBox=new THREE.Box3().setFromObject(group);
  stats.height=Number((finalBox.max.y-finalBox.min.y).toFixed(3));
  stats.width=Number((finalBox.max.x-finalBox.min.x).toFixed(2));
  stats.depth=Number((finalBox.max.z-finalBox.min.z).toFixed(2));
  stats.triangles=wood.indices.length/3+leaves.indices.length/3+flowers.indices.length/3;
  stats.vertices=wood.positions.length/3+leaves.positions.length/3+flowers.positions.length/3;
  const dispose=()=>{group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});disposeTextures(bark);disposeTextures(leaf);};
  return {group,stats,texturePreviews:{...bark.previews,...leaf.previews},dispose};
}
