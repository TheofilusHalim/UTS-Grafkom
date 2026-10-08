// characters/Character.js -- KELAS DASAR semua karakter (Huggy, karakter teman, dst)
// Setiap karakter cukup meng-override build() dan pose(). Sisanya (posisi, putar, skala,
// sinkronisasi langkah kaki dengan kecepatan jalan) sudah diurus di sini.
import { MyObject, makeNode } from "../MyObject.js";
import { Animated, clamp01 } from "../helpers/anim.js";

export class Character extends Animated {
  constructor(ctx, opts = {}) {
    super();
    this.ctx = ctx; this.opts = opts; this.name = opts.name || "karakter";
    this.root = new MyObject(ctx.GL, ctx.prog, ctx.locs);     // akar karakter: origin = telapak kaki
    this.params = { pos: [0, 0, 0], rotY: 0, scale: 1 };       // nilai default
    this.phase = 0;        // fase langkah (bertambah sesuai JARAK tempuh -> kaki tidak "meluncur")
    this.walkAmp = 0;      // 0 diam .. 1 jalan penuh (otomatis dari kecepatan)
    this.strideK = 2.4;    // radian langkah per satuan jarak (kaki pendek -> nilai lebih besar)
    this._prev = null; this._lastT = null;
    this.build();
  }
  node(parent, geo, pos, eul) { return makeNode(this.ctx, parent, geo, pos, eul); }

  // ---------- API standar (dipanggil sutradara / story) ----------
  setPosition(x, y, z) { this.params.pos = [x, y, z]; return this; }
  setRotationY(deg)    { this.params.rotY = deg; return this; }
  setScale(s)          { this.params.scale = s; return this; }
  attachTo(parent)     { parent.add(this.root); return this; }

  // ---------- wajib di-override ----------
  build() {}                 // susun hierarki bagian tubuh di bawah this.root
  pose(time, dt) {}          // atur sudut sendi dari this.params / this.phase / this.walkAmp

  // ---------- dipanggil tiap frame ----------
  update(time, dt) {
    this.sample(time);                                    // keyframe -> this.params
    const P = this.params, pos = P.pos;
    const s = Array.isArray(P.scale) ? P.scale : [P.scale, P.scale, P.scale];
    if (this._prev && dt > 0 && Math.abs(time - this._lastT) < 0.25) {
      const d = Math.hypot(pos[0] - this._prev[0], pos[2] - this._prev[2]);
      this.speed = d / dt;
      this.phase += d * this.strideK / s[0];
    } else this.speed = 0;
    this.walkAmp += (clamp01(this.speed / 0.7) - this.walkAmp) * (1 - Math.exp(-Math.max(dt, 0) * 8));
    this._prev = pos.slice(); this._lastT = time;
    this.pose(time, dt);
    this.root.setTransform({ translate: pos, rotate: [0, P.rotY, 0], scale: s });   // Translate, Rotate, Scale
  }
}
