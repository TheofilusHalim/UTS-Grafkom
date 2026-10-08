// helpers/Environment.js -- lorong pabrik (lantai, dinding, pipa, peti, pintu, lampu gantung)
import { MyObject, makeNode } from "../MyObject.js";
import { LIBS } from "./libs.js";
import * as B from "./builders.js";
import { Animated } from "./anim.js";

const YELLOW = [0.95, 0.80, 0.15];

export class Environment extends Animated {
  // parameter yang bisa di-keyframe:  door 0..1 (pintu terbuka) · alarm 0..1 (lampu merah) · power 0..1 (terang lampu)
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.root = new MyObject(ctx.GL, ctx.prog, ctx.locs);
    this.params = { door: 0, alarm: 0, power: 1 };
    this.build();
  }
  attachTo(parent) { parent.add(this.root); return this; }

  build() {
    const root = this.root;
    const node = (p, g, pos, eul) => makeNode(this.ctx, p, g, pos, eul);
    const FLOOR = [0.13, 0.14, 0.17], WALL = [0.17, 0.21, 0.27], RUST = [0.34, 0.18, 0.12];
    const GRAY = [0.30, 0.32, 0.36], ORANGE = [0.85, 0.42, 0.10], BROWN = [0.38, 0.24, 0.12];
    node(root, B.box(10, 0.4, 44, FLOOR), [0, -0.2, -12]);                 // lantai
    node(root, B.box(10, 0.4, 44, [0.10, 0.12, 0.15]), [0, 9.2, -12]);      // langit-langit
    node(root, B.box(10.8, 9.4, 0.4, WALL), [0, 4.5, -34.2]);               // dinding belakang
    [-1, 1].forEach(s => {
      node(root, B.box(0.4, 9.4, 44, WALL), [s * 5.2, 4.5, -12]);           // dinding samping
      node(root, B.box(0.3, 2.6, 44, RUST), [s * 4.85, 1.3, -12]);          // panel karat bawah
      node(root, B.box(0.1, 0.25, 44, YELLOW), [s * 4.65, 2.75, -12]);      // garis kuning-hitam
      node(root, B.box(0.25, 0.02, 44, YELLOW), [s * 3.4, 0.01, -12]);      // marka lantai
    });
    // pipa di langit-langit (silinder sumbu y diputar ke sumbu z)
    node(root, B.cylinder(0.25, 44, GRAY),   [-3.8, 8.2, 10], [90, 0, 0]);
    node(root, B.cylinder(0.18, 44, ORANGE), [3.6, 7.9, 10], [90, 0, 0]);
    // peti & tong
    node(root, B.box(1.6, 1.6, 1.6, BROWN), [-3.8, 0.8, -6], [0, 15, 0]);
    node(root, B.box(1.0, 1.0, 1.0, BROWN), [-3.7, 2.1, -6], [0, -10, 0]);
    node(root, B.box(1.3, 1.3, 1.3, BROWN), [3.9, 0.65, -14], [0, -20, 0]);
    node(root, B.cylinder(0.5, 1.3, [0.12, 0.35, 0.40]), [-3.9, 1.3, -18]);
    // pintu di ujung lorong (engsel di tepi kiri -> pivot rotasi)
    node(root, B.box(3.2, 5.9, 0.15, [0.05, 0.06, 0.08]), [0, 2.95, -33.95]);
    const door = node(root, B.box(2.6, 5.5, 0.2, [0.25, 0.10, 0.10]), [0, 2.75, -33.8]);
    // lampu gantung: kabel (parent) -> bola lampu (child) = bandul
    const lamps = [-4, -10, -16, -22].map(z => {
      const cable = node(root, B.cylinder(0.03, 1.2, GRAY), [0, 9.0, z]);
      const bulb = node(cable, B.ellipsoid(0.32, 0.32, 0.32, [1, 1, 1]), [0, -1.2, 0]);
      return { cable, bulb };
    });


    this.door = door; this.lamps = lamps;
  }

  update(time, dt) {
    this.sample(time);
    const P = this.params;
    // pintu: rotasi sumbu arbitrary dengan PIVOT di engsel; sudut negatif = membuka ke arah lorong
    this.door.setTransform({ axis: [0, 1, 0.03], angle: -100 * P.door, pivot: [-1.3, 0, 0] });
    this.lamps.forEach((l, i) => {
      l.cable.setTransform({ axis: [1, 0, 0.3], angle: Math.sin(time * 0.9 + i) * 5 });   // bandul
      const m = Math.min(1, 0.35 * (0.5 + 0.5 * Math.sin(time * 0.6 + i * 1.3)) + P.alarm);
      const c = B.mix([1.0, 0.85, 0.62], [1.0, 0.25, 0.18], m);                         // hangat <-> merah alarm
      l.bulb.tint = c.map(v => v * P.power);
      l.bulb.emissive = (0.85 + 0.15 * Math.sin(time * 23 + i * 5) * (i === 1 ? 1 : 0.3)) * P.power;
    });
  }

  // posisi & warna 3 lampu titik (untuk shader)
  lights() {
    const pos = [], col = [];
    for (let i = 0; i < 3; i++) {
      const bulb = this.lamps[i].bulb;
      pos.push(...LIBS.transformPoint(bulb.MODEL_MATRIX, [0, 0, 0]));
      col.push(...bulb.tint);
    }
    return { pos, col };
  }
}
