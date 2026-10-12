// =====================================================================
// shader.js -> kode GLSL (program kecil yang jalan di GPU)
// =====================================================================

// VERTEX SHADER: jalan sekali untuk tiap titik (vertex)
const VS = `
attribute vec3 aPos;      // posisi vertex
attribute vec3 aNormal;   // normal buat pencahayaan
attribute vec3 aColor;    // warna per vertex (biar bisa belang)
uniform mat4 uModel, uView, uProj;
varying vec3 vN, vW, vC;
void main(){
  vec4 w = uModel * vec4(aPos,1.0);   // posisi di world
  vW = w.xyz;
  vN = mat3(uModel) * aNormal;        // normal ikut rotasi model
  vC = aColor;
  gl_Position = uProj * uView * w;    // transformasi ke layar
}`;

// FRAGMENT SHADER: jalan untuk tiap pixel, nentuin warna akhir
const FS = `
precision mediump float;
varying vec3 vN, vW, vC;
uniform vec3 uCam;                    // posisi kamera, buat specular
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  if(dot(N,V) < 0.0) N = -N;          // two-sided, jadi cone/tube gak gelap kalau kebalik
  vec3 L = normalize(vec3(0.5,1.0,0.8));       // arah cahaya
  float diff = max(dot(N,L),0.0);               // lambert
  vec3 H = normalize(L+V);
  float spec = pow(max(dot(N,H),0.0),32.0)*0.25; // phong/blinn
  gl_FragColor = vec4(vC*(0.35+0.75*diff)+spec,1.0); // ambient + diffuse + specular
}`;