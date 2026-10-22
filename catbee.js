// =====================================================================
// catbee.js -> class karakter Cat Bee (susunan badan + animasi)
// Objek: ELLIPSOID (kepala,badan,mata..), CYLINDER (kaki/tangan), ELLIPTIC CONE (telinga, ujung ekor)
// Kurva: Bezier (ekor, sayap, antena, alis)
// Animasi: siklus OTOMATIS jalan -> naik -> melayang -> turun -> jalan (hybrid)
// =====================================================================
class CatBee {
  constructor(gl){
    const S=Shapes, PI=Math.PI;                      // S = singkatan Shapes biar nulisnya pendek

    this.ants=[];                                    // daftar antena (buat animasi goyang)
    this.knobs=[];                                   // daftar gada antena (buat animasi SCALING berdenyut)
    this.walkAmt=0;                                  // 0 = diam, 1 = jalan penuh; berubah halus (easing) biar gak kaku

    // ---- STATE ANIMASI HYBRID (BARU) ----
    this.hov=0;                                      // tingkat melayang: 0 = napak tanah, 1 = melayang penuh (berubah halus)
    this.cycle=0;                                    // jam siklus (detik), cuma jalan kalau tidak di-pause
    this.CYCLE_LEN=14;                               // panjang 1 siklus = 14 detik, habis itu ulang dari 0
    this.flapPhase=0;                                // fase kepakan sayap (diakumulasi biar ganti kecepatan gak loncat)
    this.speed=0;                                    // kecepatan keliling lingkaran (dibaca main.js)

    // belang badan: abu-ungu kalau sin(z) besar -> cincin-cincin sepanjang badan
    // 11 = kerapatan cincin (makin besar makin banyak), 0.35 = ketebalan cincin (makin kecil makin tebal)
    const stripeZ=(p)=>Math.sin(p[2]*11)>0.35?COL.brown:COL.yellow;

    this.rootH=0.7;                                  // tinggi pusat badan dari lantai
    this.root=new Part(null,[0,this.rootH,0]);       // root = titik pusat karakter (tanpa bentuk)

    // ---- BAYANGAN (BARU): ellipsoid gepeng di tanah, BUKAN anak root (jadi gak ikut naik pas melayang) ----
    // radius x=0.55 (lebar), y=0.01 (tipis), z=0.8 (panjang ngikutin badan); warna hijau gelap
    // ditaruh y=0.03 supaya sedikit di atas tanah (permukaan tanah y=0.02) dan gak tertimpa
    this.shadow=new Part(S.ellipsoid(gl,0.55,0.01,0.8,flat([0.25,0.38,0.22])),[0,0.03,0]);

    // ---- BADAN (ellipsoid memanjang di sumbu z: a=0.38 lebar, b=0.4 tinggi, c=0.65 panjang) ----
    this.body=this.root.add(new Part(S.ellipsoid(gl,0.38,0.4,0.65,stripeZ)));
    this.body.add(new Part(S.ellipsoid(gl,0.27,0.28,0.3,flat(COL.cream)),[0,-0.12,0.35])); // dada putih

    // ---- KEPALA ----
    const hA=0.6, hB=0.46, hC=0.48;                  // radius kepala: a = lebar (x), b = tinggi (y), c = depan-belakang (z)

    // warna kepala per vertex. p = [x,y,z] titik di koordinat kepala (pusat kepala = 0,0,0)
    const headColor=(p)=>{
      // belang dahi = 2 bercak oval di atas kepala. Persamaan elips: (dx/0.1)^2 + (dz/0.22)^2 < 1
      const dahi = p[1]>0.25 && (((Math.abs(p[0])-0.165)/0.1)**2 + ((p[2]-0.1)/0.22)**2) < 1;
      // belang pipi = 1 bercak oval horizontal di SISI kepala, di bawah mata
      const pipi = Math.abs(p[0])>0.38 && (((p[2]-0.05)/0.22)**2 + ((p[1]+0.17)/0.09)**2) < 1;
      return (dahi||pipi)?COL.brown:COL.yellow;
    };
    this.head=this.body.add(new Part(S.ellipsoid(gl,hA,hB,hC,headColor),[0,0.45,0.6]));
    // ROTATE ARBITRARY AXIS: sumbu putar kepala = (1,0,1) = diagonal antara sumbu X dan Z
    // dinormalisasi jadi (0.707,0,0.707). Sudutnya (head.angle) digerakkan di update() -> kepala miring + nunduk sekaligus
    this.head.axis=[1,0,1];

    // HELPER 1: tinggi permukaan kepala (z) di titik (x,y)
    // dari (x/a)^2+(y/b)^2+(z/c)^2=1  ->  z = c * sqrt(1-(x/a)^2-(y/b)^2)
    const zKepala=(x,y)=>hC*Math.sqrt(1-(x/hA)**2-(y/hB)**2);

    // HELPER 2: pivot yang nempel di permukaan kepala titik (x,y), sumbu z-nya searah normal permukaan
    // normal ellipsoid = gradien = (x/a^2, y/b^2, z/c^2) lalu dinormalisasi
    // rotX = -asin(n_y), rotY = atan2(n_x, n_z); emb = seberapa dalam ditanam ke kepala
    const onHead=(x,y,emb=0)=>{
      const z=zKepala(x,y);
      const nx=x/(hA*hA), ny=y/(hB*hB), nz=z/(hC*hC), l=Math.hypot(nx,ny,nz);
      const n=[nx/l,ny/l,nz/l];
      return new Part(null,[x-n[0]*emb, y-n[1]*emb, z-n[2]*emb],
                      [-Math.asin(n[1]), Math.atan2(n[0],n[2]), 0]);
    };

    // HELPER 3: telinga = ELLIPTIC CONE. B = pusat alas (sudah mengandung tanda s), h = tinggi,
    // a = lebar, b = tebal, tilt = miring keluar. rotX +90 -> sumbu z cone menghadap bawah, puncak di atas
    // puncak = B + h * (s*sin(tilt), cos(tilt))
    const telinga=(s,B,h,a,b,tilt,warna)=>{
      const puncak=[B[0]+s*h*Math.sin(tilt), B[1]+h*Math.cos(tilt), B[2]];
      return new Part(S.ellipticCone(gl,a,b,h,flat(warna)),puncak,[PI/2,0,-s*tilt]);
    };

    [-1,1].forEach(s=>{                              // s = -1 kiri, 1 kanan (biar simetris)

      // ---- TELINGA (cone) ---- miring keluar 0.55 rad (~31 derajat)
      // alas B=(0.36,0.20) ada di dalam kepala: (0.36/0.6)^2+(0.2/0.46)^2 = 0.55 < 1 -> gak ada celah
      // puncak = (0.36+0.36*sin0.55, 0.20+0.36*cos0.55) = (0.55, 0.51)
      this.head.add(telinga(s,[s*0.36,0.20,-0.02],0.36,0.19,0.06,0.55,COL.yellow));
      // telinga dalam (putih): digeser ke depan (z=0.05) biar nongol di depan telinga luar
      this.head.add(telinga(s,[s*0.365,0.23,0.05],0.27,0.12,0.06,0.55,COL.cream));

      // ---- MATA ---- pusat x=+-0.23, y=-0.07; menonjol ~0.03 dari kulit kepala (emb=0.02)
      const matP=onHead(s*0.23,-0.07,0.02);
      this.head.add(matP);
      const mata=matP.add(new Part(null,[0,0,0],[0,0,s*0.12]));    // rotZ 0.12 rad (~7 derajat) -> ujung luar naik dikit (sayu)
      mata.add(new Part(S.ellipsoid(gl,0.15,0.105,0.05,flat(COL.white))));                         // bola mata putih
      mata.add(new Part(S.ellipsoid(gl,0.085,0.09,0.05,flat(COL.black)),[0,-0.01,0.012]));         // iris hitam
      mata.add(new Part(S.ellipsoid(gl,0.022,0.022,0.012,flat(COL.white)),[-s*0.03,0.0,0.055]));   // kilau mata
      mata.add(new Part(S.ellipsoid(gl,0.165,0.085,0.062,flat(COL.yellow)),[0,0.075,0]));          // kelopak atas (setengah merem)
      mata.add(new Part(S.ellipsoid(gl,0.16,0.013,0.058,flat(COL.brown)),[0,0,0]));                // garis kelopak

      // ---- ALIS = KURVA bezier, tebal di tengah & lancip di ujung: radius 0.014*(0.5+sin(pi v)) ----
      const alisP=onHead(s*0.22,0.22,0);
      this.head.add(alisP);
      alisP.add(new Part(S.bezierTube(gl,
        [[-0.14*s,-0.03],[-0.09*s,0.03],[0.05*s,0.04],[0.14*s,-0.05]],
        v=>0.014*(0.5+Math.sin(PI*v)),1,flat(COL.brown))));

      // ---- ANTENA = KURVA bezier (batang) + ellipsoid lonjong (gada) ----
      // rotY: kanan -0.6 rad, kiri PI+0.6 rad -> sumbu x lokal jadi (+-0.825, 0, 0.565): keluar + maju
      const ant=this.head.add(new Part(
        S.bezierTube(gl,[[0,0],[0,0.25],[0.06,0.4],[0.26,0.48]],v=>0.055,1,flat(COL.brown)),
        [s*0.2,0.4,0.05],[0,s>0?-0.6:PI+0.6,0]));
      // rotZ gada = arah singgung ujung kurva = atan((0.48-0.4)/(0.26-0.06)) = atan(0.4) ~ 0.38 rad
      const knob=ant.add(new Part(S.ellipsoid(gl,0.17,0.115,0.115,flat(COL.brown)),[0.33,0.51,0],[0,0,0.38]));
      this.ants.push(ant);                           // simpan antena -> dianimasikan (rotate) di update()
      this.knobs.push(knob);                         // simpan gada   -> dianimasikan (scaling) di update()
    });

    // ---- MONCONG putih (z dihitung dari permukaan kepala lewat zKepala, dikurangi 0.03 biar menonjol) ----
    this.head.add(new Part(S.ellipsoid(gl,0.17,0.12,0.12,flat(COL.cream)),[0,-0.23,zKepala(0,-0.23)-0.03]));
    [-1,1].forEach(s=>this.head.add(new Part(S.ellipsoid(gl,0.12,0.1,0.11,flat(COL.cream)),
                                             [s*0.09,-0.25,zKepala(s*0.09,-0.25)-0.03])));
    this.head.add(new Part(S.ellipsoid(gl,0.05,0.034,0.03,flat(COL.pink)),[0,-0.15,0.465]));   // hidung
    this.head.add(new Part(S.ellipsoid(gl,0.055,0.04,0.025,flat(COL.black)),[0,-0.285,0.49])); // mulut

    // ---- SAYAP = KURVA bezier, radius sin(pi v) biar bentuk daun, dipipihkan ----
    const ukSayap=0.6;                               // faktor ukuran sayap (1.0 = ukuran awal yang kegedean)
    const sayapP=[[0,0],[0.1,0.45],[0.3,0.7],[0.55,0.85]].map(q=>[q[0]*ukSayap,q[1]*ukSayap]);
    this.wings=[1,-1].map(s=>this.body.add(new Part(
      S.bezierTube(gl,sayapP,v=>ukSayap*(0.03+0.2*Math.sin(PI*v)),0.1,flat(COL.teal)),
      [s*0.2,0.3,-0.05],
      [0,s>0?0.5:PI-0.5,0.2])));                     // rotY 0.5 rad (~29 derajat); sayap kiri = cerminannya

    // ---- KAKI & TANGAN = CYLINDER (belang) + bola paha + telapak ellipsoid, pivot di pinggul ----
    const stripeY=(p)=>Math.sin(p[1]*18)>0.3?COL.brown:COL.yellow;
    const hipY=-0.2, legRadius=0.11;
    const pawSize=[0.14,0.10,0.18], thighSize=[0.15,0.17,0.17];
    const pawDown=this.rootH+hipY-pawSize[1];        // 0.7 - 0.2 - 0.1 = 0.4 -> telapak pas menyentuh lantai (y=0)
    const legLength=pawDown-0.05;                    // 0.4 - 0.05 = 0.35 (masuk 0.05 ke telapak biar nyambung)
    // legs[0]/[1] = kaki depan (= "tangan"), legs[2]/[3] = kaki belakang
    const legPos=[[1,0.34],[-1,0.34],[1,-0.34],[-1,-0.34]];
    this.legs=legPos.map(([sx,z])=>{
      const leg=this.body.add(new Part(S.cylinder(gl,legRadius,legLength,stripeY),[sx*0.22,hipY,z]));
      leg.add(new Part(S.ellipsoid(gl,...thighSize,flat(COL.yellow)),[0,0,0]));
      leg.add(new Part(S.ellipsoid(gl,...pawSize,flat(COL.yellow)),[0,-pawDown,0.04]));
      return leg;
    });

    // ---- EKOR = KURVA bezier (belang per v) + ELLIPTIC CONE di ujung ----
    const stripeV=(p,u,v)=>Math.floor(v*8)%2?COL.brown:COL.yellow;   // 8 = jumlah belang sepanjang ekor
    this.tail=this.body.add(new Part(
      S.bezierTube(gl,[[0,0],[0.5,-0.15],[0.85,0.1],[0.95,0.55]],v=>0.11-0.03*v,1,stripeV),
      [0,-0.05,-0.6],[0,PI/2,0]));                   // rotY 90 -> ekor ke belakang
    // cone ujung ekor: alas di ujung kurva (0.95,0.55) radius 0.08 (= radius ujung tube 0.11-0.03*1)
    // arah kurva di ujung miring rotZ -0.22 rad -> puncak = alas + 0.28*(sin0.22, cos0.22) = (1.011, 0.823)
    this.tail.add(new Part(S.ellipticCone(gl,0.08,0.08,0.28,flat(COL.brown)),[1.011,0.823,0],[PI/2,0,-0.22]));
  }

