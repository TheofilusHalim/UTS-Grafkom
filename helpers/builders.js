// helpers/builders.js -- pembuat geometri.
// Format vertex (Array 1D): X,Y,Z, R,G,B, Nx,Ny,Nz   (posisi + warna + normal untuk pencahayaan)
const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };
const lerp = (a, b, t) => a + (b - a) * t;
export const mix = (c1, c2, t) => c1.map((x, i) => lerp(x, c2[i], t));

// ---------- Pembuat permukaan parametrik generik ----------
// fn(u,v) -> {p:[x,y,z], n?:[nx,ny,nz]}; bila n tidak ada, dihitung dari turunan numerik.
// color: [r,g,b] atau fungsi (u,v,p) -> [r,g,b]  (gradasi warna halus per-vertex)
export function parametric(fn, nu, nv, color) {
  const vertex = [], faces = [], e = 1e-4;
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = j / nv, r = fn(u, v);
      let n = r.n;
      if (!n) {
        const du = sub(fn(Math.min(1, u+e), v).p, fn(Math.max(0, u-e), v).p);
        const dv = sub(fn(u, v+e).p, fn(u, v-e).p);
        n = cross(dv, du);
        if (Math.hypot(n[0], n[1], n[2]) < 1e-9) n = [0, u < 0.5 ? 1 : -1, 0];
      }
      n = norm(n);
      const c = typeof color === "function" ? color(u, v, r.p) : color;
      vertex.push(r.p[0], r.p[1], r.p[2], c[0], c[1], c[2], n[0], n[1], n[2]);
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + nv + 1;
      faces.push(a, b, a + 1, a + 1, b, b + 1);
    }
  return { vertex, faces };
}

// ================= OBJEK PENDUKUNG (bukan 3 quadric wajib) =================
export function ellipsoid(rx, ry, rz, color, c = [0,0,0], nu = 18, nv = 28) {
  return parametric((u, v) => {
    const th = u * Math.PI, ph = v * 2 * Math.PI;
    const nx = Math.sin(th)*Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th)*Math.sin(ph);
    return { p: [c[0]+rx*nx, c[1]+ry*ny, c[2]+rz*nz], n: [nx/rx, ny/ry, nz/rz] };
  }, nu, nv, color);
}

// Kapsul: ujung ATAS tepat di titik sendi (0,0,0), memanjang ke bawah (-y). Panjang total = h + 2r
export function capsule(r, h, color, nu = 20, nv = 20) {
  const cy = -(h/2 + r);
  return parametric((u, v) => {
    const ph = v * 2 * Math.PI; let th, off;
    if (u < 0.4)        { th = (u/0.4) * Math.PI/2; off = h/2; }
    else if (u <= 0.6)  { th = Math.PI/2; off = h/2 - ((u-0.4)/0.2) * h; }
    else                { th = Math.PI/2 + ((u-0.6)/0.4) * Math.PI/2; off = -h/2; }
    const nx = Math.sin(th)*Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th)*Math.sin(ph);
    return { p: [r*nx, r*ny + off + cy, r*nz], n: [nx, ny, nz] };
  }, nu, nv, color);
}

// Silinder tanpa tutup, ujung atas di (0,0,0), memanjang ke bawah
export function cylinder(r, h, color, nv = 20) {
  return parametric((u, v) => {
    const ph = v * 2 * Math.PI;
    return { p: [r*Math.cos(ph), -u*h, r*Math.sin(ph)], n: [Math.cos(ph), 0, Math.sin(ph)] };
  }, 1, nv, color);
}

