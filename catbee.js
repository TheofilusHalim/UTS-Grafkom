// =====================================================================
// catbee.js -> class karakter Cat Bee (susunan badan + animasi)
// =====================================================================
class CatBee {
  constructor(gl){
    const S=Shapes, PI=Math.PI;                      // S = singkatan Shapes biar nulisnya pendek

    // belang badan: abu-ungu kalau sin(z) besar -> cincin-cincin sepanjang badan
    const stripeZ=(p)=>Math.sin(p[2]*11)>0.35?COL.brown:COL.yellow;

    this.rootH=0.7;                                  // tinggi pusat badan dari lantai
    this.root=new Part(null,[0,this.rootH,0]);       // root = titik pusat karakter (tanpa bentuk)

    // ---- BADAN (ellipsoid memanjang di sumbu z) ----
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
      return (dahi||pipi)?COL.brown:COL.yellow;      // kena salah satu bercak -> gelap, sisanya kuning
    };
    this.head=this.body.add(new Part(S.ellipsoid(gl,hA,hB,hC,headColor),[0,0.45,0.6]));

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

    // HELPER 3 (DIPERBAIKI): telinga = elliptic cone
    // B = pusat alas (SUDAH mengandung tanda s, jadi JANGAN dikali s lagi), h = tinggi, a = lebar, b = tebal, tilt = miring keluar
    // rotX +90 -> sumbu z cone menghadap bawah, puncak di atas
    // puncak = B + h * (s*sin(tilt), cos(tilt)). Tanda s cuma buat arah miring, BUKAN buat B[0]
    const telinga=(s,B,h,a,b,tilt,warna)=>{
      const puncak=[B[0]+s*h*Math.sin(tilt), B[1]+h*Math.cos(tilt), B[2]];   // <- sebelumnya s*(B[0]+...) = s dua kali
      return new Part(S.ellipticCone(gl,a,b,h,flat(warna)),puncak,[PI/2,0,-s*tilt]);
    };

    [-1,1].forEach(s=>{                              // s = -1 kiri, 1 kanan (biar simetris)

      // ---- TELINGA ---- lebar, pendek, miring keluar 0.55 rad (~31 derajat), duduk di sudut atas kepala
      // alas B=(0.36,0.20,-0.02) ada DI DALAM kepala: (0.36/0.6)^2+(0.2/0.46)^2 = 0.36+0.19 = 0.55 < 1 -> gak ada celah
      // puncak = (0.36+0.36*sin0.55, 0.20+0.36*cos0.55) = (0.36+0.188, 0.20+0.307) = (0.55, 0.51)
      // -> puncak pas di pojok atas kepala (kepala paling atas y=0.46), sedikit nongol kayak referensi
      this.head.add(telinga(s,[s*0.36,0.20,-0.02],0.36,0.19,0.06,0.55,COL.yellow));
      // telinga dalam (putih): digeser ke DEPAN (z=0.05) dan agak tebal (b=0.06) supaya nongol di depan telinga luar
      // (dulu z sama dan lebih tipis, jadi ketutup total)
      this.head.add(telinga(s,[s*0.365,0.23,0.05],0.27,0.12,0.06,0.55,COL.cream));

      // ---- MATA ---- pusat x=+-0.23, y=-0.07; menonjol ~0.03 dari kulit kepala (emb=0.02)
      const matP=onHead(s*0.23,-0.07,0.02);
      this.head.add(matP);
      // grup mata dimiringkan rotZ s*0.12 rad (~7 derajat) -> ujung luar agak naik (kesan sayu)
      const mata=matP.add(new Part(null,[0,0,0],[0,0,s*0.12]));
      mata.add(new Part(S.ellipsoid(gl,0.15,0.105,0.05,flat(COL.white))));                         // bola mata putih
      mata.add(new Part(S.ellipsoid(gl,0.085,0.09,0.05,flat(COL.black)),[0,-0.01,0.012]));         // iris hitam
      mata.add(new Part(S.ellipsoid(gl,0.022,0.022,0.012,flat(COL.white)),[-s*0.03,0.0,0.055]));   // kilau mata
      mata.add(new Part(S.ellipsoid(gl,0.165,0.085,0.062,flat(COL.yellow)),[0,0.075,0]));          // kelopak atas (setengah merem)
      mata.add(new Part(S.ellipsoid(gl,0.16,0.013,0.058,flat(COL.brown)),[0,0,0]));                // garis kelopak (eyeliner)

      // ---- ALIS = kurva bezier, tebal di tengah & lancip di ujung: radius 0.014*(0.5+sin(pi v)) ----
      const alisP=onHead(s*0.22,0.22,0);
      this.head.add(alisP);
      alisP.add(new Part(S.bezierTube(gl,
        [[-0.14*s,-0.03],[-0.09*s,0.03],[0.05*s,0.04],[0.14*s,-0.05]],
        v=>0.014*(0.5+Math.sin(PI*v)),1,flat(COL.brown))));

      // ---- ANTENA = kurva bezier (batang) + ellipsoid lonjong (gada) ----
      // dipendekin: titik kontrol akhir (0.26,0.48), dulu (0.3,0.58) -> proporsi lebih mirip referensi
      // rotY: kanan -0.6 rad, kiri PI+0.6 rad -> sumbu x lokal jadi (+-0.825, 0, 0.565): keluar + maju
      const ant=this.head.add(new Part(
        S.bezierTube(gl,[[0,0],[0,0.25],[0.06,0.4],[0.26,0.48]],v=>0.055,1,flat(COL.brown)),
        [s*0.2,0.4,0.05],[0,s>0?-0.6:PI+0.6,0]));
      // rotZ gada = arah singgung ujung kurva = atan((0.48-0.4)/(0.26-0.06)) = atan(0.4) ~ 0.38 rad
      ant.add(new Part(S.ellipsoid(gl,0.17,0.115,0.115,flat(COL.brown)),[0.33,0.51,0],[0,0,0.38]));
      (this.ants=this.ants||[]).push(ant);          // simpan antena biar bisa dianimasikan di update()
    });

