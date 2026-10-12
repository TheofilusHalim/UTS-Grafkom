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