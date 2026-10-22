// =====================================================================
// environment.js -> lingkungan taman: tanah, batu, pohon, bunga, rumput, sarang lebah, awan
// Hanya pakai 3 jenis objek yang sama (ellipsoid, cylinder, elliptic cone) + kurva Bezier (rumput)
// =====================================================================
class Environment {
  constructor(gl){
    const S=Shapes, PI=Math.PI;
    this.root=new Part(null,[0,0,0]);
    this.trees=[]; this.flowers=[]; this.clouds=[]; this.tufts=[];   // daftar objek yang dianimasikan

    // generator angka acak tetap (LCG): hasil sama tiap reload, jadi tata letak taman nggak berubah-ubah
    let seed=12345;
    const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };   // hasil 0..1

    // ---- TANAH: ellipsoid gepeng, radius x dan z = 45, tebal y = 0.02 (ujungnya ketutup kabut) ----
    this.root.add(new Part(S.ellipsoid(gl,45,0.02,45,flat(COL.grass))));

    // ---- BATU: 18 ellipsoid kecil membentuk lingkaran jalur kucing (radius 3.3; kucing jalan di radius 2.2) ----
    const mStone=S.ellipsoid(gl,0.16,0.09,0.12,flat(COL.stone));    // 1 mesh dipakai ulang buat semua batu (hemat memori)
    const nStone=18, rStone=3.3;
    for(let i=0;i<nStone;i++){
      const a=i/nStone*2*PI;                                        // sudut tiap batu: 360 derajat dibagi 18 = 20 derajat
      const st=this.root.add(new Part(mStone,[rStone*Math.sin(a),0.04,rStone*Math.cos(a)],[0,a,0]));
      st.scl=0.8+0.5*rnd();                                         // SCALING: ukuran batu acak 0.8 sampai 1.3 kali
    }

    // ---- POHON ----
    const mTrunk=S.cylinder(gl,0.13,1,flat(COL.trunk));             // batang: cylinder radius 0.13, tinggi 1
    const mRoundA=S.ellipsoid(gl,0.9,0.8,0.9,flat(COL.leaf));       // tajuk bulat besar
    const mRoundB=S.ellipsoid(gl,0.6,0.55,0.6,flat(COL.leaf2));     // tajuk bulat kecil (di atas)
    const mPineA=S.ellipticCone(gl,0.9,0.9,1.5,flat(COL.leaf2));    // cemara bawah: cone radius alas 0.9, tinggi 1.5
    const mPineB=S.ellipticCone(gl,0.65,0.65,1.2,flat(COL.leaf));   // cemara atas: cone radius alas 0.65, tinggi 1.2
    const makeTree=(x,z,s,pine)=>{
      const tr=this.root.add(new Part(null,[x,0,z]));               // pivot di pangkal pohon (biar goyangnya dari bawah)
      tr.scl=s;                                                     // SCALING: ukuran seluruh pohon (anak ikut membesar)
      tr.add(new Part(mTrunk,[0,1,0]));                             // cylinder menggantung ke bawah, jadi taruh di y=1 -> batang y=0..1
      if(pine){
        // rotX +90 -> sumbu z cone jadi ke bawah: puncak di titik pos, alas turun sejauh tinggi cone
        tr.add(new Part(mPineA,[0,2.4,0],[PI/2,0,0]));              // puncak y=2.4, alas y=2.4-1.5=0.9 (nutup ujung batang)
        tr.add(new Part(mPineB,[0,3.2,0],[PI/2,0,0]));              // puncak y=3.2, alas y=3.2-1.2=2.0 (numpuk di atas)
      } else {
        tr.add(new Part(mRoundA,[0,1.8,0]));                        // pusat y=1.8, radius y 0.8 -> bawahnya y=1.0 (pas di ujung batang)
        tr.add(new Part(mRoundB,[0.4,2.4,0.1]));                    // tajuk kedua, geser biar gak simetris
      }
      this.trees.push({p:tr,ph:rnd()*6.28});                        // ph = fase acak biar goyangnya gak serempak
    };
    [[-5.2,-4.0,1.1],[6,-3.5,1.3],[-7,2.5,1.0],[7.5,3,1.2],[0,-9,1.5]].forEach(a=>makeTree(a[0],a[1],a[2],false)); // pohon bulat [x,z,skala]
    [[-8,-2,1.2],[4,-8,1.4],[-3.8,-7.5,1.0],[8.5,-1,1.3],[-5,6.5,1.1],[5,7,1.2]].forEach(a=>makeTree(a[0],a[1],a[2],true)); // cemara

    // ---- BUNGA: batang cylinder + pusat ellipsoid + 6 kelopak ellipsoid ----
    const mStem=S.cylinder(gl,0.02,0.4,flat(COL.leaf2));
    const mCenter=S.ellipsoid(gl,0.055,0.04,0.055,flat(COL.honey));
    const mPetals=[COL.petalPink,COL.petalWhite,COL.petalOrange].map(c=>S.ellipsoid(gl,0.07,0.02,0.04,flat(c)));
    for(let i=0;i<10;i++){
      const a=rnd()*2*PI, r=4+rnd()*4;                              // posisi acak: sudut 0..360, jarak 4..8 dari tengah
      const f=this.root.add(new Part(null,[r*Math.sin(a),0,r*Math.cos(a)]));
      f.scl=1.5+rnd();                                              // SCALING: ukuran bunga 1.5 sampai 2.5 kali
      f.add(new Part(mStem,[0,0.4,0]));                             // batang y=0..0.4
      const head=f.add(new Part(null,[0,0.4,0]));                   // kepala bunga di ujung batang
      head.axis=[1,0,1];                                            // ROTATE ARBITRARY AXIS: kepala bunga goyang di sumbu diagonal (1,0,1)
      head.add(new Part(mCenter));
      for(let k=0;k<6;k++){
        const th=k*PI/3;                                            // 6 kelopak, jarak sudut 60 derajat (PI/3)
        // kelopak di radius 0.1; rotY -th supaya sumbu panjang kelopak (x) menghadap keluar dari pusat
        head.add(new Part(mPetals[i%3],[0.1*Math.cos(th),0,0.1*Math.sin(th)],[0,-th,0]));
      }
      this.flowers.push({p:f,h:head,ph:rnd()*6.28});
    }

