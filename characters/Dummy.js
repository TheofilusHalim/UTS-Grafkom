// characters/Dummy.js -- KARAKTER CONTOH / TEMPLATE untuk teman satu tim.
//
// CARA PAKAI (untuk teman):
//   1. Copy file ini jadi characters/NamaKarakter.js, ganti nama class.
//   2. Isi build(): susun bagian tubuh dengan this.node(parent, geometri, [x,y,z], [rotX,rotY,rotZ]).
//      Origin this.root = TELAPAK KAKI (y=0 = lantai). Hadap default = +z (menghadap kamera).
//   3. Isi pose(): atur sudut sendi pakai setTransform({axis, angle, pivot, rotate, translate, scale}).
//      Yang tersedia otomatis: this.phase (fase langkah), this.walkAmp (0..1), this.params.* (dari keyframe).
//   4. Di tugas.js cukup:  import { NamaKarakter } ...;  const x = new NamaKarakter(ctx).attachTo(scene);  actors.push(x);
//      Gerakannya (posisi, putar, skala, parameter custom) diatur lewat keyframe di story.js.
import { Character } from "./Character.js";
import * as B from "../helpers/builders.js";

export class Dummy extends Character {
  build() {
    const c = this.opts.color || [0.9, 0.5, 0.2], skin = this.opts.skin || [0.95, 0.80, 0.65];
    const pants = this.opts.pants || [0.15, 0.18, 0.30];
    this.strideK = 5;                                               // kaki lebih pendek dari Huggy -> langkah lebih rapat
    const body = this.node(this.root, B.ellipsoid(0.45, 0.7, 0.30, c), [0, 2.3, 0]);          // badan (elipsoid, boleh)
    const head = this.node(body, B.ellipsoid(0.36, 0.40, 0.34, skin, [0, 0.42, 0]), [0, 0.68, 0]);
    [-1, 1].forEach(s => this.node(head, B.ellipsoid(0.05, 0.06, 0.04, [0.05, 0.05, 0.08]), [s * 0.14, 0.5, 0.31]));
    const arm = side => {
      const up = this.node(body, B.capsule(0.10, 0.50, c), [side * 0.55, 0.55, 0], [0, 0, side * 6]);
      const fo = this.node(up, B.capsule(0.09, 0.45, skin), [0, -0.7, 0]);
      return { up, fo };
    };
    const leg = sx => {
      const l = this.node(body, B.capsule(0.14, 1.30, pants), [sx * 0.2, -0.65, 0]);
      this.node(l, B.ellipsoid(0.15, 0.09, 0.26, [0.1, 0.1, 0.12], [0, 0, 0.08]), [0, -1.62, 0]);
      return l;
    };
    Object.assign(this, { body, head, armR: arm(-1), armL: arm(1), legR: leg(-1), legL: leg(1) });
  }

  // params yang dipakai: wave 0..1 (melambai), look -1..1 (tengok)
  pose(time, dt) {
    const P = this.params, w = P.wave || 0, amp = this.walkAmp, ph = this.phase;
    const sw = Math.sin(ph) * 25 * amp;
    // penyesuai lantai: badan naik-turun mengikuti rentangan kaki supaya telapak selalu menapak
    const bodyY = 0.10 + 1.62 * Math.cos(sw * Math.PI / 180) + 0.65;
    this.body.setTransform({ translate: [0, bodyY - 2.3, 0], scale: [1, 1 + 0.01 * Math.sin(time * 2), 1] });
    this.legL.setTransform({ axis: [1, 0, 0.05], angle: sw });
    this.legR.setTransform({ axis: [1, 0, 0.05], angle: -sw });
    this.armL.up.setTransform({ axis: [1, 0, 0.1], angle: -sw * 0.8 });
    this.armL.fo.setTransform({ rotate: [-15 * amp, 0, 0] });
    this.armR.up.setTransform({ rotate: [sw * 0.8 * (1 - w), 0, 0], axis: [0.25, 0, 1], angle: -140 * w });
    this.armR.fo.setTransform({ axis: [0.1, 0.05, 1], angle: -30 * w + Math.sin(time * 7) * 20 * w });
    this.head.setTransform({ rotate: [0, (P.look || 0) * 35, 0] });
  }
}
