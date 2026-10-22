// =====================================================================
// shader.js -> kode GLSL (program kecil yang jalan di GPU)
// =====================================================================

// VERTEX SHADER: jalan sekali untuk tiap titik (vertex)  (TIDAK diubah)
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
uniform vec3 uCam;                    // posisi kamera (buat specular + hitung jarak kabut)
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  if(dot(N,V) < 0.0) N = -N;          // two-sided, jadi cone/tube gak gelap kalau kebalik
  vec3 L = normalize(vec3(0.5,1.0,0.8));       // arah cahaya (matahari dari kanan-atas-depan)
  float diff = max(dot(N,L),0.0);               // lambert: makin tegak lurus ke cahaya makin terang
  vec3 H = normalize(L+V);
  float spec = pow(max(dot(N,H),0.0),32.0)*0.25; // kilap (blinn-phong), 32 = ketajaman kilap
  vec3 c = vC*(0.4+0.75*diff)+spec;     // 0.4 = cahaya dasar (ambient), 0.75 = kekuatan diffuse

  // ---- KABUT (BARU): objek yang jauh pelan-pelan berubah jadi warna langit ----
  // d = jarak pixel ke kamera. Kabut 0 kalau d <= 20, penuh (1) kalau d >= 42
  // rumus: fog = (d - 20) / (42 - 20) = (d - 20) / 22, lalu dijepit ke 0..1 (clamp)
  float d = length(uCam - vW);
  float fog = clamp((d-20.0)/22.0, 0.0, 1.0);
  c = mix(c, vec3(0.62,0.82,0.95), fog);  // mix(a,b,t) = a*(1-t)+b*t; warna langit sama dgn clearColor di main.js
  gl_FragColor = vec4(c,1.0);
}`;