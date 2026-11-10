// 3D view of the device for a guide page: the model turned to a side, with parts lit up.
//
// One renderer for the whole page. The page re-renders its screens as HTML strings, so every
// screen brings a fresh placeholder (.dia3d) and the same canvas is moved into it. Until the
// model has loaded, and wherever WebGL or ES modules are not available (file://), the
// placeholder keeps the flat diagram it was given, so the page never shows an empty box.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const DATA = window.GUIDE_MODEL;
const ACCENT = new THREE.Color(0x2dd4bf);
const BASE_DIST = 0.42;                            // camera distance at zoom 1, m

// Which way the model is turned for each side. glTF is Y-up and the device's front faces +Z;
// a small tilt keeps it reading as an object rather than a flat picture.
const FACES = {
  front: new THREE.Euler(THREE.MathUtils.degToRad(8), THREE.MathUtils.degToRad(-14), 0),
  back: new THREE.Euler(THREE.MathUtils.degToRad(8), THREE.MathUtils.degToRad(180 + 14), 0),
  top: new THREE.Euler(THREE.MathUtils.degToRad(72), 0, 0),       // top edge to the viewer, front down
  bottom: new THREE.Euler(THREE.MathUtils.degToRad(-72), 0, 0),
  // the back seen from above and to the side: the screws on the grip edges face the viewer too
  back_angle: new THREE.Euler(THREE.MathUtils.degToRad(24), THREE.MathUtils.degToRad(180 + 30), 0),
};

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x000000, 1);                 // black: transparent on the glasses
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.className = "c3d";

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(0.4, 0.8, 1.2);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 0.8);
rim.position.set(-0.8, -0.2, -1);
scene.add(rim);

const camera = new THREE.PerspectiveCamera(28, 2, 0.01, 10);
camera.position.set(0, 0, BASE_DIST);                  // the device fills about 3/4 of the view's width
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 0.2;
controls.maxDistance = 1.0;
controls.enableDamping = true;

const pivot = new THREE.Group();                     // turned to a side; the model sits centred in it
scene.add(pivot);
let model = null;
const nodes = {};                                    // object name -> Object3D
const rings = new THREE.Group();
const arrows = new THREE.Group();                   // the current step's arrows, in the pivot's frame
const ARROW = new THREE.MeshBasicMaterial({ color: ACCENT, depthTest: false, transparent: true });
pivot.add(rings);
pivot.add(arrows);

const want = { view: "front", lit: [], zoom: 1, focus: "", ring: "", scene: null };
const aim = new THREE.Vector3();                    // where the camera looks: the model's centre, or a zoomed part
const turnTo = new THREE.Quaternion().setFromEuler(FACES.front);
let host = null;
let lastOpts = null;
let motionStart = 0;

function ringTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.strokeStyle = "#2dd4bf";
  g.lineWidth = 10;
  g.beginPath();
  g.arc(64, 64, 52, 0, Math.PI * 2);
  g.stroke();
  return new THREE.CanvasTexture(c);
}
const RING = new THREE.SpriteMaterial({ map: ringTexture(), depthTest: false, transparent: true });

// Every mesh gets its own material copy, so lighting one part never lights another that
// shared its material in the file.
function prepare(root) {
  root.traverse(o => {
    nodes[o.name] = o;
    if (o.isMesh) {
      o.material = o.material.clone();
      o.userData.base = { color: o.material.color.clone(), emissive: o.material.emissive.clone(),
                          intensity: o.material.emissiveIntensity };
    }
  });
}

// Each movable object remembers where it sits and where it goes when its part is removed,
// both in its parent's frame, so a step can put it anywhere between the two.
function prepareMoves() {
  model.updateMatrixWorld(true);
  const zero = model.localToWorld(new THREE.Vector3());
  Object.entries(DATA.remove || {}).forEach(([id, d]) => (DATA.parts[id] || []).forEach(n => {
    const o = nodes[n];
    if (!o || !o.parent) return;
    const tip = model.localToWorld(new THREE.Vector3(d[0], d[1], d[2]));
    const off = o.parent.worldToLocal(tip.clone()).sub(o.parent.worldToLocal(zero.clone()));
    o.userData.home = o.position.clone();
    o.userData.away = o.position.clone().add(off);
    o.userData.homeQ = o.quaternion.clone();
    o.userData.axis = off.clone().normalize();       // in the parent's frame: the way it comes out
  }));
}

