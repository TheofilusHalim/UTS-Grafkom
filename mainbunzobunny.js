"use strict";
/* =====================================================================
   BUNZO BUNNY  -  Poppy Playtime  (WebGL murni, TANPA three.js)

   Syarat tugas:
   1) Karakter dibuat dengan KURVA
        - Bezier kubik      : telinga panjang, ring di punggung, garis bibir,
                              garis jari di telapak kaki
        - Catmull-Rom spline: 2 strap overall
      (kurva disapu menjadi "tube" / generalized cylinder)
   2) Memakai 3 JENIS QUADRIC:
        - ELLIPSOID          : kepala, badan, pipi, mata, celana, telapak kaki, dll.
        - ELLIPTIC CYLINDER  : kaki, lengan, gigi kelinci, kancing, simbal, dll.
        - ELLIPTIC CONE      : topi, tanda segitiga hijau, flap overall,
                               tonjolan kepala

   Kontrol: drag mouse = putar, scroll = zoom,
            C = tepuk simbal (on/off), R = auto-rotate
   ===================================================================== */

window.addEventListener("load", main);

/* ------------------------------ Vektor ------------------------------ */
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vcross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
const vnorm = (a) => {
  const l = vlen(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------ Matriks 4x4 (column-major) ------------------------------ */
const M4 = {
  identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  },
  translate(x, y, z) {
    const m = M4.identity();
    m[12] = x; m[13] = y; m[14] = z;
    return m;
  },
  scale(x, y, z) {
    const m = M4.identity();
    m[0] = x; m[5] = y; m[10] = z;
    return m;
  },
  rotX(a) {
    const m = M4.identity(), c = Math.cos(a), s = Math.sin(a);
    m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
    return m;
  },
  rotY(a) {
    const m = M4.identity(), c = Math.cos(a), s = Math.sin(a);
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    return m;
  },
  rotZ(a) {
    const m = M4.identity(), c = Math.cos(a), s = Math.sin(a);
    m[0] = c; m[1] = s; m[4] = -s; m[5] = c;
    return m;
  },
  // rotasi terhadap SUMBU SEMBARANG (rumus Rodrigues)
  axisAngle(axis, a) {
    const n = vnorm(axis), x = n[0], y = n[1], z = n[2];
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    const m = M4.identity();
    m[0] = t * x * x + c;     m[1] = t * x * y + s * z; m[2] = t * x * z - s * y;
    m[4] = t * x * y - s * z; m[5] = t * y * y + c;     m[6] = t * y * z + s * x;
    m[8] = t * x * z + s * y; m[9] = t * y * z - s * x; m[10] = t * z * z + c;
    return m;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) / (near - far);
    m[11] = -1;
    m[14] = (2 * far * near) / (near - far);
    return m;
  },
  lookAt(eye, target, up) {
    const z = vnorm(vsub(eye, target));
    const x = vnorm(vcross(up, z));
    const y = vcross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -vdot(x, eye), -vdot(y, eye), -vdot(z, eye), 1,
    ]);
  },
  // inverse-transpose dari 3x3 kiri-atas (untuk normal)
  normalMat(m) {
    const A = (i, j) => m[j * 4 + i];
    const C00 = A(1, 1) * A(2, 2) - A(1, 2) * A(2, 1);
    const C01 = -(A(1, 0) * A(2, 2) - A(1, 2) * A(2, 0));
    const C02 = A(1, 0) * A(2, 1) - A(1, 1) * A(2, 0);
    const C10 = -(A(0, 1) * A(2, 2) - A(0, 2) * A(2, 1));
    const C11 = A(0, 0) * A(2, 2) - A(0, 2) * A(2, 0);
    const C12 = -(A(0, 0) * A(2, 1) - A(0, 1) * A(2, 0));
    const C20 = A(0, 1) * A(1, 2) - A(0, 2) * A(1, 1);
    const C21 = -(A(0, 0) * A(1, 2) - A(0, 2) * A(1, 0));
    const C22 = A(0, 0) * A(1, 1) - A(0, 1) * A(1, 0);
    let det = A(0, 0) * C00 + A(0, 1) * C01 + A(0, 2) * C02;
    det = Math.abs(det) < 1e-12 ? 1 : det;
    const C = [[C00, C01, C02], [C10, C11, C12], [C20, C21, C22]];
    const o = new Float32Array(9);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) o[j * 3 + i] = C[i][j] / det;
    return o;
  },
};

/* T * R * S  (pos, skala [sx,sy,sz], rotasi euler [rx,ry,rz]) */
function xf(p, s, r) {
  let m = M4.translate(p[0], p[1], p[2]);
  if (r) {
    if (r[1]) m = M4.mul(m, M4.rotY(r[1]));
    if (r[0]) m = M4.mul(m, M4.rotX(r[0]));
    if (r[2]) m = M4.mul(m, M4.rotZ(r[2]));
  }
  return M4.mul(m, M4.scale(s[0], s[1], s[2]));
}

