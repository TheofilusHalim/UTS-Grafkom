// story.js -- ALUR CERITA 100 detik (sutradara). Semua gerakan = keyframe: key(waktu, nilai, easing).
// Karakter/teman cukup memberi nama track yang sama dengan parameter karakternya.
import { key, ease } from "./helpers/anim.js";

export const DURATION = 100;

export const captions = [
  [0, 5, "Lorong pabrik Playtime Co. ... sunyi dan gelap."],
  [5, 17, "Dua pengunjung memasuki lorong."],
  [17, 25, "Mereka berhenti dan saling mengobrol."],
  [25, 30, "Pintu di ujung lorong terbuka sendiri."],
  [30, 46, "Sesosok tinggi berjalan keluar dari kegelapan: Huggy Wuggy."],
  [46, 54, "Huggy tersenyum dan melambai ramah ..."],
  [54, 66, "... lalu tiba-tiba membesar! Mereka berlari!"],
  [66, 72, "Huggy kembali tenang."],
  [72, 80, "Ia melambai ke arah kamera."],
  [80, 96, "Huggy berbalik dan menghilang ke dalam pintu."],
  [96, 100, "TAMAT"]
];

export function buildStory({ env, huggy, charB, charC, cam }) {
  const L = ease.linear;

  // ================= KAMERA =================
  cam.track("eye", [
    key(0, [0, 7, 15]), key(6, [0, 3.9, 9.5]), key(24, [0, 3.9, 9.5]), key(30, [0.5, 3.4, 5.5]),
    key(44, [0, 3.7, 7.5]), key(53, [0, 3.7, 7.5]), key(55, [0, 2.0, 3.5]), key(64, [0, 2.2, 4]),
    key(68, [0.8, 5.8, -3.5]), key(80, [0.8, 5.8, -3.5]), key(90, [0, 3.9, 2]), key(100, [0, 3.9, 9])]);
  cam.track("target", [
    key(0, [0, 2.5, -10]), key(6, [0, 3, -8]), key(24, [0, 3, -8]), key(30, [0, 4.5, -30]),
    key(44, [0, 4, -10]), key(53, [0, 4, -10]), key(55, [0, 5, -9]), key(64, [0, 5, -9]),
    key(68, [0, 5.6, -7.5]), key(80, [0, 5.6, -7.5]), key(90, [0, 3.5, -20]), key(100, [0, 3.5, -30])]);
  cam.track("shake", [key(0, 0), key(54, 0), key(55, 1), key(63, 1), key(66, 0)]);

  // ================= LINGKUNGAN =================
  env.track("door",  [key(0, 0), key(25, 0), key(29, 1)]);
  env.track("alarm", [key(0, 0), key(53.5, 0), key(55, 1), key(65, 1), key(68, 0)]);
  const flick = [key(0, 1), key(53.5, 1)];
  for (let t = 54, i = 0; t < 64; t += 0.3, i++) flick.push(key(t, i % 2 ? 1 : 0.15, L));   // lampu berkedip
  flick.push(key(65, 1), key(94, 1), key(100, 0));                                            // meredup di akhir
  env.track("power", flick);

  // ================= KARAKTER 2 (charB) =================
  charB.track("pos", [
    key(0, [-2.2, 0, 16]), key(5, [-2.2, 0, 16]), key(17, [-2.2, 0, -6]),               // masuk lorong
    key(54.5, [-2.2, 0, -6]), key(63, [-2.2, 0, 16], L)]);                              // lari menuju kamera
  charB.track("rotY", [key(0, 180), key(18, 180), key(20, 90), key(30, 90), key(32, 180), key(54, 180), key(55.5, 0)]);
  charB.track("scale", [key(0, 1), key(48, 1), key(52, 0.85), key(54, 1)]);               // mengkerut ketakutan
  charB.track("wave", [key(0, 0), key(48, 0), key(50, 1), key(53, 1), key(54, 0)]);

  // ================= KARAKTER 3 (charC) =================
  charC.track("pos", [
    key(0, [2.2, 0, 16]), key(7, [2.2, 0, 16]), key(19, [2.2, 0, -6]),
    key(55, [2.2, 0, -6]), key(63.5, [2.2, 0, 16], L)]);
  charC.track("rotY", [key(0, 180), key(20, 180), key(22, 270), key(30, 270), key(32, 180), key(54.5, 180), key(56, 360)]);
  charC.track("scale", [key(0, 1), key(47, 1), key(51, 0.8), key(54.2, 1)]);

  // ================= HUGGY =================
  huggy.track("pos", [
    key(0, [0, 0, -37]), key(27, [0, 0, -37]), key(30.5, [0, 0, -33.2]),               // tersembunyi di balik dinding/pintu
    key(48, [0, 0, -11]), key(54, [0, 0, -11]),                                         // berjalan mendekat
    key(57, [0, 0, -7.5], ease.out), key(82, [0, 0, -7.5]),                             // menerjang maju
    key(99, [0, 0, -37])]);                                                             // berjalan kembali ke pintu
  huggy.track("rotY",  [key(0, 0), key(80, 0), key(82, 180)]);
  huggy.track("scale", [key(0, 1), key(54, 1), key(57, 1.3), key(66, 1.3), key(70, 1)]);   // membesar lalu mengecil
  huggy.track("wave",  [key(0, 0), key(46, 0), key(48, 1), key(53, 1), key(55, 0),
                        key(72, 0), key(74, 1), key(79, 1), key(80.5, 0)]);
  huggy.track("scare", [key(0, 0), key(54, 0), key(56, 1), key(63, 1), key(67, 0)]);
}
