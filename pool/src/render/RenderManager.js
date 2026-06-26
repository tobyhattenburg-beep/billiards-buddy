/* ============================================================
   RenderManager — owns ALL Three.js / WebGL resources.

   DESIGN CONTRACT
   - The renderer READS interpolated ball positions from the
     PhysicsManager; it never writes simulation state.
   - Every GPU resource it creates (geometries, materials,
     textures, env render-target, renderer) is tracked and freed
     in dispose(), so venue/scene swaps can't leak WebGL memory.

   VISUAL TARGET: Hustle Kings — hyper-gloss PBR balls (clearcoat
   over a low-roughness base, reflecting a PMREM studio
   environment), cloth with a soft fabric grain that scatters the
   light, warm overhead key light, ACES filmic tone mapping.
   ============================================================ */
'use strict';

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Standard pool ball colours (1..7 solids; 9..15 reuse 1..7 as stripes; 8 black).
const BALL_COLORS = {
  1: '#ffcf2e', 2: '#1f5fff', 3: '#ff3b30', 4: '#8a3df0',
  5: '#ff8a1e', 6: '#1fae5a', 7: '#8a1f1f', 8: '#15151c',
  9: '#ffcf2e', 10: '#1f5fff', 11: '#ff3b30', 12: '#8a3df0',
  13: '#ff8a1e', 14: '#1fae5a', 15: '#8a1f1f',
};

export class RenderManager {
  constructor(canvas, table) {
    this.canvas = canvas;
    this.table = table;
    this._disposables = new Set();   // geometries/materials/textures to free
    this._meshes = new Map();        // physics ball id -> { mesh, lastX, lastZ }
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this._envRT = null;
  }

  // track any resource that exposes .dispose()
  _own(r) { if (r) this._disposables.add(r); return r; }

  init() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(this._w(), this._h(), false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.Fog(0x05070d, 9, 22);

    this.camera = new THREE.PerspectiveCamera(42, this._w() / this._h(), 0.05, 100);
    this.camera.position.set(0, 3.4, 4.4);
    this.camera.lookAt(0, 0, 0);

    this._buildEnvironment();
    this._buildLights();
    this._buildTable();

    window.addEventListener('resize', () => this.resize());
    return this;
  }

  _w() { return this.canvas.clientWidth || window.innerWidth; }
  _h() { return this.canvas.clientHeight || window.innerHeight; }

