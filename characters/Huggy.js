// characters/Huggy.js -- Huggy Wuggy. Hierarki: root -> badan -> (kepala -> rahang/mata) / (lengan atas -> tengah -> tangan) / (paha -> betis -> telapak)
import { Character } from "./Character.js";
import * as B from "../helpers/builders.js";

// ======================= WARNA =======================
const FUR_D = [0.25, 0.35, 0.45], FUR_L = [0.34, 0.45, 0.55], FUR_TIP = [0.46, 0.56, 0.64];
const MUSTARD = [0.80, 0.58, 0.16], RED = [0.80, 0.07, 0.10];
const WHITE = [0.95, 0.95, 0.90], BLACK = [0.03, 0.03, 0.05];
const YELLOW = MUSTARD;
const furColor = (u, v, p) => B.mix(FUR_D, FUR_L, B.noise3(p[0]*5 + 3, p[1]*5, p[2]*5));   // bulu belang halus
const fur = (geo, n, len, rad, seed, acc) => B.addFur(geo, n, len, rad, FUR_D, FUR_TIP, seed, acc);


export class Huggy extends Character {
  build() {
    const node = (p, g, pos, eul) => this.node(p, g, pos, eul);

    // ======================= KARAKTER (mirip Huggy Wuggy asli: tinggi, kurus, lengan & kaki panjang) =======================
    // ----- Badan: superellipsoid (bukan elipsoid biasa) + bulu kerucut -----
    const TR = { a: 0.62, b: 0.85, d: 0.40, e1: 0.8, e2: 0.9, taper: 0.12 };
    const torso = node(this.root, fur(B.superellipsoid(TR.a, TR.b, TR.d, TR.e1, TR.e2, furColor, { taper: TR.taper }), 900, 0.07, 0.07, 1), [0, 4.32, 0]);   // origin karakter = telapak kaki -> badan diangkat

    // ----- Kepala: superellipsoid melebar di atas, menyempit ke dagu (bentuk baji seperti aslinya) -----
    const HC = [0, 0.68, 0], H = { a: 0.78, b: 0.68, d: 0.58, e1: 0.7, e2: 0.8, taper: 0.22 };
    const headGeo = B.superellipsoid(H.a, H.b, H.d, H.e1, H.e2, furColor, { center: HC, taper: H.taper, nu: 32, nv: 44 });
    fur(headGeo, 650, 0.075, 0.06, 2, p => !(p[2] > 0.1 && p[1] < 1.05));      // bulu, kecuali area wajah
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
      node(head, B.cone(0.06, 0.12, WHITE), [p[0], p[1] - 0.03, p[2]], [180, 0, 0]);
    });
    [0.22, 0.38, 0.50, 0.62, 0.78].forEach(u => {
      const p = loCurve(u);
      node(jaw, B.cone(0.055, 0.10, WHITE), [p[0], p[1] + 0.03, p[2]]);
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


    Object.assign(this, { torso, head, jaw, mouth, eyes, armR, armL, legR, legL });
  }

  // ----- Parameter yang bisa di-keyframe dari story -----
  //  pos, rotY, scale (dari Character)
  //  wave  : 0..1  melambai tangan kanan        scare : 0..1  mengangkat kedua tangan + membungkuk + rahang terbuka
  //  mouth : 0..1  buka mulut manual            look  : -1..1 tengok kepala kiri/kanan
  pose(time, dt) {
    const P = this.params, w = P.wave || 0, sc = P.scare || 0, look = P.look || 0;
    const amp = this.walkAmp, ph = this.phase;

    // badan: napas, naik-turun saat jalan, membungkuk dengan PIVOT di pinggul (arbitrary axis)
    const bob = Math.abs(Math.sin(ph)) * 0.08 * amp;
    this.torso.setTransform({ translate: [0, bob, 0], scale: [1, 1 + 0.012 * Math.sin(time * 2), 1],
      axis: [1, 0, 0], angle: 16 * sc, pivot: [0, -0.78, 0] });

    // kaki: paha (sumbu arbitrary di pinggul), lutut, telapak tetap datar. -16*sc mengimbangi badan yang membungkuk
    const sw = Math.sin(ph) * 22 * amp;
    const kL = Math.max(0, -Math.cos(ph)) * 30 * amp, kR = Math.max(0, Math.cos(ph)) * 30 * amp;
    const lean = -16 * sc;
    this.legL.thigh.setTransform({ axis: [1, 0, 0.05], angle: sw + lean });
    this.legL.shin.setTransform({ axis: [1, 0, 0], angle: kL });
    this.legL.foot.setTransform({ axis: [1, 0, 0], angle: -(sw + kL) });
    this.legR.thigh.setTransform({ axis: [1, 0, 0.05], angle: -sw + lean });
    this.legR.shin.setTransform({ axis: [1, 0, 0], angle: kR });
    this.legR.foot.setTransform({ axis: [1, 0, 0], angle: sw - kR });

    // lengan kiri karakter: ayun + terangkat saat scare
    const aSw = Math.sin(ph) * 16 * amp;
    this.armL.upper.setTransform({ axis: [1, 0, 0.12], angle: aSw + Math.sin(time * 1.1) * 2 - 105 * sc });
    this.armL.fore.setTransform({ rotate: [-(8 + 14 * amp * Math.max(0, Math.sin(ph))) - 25 * sc, 0, 0] });
    this.armL.hand.setTransform({ axis: [1, 0.4, 0.2], angle: Math.sin(ph) * 6 * amp });

    // lengan kanan karakter (sisi kiri layar): ayun + MELAMBAI (sumbu arbitrary) + scare
    this.armR.upper.setTransform({ rotate: [-aSw * (1 - w) + Math.sin(time * 1.3) * 2 - 105 * sc * (1 - w), 0, 0],
      axis: [0.25, 0, 1], angle: -110 * w });
    this.armR.fore.setTransform({ rotate: [-(8 + 14 * amp * Math.max(0, -Math.sin(ph))) * (1 - w) - 25 * sc, 0, 0],
      axis: [0.1, 0.05, 1], angle: -70 * w + Math.sin(time * 7) * 22 * w });
    this.armR.hand.setTransform({ axis: [1, 0.4, 0.2], angle: Math.sin(time * 7 + 1) * 18 * w - Math.sin(ph) * 6 * amp });

    // kepala (pivot leher), rahang (pivot engsel), rongga mulut, mata
    this.head.setTransform({ axis: [1, 0.2, 0.1], angle: Math.sin(time * 1.7) * 3 + 4 * Math.sin(ph * 2) * amp - 12 * sc,
                             rotate: [0, look * 35, -8 * w] });
    const open = Math.min(1, Math.max(w * (0.5 + 0.5 * Math.sin(time * 3)), P.mouth || 0, sc * (0.85 + 0.15 * Math.sin(time * 14))));
    this.jaw.setTransform({ axis: [1, 0, 0], angle: 26 * open, pivot: [0, 0.35, -0.15] });
    this.mouth.setTransform({ translate: [0, 0, 0.14 * open], scale: [1.15, 1, 0.002 + 0.62 * open] });
    const b = time % 4, blink = 1 - 0.9 * Math.exp(-(((b - 3.9) / 0.05) ** 2)), big = 1 + 0.25 * sc;
    this.eyes.forEach(e => e.setTransform({ scale: [big, blink * big, 1] }));
  }
}
