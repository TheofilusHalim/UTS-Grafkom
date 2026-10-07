// tugas.js -- Huggy Wuggy di lorong pabrik (WebGL murni)
import { LIBS } from "./helpers/libs.js";
import { MyObject } from "./MyObject.js";
import * as B from "./helpers/builders.js";

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

// ======================= HELPER =======================
const scene = new MyObject(GL, prog, locs);            // akar (tanpa geometri)
function node(parent, geo, pos = [0,0,0], eul = [0,0,0]) {
  const o = new MyObject(GL, prog, locs, geo);
  o.setPose(pos, eul); parent.add(o); return o;
}
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ======================= WARNA =======================
const FUR_D = [0.25, 0.35, 0.45], FUR_L = [0.34, 0.45, 0.55], FUR_TIP = [0.46, 0.56, 0.64];
const MUSTARD = [0.80, 0.58, 0.16], RED = [0.80, 0.07, 0.10];
const WHITE = [0.95, 0.95, 0.90], BLACK = [0.03, 0.03, 0.05];
const YELLOW = MUSTARD;
const furColor = (u, v, p) => B.mix(FUR_D, FUR_L, B.noise3(p[0]*5 + 3, p[1]*5, p[2]*5));   // bulu belang halus
const fur = (geo, n, len, rad, seed, acc) => B.addFur(geo, n, len, rad, FUR_D, FUR_TIP, seed, acc);

// ======================= KARAKTER (mirip Huggy Wuggy asli: tinggi, kurus, lengan & kaki panjang) =======================
// ----- Badan: superellipsoid (bukan elipsoid biasa) + bulu kerucut -----
const TR = { a: 0.62, b: 0.85, d: 0.40, e1: 0.8, e2: 0.9, taper: 0.12 };
const torso = node(scene, fur(B.superellipsoid(TR.a, TR.b, TR.d, TR.e1, TR.e2, furColor, { taper: TR.taper }), 320, 0.16, 0.05, 1), [0, 0, 0]);

// ----- Kepala: superellipsoid melebar di atas, menyempit ke dagu (bentuk baji seperti aslinya) -----
const HC = [0, 0.68, 0], H = { a: 0.78, b: 0.68, d: 0.58, e1: 0.7, e2: 0.8, taper: 0.22 };
const headGeo = B.superellipsoid(H.a, H.b, H.d, H.e1, H.e2, furColor, { center: HC, taper: H.taper, nu: 32, nv: 44 });
fur(headGeo, 650, 0.11, 0.06, 2, p => !(p[2] > 0.1 && p[1] < 1.05));      // bulu, kecuali area wajah
const head = node(torso, headGeo, [0, 0.78, 0]);                            // pivot kepala = leher
const surfZ = (x, y) => B.superSurfZ(x, y, H, HC);

// ----- CONE: jambul runcing di puncak kepala -----
[[-1, 0.58, 1.20, 30, 0.14, 0.48], [1, 0.58, 1.20, 30, 0.14, 0.48],
 [-1, 0.30, 1.28, 12, 0.10, 0.36], [1, 0.30, 1.28, 12, 0.10, 0.36], [0, 0, 1.30, 0, 0.09, 0.30]]
  .forEach(([sd, x, y, tilt, r, h]) => node(head, B.cone(r, h, FUR_L), [sd * x, y, 0], [0, 0, -sd * tilt]));

// ----- Mata kecil berdekatan (sklera putih + pupil hitam) -----
const eyeY = HC[1] - 0.06;
const eyes = [-1, 1].map(s => {
  const eye = node(head, B.ellipsoid(0.11, 0.12, 0.09, WHITE), [s * 0.2, eyeY, surfZ(s * 0.2, eyeY) - 0.05]);
  node(eye, B.ellipsoid(0.075, 0.085, 0.05, BLACK), [0, 0, 0.065]);
  return eye;
});

