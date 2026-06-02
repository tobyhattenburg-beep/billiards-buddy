/* ============================================================
   Cue Sharks — 3D Pool (Three.js)  ·  physics on the XZ plane
   ============================================================ */
'use strict';

// ---- Table / physics constants (world units) ----
var HX=2.0, HZ=1.0, BR=0.085, POCK=0.12;
var FR=0.988, STOP=0.0045, RAIL=0.86, RESTB=0.95;
function POCKETS(){ return [[-HX,-HZ],[0,-HZ],[HX,-HZ],[-HX,HZ],[0,HZ],[HX,HZ]]; }

// ---- AI roster ----
var CHARACTERS=[
 {id:'rookie',name:'Ricky the Rookie',avatar:'🐣',difficulty:0.30,taunts:{think:["Uhh… this one?"],miss:["Phew, your turn."],scratch:["Ha! You scratched!"],score:["Hey, I did it!"],slow:["You napping?"],win:["I won?!"],lose:["Aw, good game."]}},
 {id:'shark',name:'Sharkey Malone',avatar:'🦈',difficulty:0.62,taunts:{think:["Watch and learn."],miss:["Sloppy."],scratch:["Amateur hour."],score:["Too easy."],slow:["Shoot already."],win:["Sharks don't lose."],lose:["You got lucky."]}},
 {id:'duchess',name:'The Duchess',avatar:'👑',difficulty:0.70,taunts:{think:["Observe true class."],miss:["How pedestrian."],scratch:["Oh dear."],score:["Naturally."],slow:["Do hurry."],win:["Checkmate, darling."],lose:["Well played."]}},
 {id:'doc',name:'Doc Banks',avatar:'🎩',difficulty:0.55,taunts:{think:["Geometry never lies."],miss:["Recalculating."],scratch:["An anomaly."],score:["Q.E.D."],slow:["Time is a variable."],win:["Proof complete."],lose:["Fascinating."]}},
 {id:'vegas',name:'Vegas Vince',avatar:'🎰',difficulty:0.66,taunts:{think:["House always wins."],miss:["Bust!"],scratch:["Snake eyes!"],score:["Jackpot!"],slow:["Clock's running."],win:["Cash me out!"],lose:["You broke the bank."]}},
 {id:'zen',name:'Master Zen',avatar:'🧘',difficulty:0.74,taunts:{think:["Become the cue."],miss:["The river bends."],scratch:["Chaos finds you."],score:["Effortless."],slow:["The moment passes."],win:["Balance achieved."],lose:["You taught me."]}},
 {id:'tank',name:'Tank Romano',avatar:'💪',difficulty:0.58,taunts:{think:["I'll SMASH it."],miss:["Too much sauce."],scratch:["My bad."],score:["BOOM!"],slow:["Quit stallin'!"],win:["TANK WINS!"],lose:["Respect."]}},
 {id:'lola',name:'Lola Quick',avatar:'⚡',difficulty:0.68,taunts:{think:["Fast hands."],miss:["Recalibrating."],scratch:["That'll sting."],score:["Speed kills!"],slow:["Anytime now…"],win:["Too quick for ya."],lose:["Run it back."]}},
 {id:'ghost',name:'The Ghost',avatar:'👻',difficulty:0.80,taunts:{think:["You won't see it coming."],miss:["A rare lapse."],scratch:["Boo."],score:["Vanished."],slow:["I have eternity."],win:["You never had a chance."],lose:["Impossible…"]}},
 {id:'champ',name:'Champ Carter',avatar:'🏆',difficulty:0.90,taunts:{think:["Watch the champ."],miss:["Even legends slip."],scratch:["Bold move."],score:["Textbook."],slow:["Decide fast."],win:["Undefeated."],lose:["New legend in town."]}},
 {id:'nova',name:'Nova Rey',avatar:'🌟',difficulty:0.85,taunts:{think:["Stardust and angles."],miss:["A cosmic fluke."],scratch:["Down the wormhole."],score:["Supernova!"],slow:["Shine or step aside."],win:["I burn brightest."],lose:["A new star rises."]}}
];

// ---- Cues (level unlocks) ----
var CUES=[
 {id:'ash',name:'Ash Classic',unlock:1,traits:{power:1.0,spin:1.0,assist:1},shaft:'#d9b271',glow:'rgba(217,178,113,0.6)',desc:'Balanced all-rounder.'},
 {id:'viper',name:'Neon Viper',unlock:2,traits:{power:0.95,spin:1.3,assist:1},shaft:'#39e08a',glow:'rgba(57,224,138,0.85)',desc:'Whippy — heavy English & draw.'},
 {id:'sledge',name:'Sledgehammer',unlock:3,traits:{power:1.25,spin:0.8,assist:1},shaft:'#ff5a5a',glow:'rgba(255,90,90,0.85)',desc:'Brutal break power, less fine spin.'},
 {id:'laser',name:'Laser Sight',unlock:4,traits:{power:1.0,spin:1.0,assist:2},shaft:'#36e6ff',glow:'rgba(54,230,255,0.9)',desc:'Optics — full object-ball path.'},
 {id:'gold',name:'Gold Standard',unlock:6,traits:{power:1.1,spin:1.15,assist:1},shaft:'#ffd24a',glow:'rgba(255,210,74,0.9)',desc:'More power AND spin.'},
 {id:'phantom',name:'The Phantom',unlock:8,traits:{power:1.05,spin:1.4,assist:2},shaft:'#b06bff',glow:'rgba(176,107,255,0.9)',desc:'Elite spin + optics.'},
 {id:'excalibur',name:'Excalibur',unlock:10,traits:{power:1.2,spin:1.25,assist:2},shaft:'#ffffff',glow:'rgba(255,255,255,0.95)',desc:'The legendary cue.'}
];

