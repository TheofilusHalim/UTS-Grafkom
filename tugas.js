// tugas.js -- PERAKITAN: GL + shader, memasang semua karakter ke satu scene, lalu menjalankan story.
import { LIBS } from "./helpers/libs.js";
import { MyObject } from "./MyObject.js";
import { Animated } from "./helpers/anim.js";
import { Environment } from "./helpers/Environment.js";
import { Huggy } from "./characters/Huggy.js";
import { createRenderer } from "./helpers/shader.js";
import { Dummy } from "./characters/Dummy.js";       // placeholder; ganti dengan karakter buatan temanmu
import { buildStory, DURATION, captions } from "./story.js";

const canvas = document.getElementById("glcanvas");
const { GL, prog, locs, uP, uV, uCam, uLP, uLC } = createRenderer(canvas);   // shader & setup GL ada di helpers/shader.js

// ======================= SCENE: SEMUA KARAKTER DISATUKAN DI SINI =======================
const ctx = { GL, prog, locs };
const scene = new MyObject(GL, prog, locs);                       // akar seluruh dunia

const env = new Environment(ctx).attachTo(scene);
const huggy = new Huggy(ctx, { name: "Huggy" }).attachTo(scene);
const charB = new Dummy(ctx, { name: "Karakter 2", color: [0.20, 0.55, 0.85] }).attachTo(scene);   // GANTI: karakter teman 1
const charC = new Dummy(ctx, { name: "Karakter 3", color: [0.85, 0.30, 0.45] }).attachTo(scene);   // GANTI: karakter teman 2
const actors = [huggy, charB, charC];                             // daftar yang di-update tiap frame

const cam = new Animated();
buildStory({ env, huggy, charB, charC, cam });                    // isi keyframe semua pelaku
scene.setup();                                                    // buat buffer untuk SEMUA node

// ======================= KONTROL BANTU (cerita tetap berjalan otomatis dari kode) =======================
const capEl = document.getElementById("caption");
let T = parseFloat(new URLSearchParams(location.search).get("t")) || 0;
let playing = true, last = null, free = false, drag = false, lx = 0, ly = 0;
const keys = new Set();
const fc = { pos: [0, 3.7, 7.5], yaw: 0, pitch: 0 };                 // kamera bebas (fly camera)
const fwdOf = () => [Math.sin(fc.yaw) * Math.cos(fc.pitch), Math.sin(fc.pitch), -Math.cos(fc.yaw) * Math.cos(fc.pitch)];
let curEye = [0, 4, 8], curTarget = [0, 3, -8];
const statusEl = document.getElementById("camstatus");
window.addEventListener("keydown", e => {
  keys.add(e.code);
  if (e.repeat && (e.code === "KeyF" || e.code === "Space")) return;   // tahan tombol tidak boleh menyalakan-mematikan berulang
  if (e.code === "Space") { playing = !playing; e.preventDefault(); }
  else if (e.code === "ArrowRight") T = Math.min(DURATION, T + 5);
  else if (e.code === "ArrowLeft") T = Math.max(0, T - 5);
  else if (e.code === "KeyR") T = 0;
  else if (e.code === "KeyF") {
    free = !free;
    if (free) {                                                       // mulai dari posisi kamera cerita saat ini
      fc.pos = curEye.slice();
      const d = [curTarget[0] - curEye[0], curTarget[1] - curEye[1], curTarget[2] - curEye[2]], l = Math.hypot(...d);
      fc.yaw = Math.atan2(d[0], -d[2]); fc.pitch = Math.asin(d[1] / l);
    }
  }
});
window.addEventListener("keyup", e => keys.delete(e.code));
window.addEventListener("blur", () => { keys.clear(); drag = false; });   // jendela kehilangan fokus -> lepas semua tombol
canvas.addEventListener("mousedown", e => { drag = true; lx = e.clientX; ly = e.clientY; });
window.addEventListener("mouseup", () => drag = false);
window.addEventListener("mousemove", e => {
  if (!drag || !free) return;
  fc.yaw += (e.clientX - lx) * 0.004;
  fc.pitch = Math.max(-1.5, Math.min(1.5, fc.pitch - (e.clientY - ly) * 0.004));
  lx = e.clientX; ly = e.clientY;
});
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  if (free) { const f = fwdOf(); fc.pos = fc.pos.map((v, i) => v - f[i] * e.deltaY * 0.01); }
}, { passive: false });
canvas.addEventListener("dblclick", () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); });

// ======================= KANVAS PENUH =======================
let Pm;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  Pm = LIBS.get_projection(48, canvas.width / canvas.height, 0.1, 100);
}
window.addEventListener("resize", resize);
resize();

GL.enable(GL.DEPTH_TEST);
GL.clearColor(0.02, 0.03, 0.05, 1);

// ======================= LOOP UTAMA (delta time) =======================
function frame(ms) {
  const real = last === null ? 0 : Math.min(0.05, (ms - last) / 1000);
  last = ms;
  const dt = playing ? real : 0;
  T = Math.min(DURATION, T + dt);                                  // berhenti di akhir cerita (tidak loop)

  env.update(T, dt);
  actors.forEach(a => a.update(T, dt));                            // semua karakter dengan antarmuka yang sama
  cam.sample(T);

  const c = cam.params;
  let eye = c.eye.slice(), target = c.target;
  eye[0] += Math.sin(T * 47) * 0.06 * c.shake; eye[1] += Math.sin(T * 53) * 0.05 * c.shake; eye[2] += Math.sin(T * 41) * 0.05 * c.shake;
  curEye = eye.slice(); curTarget = target.slice();
  if (free) {                                                      // kamera bebas: WASD gerak, Q/E turun-naik, Shift cepat, drag = lihat
    const f = fwdOf(), r = [Math.cos(fc.yaw), 0, Math.sin(fc.yaw)];
    const sp = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 24 : 8) * real;
    const mv = (v, k) => { for (let i = 0; i < 3; i++) fc.pos[i] += v[i] * k; };
    if (keys.has("KeyW")) mv(f, sp);
    if (keys.has("KeyS")) mv(f, -sp);
    if (keys.has("KeyD")) mv(r, sp);
    if (keys.has("KeyA")) mv(r, -sp);
    if (keys.has("KeyE")) fc.pos[1] += sp;
    if (keys.has("KeyQ")) fc.pos[1] -= sp;
    eye = fc.pos.slice();
    target = [eye[0] + f[0], eye[1] + f[1], eye[2] + f[2]];
  }
  const V = LIBS.lookAt(eye, target, [0, 1, 0]);
  const L = env.lights();

  GL.viewport(0, 0, canvas.width, canvas.height);
  GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
  GL.uniformMatrix4fv(uP, false, new Float32Array(Pm));
  GL.uniformMatrix4fv(uV, false, new Float32Array(V));
  GL.uniform3fv(uCam, eye);
  GL.uniform3fv(uLP, new Float32Array(L.pos));
  GL.uniform3fv(uLC, new Float32Array(L.col));
  scene.render(LIBS.get_I4());

  statusEl.textContent = free ? "KAMERA BEBAS aktif - WASD gerak, drag = lihat, F = kembali" : "";
  const cap = captions.find(x => T >= x[0] && T < x[1]) || captions[captions.length - 1];
  capEl.textContent = cap[2];
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