    // ---- RUMPUT: helai = KURVA Bezier (1 mesh dipakai ulang), tiap rumpun 3 helai ----
    // titik kontrol (0,0) -> (0.16,0.36): helai tumbuh ke atas lalu melengkung ke kanan; radius dari 0.034 (pangkal) mengecil ke 0.004 (ujung)
    const mBlade=S.bezierTube(gl,[[0,0],[0.01,0.15],[0.06,0.28],[0.16,0.36]],v=>0.03*(1-v)+0.004,0.35,flat(COL.blade));
    for(let i=0;i<28;i++){
      const a=rnd()*2*PI, r=3.6+rnd()*6.4;                          // di luar lingkaran batu (r>3.6) sampai r=10
      const tuft=this.root.add(new Part(null,[r*Math.sin(a),0,r*Math.cos(a)],[0,rnd()*6.28,0]));
      tuft.scl=1+0.8*rnd();                                         // SCALING: tinggi rumpun 1 sampai 1.8 kali
      for(let k=0;k<3;k++) tuft.add(new Part(mBlade,[0.03*k,0,0],[0,k*2.1,0])); // 3 helai, tiap helai diputar 2.1 rad (~120 derajat)
      this.tufts.push({p:tuft,ph:rnd()*6.28});
    }

    // ---- SARANG LEBAH: 4 ellipsoid ditumpuk, selang-seling madu terang/gelap ----
    const hive=this.root.add(new Part(null,[-4.8,0,-2.6],[0,0.5,0]));   // rotY 0.5 rad biar pintunya menghadap ke arah kamera/kucing
    [[0.8,0.3,0.28,COL.honey],[0.68,0.28,0.72,COL.honey2],[0.52,0.26,1.1,COL.honey],[0.3,0.2,1.4,COL.honey2]]
      .forEach(([r,h,y,c])=>hive.add(new Part(S.ellipsoid(gl,r,h,r,flat(c)),[0,y,0]))); // [radius mendatar, setengah tinggi, posisi y, warna]
    // pintu: permukaan lapis ke-2 di y=0.55 -> z = 0.68*sqrt(1-(0.17/0.28)^2) = 0.54, pintu di z=0.55 (nongol ~0.07)
    hive.add(new Part(S.ellipsoid(gl,0.16,0.12,0.06,flat(COL.brown)),[0,0.55,0.55]));

    // ---- AWAN: 3 ellipsoid per awan (mesh dipakai ulang), melayang pelan ----
    const mCloudA=S.ellipsoid(gl,1.2,0.5,0.7,flat(COL.cloud));
    const mCloudB=S.ellipsoid(gl,0.8,0.45,0.6,flat(COL.cloud));
    [[-8,6,-15,2.2],[7,7,-18,2.6],[-1,5.5,-22,3],[13,6,-10,2]].forEach(([x,y,z,s])=>{   // [x,y,z,skala]
      const c=this.root.add(new Part(null,[x,y,z]));
      c.scl=s;                                                      // SCALING: awan diperbesar 2 sampai 3 kali
      c.add(new Part(mCloudA));
      c.add(new Part(mCloudB,[1.0,-0.1,0.1]));
      c.add(new Part(mCloudB,[-1.0,-0.12,0]));
      this.clouds.push({p:c,x0:x,ph:rnd()*6.28});
    });
  }

  // animasi lingkungan, dipanggil tiap frame. t = waktu (detik)
  update(t){
    // ROTATE: pohon bergoyang dari pangkal: rotZ +-0.02 rad (+-1.1 derajat), rotX +-0.015 rad
    this.trees.forEach(o=>{ o.p.rot[2]=Math.sin(t*0.8+o.ph)*0.02; o.p.rot[0]=Math.cos(t*0.6+o.ph)*0.015; });
    // ROTATE: batang bunga miring +-0.08 rad (+-4.6 derajat); ROTATE ARBITRARY AXIS: kepala bunga +-0.3 rad (+-17 derajat)
    this.flowers.forEach(o=>{ o.p.rot[2]=Math.sin(t*1.2+o.ph)*0.08; o.h.angle=Math.sin(t*1.5+o.ph)*0.3; });
    // ROTATE: rumpun rumput ditiup angin, miring +-0.1 rad (+-5.7 derajat)
    this.tufts.forEach(o=>{ o.p.rot[2]=Math.sin(t*1.5+o.ph)*0.1; });
    // TRANSLATE: awan bergeser di sumbu X: x = x0 +- 2.5 (periode 2*PI/0.1 = 63 detik, jadi pelan banget)
    this.clouds.forEach(o=>{ o.p.pos[0]=o.x0+Math.sin(t*0.1+o.ph)*2.5; });
  }

  draw(gl,prog,m){ this.root.draw(gl,prog,m); }
}