// ---- Venues (career swaps the 3D environment) ----
var VENUES={
 basement:{name:'The Basement', felt:0x0b5a2a, rail:0x3a2410, light:0xffe6bc, bg:0x0a0c08, bokeh:[0xffd24a,0x8a6b2e,0xc89a3a], amb:0.34, exp:1.0},
 lounge:{name:'Neon Lounge', felt:0x0c2b52, rail:0x2a1a0e, light:0xfff2d6, bg:0x06080e, bokeh:[0x36e6ff,0xff3df0,0xffd24a,0xffffff], amb:0.28, exp:1.05},
 velvet:{name:'The Velvet Room', felt:0x5a1530, rail:0x4a3208, light:0xffd9b0, bg:0x140509, bokeh:[0xff5a7a,0xffd24a,0xff9e3d], amb:0.30, exp:1.05},
 arena:{name:'Tournament Arena', felt:0x10407a, rail:0x1c1c20, light:0xffffff, bg:0x080a12, bokeh:[0xffffff,0x9fd0ff,0xffe0a0], amb:0.5, exp:1.12},
 skyline:{name:'Sky Lounge', felt:0x123048, rail:0x1a1a22, light:0xcfe0ff, bg:0x05070f, bokeh:[0x36e6ff,0xffffff,0xff9e3d], amb:0.30, exp:1.05},
 vault:{name:'The Vault', felt:0x1c1407, rail:0x0a0a0a, light:0xffd24a, bg:0x080604, bokeh:[0xffd24a,0xffffff,0xc8a83a], amb:0.24, exp:1.12}
};
// ---- Career ladder ----
var CAREER=[
 {venue:'basement', opponents:['rookie','tank'],  reward:200},
 {venue:'lounge',   opponents:['lola','vegas'],   reward:400},
 {venue:'velvet',   opponents:['doc','duchess'],  reward:750},
 {venue:'arena',    opponents:['shark','zen'],    reward:1300},
 {venue:'skyline',  opponents:['nova','ghost'],   reward:2200},
 {venue:'vault',    opponents:['champ'],          reward:5000}
];
function charById(id){ for(var i=0;i<CHARACTERS.length;i++) if(CHARACTERS[i].id===id) return CHARACTERS[i]; return CHARACTERS[0]; }

// ---- State ----
var R3={renderer:null,scene:null,camera:null,env:null,balls:[],cue:null,ghost:null,aimLine:null,lights:{},pool:null};
var G={ balls:[],cueBall:null,state:'aiming',turn:'you',aim:0,power:0,drawing:false,spin:{x:0,y:0},cueSpin:{x:0,y:0},spinUsed:false,
  scores:{you:0,ai:0},potted:[],scratch:false,ai:CHARACTERS[1],turnStart:0,slow:false,bubbleT:null };
var CAM={mode:'aim',az:Math.PI*0.5,el:0.62,dist:5.4,cinem:0};
var PLAYER=loadPlayer();

window.addEventListener('DOMContentLoaded', boot);
function boot(){ initThree(); bindUI(); renderLevel(); newGame(); loop();
  if(location.hash==='#career') setTimeout(openCareer,400); }

// ============================================================
//  THREE scene
// ============================================================
function vw(){ return document.getElementById('gl').clientWidth||window.innerWidth; }
function vh(){ return document.getElementById('gl').clientHeight||window.innerHeight; }
function initThree(){
  var cv=document.getElementById('gl');
  var rn=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  rn.setPixelRatio(Math.min(devicePixelRatio||1,2)); rn.setSize(vw(),vh(),false);
  rn.shadowMap.enabled=true; rn.shadowMap.type=THREE.PCFSoftShadowMap;
  rn.outputEncoding=THREE.sRGBEncoding; rn.toneMapping=THREE.ACESFilmicToneMapping; rn.toneMappingExposure=1.05;
  var sc=new THREE.Scene(); sc.fog=new THREE.Fog(0x06080e,7,18);
  var cam=new THREE.PerspectiveCamera(46,vw()/vh(),0.1,100);
  R3.renderer=rn; R3.scene=sc; R3.camera=cam;
  R3.env=makeEnv();
  sc.environment=R3.env;
  buildBokeh(); buildLamp(); buildLights(); buildTable(); buildCue(); buildAimAids();
  applyVenue('lounge');
  window.addEventListener('resize',onResize);
}
function onResize(){ if(!R3.renderer)return; R3.renderer.setSize(vw(),vh(),false); R3.camera.aspect=vw()/vh(); R3.camera.updateProjectionMatrix(); }

function makeEnv(){ var c=document.createElement('canvas'); c.width=32; c.height=128; var x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,0,128); g.addColorStop(0,'#2a3550'); g.addColorStop(0.32,'#10141f'); g.addColorStop(0.5,'#0c1322'); g.addColorStop(1,'#05070d');
  x.fillStyle=g; x.fillRect(0,0,32,128); x.fillStyle='rgba(255,240,210,0.9)'; x.fillRect(0,18,32,10);
  var t=new THREE.CanvasTexture(c); t.mapping=THREE.EquirectangularReflectionMapping;
  var pm=new THREE.PMREMGenerator(R3.renderer); var e=pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose(); return e;
}
function radialGlow(inner){ var c=document.createElement('canvas'); c.width=256; c.height=256; var x=c.getContext('2d');
  var g=x.createRadialGradient(128,128,8,128,128,128); g.addColorStop(0,inner||'rgba(190,215,255,0.55)'); g.addColorStop(0.5,'rgba(120,160,230,0.14)'); g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g; x.fillRect(0,0,256,256); return new THREE.CanvasTexture(c); }
function softCircle(){ var c=document.createElement('canvas'); c.width=64; c.height=64; var x=c.getContext('2d');
  var g=x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); }