function meshesOf(partId) {
  const out = [];
  (DATA.parts[partId] || []).forEach(n => { if (nodes[n]) nodes[n].traverse(o => { if (o.isMesh) out.push(o); }); });
  return out;
}
function anchorsOf(partId) {
  return ["Anchor_" + partId, "Anchor_" + partId + "_1", "Anchor_" + partId + "_2"].map(n => nodes[n]).filter(Boolean);
}

// Arrows, built at an anchor and pointing along `dir` (pivot frame). Straight ones show a
// push or a pull; round ones a screwdriver turn, anticlockwise to undo, seen from the head.
function straightArrow(len) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, len, 12), ARROW);
  shaft.position.y = len / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.0048, 0.011, 16), ARROW);
  head.position.y = len + 0.0055;
  g.add(shaft, head);
  return g;                                          // along +Y, from its base
}
function roundArrow(undo) {
  const g = new THREE.Group();
  const r = 0.0115, sweep = Math.PI * 1.5;
  const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0014, 8, 48, sweep), ARROW);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.0040, 0.009, 16), ARROW);
  const a = sweep;                                   // the arc runs anticlockwise from +X, seen from +Z
  head.position.set(r * Math.cos(a), r * Math.sin(a), 0);
  head.rotation.z = a;                               // cone's +Y along the arc's direction of travel
  g.add(arc, head);
  if (!undo) g.scale.x = -1;                         // clockwise: the same arrow mirrored
  g.rotation.x = -Math.PI / 2;                       // lie in the plane square to +Y
  const holder = new THREE.Group();
  holder.add(g);
  return holder;                                     // turning about +Y, which points out of the screw
}
function outward(anchor) {
  // Blender's anchor +Z (out of the device) is glTF's local +Y
  const q = anchor.getWorldQuaternion(new THREE.Quaternion());
  const d = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  return d.applyQuaternion(pivot.getWorldQuaternion(new THREE.Quaternion()).invert());
}
function buildArrows() {
  arrows.clear();
  const sc = want.scene;
  if (!sc || !sc.arrows || !model) return;
  sc.arrows.forEach(a => {
    const anchors = anchorsOf(a.part);
    const moveDir = DATA.remove && DATA.remove[a.part] ? new THREE.Vector3().fromArray(DATA.remove[a.part]).normalize() : null;
    anchors.forEach(an => {
      const at = pivot.worldToLocal(an.getWorldPosition(new THREE.Vector3()));
      const out = outward(an);
      let g, dir;
      if (a.kind === "unscrew" || a.kind === "screw") { g = roundArrow(a.kind === "unscrew"); dir = out; at.addScaledVector(out, 0.004); }
      else if (a.kind === "press") { g = straightArrow(0.028); dir = out.clone().negate(); at.addScaledVector(out, 0.04); }
      else { g = straightArrow(a.part === "back_cover" ? 0.05 : 0.028); dir = (moveDir || out).clone(); at.addScaledVector(out, 0.004); }
      if (g.userData.round !== true && a.kind !== "unscrew" && a.kind !== "screw") {
        // A straight arrow along the surface normal points straight at the viewer and shows as
        // a dot: lean it 40° so it comes in from outside the device: from the nearer end on the
        // front and back (from below it read as "push up"), from the front on the top and bottom edges.
        const side = Math.abs(out.y) > 0.7 ? new THREE.Vector3(0, 0, 1)
          : new THREE.Vector3(at.x < 0 ? 1 : -1, 0, 0);
        if (Math.abs(dir.dot(out)) > 0.85) {
          const lean = dir.clone().multiplyScalar(Math.cos(0.7)).addScaledVector(side, Math.sin(0.7)).normalize();
          if (a.kind === "press") at.sub(dir.clone().multiplyScalar(0.04)).add(lean.clone().multiplyScalar(-0.04));
          dir = lean;
        }
      }
      g.position.copy(at);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.userData.kind = a.kind;
      arrows.add(g);
    });
  });
}