// ----- 3D CURVE #1: senyum lebar = B-Spline 7 titik kontrol (bibir tebal, tertutup) -----
const mq = x => (x / 0.5) ** 2;
const yU = x => 0.34 - 0.17 * (1 - mq(x));                      // bibir atas: ujung naik, tengah turun
const yL = x => yU(x) - (0.07 + 0.07 * (1 - mq(x)));            // bibir bawah menempel di bibir atas
const LIP = 0.05, xs = [-0.5, -0.33, -0.17, 0, 0.17, 0.33, 0.5];
const upPts = xs.map(x => [x, yU(x), surfZ(x, yU(x)) + LIP]);
const loPts = xs.map(x => [x, yL(x), surfZ(x, yL(x)) + LIP]);
const upCurve = u => B.bspline(upPts, u), loCurve = u => B.bspline(loPts, u);
node(head, B.tube(upCurve, 0.07, RED));
const jaw = node(head, undefined);                              // rahang: engsel di belakang-atas mulut
node(jaw, B.tube(loCurve, 0.07, RED));

// ----- QUADRIC 2: Hyperboloid 1 sheet = rongga mulut (terlihat saat rahang membuka) -----
const yMid = (yU(0) + yL(0)) / 2;
const mouth = node(head,
  B.hyperboloid1(0.30, 0.25, 0, 1.0, u => B.mix([0.03, 0.0, 0.02], [0.55, 0.04, 0.08], u * u)),
  [0, yMid, 0.33], [90, 0, 0]);

// ----- CONE: gigi runcing, posisinya diambil dari kurva bibir (tersembunyi saat mulut tertutup) -----
[0.16, 0.30, 0.44, 0.56, 0.70, 0.84].forEach(u => {
  const p = upCurve(u);
  node(head, B.cone(0.06, 0.17, WHITE), [p[0], p[1] - 0.03, p[2]], [180, 0, 0]);
});
[0.22, 0.38, 0.50, 0.62, 0.78].forEach(u => {
  const p = loCurve(u);
  node(jaw, B.cone(0.055, 0.15, WHITE), [p[0], p[1] + 0.03, p[2]]);
});

// ----- 3D CURVE #2: tali leher (B-Spline di dada) + ujung tali (Bezier) -----
const TZ = (x, y) => B.superSurfZ(x, y, TR);
const strPts = [-0.38, -0.25, -0.12, 0, 0.12, 0.25, 0.38].map(x => [x, 0.66 - 0.2 * (1 - (x / 0.38) ** 2), 0]);
strPts.forEach(p => p[2] = TZ(p[0], p[1]) + 0.05);
node(torso, B.tube(u => B.bspline(strPts, u), 0.028, [0.60, 0.67, 0.72], 40, 6));
node(torso, B.ellipsoid(0.055, 0.05, 0.04, [0.60, 0.67, 0.72]), [0, 0.46, TZ(0, 0.46) + 0.05]);
[-1, 1].forEach(s => {
  const tail = [[0.02*s, 0.46], [0.06*s, 0.36], [0.10*s, 0.26], [0.09*s, 0.15]].map(([x, y]) => [x, y, TZ(x, y) + 0.05]);
  node(torso, B.tube(t => B.bezier(tail, t), 0.022, [0.60, 0.67, 0.72], 20, 6));
});

// ----- Lengan: HIERARKI Badan -> lengan atas -> lengan tengah -> tangan (mitten kuning) -----
function makeArm(side) {                          // side=-1: lengan kanan karakter (sisi kiri layar)
  const upper = node(torso, fur(B.capsule(0.15, 1.2, furColor), 260, 0.07, 0.055, 10 + side), [side * 0.62, 0.55, 0], [0, 0, side * 6]);
  const fore  = node(upper,  fur(B.capsule(0.13, 1.2, furColor), 260, 0.07, 0.055, 20 + side), [0, -1.4, 0], [0, 0, side * 4]);
  const hand  = node(fore, B.superellipsoid(0.30, 0.48, 0.15, 0.7, 0.8, MUSTARD, { center: [0, -0.40, 0] }), [0, -1.4, 0]);
  return { upper, fore, hand };
}
const armR = makeArm(-1), armL = makeArm(1);

