// helpers/libs.js -- matriks 4x4 column-major (format WebGL)
// Konvensi: LIBS.multiply(a, b) = a × b  (b diterapkan lebih dulu pada titik)
export const LIBS = {
  degToRad(a) { return a * Math.PI / 180; },

  get_projection(fov, aspect, near, far) {
    const f = 1 / Math.tan(LIBS.degToRad(fov) / 2);
    return [f / aspect,0,0,0, 0,f,0,0, 0,0,(far+near)/(near-far),-1, 0,0,2*far*near/(near-far),0];
  },

  get_I4() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; },

  multiply(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k*4 + r] * b[c*4 + k];
        o[c*4 + r] = s;
      }
    return o;
  },

  // ---------- Transformasi dasar ----------
  translate(x, y, z) { return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]; },
  scale(x, y, z)     { return [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]; },
  rotateX(d) { const c = Math.cos(LIBS.degToRad(d)), s = Math.sin(LIBS.degToRad(d)); return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; },
  rotateY(d) { const c = Math.cos(LIBS.degToRad(d)), s = Math.sin(LIBS.degToRad(d)); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; },
  rotateZ(d) { const c = Math.cos(LIBS.degToRad(d)), s = Math.sin(LIBS.degToRad(d)); return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; },
  rotateEuler(rx, ry, rz) {   // Rz · Ry · Rx
    return LIBS.multiply(LIBS.rotateZ(rz), LIBS.multiply(LIBS.rotateY(ry), LIBS.rotateX(rx)));
  },

  // ---------- Rotasi sumbu ARBITRARY (Rodrigues) ----------
  rotateArbitrary(axis, deg) {
    const l = Math.hypot(axis[0], axis[1], axis[2]);
    const x = axis[0]/l, y = axis[1]/l, z = axis[2]/l;
    const a = LIBS.degToRad(deg), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [
      t*x*x + c,   t*x*y + s*z, t*x*z - s*y, 0,
      t*x*y - s*z, t*y*y + c,   t*y*z + s*x, 0,
      t*x*z + s*y, t*y*z - s*x, t*z*z + c,   0,
      0, 0, 0, 1
    ];
  },
  // Rotasi sumbu arbitrary mengelilingi titik PIVOT:  T(p) · R · T(-p)
  rotateAboutPivot(axis, deg, p) {
    return LIBS.multiply(LIBS.translate(p[0], p[1], p[2]),
           LIBS.multiply(LIBS.rotateArbitrary(axis, deg), LIBS.translate(-p[0], -p[1], -p[2])));
  },

  // ---------- Kamera ----------
  lookAt(eye, ctr, up) {
    let f = [ctr[0]-eye[0], ctr[1]-eye[1], ctr[2]-eye[2]];
    let l = Math.hypot(...f); f = f.map(v => v / l);
    let s = [f[1]*up[2]-f[2]*up[1], f[2]*up[0]-f[0]*up[2], f[0]*up[1]-f[1]*up[0]];
    l = Math.hypot(...s); s = s.map(v => v / l);
    const u = [s[1]*f[2]-s[2]*f[1], s[2]*f[0]-s[0]*f[2], s[0]*f[1]-s[1]*f[0]];
    const d = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    return [s[0],u[0],-f[0],0, s[1],u[1],-f[1],0, s[2],u[2],-f[2],0, -d(s,eye),-d(u,eye),d(f,eye),1];
  },

  transformPoint(m, p) {
    return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
            m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
            m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
  }
};
