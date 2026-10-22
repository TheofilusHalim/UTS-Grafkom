// helpers/Environment.js -- LORONG CABANG 3: lorong utama -> hub (persimpangan) -> 3 lorong (kiri / tengah / kanan)
//
//   z = +14 ........ -22 : lorong utama (lebar 10)
//   z = -22 ........ -34 : hub (lebar 30)
//   z = -34 ........ -64 : lorong KIRI   (x = -10, lebar 8, panjang 30)  Huggy,  pintu di ujung
//   z = -34 ........ -56 : lorong TENGAH (x =   0, lebar 8, panjang 22)  Karakter Teman 1
//   z = -34 ........ -56 : lorong KANAN  (x = +10, lebar 8, panjang 22)  Karakter 3
import { MyObject, makeNode } from "../MyObject.js";
import { LIBS } from "./libs.js";
import * as B from "./builders.js";
import { Animated } from "./anim.js";

const YELLOW = [0.95, 0.80, 0.15];
const FLOOR = [0.13, 0.14, 0.17], WALL = [0.17, 0.21, 0.27], RUST = [0.34, 0.18, 0.12];
const GRAY = [0.30, 0.32, 0.36], ORANGE = [0.85, 0.42, 0.10], BROWN = [0.38, 0.24, 0.12];
const CEIL = [0.10, 0.12, 0.15], RED = [1.0, 0.25, 0.18];
const CH = 9.2;                                          // tinggi langit-langit lorong
export const BRANCH_X = { left: -10, mid: 0, right: 10 };

