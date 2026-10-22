// =====================================================================
// shapes.js -> pabrik bentuk: 3 objek kuadrik + kurva Bezier
// =====================================================================
const COL = {                                    // palet warna (R,G,B skala 0..1; 0.5 = setengah terang)
  // ---- warna karakter (TIDAK diubah) ----
  yellow:[0.96,0.89,0.52],                       // kuning pastel kulit Cat Bee
  brown:[0.31,0.25,0.31],                        // abu-ungu gelap buat belang, antena, ekor
  cream:[0.97,0.96,0.93],                        // putih tulang buat moncong, dada, dalam telinga
  teal:[0.45,0.83,0.88],                         // biru toska muda buat sayap
  white:[1,1,1],
  black:[0.07,0.06,0.09],
  pink:[0.33,0.25,0.32],                         // dipakai buat hidung (abu-ungu gelap)
  // ---- warna lingkungan (BARU) ----
  grass:[0.45,0.70,0.33],                        // rumput siang hari (lebih terang dari sebelumnya)
  blade:[0.30,0.62,0.28],                        // helai rumput
  trunk:[0.45,0.30,0.18],                        // batang pohon
  leaf:[0.30,0.62,0.30],                         // daun hijau terang
  leaf2:[0.20,0.50,0.28],                        // daun hijau tua
  stone:[0.62,0.62,0.60],                        // batu
  honey:[0.98,0.78,0.20],                        // madu (sarang lebah)
  honey2:[0.85,0.60,0.12],                       // madu lebih gelap, buat selang-seling
  cloud:[1,1,1],                                 // awan
  petalPink:[0.95,0.50,0.65], petalWhite:[0.98,0.98,0.95], petalOrange:[0.98,0.60,0.25]
};
const flat = c => () => c;                       // fungsi warna polos (semua vertex sama)

class Shapes {
  // OBJEK 1: Ellipsoid -> x = a cos v cos u, y = b cos v sin u, z = c sin v  (v: -pi/2..pi/2, u: -pi..pi)
  static ellipsoid(gl,a,b,c,colorFn){
    return new Mesh(gl,(u,v)=>[a*Math.cos(v)*Math.cos(u), b*Math.cos(v)*Math.sin(u), c*Math.sin(v)],
      -Math.PI,Math.PI,-Math.PI/2,Math.PI/2,48,32,colorFn);
  }

  // OBJEK 2: Elliptic cone (quadric selain ellipsoid/cylinder) -> x = a v cos u, y = b v sin u, z = c v
  // v: 0..1, puncak di v=0, alas di v=1, sumbu z
  static ellipticCone(gl,a,b,c,colorFn){
    return new Mesh(gl,(u,v)=>[a*v*Math.cos(u), b*v*Math.sin(u), c*v],
      -Math.PI,Math.PI,0,1,32,8,colorFn);
  }

  // OBJEK 3: Cylinder (sumbu Y, menggantung dari y=0 ke y=-h) -> x = r cos u, y = -h v, z = r sin u
  static cylinder(gl,r,h,colorFn){
    return new Mesh(gl,(u,v)=>[r*Math.cos(u), -h*v, r*Math.sin(u)],
      -Math.PI,Math.PI,0,1,24,8,colorFn);
  }

  // KURVA: Bezier cubic di bidang XY, lalu disapu lingkaran jadi tube
  // B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
  // P = 4 titik kontrol, rFn = radius tiap posisi, pipih = skala sumbu z (kecil = gepeng)
  static bezierTube(gl,P,rFn,pipih,colorFn){
    const bez=t=>{const s=1-t;return [0,1].map(k=>s*s*s*P[0][k]+3*s*s*t*P[1][k]+3*s*t*t*P[2][k]+t*t*t*P[3][k]);};
    return new Mesh(gl,(u,v)=>{
      const p=bez(v), q=bez(Math.min(v+1e-3,1)), r0=bez(Math.max(v-1e-3,0));
      let tx=q[0]-r0[0], ty=q[1]-r0[1]; const l=Math.hypot(tx,ty)||1; // arah singgung kurva
      const nx=-ty/l, ny=tx/l;                  // normal kurva (tegak lurus singgung)
      const r=rFn(v);
      return [p[0]+r*Math.cos(u)*nx, p[1]+r*Math.cos(u)*ny, r*pipih*Math.sin(u)];
    },0,2*Math.PI,0,1,20,24,colorFn);
  }
}