// ----- Kaki panjang: pinggul -> paha -> betis -> telapak -----
// QUADRIC 3: Hyperbolic paraboloid = telapak kaki (pelana dipangkas oval, ujung depan-belakang melengkung naik)
function makeLeg(sx, seed) {
  const thigh = node(torso, fur(B.capsule(0.17, 1.4, furColor), 300, 0.07, 0.06, 30 + seed), [sx * 0.26, -0.78, 0]);
  const shin  = node(thigh,  fur(B.capsule(0.15, 1.4, furColor), 260, 0.07, 0.055, 40 + seed), [0, -1.74, 0]);
  const foot  = node(shin, B.saddle(1.45, 0.75, 0.10, MUSTARD, "oval", 32, 14), [0, -1.74, 0.38], [0, 90, 0]);
  return { thigh, shin, foot };
}
const legR = makeLeg(-1, 0), legL = makeLeg(1, 5);

// ======================= LINGKUNGAN: LORONG PABRIK =======================
const FLOOR = [0.13, 0.14, 0.17], WALL = [0.17, 0.21, 0.27], RUST = [0.34, 0.18, 0.12];
const GRAY = [0.30, 0.32, 0.36], ORANGE = [0.85, 0.42, 0.10], BROWN = [0.38, 0.24, 0.12];
node(scene, B.box(10, 0.4, 44, FLOOR), [0, -0.2, -12]);                 // lantai
node(scene, B.box(10, 0.4, 44, [0.10, 0.12, 0.15]), [0, 9.2, -12]);      // langit-langit
node(scene, B.box(10.8, 9.4, 0.4, WALL), [0, 4.5, -34.2]);               // dinding belakang
[-1, 1].forEach(s => {
  node(scene, B.box(0.4, 9.4, 44, WALL), [s * 5.2, 4.5, -12]);           // dinding samping
  node(scene, B.box(0.3, 2.6, 44, RUST), [s * 4.85, 1.3, -12]);          // panel karat bawah
  node(scene, B.box(0.1, 0.25, 44, YELLOW), [s * 4.65, 2.75, -12]);      // garis kuning-hitam
  node(scene, B.box(0.25, 0.02, 44, YELLOW), [s * 3.4, 0.01, -12]);      // marka lantai
});
// pipa di langit-langit (silinder sumbu y diputar ke sumbu z)
node(scene, B.cylinder(0.25, 44, GRAY),   [-3.8, 8.2, 10], [90, 0, 0]);
node(scene, B.cylinder(0.18, 44, ORANGE), [3.6, 7.9, 10], [90, 0, 0]);
// peti & tong
node(scene, B.box(1.6, 1.6, 1.6, BROWN), [-3.8, 0.8, -6], [0, 15, 0]);
node(scene, B.box(1.0, 1.0, 1.0, BROWN), [-3.7, 2.1, -6], [0, -10, 0]);
node(scene, B.box(1.3, 1.3, 1.3, BROWN), [3.9, 0.65, -14], [0, -20, 0]);
node(scene, B.cylinder(0.5, 1.3, [0.12, 0.35, 0.40]), [-3.9, 1.3, -18]);
// pintu di ujung lorong (engsel di tepi kiri -> pivot rotasi)
node(scene, B.box(3.2, 5.9, 0.15, [0.05, 0.06, 0.08]), [0, 2.95, -33.95]);
const door = node(scene, B.box(2.6, 5.5, 0.2, [0.25, 0.10, 0.10]), [0, 2.75, -33.8]);
// lampu gantung: kabel (parent) -> bola lampu (child) = bandul
const lamps = [-4, -10, -16, -22].map(z => {
  const cable = node(scene, B.cylinder(0.03, 1.2, GRAY), [0, 9.0, z]);
  const bulb = node(cable, B.ellipsoid(0.32, 0.32, 0.32, [1, 1, 1]), [0, -1.2, 0]);
  return { cable, bulb };
});

scene.setup();     // membuat buffer untuk SEMUA node

