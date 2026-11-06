import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { DEFAULTS, SPECIES, generateTree } from './tree.js';

const $ = id => document.getElementById(id);
const container=$('viewer'), loading=$('loading'), toastEl=$('toast');
const settings={...DEFAULTS};
const scene=new THREE.Scene();scene.background=new THREE.Color('#e6ede7');scene.fog=new THREE.Fog('#e6ede7',24,54);
const camera=new THREE.PerspectiveCamera(38,1,.025,160);
camera.position.set(12,7,13);
let renderer, orbit, current=null, scheduled=null, toastTimer=null, processing=false, queued=false, showGrid=true, showWire=false;

function showToast(message,error=false){
  toastEl.textContent=message;toastEl.style.background=error?'#743f35':'#234731';toastEl.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('visible'),3400);
}
function downloadBlob(data,name,type='application/octet-stream'){
  const blob=data instanceof Blob?data:new Blob([data],{type});
  const href=URL.createObjectURL(blob);const link=document.createElement('a');link.href=href;link.download=name;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),10000);
}
function updateLabels(){
  const format={height:v=>Number(v).toFixed(2)+' m',trunks:v=>String(Math.round(v)),spread:v=>Math.round(v*100)+'%',branchDensity:v=>Math.round(v*100)+'%',complexity:v=>Math.round(v*100)+'%',gnarl:v=>Math.round(v*100)+'%',foliage:v=>Math.round(v*100)+'%',leafletSize:v=>Math.round(v*100)+'%',bloom:v=>Math.round(v*100)+'%'};
  for(const [key,fn] of Object.entries(format)){$(key+'-val').textContent=fn(settings[key]);}
}
function readInputs(){
  for(const element of document.querySelectorAll('[data-key]')){
    const key=element.dataset.key;
    if(key==='seed')settings[key]=Math.max(1,Math.trunc(Number(element.value)||1));
    else if(element.type==='range')settings[key]=Number(element.value);
    else settings[key]=element.value;
  }
  updateLabels();
}
function syncInputs(){
  for(const element of document.querySelectorAll('[data-key]'))element.value=settings[element.dataset.key];
  updateLabels();
}
function setTexturePreview(id,data){
  const img=new Image();img.onload=()=>{const canvas=$(id);if(!canvas)return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);};img.src=data;
}
function formatInt(n){return Math.round(n).toLocaleString('en-US');}
function metrics(stats){
  $('stat-height').textContent=stats.height.toFixed(2);
  $('stat-width').textContent=stats.width.toFixed(2);
  $('stat-branches').textContent=formatInt(stats.branches);
  $('stat-leaves').textContent=formatInt(stats.leaflets);
  $('stat-tris').textContent=formatInt(stats.triangles);
  $('stat-thorns').textContent=formatInt(stats.thorns);
  $('dimension-label').textContent=stats.height.toFixed(2)+' m';
}
function frameTree(){
  if(!current)return;
  const b=new THREE.Box3().setFromObject(current.group),size=b.getSize(new THREE.Vector3());
  const center=b.getCenter(new THREE.Vector3());
  const distance=Math.max(size.y*1.65,size.x*1.7,10.5);
  camera.position.set(center.x+distance*.85,center.y+distance*.37,center.z+distance*.99);
  camera.near=.025;camera.far=220;camera.updateProjectionMatrix();
  orbit.target.copy(center);orbit.update();
}
function syncWire(){if(!current)return;current.group.traverse(node=>{if(node.isMesh){node.material.wireframe=showWire;}});}
function doGenerate(frame=false){
  if(processing){queued=true;return;}
  processing=true;$('generate').disabled=true;
  try{
    readInputs();
    const next=generateTree(settings);
    // Keep existing geometry until the next model is successfully generated.
    const prev=current;current=next;scene.add(current.group);
    if(prev){scene.remove(prev.group);prev.dispose();}
    metrics(current.stats);setTexturePreview('bark-thumb',next.texturePreviews.bark);setTexturePreview('leaf-thumb',next.texturePreviews.leaf);
    syncWire();if(frame)frameTree();
    loading.classList.add('hidden');
  }catch(e){console.error('Procedural tree generation failed:',e);loading.classList.add('hidden');showToast('Generation error: '+e.message,true);}
  finally{processing=false;$('generate').disabled=false;if(queued){queued=false;requestGenerate(0);}}
}
function requestGenerate(ms=180){clearTimeout(scheduled);scheduled=setTimeout(()=>doGenerate(false),ms);}
function initScene(){
  if(!window.WebGLRenderingContext){throw new Error('WebGL unavailable. Open this website in a WebGL-capable browser.');}
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.37;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  orbit=new OrbitControls(camera,renderer.domElement);
  orbit.enableDamping=true;orbit.dampingFactor=.075;orbit.minDistance=2;orbit.maxDistance=42;
  orbit.maxPolarAngle=Math.PI*.51;orbit.target.set(0,2.9,0);
  scene.add(new THREE.HemisphereLight(0xf7f9e8,0x758779,2.1));
  const sun=new THREE.DirectionalLight(0xffedbc,2.7);
  sun.position.set(-4,12,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left=-13;sun.shadow.camera.right=13;sun.shadow.camera.top=13;sun.shadow.camera.bottom=-13;
  sun.shadow.bias=-.0008;sun.shadow.normalBias=.009;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xc4e2ee,.85);fill.position.set(8,5,-7);scene.add(fill);
  const groundGeo=new THREE.CircleGeometry(20,96);groundGeo.rotateX(-Math.PI/2);
  const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({color:0xdee8d9,roughness:1,metalness:0}));
  ground.name='PreviewGround_NotIncludedInExport';ground.receiveShadow=true;ground.position.y=-.012;scene.add(ground);
  const grid=new THREE.GridHelper(36,36,0xa5b6a2,0xc5d3c3);grid.position.y=.003;grid.material.opacity=.26;grid.material.transparent=true;grid.name='PreviewGrid_NotIncludedInExport';scene.add(grid);
  $('toggle-grid').addEventListener('click',()=>{showGrid=!showGrid;grid.visible=showGrid;$('toggle-grid').classList.toggle('active',showGrid);$('toggle-grid').setAttribute('aria-pressed',showGrid);});
  $('toggle-wireframe').addEventListener('click',()=>{showWire=!showWire;syncWire();$('toggle-wireframe').classList.toggle('active',showWire);$('toggle-wireframe').setAttribute('aria-pressed',showWire);});
  $('fit').addEventListener('click',frameTree);
  const resize=()=>{const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);};
  new ResizeObserver(resize).observe(container);resize();
  function animate(){requestAnimationFrame(animate);orbit.update();renderer.render(scene,camera);}animate();
}

