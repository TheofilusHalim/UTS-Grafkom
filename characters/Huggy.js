// characters/Huggy.js -- Huggy Wuggy.
// Hierarki: root -> badan -> kepala -> (rahang atas, rahang bawah, mata -> pupil)
//                         -> lengan atas -> lengan tengah -> tangan -> telapak + 3 jari kerucut menyatu + jempol
//                         -> paha -> betis -> telapak (ellipsoid)
import { Character } from "./Character.js";
import * as B from "../helpers/builders.js";

const FUR_D = [0.14, 0.30, 0.72], FUR_L = [0.24, 0.44, 0.92];
const MUSTARD = [0.80, 0.58, 0.16], RED = [0.80, 0.07, 0.10];
const WHITE = [0.97, 0.97, 0.94], BLACK = [0.02, 0.02, 0.04];
const furColor = (u, v, p) => B.mix(FUR_D, FUR_L, B.noise3(p[0] * 5 + 3, p[1] * 5, p[2] * 5));   // belang halus
const rad = d => d * Math.PI / 180;

const THIGH = 1.74, SHIN = 1.72, HIP = 0.78, FOOT_H = 0.14;   // panjang ruas kaki & tinggi sendi telapak dari lantai

export class Huggy extends Character {
  build() {
    const node = (p, g, pos, eul) => this.node(p, g, pos, eul);

    // ----- Badan: ELLIPSOID + BULU HALUS (shell fur, lihat shader) -----
    const TR = { a: 0.62, b: 0.85, d: 0.40, e1: 0.8, e2: 0.9, taper: 0.12 };
    const torso = node(this.root, B.ellipsoid(TR.a, TR.b, TR.d, furColor, [0, 0, 0], 28, 40), [0, 4.32, 0]);
    torso.furLen = 0.10;

    // ----- Kepala: melebar di atas, menyempit ke dagu. Bulu tidak tumbuh di area wajah (furMask) -----
    const HC = [0, 0.68, 0], H = { a: 0.74, b: 0.62, d: 0.55, e1: 0.5, e2: 0.85, taper: 0.38 };
  const head = node(torso, B.orientOutward(B.superellipsoid(H.a, H.b, H.d, H.e1, H.e2, furColor, { center: HC, taper: H.taper, nu: 32, nv: 44 })), [0, 0.78, 0]);
    head.furLen = 0.09;
    head.furMask = [0, 0.45, 0.55, 0.6];                            // area wajah: bulu DIPENDEKKAN (bukan dibuang), tanpa lingkaran gundul
    const surfZ = (x, y) => B.superSurfZ(x, y, H, HC);

    // ----- CONE: sepasang TELINGA lancip di sudut atas kepala (berbulu, warna sama -> menyatu; tanpa duri) -----
    [-1, 1].forEach(sd => {
      const ear = node(head, B.cone(0.26, 0.5, furColor), [sd * 0.66, 1.18, 0], [0, 0, -sd * 18]);
      ear.furLen = 0.08;
    });

    // ----- Mata: bola HITAM BESAR (hampir memenuhi mata) tepat di atas mulut, hanya cincin putih tipis + kilau -----
    const eyeY = 0.62;
    const eyes = [], pupils = [];
    [-1, 1].forEach(sd => {
      const ex = sd * 0.24;
      const eye = node(head, B.ellipsoid(0.17, 0.18, 0.10, WHITE), [ex, eyeY, surfZ(ex, eyeY) - 0.02]);
      const pupil = node(eye, B.ellipsoid(0.130, 0.130, 0.05, BLACK), [0, 0, 0.065]);
      eyes.push(eye); pupils.push(pupil);
    });

    // ----- 3D CURVE: senyum lebar = B-Spline 7 titik kontrol; bibir atas & bawah masing-masing punya rahang -----
    const mq = x => (x / 0.42) ** 2;
    const yU = x => 0.54 - 0.26 * (1 - mq(x));                      // ujung naik tinggi, tengah turun = senyum melengkung
    const yL = x => yU(x) - (0.07 + 0.07 * (1 - mq(x)));          // tertutup: kedua bibir saling menempel
    const LIP = 0.05, xs = [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42];
    const upPts = xs.map(x => [x, yU(x), surfZ(x, yU(x)) + LIP]);
    const loPts = xs.map(x => [x, yL(x), surfZ(x, yL(x)) + LIP]);
    const upCurve = u => B.bspline(upPts, u), loCurve = u => B.bspline(loPts, u);
    const yMid = (yU(0) + yL(0)) / 2;
    const jawU = node(head, undefined), jawL = node(head, undefined);      // dua rahang, engsel di dalam kepala
    node(jawU, B.tube(upCurve, 0.07, RED));
    node(jawL, B.tube(loCurve, 0.07, RED));

    // ----- CONE: gigi. Diletakkan sedikit DI BELAKANG bibir, jadi tersembunyi saat mulut menutup -----
    [0.28, 0.40, 0.50, 0.60, 0.72].forEach(u => {
      const p = upCurve(u);
      node(jawU, B.cone(0.055, 0.085, WHITE), [p[0], p[1] - 0.03, p[2] - 0.06], [180, 0, 0]);
    });
    [0.34, 0.44, 0.56, 0.66].forEach(u => {
      const p = loCurve(u);
      node(jawL, B.cone(0.05, 0.075, WHITE), [p[0], p[1] + 0.03, p[2] - 0.06]);
    });

    // ----- ELLIPSOID gepeng: bagian dalam mulut (gelap), hanya muncul saat mulut terbuka -----
    const cav = node(head, B.ellipsoid(0.25, 0.09, 0.05, [0.04, 0.0, 0.03]), [0, yMid, surfZ(0, yMid) + 0.01]);

    // ----- 3D CURVE: tali leher (B-Spline) + ujung tali (Bezier), di atas lapisan bulu -----
    const TZ = (x, y) => TR.d * Math.sqrt(Math.max(0.02, 1 - (x / TR.a) ** 2 - (y / TR.b) ** 2));
    const strPts = [-0.38, -0.25, -0.12, 0, 0.12, 0.25, 0.38].map(x => [x, 0.66 - 0.2 * (1 - (x / 0.38) ** 2), 0]);
    strPts.forEach(p => p[2] = TZ(p[0], p[1]) + 0.1);
    node(torso, B.tube(u => B.bspline(strPts, u), 0.028, [0.60, 0.67, 0.72], 40, 6));
    node(torso, B.ellipsoid(0.055, 0.05, 0.04, [0.60, 0.67, 0.72]), [0, 0.46, TZ(0, 0.46) + 0.1]);
    [-1, 1].forEach(s => {
      const tail = [[0.02*s, 0.46], [0.06*s, 0.36], [0.10*s, 0.26], [0.09*s, 0.15]].map(([x, y]) => [x, y, TZ(x, y) + 0.1]);
      node(torso, B.tube(t => B.bezier(tail, t), 0.022, [0.60, 0.67, 0.72], 20, 6));
    });

    // ----- Lengan: lengan atas -> lengan tengah -> tangan (telapak + 3 jari @ 2 ruas) -----
    const makeArm = side => {
      const arc = (len, sd) => t => B.bezier([[0, 0, 0], [0.05 * sd, -len * 0.33, 0.06], [0.02 * sd, -len * 0.66, 0.05], [0, -len, 0]], t);
      const upper = node(torso, B.tube(arc(1.4, side), 0.15, furColor, 30, 14, 0.04), [side * 0.62, 0.55, 0], [0, 0, side * 6]);
      node(upper, B.ellipsoid(0.16, 0.16, 0.16, furColor), [0, 0, 0]).furLen = 0.08;                       // sendi bahu
      const fore  = node(upper, B.tube(arc(1.4, -side), 0.13, furColor, 30, 14, 0.04), [0, -1.4, 0], [0, 0, side * 4]);
      node(fore, B.ellipsoid(0.14, 0.14, 0.14, furColor), [0, 0, 0]).furLen = 0.08;                         // sendi siku
      upper.furLen = 0.09; fore.furLen = 0.09;
      // TANGAN = telapak ELLIPSOID pipih + 3 jari KERUCUT yang menyatu (jarak = 1.5 x jari-jari -> saling menempel) + jempol kecil
      const hand = node(fore, B.ellipsoid(0.23, 0.27, 0.11, MUSTARD, [0, -0.22, 0]), [0, -1.4, 0]);
      const fingerBlock = node(hand, undefined, [0, -0.40, 0]);          // SATU sendi untuk ketiga jari -> bergerak bersamaan
      [-1, 0, 1].forEach(i => node(fingerBlock, B.cone(0.105, 0.30, MUSTARD), [i * 0.135, 0, 0], [180, 0, 0]));   // ujung runcing ke bawah
      const thumb = node(hand, B.cone(0.085, 0.22, MUSTARD), [-side * 0.2, -0.2, 0.02], [180, 0, -side * 30]);
      return { upper, fore, hand, fingerBlock, thumb };
    };
    const armR = makeArm(-1), armL = makeArm(1);

    // ----- Kaki panjang = 3D CURVE (Bezier tube). Telapak = ELLIPSOID pipih -----
    const makeLeg = (sx, seed) => {
      const arc = (len, k) => t => B.bezier([[0, 0, 0], [0, -len * 0.33, 0.08 * k], [0, -len * 0.66, 0.05 * k], [0, -len, 0]], t);
      const thigh = node(torso, B.tube(arc(THIGH, 1), 0.17, furColor, 30, 14, 0.04), [sx * 0.26, -HIP, 0]);
      node(thigh, B.ellipsoid(0.18, 0.18, 0.18, furColor), [0, 0, 0]).furLen = 0.08;
      const shin  = node(thigh, B.tube(arc(SHIN, -1), 0.15, furColor, 30, 14, 0.04), [0, -THIGH, 0]);
      node(shin, B.ellipsoid(0.16, 0.16, 0.16, furColor), [0, 0, 0]).furLen = 0.08;                         // lutut
      thigh.furLen = 0.09; shin.furLen = 0.09;
      const foot  = node(shin, B.ellipsoid(0.38, 0.14, 0.72, MUSTARD), [0, -SHIN, 0.36]);
      return { thigh, shin, foot };
    };
    const legR = makeLeg(-1), legL = makeLeg(1);

    Object.assign(this, { torso, head, jawU, jawL, cav, eyes, pupils, armR, armL, legR, legL, yMid, hinge: [0, yMid, -0.15] });
  }

