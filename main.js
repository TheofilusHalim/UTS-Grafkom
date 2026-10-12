// =====================================================================
// main.js -> program utama: setup WebGL, kamera, loop animasi
// =====================================================================
const canvas=document.getElementById("c");
const gl=canvas.getContext("webgl");                 // WebGL murni, bukan three.js

// ---- compile & link shader ----
function compile(type,src){
  const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); // tampilin error shader
  return s;
}
const prog=gl.createProgram();
gl.attachShader(prog,compile(gl.VERTEX_SHADER,VS));
gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,FS));
gl.linkProgram(prog); gl.useProgram(prog);
gl.enable(gl.DEPTH_TEST);                            // biar objek depan nutup yang di belakang
gl.clearColor(0.1,0.1,0.18,1);                       // warna background

// ---- bikin objek ----
const cat=new CatBee(gl);
const ground=new Part(Shapes.ellipsoid(gl,4,0.02,4,flat(COL.grass)),[0,0,0]); // lantai = ellipsoid pipih

// ---- kontrol kamera & keyboard ----
// Karakter mulai di sisi depan lingkaran (z positif), jadi yaw 0 membuatnya
// berada di tengah layar; kamera tetap bisa diputar dengan drag mouse.
let yaw=0, pitch=0.35, dist=9, drag=false, lx=0, ly=0, walk=true;
canvas.onmousedown=e=>{drag=true;lx=e.clientX;ly=e.clientY;};
window.onmouseup=()=>drag=false;
window.onmousemove=e=>{ if(!drag)return;
  yaw+=(e.clientX-lx)*0.01; pitch+=(e.clientY-ly)*0.01; lx=e.clientX; ly=e.clientY; };
canvas.onwheel=e=>{dist=Math.min(Math.max(dist+e.deltaY*0.005,3),12);};   // zoom dibatasi 3..12
window.onkeydown=e=>{ if(e.code=="Space") walk=!walk; };                  // spasi = jalan/diam

// ---- loop render ----
let angle=0, last=0;
function frame(ms){
  const t=ms/1000, dt=t-last; last=t;                // t = detik, dt = selisih antar frame
  canvas.width=innerWidth; canvas.height=innerHeight;
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  // kamera: view = translate * rotX * rotY
  const view=Mat4.multiply(Mat4.translate(0,-0.8,-dist),Mat4.multiply(Mat4.rotX(pitch),Mat4.rotY(yaw)));
  const proj=Mat4.perspective(Math.PI/4,canvas.width/canvas.height,0.1,50);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog,"uView"),false,new Float32Array(view));
  gl.uniformMatrix4fv(gl.getUniformLocation(prog,"uProj"),false,new Float32Array(proj));

  // ---- BAGIAN YANG DIPERBAIKI: posisi kamera asli di world (buat hitung specular di shader) ----
  // Dulu ditulis tetap (0,3,dist), jadi pas kamera diputar pakai mouse arah pandangnya salah
  // dan pencahayaan wajah kelihatan terbelah. Sekarang dihitung dari kebalikan matriks view:
  //   view = T(0,-0.8,-dist) * rotX(pitch) * rotY(yaw)
  //   posisi kamera = rotY(-yaw) * rotX(-pitch) * T(0,0.8,dist)  (rotasi dinegatifkan, urutan dibalik)
  const inv=Mat4.multiply(Mat4.rotY(-yaw),Mat4.multiply(Mat4.rotX(-pitch),Mat4.translate(0,0.8,dist)));
  gl.uniform3f(gl.getUniformLocation(prog,"uCam"),inv[12],inv[13],inv[14]); // inv[12..14] = kolom translasi = posisi kamera

  ground.draw(gl,prog,Mat4.identity());

  if(walk) angle+=dt*0.5;                            // kucing muter di lingkaran radius 2.2
  cat.update(t,walk);
  const R=2.2;
  let m=Mat4.translate(R*Math.sin(angle),0,R*Math.cos(angle));  // posisi di lingkaran
  m=Mat4.multiply(m,Mat4.rotY(angle+Math.PI/2));                // hadap ke arah singgung lingkaran
  cat.draw(gl,prog,m);

  requestAnimationFrame(frame);                      // panggil lagi frame berikutnya
}
requestAnimationFrame(frame);