// ======================= TIMELINE (delta time) =======================
let time = parseFloat(new URLSearchParams(location.search).get("t")) || 0;   // ?t=10 -> lompat ke detik ke-10
let last = null, amp = 0, wave = 0;     // amp = intensitas jalan, wave = intensitas melambai
function timeline(t) {           // siklus 24 detik, mulus (loop sempurna)
  const T = t % 24;
  if (T < 8)  { const k = T / 8;         return { z: lerp(-12, -3, smooth(0, 1, k)), rotY: 0,  amp: Math.sin(Math.PI * k), wave: 0 }; }
  if (T < 12) { return { z: -3, rotY: 0, amp: 0, wave: smooth(8, 8.8, T) * (1 - smooth(11.2, 12, T)) }; }
  if (T < 14) { return { z: -3, rotY: 180 * smooth(12, 14, T), amp: 0, wave: 0 }; }
  if (T < 22) { const k = (T - 14) / 8;  return { z: lerp(-3, -12, smooth(0, 1, k)), rotY: 180, amp: Math.sin(Math.PI * k), wave: 0 }; }
  return { z: -12, rotY: 180 + 180 * smooth(22, 24, T), amp: 0, wave: 0 };
}

GL.enable(GL.DEPTH_TEST);
GL.clearColor(0.02, 0.03, 0.05, 1);
// Kanvas selalu memenuhi jendela; proyeksi mengikuti rasio aspek terbaru
let Pm;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  Pm = LIBS.get_projection(48, canvas.width / canvas.height, 0.1, 100);
}
window.addEventListener("resize", resize);
resize();
canvas.addEventListener("dblclick", () => {            // klik 2x = layar penuh sungguhan
  if (document.fullscreenElement) document.exitFullscreen(); else canvas.requestFullscreen();
});

