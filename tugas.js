// tugas.js -- PERAKITAN: GL + shader, memasang semua karakter ke satu scene, lalu menjalankan story.
import { LIBS } from "./helpers/libs.js";
import { MyObject } from "./MyObject.js";
import { Animated } from "./helpers/anim.js";
import { Environment } from "./helpers/Environment.js";
import { Huggy } from "./characters/Huggy.js";
import { Dummy } from "./characters/Dummy.js";       // placeholder; ganti dengan karakter buatan temanmu
import { buildStory, DURATION, captions } from "./story.js";

// ======================= SHADER =======================
const vsSource = `
attribute vec3 position, color, normal;
uniform mat4 Pmatrix, Vmatrix, Mmatrix;
uniform mat3 uNormalMat;                 // inverse-transpose: normal benar walau objek diskalakan tak seragam
uniform float uShell, uFurLen;           // lapisan bulu ke-n (0 = kulit) dan panjang bulu
varying vec3 vColor, vNormal, vWorld, vObj;
void main() {
  vec3 p = position + normal * (uShell * uFurLen);        // geser sepanjang normal -> lapisan bulu
  vec4 w = Mmatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vColor = color;
  vNormal = uNormalMat * normal;
  vObj = position;
  gl_Position = Pmatrix * Vmatrix * w;
}`;
const fsSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vColor, vNormal, vWorld, vObj;
uniform vec3 uTint, uCam, uLP[3], uLC[3];
uniform float uEmissive, uShell;
uniform vec4 uMask;                      // bola tanpa bulu (wajah)
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 base = vColor * uTint;
  if (uShell > 0.0) {                                    // ---- BULU: tiap sel = 1 helai; makin tinggi makin banyak yang dibuang
    float fm = uMask.w > 0.0 ? smoothstep(uMask.w * 0.45, uMask.w, distance(vObj, uMask.xyz)) : 1.0;
    float r = hash(floor(vObj * 75.0));
    if (r < uShell || uShell > fm) discard;
    base *= mix(0.55, 1.15, uShell);                     // pangkal lebih gelap, ujung lebih terang
  }
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vWorld);
  if (dot(N, V) < 0.0) N = -N;                           // permukaan dua sisi
  // 1) AMBIENT hemisphere: atas (langit) lebih terang/biru, bawah (lantai) lebih gelap/hangat
  vec3 light = mix(vec3(0.20, 0.18, 0.20), vec3(0.34, 0.40, 0.52), N.y * 0.5 + 0.5);
  // 2) DIFFUSE lampu arah:  max(N·L, 0)
  light += vec3(0.20, 0.24, 0.32) * max(dot(N, normalize(vec3(0.2, 1.0, 0.4))), 0.0);
  vec3 spec = vec3(0.0);
  for (int i = 0; i < 3; i++) {                          // 3) lampu titik lorong: diffuse + specular + redaman jarak
    vec3 Lv = uLP[i] - vWorld; float d = length(Lv); Lv /= d;
    float att = 1.0 / (1.0 + 0.04 * d + 0.015 * d * d);
    float df = max(dot(N, Lv), 0.0);
    light += uLC[i] * df * att * 2.2;
    vec3 H = normalize(Lv + V);                          // Blinn-Phong: (N·H)^shininess
    spec += uLC[i] * pow(max(dot(N, H), 0.0), 32.0) * att * 0.6 * df;
  }
  vec3 col = base * light + spec + base * uEmissive * 1.5;
  col += pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.10 * vec3(0.5, 0.6, 0.8);   // 4) RIM light: tepi siluet
  float fog = smoothstep(12.0, 40.0, length(uCam - vWorld));
  gl_FragColor = vec4(mix(col, vec3(0.02, 0.03, 0.05), fog), 1.0);
}`;

const canvas = document.getElementById("glcanvas");
const GL = canvas.getContext("webgl", { antialias: true });
function compile(type, src) {
  const s = GL.createShader(type); GL.shaderSource(s, src); GL.compileShader(s);
  if (!GL.getShaderParameter(s, GL.COMPILE_STATUS)) console.error(GL.getShaderInfoLog(s));
  return s;
}
const prog = GL.createProgram();
GL.attachShader(prog, compile(GL.VERTEX_SHADER, vsSource));
GL.attachShader(prog, compile(GL.FRAGMENT_SHADER, fsSource));
GL.linkProgram(prog);
GL.useProgram(prog);

const locs = {
  position: GL.getAttribLocation(prog, "position"),
  color:    GL.getAttribLocation(prog, "color"),
  normal:   GL.getAttribLocation(prog, "normal"),
  M:        GL.getUniformLocation(prog, "Mmatrix"),
  N:        GL.getUniformLocation(prog, "uNormalMat"),
  shell:    GL.getUniformLocation(prog, "uShell"),
  furLen:   GL.getUniformLocation(prog, "uFurLen"),
  furMask:  GL.getUniformLocation(prog, "uMask"),
  tint:     GL.getUniformLocation(prog, "uTint"),
  emissive: GL.getUniformLocation(prog, "uEmissive"),
};
const uP = GL.getUniformLocation(prog, "Pmatrix"), uV = GL.getUniformLocation(prog, "Vmatrix");
const uCam = GL.getUniformLocation(prog, "uCam");
const uLP = GL.getUniformLocation(prog, "uLP"), uLC = GL.getUniformLocation(prog, "uLC");
GL.enableVertexAttribArray(locs.position);
GL.enableVertexAttribArray(locs.color);
GL.enableVertexAttribArray(locs.normal);


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
window.addEventListener("keydown", e => {
  keys.add(e.code);
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

  const cap = captions.find(x => T >= x[0] && T < x[1]) || captions[captions.length - 1];
  capEl.textContent = cap[2];
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);