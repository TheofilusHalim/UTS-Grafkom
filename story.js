// story.js -- ALUR CERITA 100 detik. Hanya MEMANGGIL fungsi gerak dari helpers/actions.js.
// Contoh:  moveTo(huggy, 30, 48, [0,0,-11])   = Huggy berjalan ke z=-11 dari detik 30 sampai 48
//          scaleTo(huggy, 54, 57, 1.3)         = Huggy membesar jadi 1.3x
//          pulse(huggy, "wave", 46, 48, 53, 55) = melambai: naik 46-48, tahan sampai 53, turun 55
import { set, param, pulse, moveTo, turnTo, scaleTo, camTo, flicker } from "./helpers/actions.js";
import { ease } from "./helpers/anim.js";

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
  // ================= KAMERA =================
  set(cam, "eye", 0, [0, 7, 15]);  set(cam, "target", 0, [0, 2.5, -10]);  set(cam, "shake", 0, 0);
  camTo(cam, 0, 6,   [0, 3.9, 9.5],   [0, 3, -8]);          // turun ke ketinggian mata
  camTo(cam, 24, 30, [0.5, 3.4, 5.5], [0, 4.5, -30]);       // maju pelan, menoleh ke pintu
  camTo(cam, 30, 44, [0, 3.7, 7.5],   [0, 4, -10]);
  camTo(cam, 53, 55, [0, 2.0, 3.5],   [0, 5, -9]);          // sudut rendah saat Huggy menyerang
  camTo(cam, 64, 68, [0.8, 5.8, -3.5], [0, 5.6, -7.5]);     // close-up wajah
  camTo(cam, 80, 90, [0, 3.9, 2],     [0, 3.5, -20]);       // mundur
  camTo(cam, 90, 100, [0, 3.9, 9],    [0, 3.5, -30]);
  param(cam, "shake", 54, 55, 1);  param(cam, "shake", 63, 66, 0);       // kamera bergetar

  // ================= LINGKUNGAN =================
  param(env, "door", 25, 29, 1);                                          // pintu membuka
  param(env, "alarm", 53.5, 55, 1);  param(env, "alarm", 65, 68, 0);      // lampu jadi merah
  set(env, "power", 0, 1);  set(env, "power", 53.9, 1);                  // tahan terang penuh sampai 53.9
  flicker(env, "power", 54, 64, 0.3, 1, 0.15);                            // lalu berkedip
  param(env, "power", 65, 66, 1);  param(env, "power", 94, 100, 0);       // meredup di akhir

  // ================= KARAKTER 2 (charB) =================
  set(charB, "pos", 0, [-2.2, 0, 16]);  set(charB, "rotY", 0, 180);
  moveTo(charB, 5, 17, [-2.2, 0, -6]);                                    // masuk lorong
  turnTo(charB, 18, 20, 90);  turnTo(charB, 30, 32, 180);                 // mengobrol, lalu menoleh ke pintu
  scaleTo(charB, 48, 52, 0.85);  scaleTo(charB, 52, 54, 1);               // mengkerut ketakutan
  pulse(charB, "wave", 48, 50, 53, 54);                                   // balas melambai
  turnTo(charB, 54, 55.5, 0);  moveTo(charB, 54.5, 63, [-2.2, 0, 16], ease.linear);   // lari ke kamera

  // ================= KARAKTER 3 (charC) =================
  set(charC, "pos", 0, [2.2, 0, 16]);  set(charC, "rotY", 0, 180);
  moveTo(charC, 7, 19, [2.2, 0, -6]);
  turnTo(charC, 20, 22, 270);  turnTo(charC, 30, 32, 180);
  scaleTo(charC, 47, 51, 0.8);  scaleTo(charC, 51, 54.2, 1);
  turnTo(charC, 54.5, 56, 360);  moveTo(charC, 55, 63.5, [2.2, 0, 16], ease.linear);

  // ================= HUGGY =================
  set(huggy, "pos", 0, [0, 0, -37]);                                      // tersembunyi di balik dinding/pintu
  moveTo(huggy, 27, 30.5, [0, 0, -33.2]);                                 // muncul di ambang pintu
  moveTo(huggy, 30.5, 48, [0, 0, -11]);                                   // berjalan mendekat
  pulse(huggy, "wave", 46, 48, 53, 55);                                   // melambai ramah
  moveTo(huggy, 54, 57, [0, 0, -7.5], ease.out);                          // menerjang
  scaleTo(huggy, 54, 57, 1.3);  scaleTo(huggy, 66, 70, 1);                // membesar lalu mengecil
  pulse(huggy, "scare", 54, 56, 63, 67);                                  // tangan terangkat + mulut lebar
  pulse(huggy, "wave", 72, 74, 79, 80.5);                                 // melambai ke kamera
  turnTo(huggy, 80, 82, 180);  moveTo(huggy, 82, 99, [0, 0, -37]);        // berbalik, kembali ke pintu
}