export function box(w, h, d, color) {
  const x = w/2, y = h/2, z = d/2, vertex = [], faces = [];
  const F = [
    [[0,0,1],  [-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],
    [[0,0,-1], [x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]],
    [[1,0,0],  [x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z]],
    [[-1,0,0], [-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z]],
    [[0,1,0],  [-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]],
    [[0,-1,0], [-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]]
  ];
  F.forEach((f, i) => {
    for (let k = 1; k <= 4; k++) vertex.push(...f[k], ...color, ...f[0]);
    faces.push(i*4, i*4+1, i*4+2, i*4, i*4+2, i*4+3);
  });
  return { vertex, faces };
}

// ================= 3 QUADRIC WAJIB (non-ellipsoid, non-cylinder) =================
// 1) CONE (kerucut):  alas di y=0, puncak di y=h.  x²+z² = r²(1 - y/h)²
export function cone(r, h, color, nv = 16) {
  return parametric((u, v) => {
    const ph = v * 2 * Math.PI, rr = r * (1 - u);
    return { p: [rr*Math.cos(ph), u*h, rr*Math.sin(ph)], n: [h*Math.cos(ph), r, h*Math.sin(ph)] };
  }, 2, nv, color);
}

// 2) HYPERBOLOID OF ONE SHEET:  x²/a² + z²/a² - y²/c² = 1
//    x = a·cosh(t)·cosφ, y = c·sinh(t), z = a·cosh(t)·sinφ ; t ∈ [t0,t1]
export function hyperboloid1(a, c, t0, t1, color, nu = 16, nv = 32) {
  return parametric((u, v) => {
    const t = lerp(t0, t1, u), ph = v * 2 * Math.PI;
    const x = a*Math.cosh(t)*Math.cos(ph), y = c*Math.sinh(t), z = a*Math.cosh(t)*Math.sin(ph);
    return { p: [x, y, z], n: [x/(a*a), -y/(c*c), z/(a*a)] };   // gradien F(x,y,z)
  }, nu, nv, color);
}

// 3) HYPERBOLIC PARABOLOID (pelana):  y = k·[(2x/w)² - (2z/d)²]
//    Domain dipangkas berbentuk "dasi kupu-kupu" (menyempit di tengah, melebar di ujung).
//    Pemangkasan domain TIDAK mengubah permukaannya: tetap quadric yang sama.
export function saddle(w, d, k, color, trim = "bow", nu = 28, nv = 12) {
  return parametric((u, v) => {
    const p = u * 2 - 1;
    const f = trim === "oval" ? Math.sqrt(Math.max(0, 1 - p * p)) : (0.2 + 0.8 * Math.abs(p));
    const q = (v * 2 - 1) * f;
    const x = p * w / 2, z = q * d / 2;
    return { p: [x, k * (p*p - q*q), z] };
  }, nu, nv, color);
}

// ================= KURVA 3D =================
// Bezier (De Casteljau), orde bebas
export function bezier(pts, t) {
  let P = pts.map(p => p.slice());
  for (let r = pts.length - 1; r > 0; r--)
    for (let i = 0; i < r; i++)
      for (let k = 0; k < 3; k++) P[i][k] = (1 - t) * P[i][k] + t * P[i+1][k];
  return P[0];
}
// B-Spline kubik uniform (ujung dilipat-gandakan agar kurva mendekati titik awal/akhir)
export function bspline(pts, t) {
  const P = [pts[0], pts[0], ...pts, pts[pts.length-1], pts[pts.length-1]];
  const segs = P.length - 3;
  const s = Math.min(Math.floor(t * segs), segs - 1), lt = t * segs - s;
  const b = [(1-lt)**3/6, (3*lt**3 - 6*lt**2 + 4)/6, (-3*lt**3 + 3*lt**2 + 3*lt + 1)/6, lt**3/6];
  const out = [0, 0, 0];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) out[k] += b[i] * P[s+i][k];
  return out;
}
// Tabung mengikuti kurva c(u), u∈[0,1], supaya kurva terlihat (bibir, alis)
export function tube(curve, radius, color, nu = 60, nv = 10, capPow = 0.35) {
  return parametric((u, v) => {
    const e = 1e-3;
    const c = curve(u);
    const T = norm(sub(curve(Math.min(1, u+e)), curve(Math.max(0, u-e))));
    let ref = [0, 0, 1];
    if (Math.abs(T[2]) > 0.9) ref = [0, 1, 0];
    const N = norm(cross(ref, T)), Bn = cross(T, N);
    const ph = v * 2 * Math.PI, rr = radius * Math.pow(Math.sin(Math.PI * u), capPow); // ujung menutup
    const dx = Math.cos(ph), dy = Math.sin(ph);
    const nrm = [dx*N[0]+dy*Bn[0], dx*N[1]+dy*Bn[1], dx*N[2]+dy*Bn[2]];
    return { p: [c[0]+rr*nrm[0], c[1]+rr*nrm[1], c[2]+rr*nrm[2]], n: nrm };
  }, nu, nv, color);
}


