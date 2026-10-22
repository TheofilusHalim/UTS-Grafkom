// helpers/anim.js -- fungsi gerak: easing, keyframe track, kelas dasar yang bisa dianimasikan
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const ease = {
  linear: t => t,
  inOut:  t => t * t * (3 - 2 * t),      // mulai & berhenti halus
  in:     t => t * t,
  out:    t => 1 - (1 - t) * (1 - t),
  hold:   t => 0                          // tahan nilai lama sampai keyframe berikutnya
};

// key(waktu, nilai, easing)  nilai = angka atau array [x,y,z]
export const key = (t, v, e) => ({ t, v, ease: e });

const copy = v => Array.isArray(v) ? v.slice() : v;

// Track = daftar keyframe. at(waktu) selalu menghasilkan nilai yang sama untuk waktu yang sama
// (jadi bisa di-pause, di-seek, dan direkam ulang dengan hasil identik).
export class Track {
  constructor(keys) { this.keys = keys.slice().sort((a, b) => a.t - b.t); }
  at(time) {
    const K = this.keys;
    if (time <= K[0].t) return copy(K[0].v);
    const last = K[K.length - 1];
    if (time >= last.t) return copy(last.v);
    let i = 0; while (K[i + 1].t < time) i++;
    const a = K[i], b = K[i + 1];
    const e = (a.ease || ease.inOut)((time - a.t) / (b.t - a.t));
    return Array.isArray(a.v) ? a.v.map((x, k) => lerp(x, b.v[k], e)) : lerp(a.v, b.v, e);
  }
}

// Kelas dasar: punya params (nilai saat ini) dan tracks (keyframe per-params)
export class Animated {
  tracks = {};
  params = {};
  track(name, keys) { this.tracks[name] = new Track(keys); return this; }
  sample(time) { for (const n in this.tracks) this.params[n] = this.tracks[n].at(time); }
  // nilai param pada waktu t (dari track bila ada, kalau tidak nilai default)
  valueAt(name, t) {
    const tr = this.tracks[name];
    if (tr) return tr.at(t);
    const v = this.params[name];
    return Array.isArray(v) ? v.slice() : (v === undefined ? 0 : v);
  }
  // tambah keyframe ke track (keyframe dengan waktu sama akan diganti)
  addKeys(name, keys) {
    if (!this.tracks[name]) this.tracks[name] = new Track(keys);
    else {
      const tr = this.tracks[name];
      keys.forEach(k => { tr.keys = tr.keys.filter(x => x.t !== k.t); tr.keys.push(k); });
      tr.keys.sort((a, b) => a.t - b.t);
    }
    return this;
  }
}