function buildBokeh(){ var tex=softCircle(), cols=[0x36e6ff,0xff3df0,0xffd24a,0x6cff9e,0xffffff], grp=new THREE.Group();
  for(var i=0;i<36;i++){ var m=new THREE.SpriteMaterial({map:tex,color:cols[i%cols.length],transparent:true,blending:THREE.AdditiveBlending,opacity:0.12+Math.random()*0.34,depthWrite:false});
    var s=new THREE.Sprite(m), sz=0.15+Math.random()*0.55; s.scale.set(sz,sz,1); s.position.set((Math.random()*2-1)*8.5,0.6+Math.random()*5.2,-8.4+Math.random()*0.5); grp.add(s); }
  R3.bokeh=grp; R3.scene.add(grp);
}
function buildLamp(){ var ly=2.02;
  var shade=new THREE.Mesh(new THREE.BoxGeometry(HX*1.64,0.16,0.66), new THREE.MeshStandardMaterial({color:0x10141b,roughness:0.5,metalness:0.5,envMap:R3.env})); shade.position.set(0,ly,0); R3.scene.add(shade);
  var panel=new THREE.Mesh(new THREE.BoxGeometry(HX*1.6,0.04,0.58), new THREE.MeshStandardMaterial({color:0xfff0d0,emissive:0xffe2a8,emissiveIntensity:2.4})); panel.position.set(0,ly-0.085,0); R3.scene.add(panel); R3.lampPanel=panel;
  var halo=new THREE.Mesh(new THREE.PlaneGeometry(HX*2.2,1.4), new THREE.MeshBasicMaterial({map:radialGlow('rgba(255,235,190,0.5)'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})); halo.position.set(0,ly-0.12,0); halo.rotation.x=-Math.PI/2; R3.scene.add(halo);
  for(var i=-1;i<=1;i+=2){ var cord=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,1.4,6),new THREE.MeshStandardMaterial({color:0x0a0a0a})); cord.position.set(i*HX*0.64,ly+0.78,0); R3.scene.add(cord); }
}
function buildLights(){
  var amb=new THREE.AmbientLight(0x29354e,0.28); R3.scene.add(amb);
  var spots=[]; [[-1,1.1],[0,3.2],[1,1.1]].forEach(function(s){
    var sp=new THREE.SpotLight(0xfff2d6,s[1],10,s[0]===0?0.62:0.7,0.55,1.3); sp.position.set(s[0]*HX*0.6,2.0,0); sp.target.position.set(s[0]*HX*0.6,0,0);
    if(s[0]===0){ sp.castShadow=true; sp.shadow.mapSize.set(2048,2048); sp.shadow.camera.near=0.5; sp.shadow.camera.far=6; sp.shadow.bias=-0.0006; }
    R3.scene.add(sp); R3.scene.add(sp.target); spots.push(sp); });
  var rim=new THREE.DirectionalLight(0x5577ff,0.18); rim.position.set(-4,3,-5); R3.scene.add(rim);
  R3.lights={amb:amb,spots:spots,rim:rim};
}
function clothMat(){ return new THREE.MeshStandardMaterial({color:VENUES[R3.venue||'lounge'].felt,roughness:0.96,metalness:0.0,envMap:R3.env,envMapIntensity:0.10}); }
function woodMat(){ return new THREE.MeshStandardMaterial({color:VENUES[R3.venue||'lounge'].rail,roughness:0.35,metalness:0.25,envMap:R3.env,envMapIntensity:0.7}); }
function buildTable(){
  var grp=new THREE.Group();
  var shape=new THREE.Shape(); shape.moveTo(-HX,-HZ); shape.lineTo(HX,-HZ); shape.lineTo(HX,HZ); shape.lineTo(-HX,HZ); shape.lineTo(-HX,-HZ);
  POCKETS().forEach(function(p){ var h=new THREE.Path(); h.absarc(p[0],p[1],POCK,0,Math.PI*2,true); shape.holes.push(h); });
  var bed=new THREE.Mesh(new THREE.ShapeGeometry(shape), clothMat()); bed.rotation.x=-Math.PI/2; bed.receiveShadow=true; grp.add(bed); R3.bed=bed;
  var pool=new THREE.Mesh(new THREE.PlaneGeometry(HX*1.72,HZ*2.0), new THREE.MeshBasicMaterial({map:radialGlow('rgba(120,170,255,0.26)'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})); pool.rotation.x=-Math.PI/2; pool.position.y=0.004; grp.add(pool); R3.pool=pool;
  var body=new THREE.Mesh(new THREE.BoxGeometry(HX*2+0.5,0.5,HZ*2+0.5), woodMat()); body.position.y=-0.26; body.castShadow=true; body.receiveShadow=true; grp.add(body); R3.body=body;
  POCKETS().forEach(function(p){ var well=new THREE.Mesh(new THREE.CylinderGeometry(POCK,POCK*0.7,0.3,20,1,true), new THREE.MeshStandardMaterial({color:0x010204,roughness:1,side:THREE.DoubleSide})); well.position.set(p[0],-0.14,p[1]); grp.add(well);
    var cap=new THREE.Mesh(new THREE.CircleGeometry(POCK*0.7,18), new THREE.MeshStandardMaterial({color:0x000000})); cap.rotation.x=-Math.PI/2; cap.position.set(p[0],-0.29,p[1]); grp.add(cap); });
  buildCushions(grp); buildRail(grp); buildSights(grp);
  R3.table=grp; R3.scene.add(grp);
}
function buildCushions(grp){ var ch=0.10, cw=0.09, gap=POCK*1.5, mat=clothMat(); R3.cushions=[];
  function cu(w,d,cx,cz){ var m=new THREE.Mesh(new THREE.BoxGeometry(w,ch,d),mat); m.position.set(cx,ch/2,cz); m.castShadow=true; m.receiveShadow=true; grp.add(m); R3.cushions.push(m); }
  var z=HZ-cw/2, x=HX-cw/2, segX=HX-2*gap, cX=HX/2;
  [-1,1].forEach(function(s){ cu(segX,cw,cX,s*z); cu(segX,cw,-cX,s*z); });
  var segZ=2*(HZ-gap); [-1,1].forEach(function(s){ cu(cw,segZ,s*x,0); });
}
function buildRail(grp){ var rw=0.16, rh=0.06, mat=woodMat(); R3.railMeshes=[];
  function bar(w,d,x,z){ var m=new THREE.Mesh(new THREE.BoxGeometry(w,rh,d),mat); m.position.set(x,0.12,z); m.castShadow=true; m.receiveShadow=true; grp.add(m); R3.railMeshes.push(m); }
  bar(HX*2+rw*2,rw,0,-(HZ+rw/2)); bar(HX*2+rw*2,rw,0,(HZ+rw/2)); bar(rw,HZ*2,-(HX+rw/2),0); bar(rw,HZ*2,(HX+rw/2),0);
}
function buildSights(grp){ var mat=new THREE.MeshStandardMaterial({color:0xcfd6e2,roughness:0.25,metalness:0.85,envMap:R3.env});
  function dot(x,z){ var m=new THREE.Mesh(new THREE.SphereGeometry(0.018,10,8),mat); m.position.set(x,0.155,z); grp.add(m); }
  [-0.75,-0.375,0.375,0.75].forEach(function(f){ dot(HX*f,-(HZ+0.10)); dot(HX*f,(HZ+0.10)); });
  [-0.5,0.5].forEach(function(f){ dot(-(HX+0.10),HZ*f); dot((HX+0.10),HZ*f); });
}
function buildCue(){ var grp=new THREE.Group();
  var shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.026,2.0,16), new THREE.MeshStandardMaterial({color:0xd9b271,roughness:0.4,metalness:0.1,envMap:R3.env})); shaft.rotation.z=-Math.PI/2; shaft.position.x=-1.0; shaft.castShadow=true;
  var tip=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.012,0.05,12), new THREE.MeshStandardMaterial({color:0xeef2ff})); tip.rotation.z=-Math.PI/2; tip.position.x=-0.02;
  grp.add(shaft); grp.add(tip); grp.visible=false; R3.cueShaft=shaft; R3.cueTip=tip; R3.cue=grp; R3.scene.add(grp);
}
function buildAimAids(){
  var ghost=new THREE.Mesh(new THREE.SphereGeometry(BR,20,16), new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.28})); ghost.visible=false; R3.scene.add(ghost); R3.ghost=ghost;
  var geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(12),3));
  var line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x9fefff,transparent:true,opacity:0.6})); line.visible=false; R3.scene.add(line); R3.aimLine=line;
}
function applyVenue(name){ R3.venue=name; var v=VENUES[name]||VENUES.lounge;
  R3.scene.background=new THREE.Color(v.bg);
  if(R3.scene.fog) R3.scene.fog.color.setHex(v.bg);
  if(R3.bed) R3.bed.material.color.setHex(v.felt);
  if(R3.cushions) R3.cushions.forEach(function(m){ m.material.color.setHex(v.felt); });
  if(R3.body) R3.body.material.color.setHex(v.rail);
  if(R3.railMeshes) R3.railMeshes.forEach(function(m){ m.material.color.setHex(v.rail); });
  if(R3.lights){ R3.lights.spots.forEach(function(s){ s.color.setHex(v.light); }); R3.lights.amb.intensity=v.amb||0.3; }
  if(R3.renderer) R3.renderer.toneMappingExposure=v.exp||1.05;
  if(R3.bokeh){ var cols=v.bokeh||[0xffffff]; R3.bokeh.children.forEach(function(s,i){ s.material.color.setHex(cols[i%cols.length]); }); }
}