export class Environment extends Animated {
  // parameter yang bisa di-keyframe:
  //   door 0..1 (pintu Huggy terbuka) · alarm 0..1 (lampu jadi merah) · power 0..1 (terang semua lampu)
  //   flick 0..1 (lampu lorong kiri & hub berkedip)
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.root = new MyObject(ctx.GL, ctx.prog, ctx.locs);
    this.params = { door: 0, alarm: 0, power: 1, flick: 0 };
    this.lamps = [];
    this.build();
  }
  attachTo(parent) { parent.add(this.root); return this; }
  node(p, g, pos, eul) { return makeNode(this.ctx, p, g, pos, eul); }

  build() {
    this.buildMainCorridor();
    this.buildHub();
    this.buildBranch({ name: "left",  x: BRANCH_X.left,  len: 30, panel: [0.40, 0.14, 0.10], pipe: ORANGE, n: 1,
                       lamp: [1.0, 0.55, 0.25], alarmW: 1, flickW: 1 });
    this.buildBranch({ name: "mid",   x: BRANCH_X.mid,   len: 22, panel: [0.14, 0.26, 0.38], pipe: [0.20, 0.50, 0.65], n: 2,
                       lamp: [0.35, 0.80, 1.0], alarmW: 0, flickW: 0 });
    this.buildBranch({ name: "right", x: BRANCH_X.right, len: 22, panel: [0.20, 0.30, 0.22], pipe: [0.45, 0.30, 0.65], n: 3,
                       lamp: [0.55, 0.90, 0.60], alarmW: 0, flickW: 0, lamp2: [0.70, 0.45, 1.0] });
    this.buildDoor();
    this.buildProps();
  }

  // lampu gantung: kabel (parent) -> bola lampu (child) = bandul
  addLamp(x, z, ceilY, cable, color, alarmW, flickW, r = 0.32) {
    const c = this.node(this.root, B.cylinder(0.03, cable, GRAY), [x, ceilY, z]);
    const bulb = this.node(c, B.ellipsoid(r, r, r, [1, 1, 1]), [0, -cable, 0]);
    this.lamps.push({ cable: c, bulb, base: color, alarmW, flickW, seed: this.lamps.length });
  }

  // ---------- LORONG UTAMA ----------
  buildMainCorridor() {
    const root = this.root, node = (...a) => this.node(...a);
    node(root, B.box(10, 0.4, 36, FLOOR), [0, -0.2, -4]);                    // lantai
    node(root, B.box(10, 0.4, 36, CEIL), [0, CH + 0.2, -4]);                 // langit-langit
    [-1, 1].forEach(s => {
      node(root, B.box(0.4, 9.4, 36, WALL), [s * 5.2, 4.5, -4]);             // dinding samping
      node(root, B.box(0.3, 2.6, 36, RUST), [s * 4.85, 1.3, -4]);            // panel karat bawah
      node(root, B.box(0.1, 0.25, 36, YELLOW), [s * 4.65, 2.75, -4]);        // garis kuning
      node(root, B.box(0.25, 0.02, 36, YELLOW), [s * 3.4, 0.01, -4]);        // marka lantai
    });
    node(root, B.cylinder(0.25, 36, GRAY),   [-3.8, 8.2, 14], [90, 0, 0]);   // pipa (sumbu y diputar ke sumbu z)
    node(root, B.cylinder(0.18, 36, ORANGE), [3.6, 7.9, 14], [90, 0, 0]);
    [8, 0, -8, -16].forEach(z => this.addLamp(0, z, CH - 0.2, 1.2, [1.0, 0.85, 0.62], 0.4, 0));
  }

  // ---------- HUB ----------
  buildHub() {
    const root = this.root, node = (...a) => this.node(...a);
    const HH = 11.6;
    node(root, B.box(30, 0.4, 12, FLOOR), [0, -0.2, -28]);
    node(root, B.box(30, 0.4, 12, CEIL), [0, 11.4, -28]);
    [-1, 1].forEach(s => {
      node(root, B.box(0.4, HH, 12, WALL), [s * 15.2, 5.6, -28]);            // dinding samping hub
      node(root, B.box(0.3, 2.6, 12, RUST), [s * 14.85, 1.3, -28]);
      node(root, B.box(0.1, 0.25, 12, YELLOW), [s * 14.65, 2.75, -28]);
      node(root, B.box(10, HH, 0.4, WALL), [s * 10, 5.6, -22.2]);            // dinding belakang hub (bukaan lorong utama di tengah)
    });
    node(root, B.box(10.4, 2.4, 0.4, WALL), [0, 10.4, -22.2]);               // ambang atas lorong utama
    // dinding depan hub: tiga bukaan (x = -10, 0, +10; lebar 8)
    [-14.5, -5, 5, 14.5].forEach((x, i) => node(root, B.box(i === 0 || i === 3 ? 1 : 2, HH, 0.4, WALL), [x, 5.6, -34.2]));
    const SIGN = [[1.0, 0.45, 0.15], [0.25, 0.80, 1.0], [0.55, 0.90, 0.40]];
    [-10, 0, 10].forEach((x, i) => {
      node(root, B.box(8.2, 2.4, 0.4, WALL), [x, 10.4, -34.2]);              // ambang di atas bukaan
      const sign = node(root, B.box(3, 0.9, 0.15, SIGN[i]), [x, 10.4, -33.9]);
      sign.emissive = 0.9;                                                   // papan penanda menyala
      for (let k = 0; k <= i; k++) node(root, B.box(0.2, 0.55, 0.06, [1, 1, 1]), [x + (k - i / 2) * 0.5, 10.4, -33.8]).emissive = 1;   // 1, 2, 3 batang
      // marka kuning di lantai dari lorong utama menuju tiap bukaan
      const dx = x, dz = -11.5, len = Math.hypot(dx, dz);
      node(root, B.box(0.25, 0.02, len, YELLOW), [dx / 2, 0.01, -28.25], [0, Math.atan2(dx, dz) * 180 / Math.PI, 0]);
    });
    [-7, 0, 7].forEach(x => this.addLamp(x, -28, 11.2, x === 0 ? 2.2 : 1.6, [1.0, 0.90, 0.75], 0.6, 0.5, x === 0 ? 0.45 : 0.32));
  }

  // ---------- LORONG CABANG ----------
  buildBranch({ name, x, len, panel, pipe, n, lamp, alarmW, flickW, lamp2 }) {
    const root = this.root, node = (...a) => this.node(...a);
    const zc = -34 - len / 2, zEnd = -34 - len;
    node(root, B.box(8.8, 0.4, len, FLOOR), [x, -0.2, zc]);
    node(root, B.box(8.8, 0.4, len, CEIL), [x, CH + 0.2, zc]);
    [-1, 1].forEach(s => {
      node(root, B.box(0.4, 9.4, len, WALL), [x + s * 4.2, 4.5, zc]);
      node(root, B.box(0.3, 2.6, len, panel), [x + s * 3.85, 1.3, zc]);
      node(root, B.box(0.1, 0.25, len, YELLOW), [x + s * 3.65, 2.75, zc]);
      node(root, B.box(0.25, 0.02, len, YELLOW), [x + s * 2.6, 0.01, zc]);
    });
    node(root, B.cylinder(0.22, len, pipe), [x, 8.4, -34], [90, 0, 0]);
    if (name !== "left") node(root, B.box(8.8, 9.4, 0.4, WALL), [x, 4.5, zEnd - 0.2]);   // dinding ujung (lorong kiri punya pintu)
    const lz = name === "left" ? [-40, -48, -56] : [-40, -48];
    lz.forEach((z, i) => this.addLamp(x, z, CH - 0.2, 1.2, (i % 2 && lamp2) ? lamp2 : lamp, alarmW, flickW));
  }

  // ---------- PINTU HUGGY (ujung lorong kiri, z = -64) ----------
  buildDoor() {
    const root = this.root, node = (...a) => this.node(...a);
    const x = BRANCH_X.left, z = -64;
    node(root, B.box(1.8, 9.4, 0.4, WALL), [x - 3.1, 4.5, z - 0.2]);          // dinding kiri-kanan pintu
    node(root, B.box(1.8, 9.4, 0.4, WALL), [x + 3.1, 4.5, z - 0.2]);
    node(root, B.box(4.4, 1.2, 0.4, WALL), [x, 8.6, z - 0.2]);                // ambang atas pintu
    node(root, B.box(4.4, 0.4, 8, FLOOR), [x, -0.2, z - 4.2]);                // ruang gelap di balik pintu (tempat Huggy menunggu)
    node(root, B.box(4.6, 8.4, 0.3, [0.01, 0.01, 0.02]), [x, 4.2, z - 8.4]);
    node(root, B.box(4.6, 0.15, 0.5, [0.05, 0.06, 0.08]), [x, 8.05, z - 0.1]);
    // daun pintu: engsel di tepi kiri -> pivot rotasi
    this.door = node(root, B.box(4.2, 7.8, 0.2, [0.25, 0.10, 0.10]), [x, 3.9, z + 0.1]);
    // garis batas kuning tempat Huggy berhenti mengejar (z = -44)
    node(root, B.box(8, 0.02, 0.35, YELLOW), [x, 0.012, -44]);
    for (let k = -3; k <= 3; k++) node(root, B.box(0.5, 0.025, 0.35, [0.02, 0.02, 0.02]), [x + k * 1.1, 0.014, -44]);
  }

  // ---------- PROPS ----------
  buildProps() {
    const root = this.root, node = (...a) => this.node(...a);
    // lorong utama
    node(root, B.box(1.6, 1.6, 1.6, BROWN), [-3.8, 0.8, -6], [0, 15, 0]);
    node(root, B.box(1.0, 1.0, 1.0, BROWN), [-3.7, 2.1, -6], [0, -10, 0]);
    node(root, B.box(1.3, 1.3, 1.3, BROWN), [3.9, 0.65, -14], [0, -20, 0]);
    node(root, B.cylinder(0.5, 1.3, [0.12, 0.35, 0.40]), [-3.9, 1.3, -18]);
    // hub
    node(root, B.box(1.5, 1.5, 1.5, BROWN), [-13.4, 0.75, -24], [0, 25, 0]);
    node(root, B.box(1.2, 1.2, 1.2, BROWN), [13.4, 0.6, -24.5], [0, -15, 0]);
    node(root, B.cylinder(0.5, 1.3, [0.12, 0.35, 0.40]), [13.3, 1.3, -32]);
    // lorong kiri: tong di dekat dinding
    node(root, B.cylinder(0.5, 1.3, [0.35, 0.12, 0.10]), [-13.4, 1.3, -52]);
    node(root, B.box(1.4, 1.4, 1.4, BROWN), [-13.3, 0.7, -57], [0, 12, 0]);
    // lorong tengah: PANGGUNG pameran = lingkaran cahaya di lantai
    const ring = node(root, B.ellipsoid(2.6, 0.04, 2.6, [0.25, 0.70, 0.95]), [BRANCH_X.mid, 0.02, -46]); ring.emissive = 0.4;
    const ring2 = node(root, B.ellipsoid(3.1, 0.03, 3.1, [0.10, 0.25, 0.40]), [BRANCH_X.mid, 0.015, -46]);
    // lorong kanan: konsol mesin di ujung + lingkaran cahaya hijau-ungu
    const X = BRANCH_X.right;
    node(root, B.box(5, 3.2, 0.8, [0.05, 0.06, 0.09]), [X, 1.6, -55.4]);
    node(root, B.box(1.8, 1.1, 0.06, [0.30, 1.0, 0.55]), [X - 1.3, 2.3, -54.97]).emissive = 0.9;
    node(root, B.box(1.8, 1.1, 0.06, [0.65, 0.35, 1.0]), [X + 1.3, 2.3, -54.97]).emissive = 0.9;
    node(root, B.ellipsoid(2.6, 0.04, 2.6, [0.50, 0.85, 0.55]), [X, 0.02, -46.5]).emissive = 0.3;
    node(root, B.ellipsoid(3.1, 0.03, 3.1, [0.20, 0.12, 0.30]), [X, 0.015, -46.5]);
  }

  update(time, dt) {
    this.sample(time);
    const P = this.params;
    // pintu: rotasi sumbu arbitrary dengan PIVOT di engsel (tepi kiri); sudut negatif = membuka ke arah lorong
    this.door.setTransform({ axis: [0, 1, 0.03], angle: -105 * P.door, pivot: [-2.1, 0, 0] });
    this.lamps.forEach((l, i) => {
      l.cable.setTransform({ axis: [1, 0, 0.3], angle: Math.sin(time * 0.9 + i) * 4 });   // bandul
      const m = Math.min(1, P.alarm * l.alarmW);
      const c = B.mix(l.base, RED, m);                                                   // warna asli <-> merah alarm
      const breathe = 0.93 + 0.07 * Math.sin(time * 0.6 + i * 1.3);
      const flick = 1 - 0.85 * P.flick * l.flickW;                                       // berkedip
      const k = P.power * breathe * flick;
      l.bulb.tint = c.map(v => v * k);
      l.bulb.emissive = (0.85 + 0.15 * Math.sin(time * 23 + i * 5) * (i === 1 ? 1 : 0.3)) * k;
    });
  }

  // 6 lampu titik TERDEKAT dengan titik fokus kamera (shader mendukung 6 lampu)
  lights(focus = [0, 4, 0]) {
    const items = this.lamps.map(l => {
      const p = LIBS.transformPoint(l.bulb.MODEL_MATRIX, [0, 0, 0]);
      return { p, c: l.bulb.tint, d: Math.hypot(p[0] - focus[0], p[1] - focus[1], p[2] - focus[2]) };
    }).sort((a, b) => a.d - b.d).slice(0, 6);
    const pos = [], col = [];
    items.forEach(it => { pos.push(...it.p); col.push(...it.c); });
    return { pos, col };
  }
}