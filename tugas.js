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
varying vec3 vColor, vNormal, vWorld;
void main() {
  vec4 w = Mmatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vColor = color;
  vNormal = mat3(Mmatrix) * normal;
  gl_Position = Pmatrix * Vmatrix * w;
}`;
const fsSource = `
precision mediump float;
varying vec3 vColor, vNormal, vWorld;
uniform vec3 uTint, uCam, uLP[3], uLC[3];
uniform float uEmissive;
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vWorld);
  if (dot(N, V) < 0.0) N = -N;                       // permukaan dua sisi (hyperboloid, pelana)
  vec3 base = vColor * uTint;
  vec3 light = vec3(0.27, 0.31, 0.42);               // ambient dingin
  light += vec3(0.20, 0.24, 0.32) * max(dot(N, normalize(vec3(0.2, 1.0, 0.4))), 0.0);
  vec3 spec = vec3(0.0);
  for (int i = 0; i < 3; i++) {                      // 3 lampu titik (warna berubah halus)
    vec3 Lv = uLP[i] - vWorld; float d = length(Lv); Lv /= d;
    float att = 1.0 / (1.0 + 0.04 * d + 0.015 * d * d);
    float df = max(dot(N, Lv), 0.0);
    light += uLC[i] * df * att * 2.2;
    vec3 H = normalize(Lv + V);
    spec += uLC[i] * pow(max(dot(N, H), 0.0), 32.0) * att * 0.6 * df;
  }
  vec3 col = base * light + spec + base * uEmissive * 1.5;
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
let playing = true, last = null, free = false, yaw = 0, pitch = 0.15, dist = 16, drag = false, lx = 0, ly = 0;
window.addEventListener("keydown", e => {
  if (e.code === "Space") { playing = !playing; e.preventDefault(); }
  else if (e.code === "ArrowRight") T = Math.min(DURATION, T + 5);
  else if (e.code === "ArrowLeft") T = Math.max(0, T - 5);
  else if (e.code === "KeyR") T = 0;
  else if (e.code === "KeyF") free = !free;
});
canvas.addEventListener("mousedown", e => { drag = true; lx = e.clientX; ly = e.clientY; });
window.addEventListener("mouseup", () => drag = false);
window.addEventListener("mousemove", e => {
  if (!drag || !free) return;
  yaw -= (e.clientX - lx) * 0.005; pitch = Math.max(-1.2, Math.min(1.4, pitch + (e.clientY - ly) * 0.005));
  lx = e.clientX; ly = e.clientY;
});
canvas.addEventListener("wheel", e => { dist = Math.max(3, Math.min(40, dist + e.deltaY * 0.02)); e.preventDefault(); }, { passive: false });
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
  if (free) {                                                      // kamera bebas (mouse drag + scroll)
    const ctr = [0, 3.5, -6];
    eye = [ctr[0] + dist * Math.sin(yaw) * Math.cos(pitch), ctr[1] + dist * Math.sin(pitch), ctr[2] + dist * Math.cos(yaw) * Math.cos(pitch)];
    target = ctr;
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