    // ---- MONCONG putih (z dihitung dari permukaan kepala lewat zKepala, dikurangi 0.03 biar menonjol) ----
    this.head.add(new Part(S.ellipsoid(gl,0.17,0.12,0.12,flat(COL.cream)),[0,-0.23,zKepala(0,-0.23)-0.03]));
    [-1,1].forEach(s=>this.head.add(new Part(S.ellipsoid(gl,0.12,0.1,0.11,flat(COL.cream)),
                                             [s*0.09,-0.25,zKepala(s*0.09,-0.25)-0.03])));
    this.head.add(new Part(S.ellipsoid(gl,0.05,0.034,0.03,flat(COL.pink)),[0,-0.15,0.465]));   // hidung gelap
    this.head.add(new Part(S.ellipsoid(gl,0.055,0.04,0.025,flat(COL.black)),[0,-0.285,0.49])); // mulut kecil kebuka

    // ---- SAYAP = kurva bezier, radius sin(pi v) biar bentuk daun, dipipihkan (TIDAK diubah) ----
    const ukSayap=0.6;                               // faktor ukuran sayap
    const sayapP=[[0,0],[0.1,0.45],[0.3,0.7],[0.55,0.85]].map(q=>[q[0]*ukSayap,q[1]*ukSayap]);
    this.wings=[1,-1].map(s=>this.body.add(new Part(
      S.bezierTube(gl,sayapP,v=>ukSayap*(0.03+0.2*Math.sin(PI*v)),0.1,flat(COL.teal)),
      [s*0.2,0.3,-0.05],
      [0,s>0?0.5:PI-0.5,0.2])));

    // ---- KAKI (TIDAK diubah) ----
    const stripeY=(p)=>Math.sin(p[1]*18)>0.3?COL.brown:COL.yellow;
    const hipY=-0.2, legRadius=0.11;
    const pawSize=[0.14,0.10,0.18], thighSize=[0.15,0.17,0.17];
    const pawDown=this.rootH+hipY-pawSize[1];        // 0.7 - 0.2 - 0.1 = 0.4
    const legLength=pawDown-0.05;                    // 0.35
    const legPos=[[1,0.34],[-1,0.34],[1,-0.34],[-1,-0.34]];
    this.legs=legPos.map(([sx,z])=>{
      const leg=this.body.add(new Part(S.cylinder(gl,legRadius,legLength,stripeY),[sx*0.22,hipY,z]));
      leg.add(new Part(S.ellipsoid(gl,...thighSize,flat(COL.yellow)),[0,0,0]));
      leg.add(new Part(S.ellipsoid(gl,...pawSize,flat(COL.yellow)),[0,-pawDown,0.04]));
      return leg;
    });

    // ---- EKOR (TIDAK diubah) ----
    const stripeV=(p,u,v)=>Math.floor(v*8)%2?COL.brown:COL.yellow;
    this.tail=this.body.add(new Part(
      S.bezierTube(gl,[[0,0],[0.5,-0.15],[0.85,0.1],[0.95,0.55]],v=>0.11-0.03*v,1,stripeV),
      [0,-0.05,-0.6],[0,PI/2,0]));
    this.tail.add(new Part(S.ellipticCone(gl,0.08,0.08,0.2,flat(COL.brown)),[0.98,0.75,0],[PI/2,0,-0.22]));
  }

  // ANIMASI (TIDAK diubah): dipanggil tiap frame. t = waktu (detik), walk = true kalau lagi jalan
  update(t,walk){
    const w=walk?1:0, sw=Math.sin(t*5);
    this.root.pos[1]=this.rootH+Math.abs(sw)*0.03*w;
    this.legs[0].rot[0]= sw*0.5*w;  this.legs[3].rot[0]= sw*0.5*w;
    this.legs[1].rot[0]=-sw*0.5*w;  this.legs[2].rot[0]=-sw*0.5*w;
    this.head.rot[0]=Math.sin(t*2.5)*0.08;
    this.tail.rot[1]=Math.PI/2+Math.sin(t*3)*0.35;
    this.wings.forEach((wg,i)=>{
      const s=i==0?1:-1;
      wg.rot[2]=(0.3+Math.sin(t*30)*0.5)*s;
    });
    this.ants.forEach((a,i)=>{ a.rot[2]=Math.sin(t*4+i)*0.12; });
  }

  draw(gl,prog,m){ this.root.draw(gl,prog,m); }
}