/* Matriks silinder unit (sumbu Y, tinggi 1, terpusat) dari titik p0 ke p1 */
function limbMatrix(p0, p1, rx, rz) {
  const d = vsub(p1, p0), len = vlen(d), y = vmul(d, 1 / len);
  let ref = [0, 0, 1];
  if (Math.abs(vdot(y, ref)) > 0.9) ref = [1, 0, 0];
  const x = vnorm(vcross(ref, y));
  const z = vcross(x, y);
  const c = vmul(vadd(p0, p1), 0.5);
  return new Float32Array([
    x[0] * rx, x[1] * rx, x[2] * rx, 0,
    y[0] * len, y[1] * len, y[2] * len, 0,
    z[0] * rz, z[1] * rz, z[2] * rz, 0,
    c[0], c[1], c[2], 1,
  ]);
}

/* ------------------------------ QUADRIC #1: ELLIPSOID ------------------------------
   x²/a² + y²/b² + z²/c² = 1   (unit sphere, diskalakan lewat matriks model) */
function meshEllipsoid(stacks = 28, slices = 48) {
  const m = { pos: [], nor: [], idx: [] };
  for (let i = 0; i <= stacks; i++) {
    const phi = (i / stacks) * Math.PI;
    for (let j = 0; j <= slices; j++) {
      const th = (j / slices) * Math.PI * 2;
      const x = Math.sin(phi) * Math.cos(th);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(th);
      m.pos.push(x, y, z);
      m.nor.push(x, y, z);
    }
  }
  for (let i = 0; i < stacks; i++)
    for (let j = 0; j < slices; j++) {
      const a = i * (slices + 1) + j, b = a + slices + 1;
      m.idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return m;
}

function facePuff(y) {
  return 1 + 0.2 * (1 - smooth(-0.65, 0.45, y));
}

function facePuffSlope(y) {
  if (y <= -0.65 || y >= 0.45) return 0;
  const t = (y + 0.65) / 1.1;
  return (-0.2 * 6 * t * (1 - t)) / 1.1;
}

function meshPuffyHead(stacks = 32, slices = 56) {
  const m = meshEllipsoid(stacks, slices);
  for (let i = 0; i < m.pos.length; i += 3) {
    const x = m.pos[i], y = m.pos[i + 1], z = m.pos[i + 2];
    const puff = facePuff(y);
    m.pos[i] = x * puff;
    m.pos[i + 2] = z * puff;
    const slope = facePuffSlope(y);
    const n = vnorm([
      x / puff,
      y - (slope * (x * x + z * z)) / (puff * puff * puff),
      z / puff,
    ]);
    m.nor[i] = n[0];
    m.nor[i + 1] = n[1];
    m.nor[i + 2] = n[2];
  }
  return m;
}

function addDisc(m, y, radius, ny, slices) {
  const base = m.pos.length / 3;
  m.pos.push(0, y, 0);
  m.nor.push(0, ny, 0);
  for (let j = 0; j <= slices; j++) {
    const th = (j / slices) * Math.PI * 2;
    m.pos.push(Math.cos(th) * radius, y, Math.sin(th) * radius);
    m.nor.push(0, ny, 0);
  }
  for (let j = 0; j < slices; j++) m.idx.push(base, base + 1 + j, base + 2 + j);
}

/* ------------------------------ QUADRIC #2: ELLIPTIC CYLINDER ------------------------------
   x²/a² + z²/c² = 1,  y ∈ [-0.5, 0.5] */
function meshCylinder(slices = 40) {
  const m = { pos: [], nor: [], idx: [] };
  for (let j = 0; j <= slices; j++) {
    const th = (j / slices) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    m.pos.push(c, -0.5, s, c, 0.5, s);
    m.nor.push(c, 0, s, c, 0, s);
  }
  for (let j = 0; j < slices; j++) {
    const a = 2 * j;
    m.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  addDisc(m, -0.5, 1, -1, slices);
  addDisc(m, 0.5, 1, 1, slices);
  return m;
}

/* ------------------------------ QUADRIC #3: ELLIPTIC CONE ------------------------------
   x²/a² + z²/c² = ((h - y)/h)²   ->  y ∈ [0,1], radius alas 1, radius atas k
   (k = 0 kerucut penuh, k > 0 kerucut terpancung / frustum) */
function meshCone(k = 0, slices = 48) {
  const m = { pos: [], nor: [], idx: [] };
  for (let j = 0; j <= slices; j++) {
    const th = (j / slices) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const n = vnorm([c, 1 - k, s]);
    m.pos.push(c, 0, s, k * c, 1, k * s);
    m.nor.push(...n, ...n);
  }
  for (let j = 0; j < slices; j++) {
    const a = 2 * j;
    m.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  addDisc(m, 0, 1, -1, slices);
  if (k > 0) addDisc(m, 1, k, 1, slices);
  return m;
}

/* ------------------------------ KURVA ------------------------------ */
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [0, 1, 2].map(
    (i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]
  );
}
function sampleBez(c, n, t0 = 0, t1 = 1) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(bez(c[0], c[1], c[2], c[3], t0 + ((t1 - t0) * i) / n));
  return out;
}
/* lingkaran dari 4 kurva Bezier kubik (unit circle di bidang XY) */
function bezierCircle(nPer = 10) {
  const k = 0.5523;
  const segs = [
    [[1, 0, 0], [1, k, 0], [k, 1, 0], [0, 1, 0]],
    [[0, 1, 0], [-k, 1, 0], [-1, k, 0], [-1, 0, 0]],
    [[-1, 0, 0], [-1, -k, 0], [-k, -1, 0], [0, -1, 0]],
    [[0, -1, 0], [k, -1, 0], [1, -k, 0], [1, 0, 0]],
  ];
  const out = [];
  segs.forEach((s) => {
    for (let i = 0; i < nPer; i++) out.push(bez(s[0], s[1], s[2], s[3], i / nPer));
  });
  out.push([1, 0, 0]);
  return out;
}
/* Catmull-Rom spline melalui titik-titik kontrol */
function catmull(pts, per = 12) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push(
        [0, 1, 2].map(
          (q) =>
            0.5 *
            (2 * p1[q] +
              (-p0[q] + p2[q]) * t +
              (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 +
              (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3)
        )
      );
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* Sapuan penampang elips sepanjang kurva (generalized cylinder).
   radFn(u) -> [radiusLebar, radiusTebal] */
function makeTube(pts, radFn, ref, seg = 16) {
  const m = { pos: [], nor: [], idx: [] }, n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)];
    const T = vnorm(vsub(b, a));
    let W = vcross(T, ref);
    if (vlen(W) < 1e-4) W = vcross(T, [0, 1, 0]);
    W = vnorm(W);
    const N = vcross(W, T);
    const r = radFn(i / (n - 1));
    const rw = Math.max(r[0], 1e-3), rt = Math.max(r[1], 1e-3);
    for (let j = 0; j <= seg; j++) {
      const ang = (j / seg) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
      const p = pts[i];
      m.pos.push(
        p[0] + W[0] * c * rw + N[0] * s * rt,
        p[1] + W[1] * c * rw + N[1] * s * rt,
        p[2] + W[2] * c * rw + N[2] * s * rt
      );
      const nn = vnorm([
        W[0] * (c / rw) + N[0] * (s / rt),
        W[1] * (c / rw) + N[1] * (s / rt),
        W[2] * (c / rw) + N[2] * (s / rt),
      ]);
      m.nor.push(nn[0], nn[1], nn[2]);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + seg + 1;
      m.idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return m;
}

/* ------------------------------ WebGL helper ------------------------------ */
const VS = `
attribute vec3 aPos;
attribute vec3 aNor;
uniform mat4 uModel, uView, uProj;
uniform mat3 uNormalMat;
varying vec3 vN, vWorld, vObj;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  vWorld = w.xyz;
  vN = uNormalMat * aNor;
  vObj = aPos;
  gl_Position = uProj * uView * w;
}`;

const FS = `
precision mediump float;
varying vec3 vN, vWorld, vObj;
uniform vec3 uColor, uColor2, uEye;
uniform float uMode, uShine, uSpec, uFreq, uAlpha;
void main(){
  // mode 3 : dinding latar (gradasi + garis tenda, tanpa pencahayaan)
  if (uMode > 2.5) {
    float g = clamp(vObj.y + 0.5, 0.0, 1.0);
    float st = step(0.5, fract(atan(vObj.z, vObj.x) / 6.2831853 * 18.0));
    gl_FragColor = vec4(mix(uColor, uColor2, g) * (0.9 + 0.1 * st), 1.0);
    return;
  }
  vec3 n = normalize(vN);
  vec3 v = normalize(uEye - vWorld);
  if (dot(n, v) < 0.0) n = -n;
  vec3 base = uColor;
  if (uMode > 0.5 && uMode < 1.5) {            // mode 1 : garis spiral topi
    float s = fract(vObj.y * 4.5);
    base = s < 0.5 ? uColor : uColor2;
  } else if (uMode > 1.5) {                    // mode 2 : papan catur lantai
    float c = mod(floor(vObj.x * uFreq) + floor(vObj.z * uFreq), 2.0);
    base = c < 1.0 ? uColor : uColor2;
  }
  vec3 L1 = normalize(vec3(0.5, 0.9, 0.8));
  vec3 L2 = normalize(vec3(-0.8, 0.3, 0.4));
  float d1 = max(dot(n, L1), 0.0);
  float d2 = max(dot(n, L2), 0.0);
  vec3 hemi = mix(vec3(0.24, 0.21, 0.19), vec3(0.42, 0.47, 0.56), n.y * 0.5 + 0.5);
  vec3 col = base * (hemi * 0.9 + vec3(1.0, 0.97, 0.9) * d1 * 0.75 + vec3(0.5, 0.6, 0.8) * d2 * 0.22);
  vec3 h = normalize(L1 + v);
  col += vec3(pow(max(dot(n, h), 0.0), uShine) * uSpec);
  col += pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.07;
  gl_FragColor = vec4(min(col, vec3(1.0)), uAlpha);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function upload(gl, m) {
  const mk = (target, data) => {
    const b = gl.createBuffer();
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return b;
  };
  return {
    pos: mk(gl.ARRAY_BUFFER, new Float32Array(m.pos)),
    nor: mk(gl.ARRAY_BUFFER, new Float32Array(m.nor)),
    idx: mk(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.idx)),
    count: m.idx.length,
  };
}

/* ------------------------------ Palet warna Bunzo ------------------------------ */
const COL = {
  yellow: [0.98, 0.79, 0.2],
  green: [0.12, 0.48, 0.08],
  belly: [0.98, 0.84, 0.39],
  frill: [0.23, 0.57, 0.13],
  button: [0.08, 0.31, 0.06],
  buttonX: [0.04, 0.16, 0.03],
  mark: [0.18, 0.52, 0.1],
  hatLight: [0.28, 0.57, 0.14],
  hatDark: [0.11, 0.36, 0.08],
  knob: [0.18, 0.4, 0.1],
  cheek: [0.88, 0.33, 0.14],
  earIn: [0.78, 0.5, 0.14],
  toe: [0.78, 0.52, 0.1],
  black: [0.02, 0.02, 0.03],
  white: [0.98, 0.97, 0.94],
  mouth: [0.72, 0.08, 0.13],
  lip: [0.5, 0.06, 0.09],
  tongue: [0.9, 0.36, 0.36],
  cymEdge: [0.43, 0.27, 0.11],
  cymFace: [0.72, 0.49, 0.22],
  ring: [0.9, 0.9, 0.92],
  base: [0.85, 0.36, 0.12],
};
const mix = (a, b, t) => a + (b - a) * t;

/* ------------------------------ MAIN ------------------------------ */
function main() {
  const canvas = document.getElementById("mycanvas");
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  const gl = canvas.getContext("webgl", { antialias: true });
  if (!gl) {
    alert("WebGL tidak didukung di browser ini.");
    return;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const aPos = gl.getAttribLocation(prog, "aPos");
  const aNor = gl.getAttribLocation(prog, "aNor");
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aNor);
  const U = {};
  ["uModel", "uView", "uProj", "uNormalMat", "uColor", "uColor2", "uEye", "uMode", "uShine", "uSpec", "uFreq", "uAlpha"].forEach(
    (n) => (U[n] = gl.getUniformLocation(prog, n))
  );

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.13, 0.12, 0.25, 1);

  /* ---------- Geometri quadric (3 jenis) ---------- */
  const G = {
    sphere: upload(gl, meshEllipsoid()),
    head: upload(gl, meshPuffyHead()),
    cyl: upload(gl, meshCylinder()),
    coneHat: upload(gl, meshCone(0.1)), // frustum untuk topi
    cone: upload(gl, meshCone(0)), // kerucut penuh
  };

  /* ---------- Parameter bentuk (proporsi mengikuti referensi) ---------- */
  const HEAD = { c: [0, 3.03, 0], r: [0.59, 0.6, 0.5] };
  const TORSO = { c: [0, 2.16, 0], r: [0.4, 0.49, 0.32] };
  const MOUTH = { cy: 3.046 };
  const headZ = (x, y) => {
    const yn = (y - HEAD.c[1]) / HEAD.r[1], puff = facePuff(yn);
    return HEAD.r[2] * puff * Math.sqrt(Math.max(0, 1 - (x / (HEAD.r[0] * puff)) ** 2 - yn ** 2));
  };
  // orientasi objek pipih agar menempel pada permukaan ellipsoid
  const surfRot = (c, r, p) => {
    const n = vnorm([(p[0] - c[0]) / r[0] ** 2, (p[1] - c[1]) / r[1] ** 2, (p[2] - c[2]) / r[2] ** 2]);
    return { n, rx: -Math.asin(n[1]), ry: Math.atan2(n[0], n[2]) };
  };

  /* ---------- Geometri kurva ---------- */
  // --- Telinga panjang ramping (Bezier kubik disapu penampang elips pipih) ---
  const earCtrl = (s) => [
    [0.42 * s, 3.42, -0.22],
    [0.78 * s, 3.62, -0.22],
    [0.82 * s, 2.45, -0.2],
    [0.62 * s, 1.76, -0.16],
  ];
  const earRound = (u, from) =>
    u > from ? Math.sqrt(Math.max(0, 1 - ((u - from) / (1 - from)) ** 2)) : 1;

  const ears = [-1, 1].map((s) => {
    const outer = makeTube(
      sampleBez(earCtrl(s), 48),
      (u) => {
        const r = earRound(u, 0.8);
        const fullness = smooth(0, 0.48, u);
        return [(0.17 + 0.13 * fullness) * r, (0.08 + 0.055 * fullness) * r + 0.002];
      },
      [0, 0, 1],
      20
    );
    const innerPts = sampleBez(earCtrl(s), 44, 0.12, 0.92).map((p, i) => {
      const u = 0.12 + 0.8 * (i / 44);
      const outerDepth = (0.08 + 0.055 * smooth(0, 0.48, u)) * earRound(u, 0.8) + 0.002;
      return [p[0], p[1], p[2] + outerDepth + 0.004];
    });
    const inner = makeTube(
      innerPts,
      (u) => {
        const earU = 0.12 + 0.8 * u;
        const r = earRound(earU, 0.8);
        return [(0.105 + 0.075 * smooth(0, 0.48, earU)) * r, 0.032 * r + 0.002];
      },
      [0, 0, 1],
      14
    );
    return { s, outer: upload(gl, outer), inner: upload(gl, inner), base: earCtrl(s)[0] };
  });

  // --- 2 strap overall tipis (Catmull-Rom: depan -> bahu -> belakang) ---
  const torsoZ = (x, y) =>
    TORSO.r[2] * Math.sqrt(Math.max(0, 1 - (x / TORSO.r[0]) ** 2 - ((y - TORSO.c[1]) / TORSO.r[1]) ** 2));
  const straps = [-1, 1].map((s) => {
    const front = [[0.22, 1.92, torsoZ(0.22, 1.92) + 0.04]].concat(
      [[0.25, 2.06], [0.25, 2.3], [0.21, 2.5]].map((p) => [p[0], p[1], torsoZ(p[0], p[1]) + 0.04])
    );
    const back = [[0.21, 2.5], [0.23, 2.25], [0.22, 2.05]].map((p) => [p[0], p[1], -(torsoZ(p[0], p[1]) + 0.04)]);
    const P = front.concat([[0.18, 2.58, 0]], back, [[0.22, 1.92, -0.3]]).map((p) => [p[0] * s, p[1], p[2]]);
    return upload(gl, makeTube(catmull(P, 10), () => [0.022, 0.06], [1, 0, 0], 12));
  });

  // --- Ring logam kecil di punggung (4 Bezier membentuk lingkaran) ---
  const ringGeom = upload(
    gl,
    makeTube(
      bezierCircle(10).map((p) => [p[0] * 0.07, 2.05 + p[1] * 0.07, -0.25]),
      () => [0.017, 0.017],
      [0, 0, 1],
      12
    )
  );
  const cymbalGroove = upload(
    gl,
    makeTube(
      Array.from({ length: 81 }, (_, i) => {
        const a = (i / 80) * Math.PI * 2;
        return [Math.cos(a), 0, Math.sin(a)];
      }),
      () => [0.008, 0.008],
      [0, 1, 0],
      8
    )
  );

  /* ---------- DEKAL WAJAH ----------
     Kontur digambar dengan kurva (Bezier / elips), lalu diproyeksikan ke
     permukaan ellipsoid kepala sehingga menempel rata (bulat dari depan). */
  function makePatch(poly, lift, rings = 6) {
    const n = poly.length;
    const cx = poly.reduce((a, p) => a + p[0], 0) / n, cy = poly.reduce((a, p) => a + p[1], 0) / n;
    const m = { pos: [], nor: [], idx: [] };
    for (let r = 0; r <= rings; r++) {
      const f = r / rings;
      for (let i = 0; i < n; i++) {
        const x = cx + (poly[i][0] - cx) * f, y = cy + (poly[i][1] - cy) * f;
        const z = headZ(x, y) + lift;
        const yn = (y - HEAD.c[1]) / HEAD.r[1], puff = facePuff(yn);
        const shape = x ** 2 / HEAD.r[0] ** 2 + z ** 2 / HEAD.r[2] ** 2;
        const nr = vnorm([
          x / (HEAD.r[0] ** 2 * puff ** 2),
          yn / HEAD.r[1] - (facePuffSlope(yn) * shape) / (HEAD.r[1] * puff ** 3),
          z / (HEAD.r[2] ** 2 * puff ** 2),
        ]);
        m.pos.push(x, y, z);
        m.nor.push(nr[0], nr[1], nr[2]);
      }
    }
    for (let r = 0; r < rings; r++)
      for (let i = 0; i < n; i++) {
        const a = r * n + i, b = r * n + ((i + 1) % n), c = (r + 1) * n + i, d = (r + 1) * n + ((i + 1) % n);
        m.idx.push(a, c, b, b, c, d);
      }
    return upload(gl, m);
  }
  const circ = (cx, cy, rx, ry, n = 32) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
  const tri = (cx, cy, w, h, pointUp = false) => {
    const V = pointUp
      ? [[cx, cy + h / 2], [cx + w, cy - h / 2], [cx - w, cy - h / 2]]
      : [[cx - w, cy + h / 2], [cx + w, cy + h / 2], [cx, cy - h / 2]];
    const out = [];
    for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) {
      const a = V[i], b = V[(i + 1) % 3], t = k / 5;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return out;
  };

  // mulut: senyum terbuka "D" -> tepi atas hampir lurus (Bezier), tepi bawah bulat dalam (Bezier)
  const mcy = MOUTH.cy;
  const mouthTopCurve = [[-0.29, mcy + 0.01, 0], [-0.15, mcy + 0.09, 0], [0.15, mcy + 0.09, 0], [0.29, mcy + 0.01, 0]];
  const mouthBotCurve = [[0.29, mcy + 0.01, 0], [0.29, mcy - 0.32, 0], [-0.29, mcy - 0.32, 0], [-0.29, mcy + 0.01, 0]];
  const mouthTop = sampleBez(mouthTopCurve, 48).map((p) => [p[0], p[1]]);
  const mouthBot = sampleBez(mouthBotCurve, 64).map((p) => [p[0], p[1]]);
  const curveYAtX = (curve, x) => {
    for (let i = 1; i < curve.length; i++) {
      const a = curve[i - 1], b = curve[i];
      if ((x - a[0]) * (x - b[0]) <= 0) {
        const t = (x - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return curve[0][1];
  };
  const mouthPoly = mouthTop.slice(0, -1).concat(mouthBot.slice(0, -1));
  const mouthPatch = makePatch(mouthPoly, 0.01, 8);
  // lidah: bagian bawah rongga mulut, lebih terang
  const tCen = [0, mcy - 0.14];
  const arc = mouthBot.filter((p) => p[1] < mcy - 0.1).map((p) => [tCen[0] + (p[0] - tCen[0]) * 0.86, tCen[1] + (p[1] - tCen[1]) * 0.86]);
  const tL = arc[arc.length - 1], tR = arc[0];
  const arch = sampleBez([[tL[0], tL[1], 0], [tL[0] * 0.45, tL[1] + 0.075, 0], [tR[0] * 0.45, tR[1] + 0.075, 0], [tR[0], tR[1], 0]], 12).slice(1, -1).map((p) => [p[0], p[1]]);
  const tonguePatch = makePatch(arc.concat(arch), 0.014, 6);
  // garis tepi mulut tipis
  const lipGeom = upload(
    gl,
    makeTube(
      mouthPoly.concat([mouthPoly[0]]).map((p) => [p[0], p[1], headZ(p[0], p[1]) + 0.014]),
      () => [0.008, 0.008],
      [0, 0, 1],
      6
    )
  );
  const cheeks = [-1, 1].map((s) => makePatch(circ(0.39 * s, 2.96, 0.17, 0.16), 0.004, 6));
  const eyes = [-1, 1].map((s) => makePatch(circ(0.23 * s, 3.31, 0.075, 0.09, 24), 0.01, 5));
  const marks = [-1, 1].flatMap((s) => [
    makePatch(tri(0.28 * s, 3.45, 0.055, 0.14, true), 0.01, 3),
    makePatch(tri(0.22 * s, 3.14, 0.038, 0.08), 0.01, 3),
  ]);

  // --- Garis jari telapak kaki (Bezier di atas ellipsoid telapak) ---
  const FOOT = { c: [0, 0.12, 0.2], r: [0.2, 0.12, 0.48] };
  const toeLines = [-0.07, 0.07].map((dx) => {
    const c2 = [[dx * 0.9, 0.33], [dx, 0.42], [dx * 1.1, 0.5], [dx * 1.15, 0.58]];
    const pts = sampleBez(c2.map((p) => [p[0], p[1], 0]), 16).map((p) => {
      const q = 1 - (p[0] / FOOT.r[0]) ** 2 - ((p[1] - FOOT.c[2]) / FOOT.r[2]) ** 2;
      return [p[0], FOOT.c[1] + FOOT.r[1] * Math.sqrt(Math.max(0, q)) + 0.004, p[1]];
    });
    return upload(gl, makeTube(pts, () => [0.011, 0.011], [1, 0, 0], 6));
  });

  /* ---------- Kamera & input ---------- */
  const cam = { yaw: 0.35, pitch: 0.12, dist: 8.6, auto: false };
  const state = { clap: false };
  let dragging = false, lx = 0, ly = 0;
  canvas.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointerup", () => (dragging = false));
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    cam.yaw -= (e.clientX - lx) * 0.008;
    cam.pitch = Math.max(-0.4, Math.min(1.2, cam.pitch + (e.clientY - ly) * 0.006));
    lx = e.clientX; ly = e.clientY;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.dist = Math.max(4.5, Math.min(24, cam.dist * (1 + Math.sign(e.deltaY) * 0.08)));
  }, { passive: false });
  window.addEventListener("keydown", (e) => {
    if (e.key === "c" || e.key === "C") state.clap = !state.clap;
    if (e.key === "r" || e.key === "R") cam.auto = !cam.auto;
  });

  const info = document.createElement("div");
  info.style.cssText = "position:fixed;left:12px;top:10px;color:#dfe3f2;font:13px sans-serif;pointer-events:none;line-height:1.5";
  info.innerHTML = "Bunzo Bunny &mdash; drag: putar &middot; scroll: zoom &middot; C: tepuk simbal &middot; R: auto-rotate";
  document.body.appendChild(info);

  /* ---------- Fungsi gambar ---------- */
  let root = M4.identity();
  function draw(geom, local, color, o) {
    o = o || {};
    const model = M4.mul(root, local);
    gl.uniformMatrix4fv(U.uModel, false, model);
    gl.uniformMatrix3fv(U.uNormalMat, false, M4.normalMat(model));
    gl.uniform3fv(U.uColor, color);
    gl.uniform3fv(U.uColor2, o.color2 || color);
    gl.uniform1f(U.uMode, o.mode || 0);
    gl.uniform1f(U.uFreq, 1);
    gl.uniform1f(U.uAlpha, 1);
    gl.uniform1f(U.uShine, o.shine || 24);
    gl.uniform1f(U.uSpec, o.spec === undefined ? 0.1 : o.spec);
    gl.bindBuffer(gl.ARRAY_BUFFER, geom.pos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, geom.nor);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geom.idx);
    gl.drawElements(gl.TRIANGLES, geom.count, gl.UNSIGNED_SHORT, 0);
  }
  const ell = (p, r, col, rot, o) => draw(G.sphere, xf(p, r, rot), col, o);
  const cyl = (p, r, col, rot, o) => draw(G.cyl, xf(p, r, rot), col, o);
  const cone = (p, r, col, rot, o) => draw(G.cone, xf(p, r, rot), col, o);
  const still = M4.identity();

  /* Lengan 2 ruas (IK sederhana): bahu S -> siku E -> tangan H */
  function arm(s, H) {
    const S = [0.3 * s, 2.4, 0], L1 = 0.56, L2 = 0.56;
    let d = vsub(H, S), dist = vlen(d);
    const maxd = L1 + L2 - 0.02;
    if (dist > maxd) { H = vadd(S, vmul(d, maxd / dist)); d = vsub(H, S); dist = maxd; }
    const dir = vmul(d, 1 / dist);
    const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    let pole = [0.3 * s, -1, -0.4];
    pole = vnorm(vsub(pole, vmul(dir, vdot(pole, dir))));
    const E = vadd(vadd(S, vmul(dir, a)), vmul(pole, h));
    draw(G.cyl, limbMatrix(S, E, 0.098, 0.098), COL.yellow);
    draw(G.cyl, limbMatrix(E, H, 0.088, 0.088), COL.yellow);
    ell(S, [0.125, 0.125, 0.125], COL.yellow);
    ell(E, [0.1, 0.1, 0.1], COL.yellow);
    ell(H, [0.12, 0.12, 0.13], COL.yellow);
    return H;
  }

  /* Simbal besar polos cokelat, dipegang dari belakang */
  function cymbal(s, H, a) {
    const n = [-s * Math.cos(a), 0, Math.sin(a)];
    const c = vadd(H, vmul(n, 0.1));
    draw(G.cyl, limbMatrix(vsub(c, vmul(n, 0.025)), vadd(c, vmul(n, 0.025)), 0.5, 0.5), COL.cymEdge, { shine: 30, spec: 0.25 });
    draw(G.cyl, limbMatrix(vsub(c, vmul(n, 0.02)), vadd(c, vmul(n, 0.032)), 0.42, 0.42), COL.cymFace, { shine: 30, spec: 0.25 });
    draw(G.cyl, limbMatrix(vadd(c, vmul(n, 0.032)), vadd(c, vmul(n, 0.046)), 0.27, 0.27), [0.78, 0.57, 0.29], { shine: 45, spec: 0.35 });
    draw(G.cyl, limbMatrix(vadd(c, vmul(n, 0.046)), vadd(c, vmul(n, 0.074)), 0.095, 0.095), COL.cymEdge, { shine: 50, spec: 0.4 });
    [0.31, 0.4].forEach((radius, i) => {
      const center = vadd(c, vmul(n, 0.05));
      draw(cymbalGroove, limbMatrix(vsub(center, vmul(n, 0.006)), vadd(center, vmul(n, 0.006)), radius, radius), i ? COL.cymEdge : COL.ring, { spec: 0.2 });
    });
    ell(vsub(c, vmul(n, 0.055)), [0.05, 0.05, 0.05], COL.cymEdge);
  }

  /* ---------- Gambar karakter ---------- */
  function drawBunzo(t) {
    const on = state.clap;
    let k = on ? 0.5 - 0.5 * Math.cos(t * 4.0) : 0; // 0 = simbal terbuka, 1 = beradu
    k = k * k * (3 - 2 * k);
    root = M4.translate(0, on ? 0.02 * Math.abs(Math.sin(t * 4.0)) : 0, 0);

    // alas bulat oranye
    cyl([0, -0.06, 0], [1.4, 0.12, 1.3], COL.base, null, { spec: 0.05 });

    // --- KAKI + TELAPAK BESAR + kaki celana menggembung berkerut ---
    [-1, 1].forEach((s) => {
      const lx0 = 0.26 * s;
      cyl([lx0, 0.74, 0], [0.125, 1.12, 0.125], COL.yellow);
      ell([lx0, FOOT.c[1], FOOT.c[2]], FOOT.r, COL.yellow);
      toeLines.forEach((g) => draw(g, M4.translate(lx0, 0, 0), COL.toe, { spec: 0.02 }));
      ell([lx0, 1.42, 0], [0.32, 0.35, 0.36], COL.green, null, { spec: 0.03 });
      for (let i = 0; i < 16; i++) { // kerutan (frill) berlekuk di ujung kaki celana
        const th = (i / 16) * Math.PI * 2;
        ell([lx0 + 0.16 * Math.cos(th), 1.1, 0.185 * Math.sin(th)], [0.055, 0.035, 0.055], COL.frill, null, { spec: 0.02 });
      }
    });
    ell([0, 1.58, 0], [0.43, 0.32, 0.37], COL.green, null, { spec: 0.03 }); // pinggul
    cyl([0, 1.83, 0], [0.37, 0.22, 0.32], COL.green, null, { spec: 0.03 }); // pinggang overall

    // --- BADAN ramping ---
    ell(TORSO.c, TORSO.r, COL.yellow);
    ell([0, 2.16, 0.3], [0.22, 0.34, 0.025], COL.belly, null, { spec: 0.02 });

    // --- BIB OVERALL, STRAP, DAN KANCING ---
    ell([0, 2.06, 0.28], [0.24, 0.19, 0.045], COL.green, null, { spec: 0.03 });
    straps.forEach((g) => draw(g, still, COL.green, { spec: 0.03 }));
    [-1, 1].forEach((s) => {
      const x = 0.22 * s, y = 2.01;
      const zs = torsoZ(x, y);
      const ry = Math.atan2(x / TORSO.r[0] ** 2, (y - TORSO.c[1]) / TORSO.r[1] ** 2);
      const bp = [x, y, zs + 0.05];
      cyl(bp, [0.078, 0.035, 0.078], COL.button, [Math.PI / 2, ry, 0], { spec: 0.15 });
      [Math.PI / 4, -Math.PI / 4].forEach((a) =>
        ell([bp[0] + Math.sin(ry) * 0.02, bp[1], bp[2] + Math.cos(ry) * 0.02], [0.048, 0.008, 0.01], COL.buttonX, [0, ry, a], { spec: 0.02 })
      );
    });
    draw(ringGeom, still, COL.ring, { shine: 60, spec: 0.6 });

    // --- KEPALA bulat ---
    draw(G.head, xf(HEAD.c, HEAD.r), COL.yellow);

    // dua tonjolan kecil di depan topi
    cone([-0.03, 3.5, 0.2], [0.03, 0.11, 0.03], COL.yellow, [0.5, 0, 0.1]);
    cone([0.07, 3.49, 0.2], [0.025, 0.07, 0.025], COL.yellow, [0.6, 0, -0.3]);

    // --- TELINGA (kurva Bezier) ---
    ears.forEach((e, i) => {
      const a = on ? 0.03 * Math.sin(t * 8.0 + i) : 0;
      const b = e.base;
      const m = M4.mul(M4.translate(b[0], b[1], b[2]), M4.mul(M4.rotZ(a), M4.translate(-b[0], -b[1], -b[2])));
      draw(e.outer, m, COL.yellow);
      draw(e.inner, m, COL.earIn, { spec: 0.03 });
    });

    // --- WAJAH: dekal pipi, mata hitam pekat, segitiga hijau, mulut senyum + lidah ---
    cheeks.forEach((g) => draw(g, still, COL.cheek, { spec: 0.02 }));
    eyes.forEach((g) => draw(g, still, COL.black, { spec: 0 }));
    marks.forEach((g) => draw(g, still, COL.mark, { spec: 0.02 }));
    draw(mouthPatch, still, COL.mouth, { spec: 0.05 });
    draw(tonguePatch, still, COL.tongue, { spec: 0.05 });
    draw(lipGeom, still, COL.lip, { spec: 0.03 });

    // Sepasang gigi depan menyatu menjadi satu bidang panjang di bibir atas.
    const incisorX = 0.1, incisorY = curveYAtX(mouthTop, incisorX) - 0.043;
    cyl([0, incisorY, headZ(0, incisorY) + 0.035], [0.1, 0.086, 0.028], COL.white, null, { spec: 0.1 });
    // Satu taring di tiap sisi gigi depan, menggantung dari bibir atas.
    [-1, 1].forEach((s) => {
      const x = 0.15 * s, y = curveYAtX(mouthTop, x), z = headZ(x, y) + 0.035;
      cone([x, y, z], [0.03, 0.105, 0.02], COL.white, [0, 0, Math.PI], { spec: 0.06 });
    });
    // Gigi bawah mengikuti lengkung rahang dan mengarah ke tengah mulut.
    [-0.22, -0.1, 0.1, 0.22].forEach((x) => {
      const y = curveYAtX(mouthBot, x);
      const z = headZ(x, y) + 0.024;
      const angle = Math.atan2(x, mcy - 0.11 - y);
      cone([x, y, z], [0.02, 0.048, 0.016], COL.white, [0, 0, angle], { spec: 0.06 });
    });

    // --- TOPI ULANG TAHUN (frustum kerucut, garis mendatar) + tunas di puncak ---
    const hatM = M4.mul(M4.translate(0, 3.47, -0.04), M4.mul(M4.rotX(-0.12), M4.rotZ(-0.08)));
    draw(G.coneHat, M4.mul(hatM, M4.scale(0.22, 0.6, 0.22)), COL.hatLight, { mode: 1, color2: COL.hatDark, spec: 0.05 });
    draw(G.cyl, M4.mul(hatM, xf([0, 0.64, 0], [0.045, 0.1, 0.045])), COL.knob, { spec: 0.03 });
    draw(G.sphere, M4.mul(hatM, xf([0, 0.73, 0], [0.09, 0.06, 0.075])), COL.knob, { spec: 0.03 });
    [[-0.045, 0.79, -0.45], [0.025, 0.82, 0.12], [0.075, 0.77, 0.58]].forEach((p, i) => {
      draw(G.sphere, M4.mul(hatM, xf([p[0], p[1], 0], [0.055, 0.11, 0.045], [0, 0, p[2]])), i === 1 ? COL.frill : COL.green, { spec: 0.03 });
    });

    // --- LENGAN PANJANG + SIMBAL (pose terbuka seperti referensi) ---
    const a = mix(1.0, 0, k);
    [-1, 1].forEach((s) => {
      const H = [mix(1.2, 0.12, k) * s, mix(2.58, 2.3, k), mix(0.7, 0.85, k)];
      const Hf = arm(s, H);
      cymbal(s, Hf, a);
    });
  }

  /* ---------- Loop render ---------- */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    return w / h;
  }

  function frame(ms) {
    const t = ms / 1000;
    if (cam.auto) cam.yaw += 0.006;
    const aspect = resize();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const dist = aspect < 0.85 ? (cam.dist * 0.85) / aspect : cam.dist;
    const target = [0, 2.1, 0];
    const eye = [
      target[0] + dist * Math.cos(cam.pitch) * Math.sin(cam.yaw),
      target[1] + dist * Math.sin(cam.pitch),
      target[2] + dist * Math.cos(cam.pitch) * Math.cos(cam.yaw),
    ];
    gl.uniformMatrix4fv(U.uView, false, M4.lookAt(eye, target, [0, 1, 0]));
    gl.uniformMatrix4fv(U.uProj, false, M4.perspective((35 * Math.PI) / 180, aspect, 0.1, 100));
    gl.uniform3fv(U.uEye, eye);

    drawBunzo(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}