async function exportGLB(){
  if(!current){showToast('Generate a tree before exporting.',true);return;}
  const btn=$('export-glb');btn.disabled=true;
  const original=$('toggle-wireframe').getAttribute('aria-pressed')==='true';
  try{
    // Wireframe is for viewport diagnostics only, not glTF material output.
    if(original){showWire=false;syncWire();}
    showToast('Packing geometry and texture maps into GLB…');
    const exporter=new GLTFExporter();
    const data=await exporter.parseAsync(current.group,{binary:true,onlyVisible:true,maxTextureSize:2048,trs:true});
    downloadBlob(data,`T2_Littleleaf_Palo_Verde_${settings.seed}_${settings.height.toFixed(2)}m.glb`,'model/gltf-binary');
    showToast('GLB exported with embedded PBR materials.');
  }catch(e){console.error(e);showToast('GLB export failed: '+e.message,true);}
  finally{if(original){showWire=true;syncWire();}btn.disabled=false;}
}
function exportPNG(){
  if(!renderer){showToast('Viewer is unavailable.',true);return;}
  try{renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{
    if(!blob){showToast('Image export failed.',true);return;}
    downloadBlob(blob,`T2_Palo_Verde_View_${settings.seed}.png`,'image/png');showToast('PNG viewport image saved.');
  },'image/png',1);}catch(e){showToast('Image export failed: '+e.message,true);}
}
function exportJSON(){
  const payload={schema:'canopy-studio/1.0',species:SPECIES,units:'metres',generator:'LittleleafPaloVerde',date:new Date().toISOString(),settings:{...settings},statistics:current?.stats??null};
  downloadBlob(JSON.stringify(payload,null,2),`T2_Palo_Verde_Recipe_${settings.seed}.json`,'application/json');showToast('Procedural recipe saved.');
}

function registerEvents(){
  for(const element of document.querySelectorAll('[data-key]')){
    element.addEventListener(element.type==='range'?'input':'change',()=>{readInputs();requestGenerate(element.type==='range'?200:0);});
  }
  $('reseed').addEventListener('click',()=>{settings.seed=Math.floor(Math.random()*2147483646)+1;syncInputs();doGenerate(false);showToast('New variation generated.');});
  $('generate').addEventListener('click',()=>{clearTimeout(scheduled);doGenerate(false);showToast('Tree regenerated with current parameters.');});
  $('reset').addEventListener('click',()=>{Object.assign(settings,DEFAULTS);syncInputs();doGenerate(true);showToast('Original T2 preset restored.');});
  $('export-glb').addEventListener('click',exportGLB);$('export-png').addEventListener('click',exportPNG);$('export-json').addEventListener('click',exportJSON);
  document.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
    if(e.key.toLowerCase()==='f')frameTree();if(e.key.toLowerCase()==='r')doGenerate(false);
  });
}
try {initScene();registerEvents();syncInputs();doGenerate(true);window.__CANOPY_APP__={settings,getStats:()=>current?.stats,regenerate:()=>doGenerate(false)};}
catch(e){console.error(e);loading.innerHTML='<div class="loading-logo">!</div><strong>3D VIEWER UNAVAILABLE</strong><span>Please enable WebGL or use an up-to-date desktop browser.</span>';showToast(e.message,true);}
