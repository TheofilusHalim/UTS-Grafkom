// helpers/shader.js -- shader (pencahayaan + bulu) dan setup WebGL. DIPAKAI BERSAMA oleh tugas.js (cerita) dan viewer.js.
// Format vertex: X,Y,Z, R,G,B, Nx,Ny,Nz (stride 36 byte)

const vsSource = `
attribute vec3 position, color, normal;
uniform mat4 Pmatrix, Vmatrix, Mmatrix;
uniform mat3 uNormalMat;                 // inverse-transpose: normal benar walau objek diskalakan tak seragam
uniform float uShell, uFurLen;           // lapisan bulu ke-n (0 = kulit) dan panjang bulu
varying vec3 vColor, vNormal, vWorld, vObj, vObjN;
void main() {
  vec3 p = position + normal * (uShell * uFurLen);        // geser sepanjang normal -> lapisan bulu
  vec4 w = Mmatrix * vec4(p, 1.0);
  w.y -= uShell * uShell * uFurLen * 0.8;                 // bulu merunduk karena gravitasi (arah dunia)
  w.y -= uShell * uShell * uFurLen * 1.3;                 // GRAVITASI: makin ke ujung helai makin terkulai ke bawah
  vWorld = w.xyz;
  vColor = color;
  vNormal = uNormalMat * normal;
  vObj = position;
  vObjN = normal;
  gl_Position = Pmatrix * Vmatrix * w;
}`;
const fsSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vColor, vNormal, vWorld, vObj, vObjN;
uniform vec3 uTint, uCam, uLP[3], uLC[3];
uniform float uEmissive, uShell;
uniform vec4 uMask;                      // bola tanpa bulu (wajah)
uniform vec2 uFog;                       // jarak awal & akhir kabut (viewer mematikannya)
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 base = vColor * uTint;
  if (uShell > 0.0) {                                    // ---- BULU: tiap sel = 1 helai berpenampang BULAT yang meruncing ke ujung (seperti kerucut tipis)
    vec3 q = vObj * 42.0;                                // kerapatan helai (makin besar = makin halus & rapat)
    vec3 id = floor(q);
    vec3 f = fract(q) - 0.5;
    vec3 n0 = normalize(vObjN);
    f -= n0 * dot(f, n0);                                // jarak diukur di bidang permukaan -> titik bulat, bukan kotak
    float len = 0.35 + 0.65 * hash(id);                  // tiap helai punya panjang berbeda
    float fm = 1.0;                                      // area wajah: bulu DIPENDEKKAN (bukan dibotakkan -> tidak ada lingkaran)
    if (uMask.w > 0.0) fm = mix(0.3, 1.0, smoothstep(uMask.w * 0.3, uMask.w, distance(vObj, uMask.xyz)));
    float rad = mix(0.55, 0.12, uShell);                 // meruncing: pangkal tebal, ujung tipis
    if (uShell > len * fm || length(f) > rad) discard;
    base *= mix(0.72, 1.12, uShell);                     // pangkal lebih gelap, ujung lebih terang
  }
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vWorld);
  if (dot(N, V) < 0.0) N = -N;                           // permukaan dua sisi
  // 1) AMBIENT hemisphere: atas (langit) lebih terang/biru, bawah (lantai) lebih gelap/hangat
  vec3 light = mix(vec3(0.20, 0.18, 0.20), vec3(0.34, 0.40, 0.52), N.y * 0.5 + 0.5);
  // 2) DIFFUSE lampu arah:  max(N·L, 0)
  light += vec3(0.20, 0.24, 0.32) * max(dot(N, normalize(vec3(0.2, 1.0, 0.4))), 0.0);
  vec3 spec = vec3(0.0);
  for (int i = 0; i < 3; i++) {                          // 3) lampu titik lorong: diffuse + specular + redaman jarak
    vec3 Lv = uLP[i] - vWorld; float d = length(Lv); Lv /= d;
    float att = 1.0 / (1.0 + 0.04 * d + 0.015 * d * d);
    float df = max(dot(N, Lv), 0.0);
    light += uLC[i] * df * att * 2.2;
    vec3 H = normalize(Lv + V);                          // Blinn-Phong: (N·H)^shininess
    spec += uLC[i] * pow(max(dot(N, H), 0.0), 32.0) * att * 0.6 * df;
  }
  vec3 col = base * light + spec + base * uEmissive * 1.5;
  col += pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.10 * vec3(0.5, 0.6, 0.8);   // 4) RIM light: tepi siluet
  float fog = smoothstep(uFog.x, uFog.y, length(uCam - vWorld));
  gl_FragColor = vec4(mix(col, vec3(0.02, 0.03, 0.05), fog), 1.0);
}`;


export function createRenderer(canvas) {
  const GL = canvas.getContext("webgl", { antialias: true });
  function compile(type, src) {
    const s = GL.createShader(type); GL.shaderSource(s, src); GL.compileShader(s);
    if (!GL.getShaderParameter(s, GL.COMPILE_STATUS)) console.error(GL.getShaderInfoLog(s));
    return s;
  }
  const prog = GL.createProgram();
  GL.attachShader(prog, compile(GL.VERTEX_SHADER, vsSource));
  GL.attachShader(prog, compile(GL.FRAGMENT_SHADER, fsSource));
  GL.linkProgram(prog);
  GL.useProgram(prog);

  const locs = {
    position: GL.getAttribLocation(prog, "position"),
    color:    GL.getAttribLocation(prog, "color"),
    normal:   GL.getAttribLocation(prog, "normal"),
    M:        GL.getUniformLocation(prog, "Mmatrix"),
    N:        GL.getUniformLocation(prog, "uNormalMat"),
    shell:    GL.getUniformLocation(prog, "uShell"),
    furLen:   GL.getUniformLocation(prog, "uFurLen"),
    furMask:  GL.getUniformLocation(prog, "uMask"),
    tint:     GL.getUniformLocation(prog, "uTint"),
    emissive: GL.getUniformLocation(prog, "uEmissive"),
  };
  const uP = GL.getUniformLocation(prog, "Pmatrix"), uV = GL.getUniformLocation(prog, "Vmatrix");
  const uCam = GL.getUniformLocation(prog, "uCam");
  const uLP = GL.getUniformLocation(prog, "uLP"), uLC = GL.getUniformLocation(prog, "uLC");
  const uFog = GL.getUniformLocation(prog, "uFog");
  GL.uniform2f(uFog, 12, 40);                       // kabut bawaan (lorong)
  GL.enableVertexAttribArray(locs.position);
  GL.enableVertexAttribArray(locs.color);
  GL.enableVertexAttribArray(locs.normal);
  return { GL, prog, locs, uP, uV, uCam, uLP, uLC, uFog };
}