  // ----- Parameter yang bisa di-keyframe dari story -----
  //  pos, rotY, scale (dari Character)
  //  wave : 0..1 melambai tangan kanan   scare : 0..1 kedua tangan terangkat + membungkuk + mulut lebar
  //  mouth: 0..1 buka mulut manual       look  : -1..1 tengok kepala + arah pandang
  pose(time, dt) {
    const P = this.params, w = P.wave || 0, sc = P.scare || 0, look = P.look || 0;
    const amp = this.walkAmp, ph = this.phase;

    // ---- kaki: paha (sumbu arbitrary di pinggul), lutut menekuk, telapak selalu datar ----
    const sw = Math.sin(ph) * 22 * amp;
    const kL = Math.max(0, -Math.cos(ph)) * 30 * amp, kR = Math.max(0, Math.cos(ph)) * 30 * amp;
    const lean = -16 * sc;                                          // imbangi badan yang membungkuk
    this.legL.thigh.setTransform({ axis: [1, 0, 0.05], angle: sw + lean });
    this.legL.shin.setTransform({ axis: [1, 0, 0], angle: kL });
    this.legL.foot.setTransform({ axis: [1, 0, 0], angle: -(sw + kL) });
    this.legR.thigh.setTransform({ axis: [1, 0, 0.05], angle: -sw + lean });
    this.legR.shin.setTransform({ axis: [1, 0, 0], angle: kR });
    this.legR.foot.setTransform({ axis: [1, 0, 0], angle: sw - kR });

    // ---- PENYESUAI LANTAI: tinggi badan dihitung agar kaki yang paling bawah TEPAT menapak (tidak menembus / melayang) ----
    const reachL = THIGH * Math.cos(rad(sw)) + SHIN * Math.cos(rad(sw + kL));
    const reachR = THIGH * Math.cos(rad(-sw)) + SHIN * Math.cos(rad(-sw + kR));
    const torsoY = FOOT_H + Math.max(reachL, reachR) + HIP;
    this.torso.setTransform({ translate: [0, torsoY - 4.32, 0], scale: [1, 1 + 0.012 * Math.sin(time * 2), 1],
      axis: [1, 0, 0], angle: 16 * sc, pivot: [0, -HIP, 0] });     // membungkuk dengan pivot di pinggul

    // ---- lengan kiri karakter: ayun; saat scare diangkat ke depan sambil sedikit melebar (tidak menembus kepala) ----
    const aSw = Math.sin(ph) * 16 * amp;
    this.armL.upper.setTransform({ rotate: [aSw + Math.sin(time * 1.1) * 2 - 105 * sc, 0, 0], axis: [0.12, 0, 1], angle: 14 * sc });
    this.armL.fore.setTransform({ rotate: [-(8 + 14 * amp * Math.max(0, Math.sin(ph))) - 25 * sc, 0, 0] });
    this.armL.hand.setTransform({ axis: [1, 0.4, 0.2], angle: Math.sin(ph) * 6 * amp });

    // ---- lengan kanan karakter (sisi kiri layar): ayun + MELAMBAI (sumbu arbitrary) ----
    this.armR.upper.setTransform({ rotate: [-aSw * (1 - w) + Math.sin(time * 1.3) * 2 - 105 * sc * (1 - w), 0, 0],
      axis: [0.25, 0, 1], angle: -110 * w - 14 * sc });
    this.armR.fore.setTransform({ rotate: [-(8 + 14 * amp * Math.max(0, -Math.sin(ph))) * (1 - w) - 25 * sc, 0, 0],
      axis: [0.1, 0.05, 1], angle: -70 * w + Math.sin(time * 7) * 22 * w });
    this.armR.hand.setTransform({ axis: [1, 0.4, 0.2], angle: Math.sin(time * 7 + 1) * 18 * w - Math.sin(ph) * 6 * amp });

    // ---- jari: SATU blok (3 jari menyatu): santai sedikit menekuk; bergetar saat melambai; mencengkeram saat scare ----
    [this.armR, this.armL].forEach((arm, idx) => {
      const flutter = (Math.sin(time * 9) * 0.5 + 0.5) * (idx === 0 ? w : 0);
      const c = 12 + 28 * flutter + 40 * sc;
      arm.fingerBlock.setTransform({ rotate: [-c, 0, 0] });
    });

    // ---- kepala (pivot leher) ----
    this.head.setTransform({ axis: [1, 0.2, 0.1], angle: Math.sin(time * 1.7) * 3 + 4 * Math.sin(ph * 2) * amp - 12 * sc,
                             rotate: [0, look * 35, -8 * w] });

    // ---- mulut: rahang ATAS naik, rahang BAWAH turun, keduanya berputar di engsel ----
    const open = Math.min(1, Math.max(w * (0.5 + 0.5 * Math.sin(time * 3)), P.mouth || 0, sc * (0.85 + 0.15 * Math.sin(time * 14))));
    this.jawU.setTransform({ axis: [1, 0, 0], angle: -10 * open, pivot: this.hinge });
    this.jawL.setTransform({ axis: [1, 0, 0], angle: 20 * open, pivot: this.hinge });
    this.cav.setTransform({ scale: [1, 0.02 + 1.8 * open, 1] });

    // ---- mata: kedip, melebar saat scare, pupil mengikuti arah pandang ----
    const b = time % 4, blink = 1 - 0.9 * Math.exp(-(((b - 3.9) / 0.05) ** 2)), big = 1 + 0.2 * sc;
    this.eyes.forEach(e => e.setTransform({ scale: [big, blink * big, 1] }));
    this.pupils.forEach(p => p.setTransform({ translate: [look * 0.05, 0, 0] }));
  }
}
