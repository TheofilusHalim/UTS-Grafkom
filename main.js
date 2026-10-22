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
gl.clearColor(0.62,0.82,0.95,1);                     // warna LANGIT (biru muda); harus sama dengan warna kabut di shader.js

// ---- bikin objek ----
const cat=new CatBee(gl);
const env=new Environment(gl);                       // lingkungan taman

// ---- lokasi uniform disimpan sekali (lebih hemat daripada dicari tiap frame) ----
const uView=gl.getUniformLocation(prog,"uView");
const uProj=gl.getUniformLocation(prog,"uProj");
const uCam =gl.getUniformLocation(prog,"uCam");

// ---- kontrol kamera & keyboard ----
// yaw = putar kiri-kanan, pitch = angguk atas-bawah (radian), dist = jarak kamera, distT = target jarak (zoom halus)
let yaw=0, pitch=0.2, dist=9, distT=9, drag=false, lx=0, ly=0, walk=true;
// force = mode paksa (BARU): null = otomatis (siklus 14 dtk), 1 = paksa melayang, 0 = paksa mendarat
let force=null;

// teks petunjuk di pojok kiri atas, ikut menampilkan mode saat ini
const infoEl=document.getElementById("info");
function setInfo(){
  const mode=force===null?"Otomatis":(force===1?"Paksa melayang":"Paksa mendarat");
  infoEl.textContent="Drag = putar kamera | Scroll = zoom | Spasi = jalan/pause | F = melayang/mendarat/otomatis | Mode: "+mode;
}
setInfo();

canvas.onmousedown=e=>{drag=true;lx=e.clientX;ly=e.clientY;};
window.onmouseup=()=>drag=false;
window.onmousemove=e=>{ if(!drag)return;
  yaw+=(e.clientX-lx)*0.01;                                          // 0.01 = sensitivitas: 100 pixel drag = 1 radian
  pitch=Math.min(Math.max(pitch+(e.clientY-ly)*0.01,0.05),1.3);      // pitch dikunci 0.05..1.3 biar kamera gak tembus tanah / kebalik
  lx=e.clientX; ly=e.clientY; };
canvas.onwheel=e=>{distT=Math.min(Math.max(distT+e.deltaY*0.005,3),12);};  // target zoom dibatasi 3..12
window.onkeydown=e=>{
  if(e.code=="Space") walk=!walk;                                    // spasi = jalan/pause
  if(e.code=="KeyF"){                                                // F: otomatis -> melayang -> mendarat -> otomatis ...
    force=(force===null)?1:(force===1?0:null);
    setInfo();
  }
};

// ---- loop render ----
let angle=0, last=0;
function frame(ms){
  const t=ms/1000;                                   // t = waktu dalam detik
  const dt=Math.min(t-last,0.05); last=t;            // dt = selisih antar frame, dibatasi 0.05 dtk biar gak loncat pas tab di-minimize

  // ukuran canvas cuma diubah kalau jendela berubah ukuran
  if(canvas.width!==innerWidth||canvas.height!==innerHeight){ canvas.width=innerWidth; canvas.height=innerHeight; }
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  dist+=(distT-dist)*Math.min(1,dt*8);               // ZOOM HALUS: jarak mendekati target pelan-pelan (faktor 8 = kecepatan)

  // kamera: view = translate * rotX * rotY
  // translate(0,-0.8,-dist): y=-0.8 artinya kamera "melihat" titik setinggi 0.8 (sekitar badan kucing)
  const view=Mat4.multiply(Mat4.translate(0,-0.8,-dist),Mat4.multiply(Mat4.rotX(pitch),Mat4.rotY(yaw)));
  // perspektif: fov 45 derajat (PI/4), near 0.3, far 120 (far besar karena tanah radius 45)
  const proj=Mat4.perspective(Math.PI/4,canvas.width/canvas.height,0.3,120);
  gl.uniformMatrix4fv(uView,false,new Float32Array(view));
  gl.uniformMatrix4fv(uProj,false,new Float32Array(proj));

  // posisi kamera asli di world (buat specular & kabut) = kebalikan transformasi view
  const inv=Mat4.multiply(Mat4.rotY(-yaw),Mat4.multiply(Mat4.rotX(-pitch),Mat4.translate(0,0.8,dist)));
  gl.uniform3f(uCam,inv[12],inv[13],inv[14]);

  env.update(t);                                     // animasi lingkungan (pohon, bunga, rumput, awan)
  env.draw(gl,prog,Mat4.identity());

  // URUTAN DIUBAH: cat.update dulu, baru angle dihitung, supaya kecepatan yang dipakai selalu yang terbaru
  cat.update(t,dt,walk,force);

  // TRANSLATE + ROTATE: kucing muter di lingkaran radius R=2.2
  // angle bertambah 0.5 rad/dtk dikali cat.speed (0 saat pause, 1 saat jalan, 1.4 saat melayang)
  // satu putaran = 2*PI/0.5 = 12.57 dtk saat jalan, dan 2*PI/(0.5*1.4) = 8.98 dtk saat melayang
  angle+=dt*0.5*cat.speed;
  const R=2.2;
  let m=Mat4.translate(R*Math.sin(angle),0,R*Math.cos(angle));  // posisi di lingkaran: x=R sin(a), z=R cos(a), y=0
  m=Mat4.multiply(m,Mat4.rotY(angle+Math.PI/2));                // hadap ke arah singgung lingkaran (angle + 90 derajat)
  cat.draw(gl,prog,m);

  requestAnimationFrame(frame);                      // panggil lagi frame berikutnya
}
requestAnimationFrame(frame);