  // PMREM-prefiltered studio environment => the reflections that
  // sell the hyper-gloss balls. Generated procedurally so it works
  // offline (no .hdr download).
  _buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const roomScene = new RoomEnvironment();
    this._envRT = pmrem.fromScene(roomScene, 0.04);
    this.scene.environment = this._envRT.texture;
    // tidy up the throwaway room scene + generator
    roomScene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    pmrem.dispose();
  }

  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0x2a3550, 0.35));
    // warm overhead key, like the lamp above a bar table
    const key = new THREE.SpotLight(0xfff2d6, 38, 16, 0.7, 0.5, 1.2);
    key.position.set(0, 5.2, 0);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 12;
    key.shadow.bias = -0.0004;
    this.scene.add(key, key.target);
    // cool rim from behind for separation
    const rim = new THREE.DirectionalLight(0x6688ff, 0.4);
    rim.position.set(-4, 3, -6);
    this.scene.add(rim);
  }

  // -------- table --------
  _buildTable() {
    const T = this.table;
    const grp = new THREE.Group();

    // Cloth bed with pocket holes cut out
    const shape = new THREE.Shape();
    shape.moveTo(-T.HX, -T.HZ);
    shape.lineTo(T.HX, -T.HZ);
    shape.lineTo(T.HX, T.HZ);
    shape.lineTo(-T.HX, T.HZ);
    shape.lineTo(-T.HX, -T.HZ);
    for (const p of T.pockets) {
      const hole = new THREE.Path();
      hole.absarc(p.x, p.z, T.pocketCapture, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    const bedGeo = this._own(new THREE.ShapeGeometry(shape, 12));
    const cloth = this._own(new THREE.MeshStandardMaterial({
      color: 0x0c6b34,
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.12,
      roughnessMap: this._clothGrain(),
      bumpMap: this._clothGrain(),
      bumpScale: 0.012,
    }));
    const bed = new THREE.Mesh(bedGeo, cloth);
    bed.rotation.x = -Math.PI / 2;
    bed.receiveShadow = true;
    grp.add(bed);

    // Slate body underneath
    const bodyGeo = this._own(new THREE.BoxGeometry(T.HX * 2 + 0.4, 0.5, T.HZ * 2 + 0.4));
    const slate = this._own(new THREE.MeshStandardMaterial({ color: 0x120a06, roughness: 0.7, metalness: 0.1 }));
    const body = new THREE.Mesh(bodyGeo, slate);
    body.position.y = -0.27;
    body.receiveShadow = true;
    grp.add(body);

    // Wood rails (glossy mahogany)
    const wood = this._own(new THREE.MeshPhysicalMaterial({
      color: 0x4a2410, roughness: 0.3, metalness: 0.15,
      clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.9,
    }));
    const rh = 0.13, rw = 0.16;
    const railSpecs = [
      [T.HX * 2 + rw * 2, rw, 0, -(T.HZ + rw / 2)],
      [T.HX * 2 + rw * 2, rw, 0, T.HZ + rw / 2],
      [rw, T.HZ * 2, -(T.HX + rw / 2), 0],
      [rw, T.HZ * 2, T.HX + rw / 2, 0],
    ];
    for (const [w, d, x, z] of railSpecs) {
      const g = this._own(new THREE.BoxGeometry(w, rh, d));
      const m = new THREE.Mesh(g, wood);
      m.position.set(x, rh / 2 - 0.02, z);
      m.castShadow = true; m.receiveShadow = true;
      grp.add(m);
    }

    // Cushion rubber (felt-coloured). Each cushion's INNER face sits
    // on the rail line (±HX / ±HZ) — exactly where the physics bounces
    // the ball — and the body extends outward from there.
    const cushMat = this._own(new THREE.MeshStandardMaterial({ color: 0x0a5a2c, roughness: 0.85, metalness: 0 }));
    const ch = 0.085, ct = 0.06, inset = T.pocketMouth; // height, thickness, pocket-mouth gap
    const cushAt = (w, d, x, z) => {
      const g = this._own(new THREE.BoxGeometry(w, ch, d));
      const m = new THREE.Mesh(g, cushMat);
      m.position.set(x, ch / 2, z);
      m.castShadow = true;
      grp.add(m);
    };
    // Long rails (z = ±HZ) are split into two halves by the side pocket.
    const segLong = T.HX - 2 * inset;          // length of each half
    const segLongCx = T.HX / 2;                // centre of each half on x
    const longZ = T.HZ + ct / 2;               // inner face on z = ±HZ
    cushAt(segLong, ct, -segLongCx, -longZ);
    cushAt(segLong, ct,  segLongCx, -longZ);
    cushAt(segLong, ct, -segLongCx,  longZ);
    cushAt(segLong, ct,  segLongCx,  longZ);
    // Short rails (x = ±HX) are single segments between the corners.
    const segShort = T.HZ * 2 - 2 * inset;
    const shortX = T.HX + ct / 2;              // inner face on x = ±HX
    cushAt(ct, segShort, -shortX, 0);
    cushAt(ct, segShort,  shortX, 0);

    // Pocket wells
    const wellMat = this._own(new THREE.MeshStandardMaterial({ color: 0x010203, roughness: 1, side: THREE.DoubleSide }));
    for (const p of T.pockets) {
      const g = this._own(new THREE.CylinderGeometry(T.pocketCapture, T.pocketCapture * 0.7, 0.32, 20, 1, true));
      const well = new THREE.Mesh(g, wellMat);
      well.position.set(p.x, -0.15, p.z);
      grp.add(well);
    }

    this.scene.add(grp);
    this._tableGroup = grp;
  }

  // procedural fabric-grain texture (subtle high-frequency noise)
  _clothGrain() {
    if (this._grainTex) return this._grainTex;
    const s = 256, c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 150 + Math.random() * 105;     // bright, tight noise => fine grain
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = this._own(new THREE.CanvasTexture(c));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 4);
    this._grainTex = tex;
    return tex;
  }

  // -------- balls --------
  // Build glossy ball meshes to match the current physics balls.
  setBalls(physicsBalls) {
    // remove any meshes whose physics ball no longer exists
    const ids = new Set(physicsBalls.map((b) => b.id));
    for (const [id, rec] of this._meshes) {
      if (!ids.has(id)) { this.scene.remove(rec.mesh); this._meshes.delete(id); }
    }
    const geo = this._ballGeo || (this._ballGeo = this._own(new THREE.SphereGeometry(this.table.R, 48, 32)));
    for (const b of physicsBalls) {
      if (this._meshes.has(b.id)) continue;
      const mat = this._own(new THREE.MeshPhysicalMaterial({
        map: this._ballTexture(b),
        roughness: 0.05,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.25,
      }));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      mesh.position.set(b.x, this.table.R, b.z);
      this.scene.add(mesh);
      this._meshes.set(b.id, { mesh, lastX: b.x, lastZ: b.z });
    }
  }

  // Equirectangular ball texture: cue is plain ivory; solids are a
  // coloured ball with two white number discs; stripes are a white
  // ball with a coloured equatorial band + number disc.
  _ballTexture(b) {
    const w = 512, h = 256, c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');

    if (b.isCue) {
      x.fillStyle = '#f4efe1'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#c8413a';
      x.beginPath(); x.arc(w * 0.5, h * 0.5, 7, 0, 7); x.fill(); // single spot
    } else {
      const num = ((b.id - 1) % 15) + 1;
      const col = BALL_COLORS[num] || '#cccccc';
      const striped = num >= 9;
      if (striped) {
        x.fillStyle = '#f4efe1'; x.fillRect(0, 0, w, h);
        x.fillStyle = col; x.fillRect(0, h * 0.30, w, h * 0.40); // equatorial band
      } else {
        x.fillStyle = col; x.fillRect(0, 0, w, h);
      }
      // two white number discs (front & back of the ball)
      for (const cx of [w * 0.25, w * 0.75]) {
        x.fillStyle = '#f7f3e8';
        x.beginPath(); x.arc(cx, h * 0.5, 34, 0, 7); x.fill();
        x.fillStyle = '#14140f';
        x.font = 'bold 38px Arial';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(String(num), cx, h * 0.5 + 2);
      }
    }
    const tex = this._own(new THREE.CanvasTexture(c));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  // -------- aim guide --------
  // A glowing sight line from the cue ball plus a target ring where
  // it points. Built lazily; GPU resources tracked like everything else.
  setAimGuide(x, z, dx, dz, visible) {
    if (!this._aimLine) {
      const g = this._own(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const m = this._own(new THREE.LineBasicMaterial({ color: 0x9ef6ff, transparent: true, opacity: 0.85 }));
      this._aimLine = new THREE.Line(g, m);
      this._aimLine.frustumCulled = false;
      this.scene.add(this._aimLine);

      const rg = this._own(new THREE.RingGeometry(this.table.R * 0.65, this.table.R * 0.95, 28));
      const rm = this._own(new THREE.MeshBasicMaterial({ color: 0x9ef6ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      this._aimRing = new THREE.Mesh(rg, rm);
      this._aimRing.rotation.x = -Math.PI / 2;
      this.scene.add(this._aimRing);
    }
    this._aimLine.visible = visible;
    this._aimRing.visible = visible;
    if (!visible) return;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len, uz = dz / len;
    const L = 1.6, y = this.table.R;
    const pos = this._aimLine.geometry.attributes.position;
    pos.setXYZ(0, x, y, z);
    pos.setXYZ(1, x + ux * L, y, z + uz * L);
    pos.needsUpdate = true;
    this._aimRing.position.set(x + ux * L, 0.003, z + uz * L);
  }

  // -------- frame --------
  // alpha in [0,1): interpolation between the previous and current
  // physics positions, so motion is smooth even at <sim-rate FPS.
  render(physicsBalls, alpha) {
    for (const b of physicsBalls) {
      const rec = this._meshes.get(b.id);
      if (!rec) continue;
      if (!b.active) { rec.mesh.visible = false; continue; }
      rec.mesh.visible = true;
      const dx = b.px + (b.x - b.px) * alpha;
      const dz = b.pz + (b.z - b.pz) * alpha;
      // roll the ball based on how far it moved (axis ⟂ travel)
      const mx = dx - rec.lastX, mz = dz - rec.lastZ;
      const dist = Math.hypot(mx, mz);
      if (dist > 1e-5) {
        const axis = new THREE.Vector3(mz, 0, -mx).normalize();
        rec.mesh.rotateOnWorldAxis(axis, dist / this.table.R);
      }
      rec.mesh.position.set(dx, this.table.R, dz);
      rec.lastX = dx; rec.lastZ = dz;
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    if (!this.renderer) return;
    this.renderer.setSize(this._w(), this._h(), false);
    this.camera.aspect = this._w() / this._h();
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    for (const [, rec] of this._meshes) this.scene.remove(rec.mesh);
    this._meshes.clear();
    for (const d of this._disposables) { try { d.dispose(); } catch (e) {} }
    this._disposables.clear();
    if (this._envRT) this._envRT.dispose();
    if (this.scene) this.scene.environment = null;
    if (this.renderer) this.renderer.dispose();
  }
}