// ================= NOISE, RNG, SUPERELLIPSOID, BULU =================
const hash3 = (i, j, k) => { const h = Math.sin(i*127.1 + j*311.7 + k*74.7) * 43758.5453; return h - Math.floor(h); };
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const sm = t => t*t*(3 - 2*t), u = sm(x-xi), v = sm(y-yi), w = sm(z-zi);
  const L = (a, b, t) => a + (b - a) * t;
  const f = dz => L(L(hash3(xi,yi,zi+dz), hash3(xi+1,yi,zi+dz), u), L(hash3(xi,yi+1,zi+dz), hash3(xi+1,yi+1,zi+dz), u), v);
  return L(f(0), f(1), w);
}
function rng(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cp = (w, m) => { const c = Math.cos(w); return Math.sign(c) * Math.pow(Math.abs(c), m); };
const sp = (w, m) => { const s = Math.sin(w); return Math.sign(s) * Math.pow(Math.abs(s), m); };

// Superellipsoid (e1,e2 < 1 => lebih "kotak membulat" daripada elipsoid) + taper (melebar di atas)
export function superellipsoid(a, b, d, e1, e2, color, o = {}) {
  const c = o.center || [0,0,0], tp = o.taper || 0;
  return parametric((u, v) => {
    const eta = Math.PI/2 - u*Math.PI, om = v*2*Math.PI;
    const ce = cp(eta, e1), se = sp(eta, e1), co = cp(om, e2), so = sp(om, e2);
    return { p: [c[0] + a*(1 + tp*se)*ce*co, c[1] + b*se, c[2] + d*(1 + 0.4*tp*se)*ce*so] };
  }, o.nu || 28, o.nv || 40, color);
}
// z permukaan superellipsoid pada (x,y) -> supaya kurva & mata menempel di kulit
export function superSurfZ(x, y, P, C = [0,0,0]) {
  const yn = (y - C[1]) / P.b, tp = P.taper || 0;
  const rem = 1 - Math.pow(Math.abs(yn), 2 / P.e1); if (rem <= 0) return C[2];
  const aE = P.a * (1 + tp*yn), dE = P.d * (1 + 0.4*tp*yn);
  const Sx = Math.pow(Math.abs((x - C[0]) / aE), 2 / P.e2);
  const Sz = Math.pow(rem, P.e1 / P.e2) - Sx; if (Sz <= 0) return C[2];
  return C[2] + dE * Math.pow(Sz, P.e2 / 2);
}
// Bulu: ratusan KERUCUT kecil yang digabung ke geometri induk (menempel di permukaan)
export function addFur(geo, count, len, rad, baseCol, tipCol, seed = 1, accept = () => true) {
  const R = rng(seed), V = geo.vertex, nv = V.length / 9, ring = 5;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < nv; i++) { cx += V[i*9]; cy += V[i*9+1]; cz += V[i*9+2]; }
  cx /= nv; cy /= nv; cz /= nv;
  let made = 0, tries = 0;
  while (made < count && tries < count * 30) {
    tries++;
    const i = Math.floor(R() * nv) * 9;
    const p = [V[i], V[i+1], V[i+2]];
    let n = [V[i+6], V[i+7], V[i+8]];
    if (n[0]*(p[0]-cx) + n[1]*(p[1]-cy) + n[2]*(p[2]-cz) < 0) n = n.map(x => -x);   // pastikan keluar
    if (!accept(p, n)) continue;
    const ref = Math.abs(n[1]) > 0.9 ? [1,0,0] : [0,1,0];
    const t1 = norm(cross(n, ref)), t2 = cross(n, t1), L = len * (0.6 + 0.8*R());
    const dir = norm([n[0] + (R()-0.5)*0.6, n[1] + (R()-0.5)*0.6 - 0.12, n[2] + (R()-0.5)*0.6]);
    const base = V.length / 9;
    for (let k = 0; k < ring; k++) {
      const an = k / ring * 2 * Math.PI, c = Math.cos(an), s = Math.sin(an);
      const rv = [t1[0]*c + t2[0]*s, t1[1]*c + t2[1]*s, t1[2]*c + t2[2]*s];
      const nn = norm([rv[0]*0.7 + dir[0]*0.5, rv[1]*0.7 + dir[1]*0.5, rv[2]*0.7 + dir[2]*0.5]);
      V.push(p[0] + rv[0]*rad - n[0]*0.03, p[1] + rv[1]*rad - n[1]*0.03, p[2] + rv[2]*rad - n[2]*0.03,
             baseCol[0], baseCol[1], baseCol[2], nn[0], nn[1], nn[2]);
    }
    V.push(p[0] + dir[0]*L, p[1] + dir[1]*L, p[2] + dir[2]*L, tipCol[0], tipCol[1], tipCol[2], dir[0], dir[1], dir[2]);
    for (let k = 0; k < ring; k++) geo.faces.push(base + k, base + (k + 1) % ring, base + ring);
    made++;
  }
  return geo;
}

// Pastikan semua normal menghadap KELUAR (diperlukan oleh bulu "shell" yang bergeser sepanjang normal)
export function orientOutward(geo) {
  const V = geo.vertex, n = V.length / 9;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) { cx += V[i*9]; cy += V[i*9+1]; cz += V[i*9+2]; }
  cx /= n; cy /= n; cz /= n;
  for (let i = 0; i < n; i++) {
    const o = i * 9;
    if (V[o+6]*(V[o]-cx) + V[o+7]*(V[o+1]-cy) + V[o+8]*(V[o+2]-cz) < 0) { V[o+6] = -V[o+6]; V[o+7] = -V[o+7]; V[o+8] = -V[o+8]; }
  }
  return geo;
}