  // ANIMASI: dipanggil tiap frame.
  // t = waktu (detik), dt = selisih waktu antar frame, walk = false kalau di-pause (Spasi)
  // force = null (otomatis) | 1 (paksa melayang) | 0 (paksa mendarat)  -> diatur tombol F di main.js
  update(t,dt,walk,force){
    // ---------- fungsi bantu ----------
    // lerp(a,b,k): nilai di antara a dan b. k=0 -> a, k=1 -> b, k=0.5 -> tengah-tengah
    const lerp=(a,b,k)=>a+(b-a)*k;
    // ss(x,a,b): smoothstep. 0 kalau x<=a, 1 kalau x>=b, di antaranya kurva S (3k^2 - 2k^3) -> mulai & berhenti lembut
    const ss=(x,a,b)=>{ const k=Math.min(1,Math.max(0,(x-a)/(b-a))); return k*k*(3-2*k); };

    // ---------- 1. JAM SIKLUS & TARGET MELAYANG ----------
    if(walk) this.cycle+=dt;                         // jam siklus cuma maju kalau tidak di-pause
    const c=this.cycle%this.CYCLE_LEN;               // posisi dalam siklus: 0..14 detik (% = sisa bagi, jadi berulang)
    // jadwal otomatis: naik di detik 6-7 (ss naik 0->1), turun di detik 11-12 (dikurangi ss turun)
    //   detik 0-6   -> 0 (jalan) | 6-7 -> naik | 7-11 -> 1 (melayang) | 11-12 -> turun | 12-14 -> 0 (jalan)
    const auto=ss(c,6,7)-ss(c,11,12);
    const target=(force===null||force===undefined)?auto:force;   // kalau F ditekan, jadwal otomatis diabaikan
    // EASING: hov mendekati target pelan-pelan, faktor 4 = kecepatan (~0.25 dtk), min(1,..) biar gak overshoot
    this.hov+=(target-this.hov)*Math.min(1,dt*4);
    const h=this.hov;

    // ---------- 2. JALAN (EASING) ----------
    // walkAmt mendekati 1 (jalan) atau 0 (pause); faktor 6 = peralihan ~0.17 detik
    this.walkAmt+=((walk?1:0)-this.walkAmt)*Math.min(1,dt*6);
    // g = kekuatan gerakan kaki: penuh kalau jalan di tanah, hilang pelan-pelan saat melayang (1-h)
    const g=this.walkAmt*(1-h);
    const sw=Math.sin(t*5);                          // ayunan langkah, periode 2*PI/5 = 1.26 dtk
    // kecepatan muter lingkaran: 1 saat di tanah, 1.4 saat melayang (terbang sedikit lebih cepat)
    // dikali walkAmt biar berhenti halus pas pause
    this.speed=this.walkAmt*(1+0.4*h);

    // ---------- 3. TRANSLATE (tinggi badan) ----------
    // tinggi = 0.7 (tanah) + bobbing langkah (maks 0.03, hanya saat jalan)
    //        + 0.7*h (naik sampai 1.4 saat h=1) + goyang melayang (+-0.06, periode 3.14 dtk)
    this.root.pos[1]=this.rootH + Math.abs(sw)*0.03*g + 0.7*h + Math.sin(t*2)*0.06*h;
    // ROTATE sumbu X: badan miring hidung ke atas saat naik; -0.12 rad (~ -6.9 derajat) di h=1 (negatif = depan naik)
    this.root.rot[0]=-0.12*h;

    // ---------- 4. KAKI: ayun saat jalan, DITEKUK KE BELAKANG saat melayang ----------
    // rotX positif menggeser kaki ke belakang (z negatif). Tekuk: kaki depan 0.5 rad (28.6 derajat), belakang 0.9 rad (51.6 derajat)
    // dangle = kaki bergoyang kecil saat melayang (+-0.08 rad)
    const dangle=Math.sin(t*3)*0.08*h;
    this.legs[0].rot[0]= sw*0.5*g + 0.5*h + dangle;  // depan kanan (diagonal dengan belakang kiri)
    this.legs[3].rot[0]= sw*0.5*g + 0.9*h + dangle;  // belakang kiri
    this.legs[1].rot[0]=-sw*0.5*g + 0.5*h - dangle;  // depan kiri (tanda swing dibalik)
    this.legs[2].rot[0]=-sw*0.5*g + 0.9*h - dangle;  // belakang kanan

    // ---------- 5. KEPALA ----------
    // ROTATE sumbu X: angguk dari -0.08 sampai +0.08 rad, periode 2.51 dtk
    this.head.rot[0]=Math.sin(t*2.5)*0.08;
    // ROTATE ARBITRARY AXIS: kepala muter di sumbu (1,0,1), -0.12 sampai +0.12 rad, periode 4.19 dtk
    this.head.angle=Math.sin(t*1.5)*0.12;

    // ---------- 6. EKOR ----------
    // ROTATE sumbu Y: goyang dari 1.22 sampai 1.92 rad (tengah PI/2 = 1.5708, ayunan +-0.35), periode 2.09 dtk
    this.tail.rot[1]=Math.PI/2+Math.sin(t*3)*0.35;

    // ---------- 7. SAYAP: menguncup + kepak sesekali (jalan) -> kepak cepat & lebar (melayang) ----------
    // fase kepakan DIAKUMULASI (phase += dt*kecepatan) bukan sin(t*kecepatan), karena kalau kecepatan
    // berubah langsung di sin(t*...), gambarnya loncat. Kecepatan: 14 rad/dtk (jalan) -> 30 rad/dtk (melayang)
    this.flapPhase+=dt*lerp(14,30,h);
    // kepak "sesekali" waktu jalan: pow(max(0,sin(t*1.3)),12) hampir 0 hampir sepanjang waktu, tapi
    // muncul sebentar tiap 2*PI/1.3 = 4.8 dtk (pangkat 12 bikin puncaknya sempit). Amplitudo 0.04 sampai 0.34
    const flutter=0.04+0.3*Math.pow(Math.max(0,Math.sin(t*1.3)),12);
    const amp=lerp(flutter,0.7,h);                   // amplitudo: kecil (jalan) -> 0.7 rad (melayang, lebar)
    const base=lerp(0.1,0.3,h);                      // sudut dasar sayap: menguncup 0.1 rad -> agak terbuka 0.3 rad
    // ROTATE sumbu Z: sudut = base + sin(fase)*amp; melayang -> -0.4 sampai +1.0 rad; kiri dikali -1 (cerminan)
    this.wings.forEach((wg,i)=>{
      const s=i==0?1:-1;
      wg.rot[2]=(base+Math.sin(this.flapPhase)*amp)*s;
    });

    // ---------- 8. ANTENA & GADA ----------
    // ROTATE sumbu Z: antena goyang -0.12 sampai +0.12 rad; "+i" bikin kiri-kanan gak serempak
    this.ants.forEach((a,i)=>{ a.rot[2]=Math.sin(t*4+i)*0.12; });
    // SCALING: gada antena berdenyut 0.88 sampai 1.12 kali ukuran asli, periode 1.05 dtk
    this.knobs.forEach(k=>{ k.scl=1+0.12*Math.sin(t*6); });

    // ---------- 9. BAYANGAN ----------
    // SCALING: bayangan mengecil sampai 65% saat kucing di ketinggian (1 - 0.35*h)
    this.shadow.scl=1-0.35*h;
  }

  // gambar bayangan dulu (di tanah, ikut posisi lingkaran), baru kucingnya
  draw(gl,prog,m){
    this.shadow.draw(gl,prog,m);
    this.root.draw(gl,prog,m);
  }
}