// ---- ball meshes ----
function ballTex(n){ var c=document.createElement('canvas'); c.width=256; c.height=128; var x=c.getContext('2d');
  var cols=['#f3eedd','#ffcf2e','#1f6fff','#ff3b30','#a64dff','#ff8a1e','#1fc16b','#8a1f1f','#1a1a22']; var col=n<=8?cols[n]:cols[n-8];
  function disc(cx){ if(n===0)return; x.fillStyle='#fff'; x.beginPath(); x.arc(cx,64,22,0,7); x.fill(); x.fillStyle='#141414'; x.font='bold 26px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(n,cx,65); }
  if(n===0){ x.fillStyle='#f5f0e2'; x.fillRect(0,0,256,128); }
  else if(n>8){ x.fillStyle='#f3eedd'; x.fillRect(0,0,256,128); x.fillStyle=col; x.fillRect(0,40,256,48); disc(64); disc(192); }
  else { x.fillStyle=col; x.fillRect(0,0,256,128); disc(64); disc(192); }
  var t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t;
}
function buildBallMeshes(){
  if(R3.balls) R3.balls.forEach(function(m){ R3.scene.remove(m); });
  R3.balls=[];
  G.balls.forEach(function(b){
    var m=new THREE.Mesh(new THREE.SphereGeometry(BR,40,28), new THREE.MeshPhysicalMaterial({map:ballTex(b.n),roughness:0.04,metalness:0,clearcoat:1,clearcoatRoughness:0.04,envMap:R3.env,envMapIntensity:1.1}));
    m.castShadow=true; m.position.set(b.x,BR,b.z); b.mesh=m; R3.balls.push(m); R3.scene.add(m);
  });
}
function syncBalls(){ G.balls.forEach(function(b){ if(!b.mesh)return; b.mesh.visible=!b.potted; b.mesh.position.set(b.x,BR,b.z);
  var sp=Math.hypot(b.vx,b.vz); if(sp>0.0005){ b.mesh.rotateOnWorldAxis(new THREE.Vector3(-b.vz/sp,0,b.vx/sp), sp/BR); } }); }

// ============================================================
//  Game / rack / physics
// ============================================================
function curCue(){ for(var i=0;i<CUES.length;i++) if(CUES[i].id===PLAYER.cue) return CUES[i]; return CUES[0]; }
function maxV(){ return 0.20*curCue().traits.power; }
function spinForce(){ return 0.20*0.32*curCue().traits.spin; }

function newGame(){ rack(); buildBallMeshes(); G.scores={you:0,ai:0}; G.state='aiming'; G.turn='you'; G.aim=0; G.power=0; G.drawing=false; G.spin={x:0,y:0}; G.cueSpin={x:0,y:0};
  G.turnStart=performance.now(); G.slow=false; hideMsg(); setTurn(); hideBubble(); setPower(0); drawSpinDial(); updateScore(); }
function rack(){
  var cy=0; var cue={n:0,x:-HX*0.55,z:cy,vx:0,vz:0,r:BR,potted:false,spin:0};
  var order=[1,9,2,3,8,10,4,11,5,12,6,13,7,14,15], sp=BR*2.06, dx=sp*0.87, fx=HX*0.32, balls=[cue], idx=0, row=0;
  while(idx<order.length){ for(var k=0;k<=row&&idx<order.length;k++){ balls.push({n:order[idx],x:fx+row*dx,z:cy+(k-row/2)*sp,vx:0,vz:0,r:BR,potted:false,spin:0}); idx++; } row++; }
  G.balls=balls; G.cueBall=cue;
}
function shoot(power){ if(G.state!=='aiming')return; var v=power*maxV();
  G.cueBall.vx=Math.cos(G.aim)*v; G.cueBall.vz=Math.sin(G.aim)*v; G.cueBall.spin=G.spin.x;
  G.cueSpin={x:G.spin.x,y:G.spin.y}; G.spinUsed=false; G.potted=[]; G.scratch=false;
  CAM.cinem=0; CAM.shotAim=G.aim; G.state='shooting'; }
function update(){ if(G.state!=='shooting')return; var bs=G.balls,i,maxSp=0;
  for(i=0;i<bs.length;i++){ if(!bs[i].potted){ var s=Math.abs(bs[i].vx)+Math.abs(bs[i].vz); if(s>maxSp)maxSp=s; } }
  var steps=Math.max(1,Math.min(14,Math.ceil(maxSp/(BR*0.4))));
  for(var st=0;st<steps;st++) step(1/steps);
  var moving=false; for(i=0;i<bs.length;i++){ var b=bs[i]; if(b.potted)continue; b.vx*=FR; b.vz*=FR; b.spin*=0.985; if(Math.hypot(b.vx,b.vz)<STOP){ b.vx=0; b.vz=0; } else moving=true; }
  if(!moving) endShot();
}
function step(dt){ var bs=G.balls,i,k,P=POCKETS();
  for(i=0;i<bs.length;i++){ var b=bs[i]; if(b.potted)continue; b.x+=b.vx*dt; b.z+=b.vz*dt;
    var np=false; for(k=0;k<P.length;k++){ if(Math.hypot(b.x-P[k][0],b.z-P[k][1])<POCK*1.6){ np=true; break; } }
    if(!np){ var hit='';
      if(b.x-b.r<-HX){ b.x=-HX+b.r; b.vx=Math.abs(b.vx)*RAIL; hit='x'; }
      if(b.x+b.r>HX){ b.x=HX-b.r; b.vx=-Math.abs(b.vx)*RAIL; hit='x'; }
      if(b.z-b.r<-HZ){ b.z=-HZ+b.r; b.vz=Math.abs(b.vz)*RAIL; hit='z'; }
      if(b.z+b.r>HZ){ b.z=HZ-b.r; b.vz=-Math.abs(b.vz)*RAIL; hit='z'; }
      if(hit&&b.n===0&&Math.abs(b.spin)>0.02){ if(hit==='x') b.vz+=b.spin*spinForce()*0.4; else b.vx+=b.spin*spinForce()*0.4; b.spin*=0.5; }
    }
  }
  for(i=0;i<bs.length;i++){ for(k=i+1;k<bs.length;k++){ var A=bs[i],B=bs[k]; if(A.potted||B.potted)continue;
    var dx=B.x-A.x,dz=B.z-A.z,d=Math.sqrt(dx*dx+dz*dz),mn=A.r+B.r;
    if(d<mn&&d>1e-6){ var nx=dx/d,nz=dz/d,dv=(A.vx-B.vx)*nx+(A.vz-B.vz)*nz;
      if(dv>0){ var im=dv*RESTB; A.vx-=im*nx; A.vz-=im*nz; B.vx+=im*nx; B.vz+=im*nz; }
      var ov=(mn-d)*0.5; A.x-=nx*ov; A.z-=nz*ov; B.x+=nx*ov; B.z+=nz*ov;
      if((A.n===0||B.n===0)&&!G.spinUsed){ var cb=(A.n===0)?A:B,ux=Math.cos(G.aim),uz=Math.sin(G.aim),fd=-G.cueSpin.y;
        cb.vx+=ux*fd*spinForce(); cb.vz+=uz*fd*spinForce(); cb.vx+=(-uz)*G.cueSpin.x*spinForce()*0.6; cb.vz+=(ux)*G.cueSpin.x*spinForce()*0.6; G.spinUsed=true; }
    }
  } }
  for(i=0;i<bs.length;i++){ var ba=bs[i]; if(ba.potted)continue; for(k=0;k<P.length;k++){ if(Math.hypot(ba.x-P[k][0],ba.z-P[k][1])<POCK){ ba.potted=true; ba.vx=ba.vz=0; G.potted.push(ba.n); break; } } }
}
function endShot(){
  if(G.cueBall.potted){ G.cueBall.potted=false; G.cueBall.x=-HX*0.55; G.cueBall.z=0; G.cueBall.vx=G.cueBall.vz=0; G.cueBall.spin=0; G.scratch=true; }
  var shooter=G.turn, potted=G.potted.filter(function(n){return n>0;}).length;
  if(potted>0){ G.scores[shooter]+=potted; updateScore(); if(shooter==='you') addXp(potted*12); }
  var rem=G.balls.filter(function(b){return b.n>0&&!b.potted;}).length;
  if(rem===0) return gameOver();
  if(shooter==='you'){ if(G.scratch) say('scratch'); else if(potted===0) say('miss'); } else if(potted>0) say('score');
  var cont=(potted>0&&!G.scratch);
  G.state='aiming'; G.power=0; G.drawing=false; G.spin={x:0,y:0}; setPower(0); drawSpinDial();
  if(!cont) G.turn=(shooter==='you')?'ai':'you';
  setTurn(); G.turnStart=performance.now(); G.slow=false;
  if(G.turn==='ai') setTimeout(aiTurn, 850+Math.random()*700);
}
function gameOver(){ G.state='over'; var win=G.scores.you>=G.scores.ai; say(win?'lose':'win');
  var xp= win?(60+Math.round(G.ai.difficulty*40)):20; addXp(xp);
  if(G.careerMode){
    var cash=80+Math.round(G.ai.difficulty*220);
    if(win){ PLAYER.career.beaten[G.ai.id]=true; PLAYER.career.cash+=cash;
      var st=CAREER[G.careerStage], done=st&&st.opponents.every(function(o){return PLAYER.career.beaten[o];});
      if(done&&!PLAYER.career.done[st.venue]){ PLAYER.career.done[st.venue]=true; PLAYER.career.cash+=st.reward;
        var nxt=CAREER[G.careerStage+1]; venueToast(st, nxt?VENUES[nxt.venue].name:null); }
      savePlayer(); updateCash(); }
    showMsg(win?'Match Won! 🏆':G.ai.name+' Wins',
      'You '+G.scores.you+' · '+G.ai.name+' '+G.scores.ai+(win?('   +$'+cash+' · +'+xp+' XP'):('   +'+xp+' XP')),
      win?'Career Map':'Rematch', win?openCareer:newGame);
  } else {
    showMsg(win?'You Win! 🏆':G.ai.name+' Wins','You '+G.scores.you+' · '+G.ai.name+' '+G.scores.ai+'   +'+xp+' XP','Play Again',newGame);
  }
}

// ---- AI ----
function aiTurn(){ if(G.turn!=='ai'||G.state!=='aiming')return; if(Math.random()<0.6) say('think');
  var plan=aiPlan(); G.spin={x:0,y:0}; G.cueSpin={x:0,y:0};
  if(!plan){ var near=null,nd=1e9; G.balls.forEach(function(b){ if(b.n<=0||b.potted)return; var dd=Math.hypot(b.x-G.cueBall.x,b.z-G.cueBall.z); if(dd<nd){nd=dd;near=b;} }); if(!near)return;
    G.aim=Math.atan2(near.z-G.cueBall.z,near.x-G.cueBall.x)+(Math.random()*2-1)*0.12; shoot(0.55); return; }
  G.aim=plan.aim+(Math.random()*2-1)*plan.err; shoot(plan.power);
}
function aiPlan(){ var cue=G.cueBall,best=null,P=POCKETS();
  G.balls.forEach(function(b){ if(b.n<=0||b.potted)return; P.forEach(function(p){
    var bx=p[0]-b.x,bz=p[1]-b.z,bd=Math.hypot(bx,bz); if(bd<0.01)return; var ux=bx/bd,uz=bz/bd;
    var gx=b.x-ux*2*BR,gz=b.z-uz*2*BR,ax=gx-cue.x,az=gz-cue.z,ad=Math.hypot(ax,az); if(ad<0.01)return;
    var dot=(ax/ad)*ux+(az/ad)*uz; if(dot<0.25)return; var cost=ad+bd*1.15+(1-dot)*HX*2;
    if(!best||cost<best.cost){ best={cost:cost,aim:Math.atan2(az,ax),dist:ad+bd,dot:dot}; } }); });
  if(!best)return null; var diff=G.ai.difficulty;
  return {aim:best.aim,err:(1-diff)*0.16*(1.3-best.dot),power:Math.min(1,0.4+best.dist/(HX*3)+(1-diff)*0.08)};
}

// ============================================================
//  Cameras / cue / aim render
// ============================================================
function camTarget(){ return new THREE.Vector3(0,0,0); }
function updateCam(){ var cam=R3.camera, cue=G.cueBall;
  if(G.state==='shooting'){ CAM.cinem=Math.min(1,CAM.cinem+0.03); var az=(CAM.shotAim||0)+Math.PI*0.5;
    sphere(az,0.55+0.35*CAM.cinem,5.6+1.4*CAM.cinem); }
  else if(CAM.mode==='orbit'){ sphere(CAM.az,CAM.el,CAM.dist); }
  else { var fx=Math.cos(G.aim),fz=Math.sin(G.aim);
    cam.position.set(cue.x-fx*1.55,0.62,cue.z-fz*1.55); cam.lookAt(cue.x+fx*2.4,0.0,cue.z+fz*2.4); }
}
function sphere(az,el,dist){ var c=R3.camera; c.position.set(dist*Math.cos(el)*Math.sin(az),dist*Math.sin(el),dist*Math.cos(el)*Math.cos(az)); c.lookAt(0,0,0); }

function updateCue(){ var g=R3.cue; if(!g)return; var show=(G.state==='aiming'&&!G.cueBall.potted&&G.turn==='you'); g.visible=show; if(!show)return;
  var cc=curCue(); R3.cueShaft.material.color.set(cc.shaft);
  var fx=Math.cos(G.aim),fz=Math.sin(G.aim), pull=BR*1.4+(G.drawing?G.power:0)*BR*9, td=BR+pull;
  g.position.set(G.cueBall.x-fx*td,BR,G.cueBall.z-fz*td); g.rotation.y=-G.aim;
}
function firstHit(){ var cue=G.cueBall,fx=Math.cos(G.aim),fz=Math.sin(G.aim),best=Infinity,hit=null;
  G.balls.forEach(function(b){ if(b===cue||b.potted)return; var rx=b.x-cue.x,rz=b.z-cue.z,proj=rx*fx+rz*fz; if(proj<=0)return;
    var perp=Math.abs(rx*(-fz)+rz*fx),sum=cue.r+b.r; if(perp<=sum){ var d=proj-Math.sqrt(Math.max(0,sum*sum-perp*perp)); if(d<best){best=d;hit=b;} } });
  return {d:best,hit:hit};
}
function updateAim(){ var show=(G.state==='aiming'&&!G.cueBall.potted&&G.turn==='you'); R3.aimLine.visible=show; R3.ghost.visible=show; if(!show)return;
  var cue=G.cueBall,fx=Math.cos(G.aim),fz=Math.sin(G.aim),fh=firstHit();
  var big=20, tx=fx>0.001?(HX-cue.r-cue.x)/fx:fx<-0.001?(-HX+cue.r-cue.x)/fx:big, tz=fz>0.001?(HZ-cue.r-cue.z)/fz:fz<-0.001?(-HZ+cue.r-cue.z)/fz:big;
  var railLen=Math.min(tx>0?tx:big,tz>0?tz:big,big), len=fh.hit?Math.min(fh.d,railLen):railLen;
  var ex=cue.x+fx*len, ez=cue.z+fz*len;
  var pos=R3.aimLine.geometry.attributes.position; pos.setXYZ(0,cue.x,BR,cue.z); pos.setXYZ(1,ex,BR,ez);
  if(fh.hit){ var ox=fh.hit.x-ex,oz=fh.hit.z-ez,od=Math.hypot(ox,oz)||1, plen=curCue().traits.assist>=2?1.2:0.4;
    pos.setXYZ(2,fh.hit.x,BR,fh.hit.z); pos.setXYZ(3,fh.hit.x+ox/od*plen,BR,fh.hit.z+oz/od*plen); R3.aimLine.geometry.setDrawRange(0,4);
    R3.ghost.visible=true; R3.ghost.position.set(ex,BR,ez); }
  else { pos.setXYZ(2,ex,BR,ez); pos.setXYZ(3,ex,BR,ez); R3.aimLine.geometry.setDrawRange(0,2); R3.ghost.visible=false; }
  pos.needsUpdate=true;
}

// ============================================================
//  Input / UI
// ============================================================
var _ray=new THREE.Raycaster(), _plane=new THREE.Plane(new THREE.Vector3(0,1,0),-BR);
function pointerTable(cx,cy){ var cv=document.getElementById('gl'), r=cv.getBoundingClientRect();
  var ndc=new THREE.Vector2(((cx-r.left)/r.width)*2-1, -((cy-r.top)/r.height)*2+1); _ray.setFromCamera(ndc,R3.camera);
  var pt=new THREE.Vector3(); return _ray.ray.intersectPlane(_plane,pt)?pt:null; }
function bindUI(){
  var cv=document.getElementById('gl'); var down=false, lx=0, ly=0;
  function aimTo(cx,cy){ if(G.state!=='aiming'||G.turn!=='you')return; var p=pointerTable(cx,cy); if(p){ var a=Math.atan2(p.z-G.cueBall.z,p.x-G.cueBall.x); if(isFinite(a))G.aim=a; } }
  cv.addEventListener('mousedown',function(e){ down=true; lx=e.clientX; ly=e.clientY; if(CAM.mode!=='orbit') aimTo(e.clientX,e.clientY); });
  cv.addEventListener('mousemove',function(e){ if(CAM.mode==='orbit'){ if(down){ CAM.az-=(e.clientX-lx)*0.006; CAM.el=Math.max(0.12,Math.min(1.45,CAM.el+(e.clientY-ly)*0.005)); lx=e.clientX; ly=e.clientY; } } else aimTo(e.clientX,e.clientY); });
  window.addEventListener('mouseup',function(){ down=false; });
  cv.addEventListener('wheel',function(e){ e.preventDefault(); CAM.dist=Math.max(3,Math.min(12,CAM.dist*(e.deltaY>0?1.1:0.9))); },{passive:false});
  cv.addEventListener('touchstart',function(e){ e.preventDefault(); down=true; var t=e.touches[0]; lx=t.clientX; ly=t.clientY; if(CAM.mode!=='orbit') aimTo(t.clientX,t.clientY); },{passive:false});
  cv.addEventListener('touchmove',function(e){ e.preventDefault(); var t=e.touches[0]; if(CAM.mode==='orbit'){ CAM.az-=(t.clientX-lx)*0.006; CAM.el=Math.max(0.12,Math.min(1.45,CAM.el+(t.clientY-ly)*0.005)); } else aimTo(t.clientX,t.clientY); lx=t.clientX; ly=t.clientY; },{passive:false});
  cv.addEventListener('touchend',function(e){ e.preventDefault(); down=false; },{passive:false});

  // power gauge
  var gauge=document.getElementById('power-gauge'), gd=false;
  function setY(cy){ var r=gauge.getBoundingClientRect(); var t=Math.max(0,Math.min(1,(cy-r.top)/r.height)); G.power=t; G.drawing=true; setPower(t); }
  function gEnd(){ if(!gd)return; gd=false; if(G.turn==='you'&&G.state==='aiming'&&G.power>0.05) shoot(G.power); G.power=0; G.drawing=false; setPower(0); }
  gauge.addEventListener('mousedown',function(e){ if(G.turn!=='you'||G.state!=='aiming')return; gd=true; setY(e.clientY); });
  window.addEventListener('mousemove',function(e){ if(gd) setY(e.clientY); });
  window.addEventListener('mouseup',gEnd);
  gauge.addEventListener('touchstart',function(e){ e.preventDefault(); if(G.turn!=='you'||G.state!=='aiming')return; gd=true; setY(e.touches[0].clientY); },{passive:false});
  gauge.addEventListener('touchmove',function(e){ e.preventDefault(); if(gd) setY(e.touches[0].clientY); },{passive:false});
  gauge.addEventListener('touchend',function(e){ e.preventDefault(); gEnd(); },{passive:false});

  // spin
  var sc=document.getElementById('spin'), sd=false;
  function setSpin(e){ var r=sc.getBoundingClientRect(),t=e.touches?e.touches[0]:e,cx=r.width/2,cy=r.height/2,rad=r.width/2-7; var nx=(t.clientX-r.left-cx)/rad,ny=(t.clientY-r.top-cy)/rad,m=Math.hypot(nx,ny); if(m>1){nx/=m;ny/=m;} G.spin={x:nx,y:ny}; drawSpinDial(); }
  sc.addEventListener('mousedown',function(e){ sd=true; setSpin(e); }); window.addEventListener('mousemove',function(e){ if(sd) setSpin(e); }); window.addEventListener('mouseup',function(){ sd=false; });
  sc.addEventListener('touchstart',function(e){ e.preventDefault(); setSpin(e); },{passive:false}); sc.addEventListener('touchmove',function(e){ e.preventDefault(); setSpin(e); },{passive:false});

  document.getElementById('view-btn').addEventListener('click',function(){ CAM.mode=(CAM.mode==='aim')?'orbit':'aim'; this.textContent=(CAM.mode==='aim')?'👁 Orbit':'🎯 Aim'; });
  document.getElementById('new-btn').addEventListener('click',newGame);
  document.getElementById('msg-btn').addEventListener('click',function(){ (G._msgCb||newGame)(); });
  document.getElementById('cues-btn').addEventListener('click',openCues);
  document.getElementById('cues-close').addEventListener('click',closeCues);
  document.getElementById('cues-modal').addEventListener('click',function(e){ if(e.target.id==='cues-modal') closeCues(); });
  document.getElementById('career-btn').addEventListener('click',openCareer);
  document.getElementById('career-close').addEventListener('click',closeCareer);
  document.getElementById('career-modal').addEventListener('click',function(e){ if(e.target.id==='career-modal') closeCareer(); });
  updateCash();
}
function setPower(t){ document.getElementById('power-fill').style.height=Math.round(t*100)+'%'; document.getElementById('power-pct').textContent=Math.round(t*100)+'%'; }
function setTurn(){ var el=document.getElementById('turn'); if(G.turn==='you'){ el.textContent='Your Shot'; el.classList.remove('ai'); } else { el.textContent=G.ai.name; el.classList.add('ai'); } }
function updateScore(){ document.getElementById('you-sc').textContent=G.scores.you; document.getElementById('ai-sc').textContent=G.scores.ai; document.getElementById('ai-nm').textContent=G.ai.name; }
function showMsg(t,s,btn,cb){ document.getElementById('msg-title').textContent=t; document.getElementById('msg-sub').textContent=s;
  var b=document.getElementById('msg-btn'); b.textContent=btn||'Play Again'; G._msgCb=cb||newGame;
  document.getElementById('message').classList.remove('hidden'); }
function updateCash(){ var el=document.getElementById('cash'); if(el) el.textContent='$'+PLAYER.career.cash; }
function hideMsg(){ document.getElementById('message').classList.add('hidden'); }
function say(cat){ var pool=G.ai.taunts[cat]; if(!pool||!pool.length)return; showBubble(pool[Math.floor(Math.random()*pool.length)]); }
function showBubble(t){ var b=document.getElementById('ai-bubble'); b.textContent=G.ai.avatar+' '+t; b.classList.remove('hidden'); clearTimeout(G.bubbleT); G.bubbleT=setTimeout(hideBubble,3000); }
function hideBubble(){ document.getElementById('ai-bubble').classList.add('hidden'); }
function drawSpinDial(){ var c=document.getElementById('spin'),x=c.getContext('2d'),w=c.width,h=c.height,cx=w/2,cy=h/2,R=w/2-5; x.clearRect(0,0,w,h);
  x.beginPath(); x.arc(cx,cy,R,0,7); x.fillStyle='#e9eef7'; x.fill();
  var lg=x.createRadialGradient(cx-R*0.35,cy-R*0.4,R*0.1,cx,cy,R); lg.addColorStop(0,'rgba(255,255,255,0.9)'); lg.addColorStop(0.5,'rgba(255,255,255,0)'); lg.addColorStop(1,'rgba(10,20,40,0.55)'); x.fillStyle=lg; x.beginPath(); x.arc(cx,cy,R,0,7); x.fill();
  x.strokeStyle='rgba(40,70,120,0.25)'; x.lineWidth=1; x.beginPath(); x.moveTo(cx-R,cy); x.lineTo(cx+R,cy); x.moveTo(cx,cy-R); x.lineTo(cx,cy+R); x.stroke();
  x.lineWidth=2; x.strokeStyle='rgba(54,230,255,0.4)'; x.beginPath(); x.arc(cx,cy,R,0,7); x.stroke();
  var dx=cx+G.spin.x*(R-7),dy=cy+G.spin.y*(R-7); x.beginPath(); x.arc(dx,dy,6,0,7); x.fillStyle='#ff3df0'; x.fill(); x.strokeStyle='#fff'; x.lineWidth=1.5; x.stroke();
}

// ---- progression ----
function loadPlayer(){ var p; try{ p=JSON.parse(localStorage.getItem('cueSharks3d')); }catch(e){}
  if(!p||!p.unlocked||!p.unlocked.length) p={xp:0,level:1,cue:'ash',unlocked:['ash']};
  if(!p.career) p.career={beaten:{},cash:0,done:{}};
  return p; }
function savePlayer(){ try{ localStorage.setItem('cueSharks3d',JSON.stringify(PLAYER)); }catch(e){} }
function levelInfo(xp){ var lvl=1,need=100,acc=0; while(xp>=acc+need){ acc+=need; lvl++; need=100+(lvl-1)*60; } return {level:lvl,into:xp-acc,need:need}; }
function addXp(n){ if(n<=0)return; var before=levelInfo(PLAYER.xp).level; PLAYER.xp+=n; var info=levelInfo(PLAYER.xp); PLAYER.level=info.level;
  if(info.level>before) CUES.forEach(function(c){ if(c.unlock>before&&c.unlock<=info.level&&PLAYER.unlocked.indexOf(c.id)<0){ PLAYER.unlocked.push(c.id); unlockToast(c); } });
  savePlayer(); renderLevel(); }
function renderLevel(){ var info=levelInfo(PLAYER.xp); document.getElementById('lvl').textContent='Lv '+info.level;
  document.getElementById('xp-fill').style.width=Math.round(info.into/info.need*100)+'%'; document.getElementById('xp-text').textContent=info.into+'/'+info.need; }
function unlockToast(c){ var t=document.getElementById('unlock-toast'); t.innerHTML='🎉 NEW CUE UNLOCKED<small>'+c.name+' — '+c.desc+'</small>'; t.classList.remove('hidden'); clearTimeout(unlockToast._t); unlockToast._t=setTimeout(function(){ t.classList.add('hidden'); },5000); }
function openCues(){ renderCues(); document.getElementById('cues-modal').classList.remove('hidden'); }
function closeCues(){ document.getElementById('cues-modal').classList.add('hidden'); }
function tbar(l,v,c){ var p=Math.max(8,Math.min(100,Math.round(v/1.4*100))); return '<div class="trait"><span>'+l+'</span><div class="trait-bar"><span style="width:'+p+'%;background:'+c+'"></span></div></div>'; }
function renderCues(){ var grid=document.getElementById('cues-grid'); grid.innerHTML='';
  CUES.forEach(function(c){ var owned=PLAYER.unlocked.indexOf(c.id)>=0, eq=PLAYER.cue===c.id, card=document.createElement('div');
    card.className='cue-card '+(eq?'equipped':(owned?'owned':'locked'));
    card.innerHTML=(eq?'<span class="cue-status eq">Equipped</span>':(owned?'<span class="cue-status ok">Tap to equip</span>':'<span class="cue-status lk">Lv '+c.unlock+'</span>'))+
      '<div class="cue-name">'+c.name+'</div><div class="cue-rod" style="background:linear-gradient(90deg,#2a3550,'+c.shaft+');box-shadow:0 0 10px '+c.glow+'"></div>'+
      '<div class="cue-desc">'+c.desc+'</div>'+tbar('Power',c.traits.power,'var(--red)')+tbar('Spin',c.traits.spin,'var(--green)')+tbar('Optics',c.traits.assist/2,'var(--cyan)');
    if(owned&&!eq) card.addEventListener('click',function(){ PLAYER.cue=c.id; savePlayer(); renderCues(); });
    grid.appendChild(card); });
}

// ---- career ----
function stageUnlocked(i){ if(i===0)return true; return CAREER[i-1].opponents.every(function(o){return PLAYER.career.beaten[o];}); }
function openCareer(){ renderCareer(); document.getElementById('career-modal').classList.remove('hidden'); }
function closeCareer(){ document.getElementById('career-modal').classList.add('hidden'); }
function careerMatch(oppId, idx){ G.ai=charById(oppId); G.careerMode=true; G.careerStage=idx; applyVenue(CAREER[idx].venue); closeCareer(); newGame(); }
function venueToast(st, nextName){ var t=document.getElementById('unlock-toast');
  t.innerHTML='🏆 VENUE CLEARED<small>'+VENUES[st.venue].name+' — +$'+st.reward+(nextName?(' · '+nextName+' unlocked'):'')+'</small>';
  t.classList.remove('hidden'); clearTimeout(venueToast._t); venueToast._t=setTimeout(function(){ t.classList.add('hidden'); },5500); }
function renderCareer(){
  var wrap=document.getElementById('career-body'); wrap.innerHTML='';
  document.getElementById('career-cash').textContent='$'+PLAYER.career.cash;
  CAREER.forEach(function(st,i){ var unlocked=stageUnlocked(i), v=VENUES[st.venue];
    var opps=st.opponents.map(function(o){ var c=charById(o), beaten=PLAYER.career.beaten[o], cls=beaten?'beaten':(unlocked?'play':'lock');
      return '<div class="opp '+cls+'" data-opp="'+o+'" data-stage="'+i+'"><div class="opp-av">'+c.avatar+'</div><div class="opp-nm">'+c.name+'</div>'+
             '<div class="opp-st">'+(beaten?'✓ Beaten · replay':(unlocked?('Play · diff '+Math.round(c.difficulty*100)):'🔒 Locked'))+'</div></div>'; }).join('');
    var sec=document.createElement('div'); sec.className='venue-sec'+(unlocked?'':' vlocked');
    sec.innerHTML='<div class="venue-h"><span class="venue-nm">'+(i+1)+'. '+v.name+'</span><span class="venue-rw">'+(unlocked?('Clear bonus $'+st.reward):'🔒 Locked')+'</span></div><div class="opp-row">'+opps+'</div>';
    wrap.appendChild(sec);
  });
  Array.prototype.forEach.call(wrap.querySelectorAll('.opp.play, .opp.beaten'), function(el){
    el.addEventListener('click', function(){ careerMatch(el.getAttribute('data-opp'), +el.getAttribute('data-stage')); });
  });
}

// ---- loop ----
function loop(){ requestAnimationFrame(loop);
  if(G.turn==='you'&&G.state==='aiming'&&!G.slow&&performance.now()-G.turnStart>11000){ G.slow=true; say('slow'); }
  update(); syncBalls(); updateCue(); updateAim(); updateCam();
  R3.renderer.render(R3.scene,R3.camera);
}
