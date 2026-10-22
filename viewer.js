// viewer.js -- DISPLAY KARAKTER: satu karakter diam (tanpa animasi) yang bisa diputar dengan mouse.
// Dipakai tiap anggota untuk memeriksa karakternya sendiri tanpa menjalankan cerita.
// Buka:  viewer.html?char=Huggy        (daftar karakter ada di CHARACTERS di bawah)
import { LIBS } from "./helpers/libs.js";
import { MyObject } from "./MyObject.js";
import * as B from "./helpers/builders.js";
import { createRenderer } from "./helpers/shader.js";

// ======================= DAFTAR KARAKTER =======================
// Karakter baru dari teman: tambahkan SATU baris di sini (nama tampilan, file, nama class).
const CHARACTERS = {
  "Huggy":            { file: "./characters/Huggy.js", cls: "Huggy" },
  "Dummy (template)": { file: "./characters/Dummy.js", cls: "Dummy" },
};

const qs = new URLSearchParams(location.search);
const name = CHARACTERS[qs.get("char")] ? qs.get("char") : Object.keys(CHARACTERS)[0];
const pick = document.getElementById("pick");
Object.keys(CHARACTERS).forEach(n => { const o = document.createElement("option"); o.value = o.textContent = n; o.selected = n === name; pick.appendChild(o); });
pick.onchange = () => { location.search = "?char=" + encodeURIComponent(pick.value); };

// ======================= GL + SCENE =======================
const canvas = document.getElementById("glcanvas");
const { GL, prog, locs, uP, uV, uCam, uLP, uLC, uFog } = createRenderer(canvas);
GL.uniform2f(uFog, 1e6, 2e6);                                    // kabut dimatikan (kabut hanya untuk lorong)
const ctx = { GL, prog, locs };

const scene = new MyObject(GL, prog, locs);
const info = CHARACTERS[name];
const mod = await import(info.file);
const character = new mod[info.cls](ctx, { name });
character.attachTo(scene);
character.update(0, 0);                                          // SEKALI SAJA: pose diam. Tidak ada animasi di viewer.

// ---- ukuran karakter: kumpulkan semua titik di ruang dunia (MODEL = Parent x Pose x Move, sama seperti render) ----
const box = { minY: Infinity, maxY: -Infinity, rXZ: 0 };
(function measure(node, parentM) {
  const M = LIBS.multiply(parentM, LIBS.multiply(node.POSITION_MATRIX, node.MOVE_MATRIX));
  const V = node.vertex;
  for (let i = 0; i < V.length; i += 9) {
    const p = LIBS.transformPoint(M, [V[i], V[i + 1], V[i + 2]]);
    box.minY = Math.min(box.minY, p[1]); box.maxY = Math.max(box.maxY, p[1]);
    box.rXZ = Math.max(box.rXZ, Math.hypot(p[0], p[2]));
  }
  node.childs.forEach(c => measure(c, M));
})(scene, LIBS.get_I4());
const H = box.maxY - box.minY, cy = (box.minY + box.maxY) / 2;

// ---- panggung bundar di bawah kaki ----
const R = Math.max(box.rXZ * 1.35, H * 0.22);
const stage = new MyObject(GL, prog, locs, B.ellipsoid(R, 0.07 * R / 2, R, [0.55, 0.60, 0.60], [0, -0.07 * R / 2, 0], 10, 48));
scene.add(stage);
scene.setup();                                                   // buffer untuk semua node

// ======================= KAMERA ORBIT =======================
const FOV = 48, rad = d => d * Math.PI / 180;
const fitDist = (H / 2) / Math.tan(rad(FOV) / 2) * 1.15 + box.rXZ;
const home = () => ({ yaw: rad(parseFloat(qs.get("yaw") ?? 20)), pitch: rad(parseFloat(qs.get("pitch") ?? 8)), dist: fitDist, target: [0, cy, 0] });
let view = home(), auto = false, drag = null;

canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointerup", () => drag = null);
canvas.addEventListener("pointermove", e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (drag.pan) {                                                // geser: target bergerak sepanjang sumbu kanan & atas kamera
    const k = view.dist * 0.0012, rx = Math.cos(view.yaw), rz = -Math.sin(view.yaw);
    view.target[0] -= rx * dx * k; view.target[2] -= rz * dx * k; view.target[1] += dy * k;
  } else {                                                       // putar: yaw (kiri-kanan), pitch (atas-bawah)
    view.yaw -= dx * 0.008;
    view.pitch = Math.max(-1.4, Math.min(1.4, view.pitch + dy * 0.006));
  }
});
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  view.dist = Math.max(fitDist * 0.25, Math.min(fitDist * 3, view.dist * (1 + Math.sign(e.deltaY) * 0.08)));
}, { passive: false });
canvas.addEventListener("dblclick", () => { view = home(); });
const BGS = ["#7f9a96", "#2c3440", "#e6e1d6"];
let bg = 0;
window.addEventListener("keydown", e => {
  if (e.repeat) return;
  if (e.code === "Digit1") view.yaw = 0;                         // depan
  else if (e.code === "Digit2") view.yaw = rad(90);              // samping
  else if (e.code === "Digit3") view.yaw = rad(180);             // belakang
  else if (e.code === "Digit4") view.pitch = rad(80);            // atas
  else if (e.code === "KeyR") auto = !auto;
  else if (e.code === "KeyB") { bg = (bg + 1) % BGS.length; document.body.style.background = BGS[bg]; }
});

// ======================= RENDER =======================
let Pm;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  Pm = LIBS.get_projection(FOV, canvas.width / canvas.height, 0.1, 400);
}
window.addEventListener("resize", resize);
resize();
GL.enable(GL.DEPTH_TEST);
GL.clearColor(0, 0, 0, 0);                                       // transparan -> latar diatur CSS

const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
let last = null;
function frame(ms) {
  const dt = last === null ? 0 : Math.min(0.05, (ms - last) / 1000); last = ms;
  if (auto) view.yaw += 0.5 * dt;

  const d = view.dist, p = view.pitch, y = view.yaw, tg = view.target;
  const eye = [tg[0] + d * Math.sin(y) * Math.cos(p), tg[1] + d * Math.sin(p), tg[2] + d * Math.cos(y) * Math.cos(p)];
  const f = norm([tg[0] - eye[0], tg[1] - eye[1], tg[2] - eye[2]]);
  const r = norm(cross(f, [0, 1, 0])), u = cross(r, f);          // kanan & atas kamera

  // PENCAHAYAAN 3 TITIK (menempel di kamera, jadi cahaya konsisten saat diputar):
  //  key  = utama, kiri-atas, hangat   | fill = pengisi, kanan, dingin & redup   | back = rim dari belakang atas
  const S = Math.max(d, H);
  const lights = [
    { pos: [eye[0] + u[0]*S*0.6 - r[0]*S*0.7, eye[1] + u[1]*S*0.6 - r[1]*S*0.7, eye[2] + u[2]*S*0.6 - r[2]*S*0.7], col: [1.0, 0.93, 0.82], k: 1.0 },
    { pos: [eye[0] + r[0]*S*0.9, eye[1] + r[1]*S*0.9, eye[2] + r[2]*S*0.9],                                       col: [0.45, 0.58, 0.85], k: 0.5 },
    { pos: [tg[0] - f[0]*S*0.9 + u[0]*S*0.9 + r[0]*S*0.3, tg[1] - f[1]*S*0.9 + u[1]*S*0.9 + r[1]*S*0.3, tg[2] - f[2]*S*0.9 + u[2]*S*0.9 + r[2]*S*0.3], col: [0.85, 0.9, 1.0], k: 0.8 },
  ];
  const LP = [], LC = [];
  lights.forEach(l => {
    const dd = Math.hypot(l.pos[0] - tg[0], l.pos[1] - tg[1], l.pos[2] - tg[2]);
    const comp = (1 + 0.04 * dd + 0.015 * dd * dd) * 0.3;        // imbangi redaman jarak di shader agar terang sama untuk karakter besar/kecil
    LP.push(...l.pos); LC.push(l.col[0] * l.k * comp, l.col[1] * l.k * comp, l.col[2] * l.k * comp);
  });

  GL.viewport(0, 0, canvas.width, canvas.height);
  GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
  GL.uniformMatrix4fv(uP, false, new Float32Array(Pm));
  GL.uniformMatrix4fv(uV, false, new Float32Array(LIBS.lookAt(eye, tg, [0, 1, 0])));
  GL.uniform3fv(uCam, eye);
  GL.uniform3fv(uLP, new Float32Array(LP));
  GL.uniform3fv(uLC, new Float32Array(LC));
  scene.render(LIBS.get_I4());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