function animate(ms) {
  const now = ms / 1000;
  const dt = last === null ? 0 : Math.min(0.05, now - last);   // delta time (dibatasi)
  last = now; time += dt;

  const tl = timeline(time);
  const k = 1 - Math.exp(-dt * 6);                              // peredaman eksponensial -> transisi mulus
  amp += (tl.amp - amp) * k;
  wave += (tl.wave - wave) * k;
  const ph = time * 5.5;                                        // fase langkah
  const w = wave;

  // ---- Translate + Rotate(Y) + Scale pada akar karakter ----
  const bob = Math.abs(Math.sin(ph)) * 0.08 * amp;
  torso.setTransform({
    translate: [0, 4.32 + bob, tl.z],
    rotate: [0, tl.rotY, 0],
    scale: [1, 1 + 0.012 * Math.sin(time * 2), 1]               // "bernapas"
  });

  // ---- Kaki: paha (sumbu arbitrary di pinggul), lutut menekuk, telapak dijaga tetap datar ----
  const sw = Math.sin(ph) * 22 * amp;
  const kL = Math.max(0, -Math.cos(ph)) * 30 * amp, kR = Math.max(0, Math.cos(ph)) * 30 * amp;
  legL.thigh.setTransform({ axis: [1, 0, 0.05], angle: sw });
  legL.shin.setTransform({ axis: [1, 0, 0], angle: kL });
  legL.foot.setTransform({ axis: [1, 0, 0], angle: -(sw + kL) });
  legR.thigh.setTransform({ axis: [1, 0, 0.05], angle: -sw });
  legR.shin.setTransform({ axis: [1, 0, 0], angle: kR });
  legR.foot.setTransform({ axis: [1, 0, 0], angle: sw - kR });

  // ---- Lengan kiri karakter: ayun biasa ----
  const aSw = Math.sin(ph) * 16 * amp;
  armL.upper.setTransform({ axis: [1, 0, 0.12], angle: aSw + Math.sin(time * 1.1) * 2 });
  armL.fore.setTransform({ rotate: [-(8 + 14 * amp * Math.max(0, Math.sin(ph))), 0, 0] });
  armL.hand.setTransform({ axis: [1, 0.4, 0.2], angle: Math.sin(ph) * 6 * amp });

  // ---- Lengan kanan karakter (sisi kiri layar): ayun + MELAMBAI ----
  // bahu: ayun (Euler X) lalu terangkat ke samping-atas lewat sumbu arbitrary [0.25,0,1] sebesar -110°
  armR.upper.setTransform({ rotate: [-aSw * (1 - w) + Math.sin(time * 1.3) * 2, 0, 0],
    axis: [0.25, 0, 1], angle: -110 * w });
  // siku: menekuk ke atas -70°, lalu dikibas ±22° di sumbu arbitrary [0.1,0.05,1]
  armR.fore.setTransform({ rotate: [-(8 + 14 * amp * Math.max(0, -Math.sin(ph))) * (1 - w), 0, 0],
    axis: [0.1, 0.05, 1], angle: -70 * w + Math.sin(time * 7) * 22 * w });
  armR.hand.setTransform({ axis: [1, 0.4, 0.2], angle: Math.sin(time * 7 + 1) * 18 * w - Math.sin(ph) * 6 * amp });

  // ---- Kepala (pivot di leher), rahang (pivot di engsel), mata ----
  head.setTransform({ axis: [1, 0.2, 0.1], angle: Math.sin(time * 1.7) * 3 + 4 * Math.sin(ph * 2) * amp,
                      rotate: [0, 0, -8 * w] });
  const open = w * (0.5 + 0.5 * Math.sin(time * 3));                // 0 = tertutup (senyum), 1 = terbuka
  jaw.setTransform({ axis: [1, 0, 0], angle: 26 * open, pivot: [0, 0.35, -0.15] });
  mouth.setTransform({ translate: [0, 0, 0.14 * open], scale: [1.15, 1, 0.002 + 0.62 * open] });
  const b = time % 4;
  const blink = 1 - 0.9 * Math.exp(-(((b - 3.9) / 0.05) ** 2));
  eyes.forEach(e => e.setTransform({ scale: [1, blink, 1] }));

  // ---- Pintu: rotasi sumbu arbitrary dengan PIVOT di engsel (-1.3,0,0) ----
  door.setTransform({ axis: [0, 1, 0.03], angle: 12 + 10 * Math.sin(time * 0.5), pivot: [-1.3, 0, 0] });

  // ---- Lampu: bandul + warna berubah halus (hangat <-> merah alarm) ----
  const lightPos = [], lightCol = [];
  lamps.forEach((l, i) => {
    l.cable.setTransform({ axis: [1, 0, 0.3], angle: Math.sin(time * 0.9 + i) * 5 });
    const m = 0.5 + 0.5 * Math.sin(time * 0.6 + i * 1.3);
    const c = B.mix([1.0, 0.85, 0.62], [1.0, 0.25, 0.18], m);
    l.bulb.tint = c;
    l.bulb.emissive = 0.85 + 0.15 * Math.sin(time * 23 + i * 5) * (i === 1 ? 1 : 0.3);
    if (i < 3) {
      const mm = l.bulb.MODEL_MATRIX;                         // posisi dunia bohlam (frame sebelumnya)
      lightPos.push(...LIBS.transformPoint(mm, [0, 0, 0]));
      lightCol.push(...c);
    }
  });

  // ---- Kamera (sedikit bergoyang) ----
  const eye = [Math.sin(time * 0.3) * 0.8, 3.7 + Math.sin(time * 0.4) * 0.15, 7.5];
  const V = LIBS.lookAt(eye, [0, 3.4, -8], [0, 1, 0]);

  GL.viewport(0, 0, canvas.width, canvas.height);
  GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
  GL.uniformMatrix4fv(uP, false, new Float32Array(Pm));
  GL.uniformMatrix4fv(uV, false, new Float32Array(V));
  GL.uniform3fv(uCam, eye);
  GL.uniform3fv(uLP, new Float32Array(lightPos));
  GL.uniform3fv(uLC, new Float32Array(lightCol));

  scene.render(LIBS.get_I4());
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);