// helpers/actions.js -- "KOSAKATA GERAK". Cerita tinggal memanggil fungsi-fungsi ini.
// Semua fungsi bekerja untuk karakter / kamera / lingkungan apa pun yang punya track (Animated).
// Aturan: panggil secara berurutan menurut waktu untuk satu objek.
import { key, ease } from "./anim.js";

// langsung taruh nilai pada waktu t (tanpa transisi)          set(huggy, "pos", 0, [0,0,-37])
export const set = (a, name, t, v) => a.addKeys(name, [key(t, v)]);

// ubah param dari nilai saat ini (pada t0) ke nilai v (pada t1)  param(huggy, "scare", 54, 56, 1)
export const param = (a, name, t0, t1, v, e) => a.addKeys(name, [key(t0, a.valueAt(name, t0), e), key(t1, v)]);

// naik lalu turun: 0 -> peak (t0..t1), tahan sampai t2, kembali 0 di t3       pulse(huggy, "wave", 46, 48, 53, 55)
export const pulse = (a, name, t0, t1, t2, t3, peak = 1) =>
  a.addKeys(name, [key(t0, 0), key(t1, peak), key(t2, peak), key(t3, 0)]);

// berjalan ke posisi `to` selama t0..t1 (kaki melangkah otomatis sesuai kecepatan)
export const moveTo  = (a, t0, t1, to, e) => param(a, "pos", t0, t1, to, e);
// putar badan (derajat, sumbu Y)
export const turnTo  = (a, t0, t1, deg, e) => param(a, "rotY", t0, t1, deg, e);
// membesar / mengecil
export const scaleTo = (a, t0, t1, s, e) => param(a, "scale", t0, t1, s, e);
// kamera: pindah posisi mata dan titik pandang
export const camTo = (cam, t0, t1, eye, target) => { param(cam, "eye", t0, t1, eye); param(cam, "target", t0, t1, target); };
// berkedip: nilai bergantian hi/lo setiap `step` detik pada t0..t1
export function flicker(a, name, t0, t1, step, hi, lo) {
  const k = [];
  for (let t = t0, i = 0; t < t1; t += step, i++) k.push(key(t, i % 2 ? hi : lo, ease.linear));
  a.addKeys(name, k);
}
// TEMPEL di AKHIR helpers/actions.js (di bawah fungsi flicker). Import di baris atas tidak berubah.
// ======================= KAMERA (shot sinematik) =======================
// Inti: tulis keyframe kamera dari fungsi fn(u, t) -> { eye, target }  (u = 0..1 selama t0..t1).
// Shot berhenti 0.02 dtk sebelum t1 -> pindah ke shot berikutnya terlihat sebagai POTONGAN (cut), bukan meluncur.
export function camShot(cam, t0, t1, fn, step = 0.25) {
  const n = Math.max(2, Math.ceil((t1 - t0) / step)), kE = [], kT = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0 - 0.02) * i / n, s = fn(i / n, t);
    kE.push(key(t, s.eye, ease.linear)); kT.push(key(t, s.target, ease.linear));
  }
  cam.addKeys("eye", kE); cam.addKeys("target", kT);
}
const mixV = (a, b, e) => a.map((x, i) => x + (b[i] - x) * e);

// DOLLY / CRANE / ZOOM: geser mata & titik pandang dari keadaan awal ke akhir    camMove(cam, 0, 6, eye0, tgt0, eye1, tgt1)
export const camMove = (cam, t0, t1, eye0, tgt0, eye1, tgt1, e = ease.inOut) =>
  camShot(cam, t0, t1, u => ({ eye: mixV(eye0, eye1, e(u)), target: mixV(tgt0, tgt1, e(u)) }));

// PANNING: mata diam, kamera menoleh ke deretan titik `targets` satu per satu (berhenti halus di tiap titik)
export const panCam = (cam, t0, t1, eye, targets) =>
  camShot(cam, t0, t1, u => {
    const seg = Math.min(targets.length - 2, Math.floor(u * (targets.length - 1))), lu = u * (targets.length - 1) - seg;
    return { eye, target: mixV(targets[seg], targets[seg + 1], ease.inOut(lu)) };
  });

// TRACKING / OVER-THE-SHOULDER / FIRST-PERSON: kamera mengikuti `actor`.
// off & look dalam kerangka lokal karakter: [kanan, atas, depan]  (depan negatif = di belakang karakter)
export function followCam(cam, actor, t0, t1, off, look) {
  camShot(cam, t0, t1, (u, t) => {
    const p = actor.valueAt("pos", t), r = actor.valueAt("rotY", t) * Math.PI / 180;
    const f = [Math.sin(r), 0, Math.cos(r)], rt = [-Math.cos(r), 0, Math.sin(r)];
    const at = v => [p[0] + rt[0] * v[0] + f[0] * v[2], p[1] + v[1], p[2] + rt[2] * v[0] + f[2] * v[2]];
    return { eye: at(off), target: at(look) };
  }, 0.1);
}

// ORBIT: mata berputar mengelilingi `center` (derajat a0 -> a1; 0 = di sisi +z), radius & tinggi tetap
export const orbitCam = (cam, t0, t1, center, radius, height, a0, a1, e = ease.inOut) =>
  camShot(cam, t0, t1, u => {
    const a = (a0 + (a1 - a0) * e(u)) * Math.PI / 180;
    return { eye: [center[0] + Math.sin(a) * radius, height, center[2] + Math.cos(a) * radius], target: center };
  });

// pindah posisi karakter secara instan (potongan adegan)          jump(charB, 80, [10,0,-35])
export const jump = (a, t, to) => a.addKeys("pos", [key(t - 0.001, a.valueAt("pos", t - 0.001), ease.linear), key(t, to)]);