function applyScene() {
  if (!model) return;
  const sc = want.scene || {};
  const removed = new Set(sc.removed || []), hidden = new Set(sc.hidden || []);
  Object.keys(DATA.remove || {}).concat(Object.keys(DATA.parts)).forEach(id => (DATA.parts[id] || []).forEach(n => {
    const o = nodes[n];
    if (!o) return;
    o.visible = !hidden.has(id);
    if (o.userData.home) o.userData.goal = removed.has(id) && !hidden.has(id) ? o.userData.away : o.userData.home;
    o.userData.motion = null;
    if (o.userData.homeQ) o.quaternion.copy(o.userData.homeQ);
  }));
  // Parts that act out their step on a loop instead of just standing where they end up.
  (sc.motion || []).forEach(m => (DATA.parts[m.part] || []).forEach(n => {
    const o = nodes[n];
    if (o && o.userData.home) o.userData.motion = m.kind;
  }));
  motionStart = clock.getElapsedTime();
  buildArrows();
}

function applyLit() {
  if (!model) return;
  const lit = new Set();
  want.lit.forEach(id => meshesOf(id).forEach(m => lit.add(m)));
  model.traverse(o => {
    if (!o.isMesh) return;
    const b = o.userData.base;
    o.material.color.copy(b.color);
    if (want.lit.length && !lit.has(o)) o.material.color.multiplyScalar(0.35);   // the rest steps back
    o.userData.lit = lit.has(o);
  });
  // Stick rings in one colour, for the InfoMode screen; otherwise their own rainbow.
  ["StickRing_L", "StickRing_R"].forEach(n => nodes[n] && nodes[n].traverse(o => {
    if (!o.isMesh) return;
    const b = o.userData.base;
    if (b.emissiveMap === undefined) b.emissiveMap = o.material.emissiveMap;
    o.material.emissiveMap = want.ring ? null : b.emissiveMap;
    o.userData.ring = want.ring ? new THREE.Color(want.ring) : null;
    o.material.needsUpdate = true;
  }));
  rings.clear();
  want.lit.forEach(id => anchorsOf(id).forEach(a => {
    const s = new THREE.Sprite(RING);
    s.scale.setScalar(0.022);
    a.getWorldPosition(s.position);
    pivot.worldToLocal(s.position);
    rings.add(s);
  }));
}

function fit() {
  if (!host) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const clock = new THREE.Clock();
const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const span = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));

// A step's motion, on a loop. k runs 0 (home) .. 1 (removed).
//   unscrew   — turns anticlockwise as it rises out of its recess, waits, drops back in
//   screw_in  — the same backwards: drops in turning clockwise, waits, lifts out
//   lift_off  — the cover's edge is prised up first, then it lifts away, waits, comes back
function play(o, t) {
  const u = o.userData;
  const T = u.motion === "lift_off" ? 4.5 : 3.2;
  const x = (t % T) / T;
  let k, turn = 0, tip = 0;
  if (u.motion === "unscrew" || u.motion === "screw_in") {
    const out = u.motion === "unscrew" ? ease(span(x, 0.08, 0.62)) * (1 - ease(span(x, 0.86, 1))) :
                                          1 - ease(span(x, 0.08, 0.62)) * (1 - ease(span(x, 0.86, 1)));
    k = out;
    turn = -k * Math.PI * 8;                         // four turns over the way out
  } else {
    const pry = ease(span(x, 0.05, 0.22));
    const lift = ease(span(x, 0.25, 0.6));
    const back = ease(span(x, 0.84, 1));
    tip = 0.1 * pry * (1 - lift) * (1 - back);        // the near edge comes up first
    k = (0.06 * pry + 0.94 * lift) * (1 - back);
  }
  o.position.copy(u.home).lerp(u.away, k);
  o.quaternion.copy(u.homeQ);
  if (turn) o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(u.axis, turn));
  if (tip) o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -tip));
}
function tick() {
  requestAnimationFrame(tick);
  if (!host || !host.isConnected) return;
  const t = clock.getElapsedTime();
  pivot.quaternion.slerp(turnTo, 0.12);
  if (model) {
    const pulse = 0.55 + 0.45 * Math.sin(t * 4);
    model.traverse(o => {
      if (!o.isMesh) return;
      if (o.userData.ring) { o.material.emissive.copy(o.userData.ring); o.material.emissiveIntensity = 2.0; }
      else if (o.userData.lit) { o.material.emissive.copy(ACCENT); o.material.emissiveIntensity = pulse; }
      else { o.material.emissive.copy(o.userData.base.emissive); o.material.emissiveIntensity = o.userData.base.intensity; }
    });
    rings.children.forEach(s => s.scale.setScalar(0.02 + 0.006 * pulse));
    Object.values(nodes).forEach(o => {
      if (o.userData.motion) play(o, t - motionStart);
      else if (o.userData.goal) o.position.lerp(o.userData.goal, 0.08);
    });
    arrows.children.forEach(g => {
      if (g.userData.kind === "unscrew" || g.userData.kind === "screw")
        g.children[0].rotation.z = (g.userData.kind === "unscrew" ? 1 : -1) * t * 2.2;   // turning the way to go
      else g.children.forEach(c => { c.material.opacity = 0.55 + 0.45 * pulse; });
    });
  }
  // Zoom: the view closes in on the part being zoomed, keeping the direction the viewer dragged to.
  const goal = new THREE.Vector3();
  const f = want.zoom > 1 && want.focus ? anchorsOf(want.focus)[0] || meshesOf(want.focus)[0] : null;
  if (f) f.getWorldPosition(goal);
  aim.lerp(goal, 0.12);
  const dir = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(aim);
  const dist = camera.position.distanceTo(aim);
  camera.position.copy(aim).addScaledVector(dir, dist + (BASE_DIST / want.zoom - dist) * 0.12);
  controls.update();
  renderer.render(scene, camera);
}

// The page calls this after every screen it draws. `view` is front/back/top/bottom, `lit` the
// manifest's part ids; opts: { zoom, focus (part id to zoom on), ring (stick ring colour) }.
// Turning to a new side also resets any drag the viewer did.
export function attach(el, view, lit, opts) {
  if (!el) return;
  lastOpts = opts;
  const face = opts && opts.scene && FACES[opts.scene.face] ? opts.scene.face : view;
  const sideChanged = face !== want.view;
  want.view = FACES[view] ? view : "front";
  want.lit = lit || [];
  want.zoom = (opts && opts.zoom) || 1;
  want.focus = (opts && opts.focus) || "";
  want.ring = (opts && opts.ring) || "";
  want.scene = (opts && opts.scene) || null;
  if (want.scene && FACES[want.scene.face]) want.view = want.scene.face;
  if (want.scene && want.scene.zoom && want.zoom === 1) want.zoom = want.scene.zoom;   // a step can stand back to fit its motion
  turnTo.setFromEuler(FACES[want.view]);
  if (sideChanged) controls.reset();
  host = el;
  if (model) {
    el.classList.add("live");
    el.appendChild(renderer.domElement);
    fit();
    applyLit();
    applyScene();
  }
}

new ResizeObserver(fit).observe(document.body);

new GLTFLoader().load(DATA.url, gltf => {
  model = gltf.scene;
  prepare(model);
  prepareMoves();
  const box = new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  pivot.add(model);
  pivot.quaternion.copy(turnTo);
  controls.saveState();
  if (host) attach(host, want.view, want.lit, lastOpts);   // with the scene, zoom and ring it was given
  tick();
}, undefined, err => console.warn("claw3d: model did not load, keeping the flat diagrams", err));

window.Claw3D = { attach, debug: () => ({ arrows: arrows.children.length, view: want.view, scene: want.scene,
  probe: ["Screw_1", "Back_Cover"].map(n => nodes[n] && { n, motion: nodes[n].userData.motion, lit: nodes[n].userData.lit,
    pos: nodes[n].position.toArray().map(v => +v.toFixed(4)), visible: nodes[n].visible }) }) };
window.dispatchEvent(new Event("claw3d-ready"));
