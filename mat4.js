// =====================================================================
// mat4.js -> class matriks 4x4 (ditulis manual karena dilarang library)
// Format column-major (sesuai WebGL): elemen [kolom*4 + baris]
// =====================================================================
class Mat4 {
  static identity(){ return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }

  static multiply(a,b){                 // hasil = a * b
    const o = new Array(16).fill(0);
    for(let c=0;c<4;c++) for(let r=0;r<4;r++)
      for(let k=0;k<4;k++) o[c*4+r] += a[k*4+r]*b[c*4+k];
    return o;
  }

  // TRANSLATE: geser objek sejauh (x,y,z) -> disimpan di kolom ke-4 (indeks 12,13,14)
  static translate(x,y,z){ const m=Mat4.identity(); m[12]=x; m[13]=y; m[14]=z; return m; }

  // SCALING (uniform): s=1 ukuran asli, s=2 dua kali lebih besar, s=0.5 setengahnya
  // diagonal (indeks 0,5,10) diisi s. Dibuat uniform biar normal buat pencahayaan tetap benar
  static scale(s){ const m=Mat4.identity(); m[0]=m[5]=m[10]=s; return m; }

  // ROTATE terhadap sumbu X / Y / Z (t = sudut dalam radian; 180 derajat = PI)
  static rotX(t){ const m=Mat4.identity(),c=Math.cos(t),s=Math.sin(t); m[5]=c;m[6]=s;m[9]=-s;m[10]=c; return m; }
  static rotY(t){ const m=Mat4.identity(),c=Math.cos(t),s=Math.sin(t); m[0]=c;m[2]=-s;m[8]=s;m[10]=c; return m; }
  static rotZ(t){ const m=Mat4.identity(),c=Math.cos(t),s=Math.sin(t); m[0]=c;m[1]=s;m[4]=-s;m[5]=c; return m; }

  // ROTATE ARBITRARY AXIS (BARU) -> rumus Rodrigues
  // muter sebesar t radian mengelilingi sumbu bebas axis=[ax,ay,az] (bukan cuma X/Y/Z)
  // R = c*I + s*[sumbu]x + (1-c)*(sumbu x sumbu^T), dengan c=cos(t), s=sin(t), k=1-c
  // cek: sumbu (0,0,1) menghasilkan m[0]=c, m[1]=s, m[4]=-s, m[5]=c = sama persis dengan rotZ
  static rotateAxis(axis,t){
    const l=Math.hypot(axis[0],axis[1],axis[2]);                // panjang vektor sumbu
    const x=axis[0]/l, y=axis[1]/l, z=axis[2]/l;                // dinormalisasi jadi panjang 1 (wajib buat rumus ini)
    const c=Math.cos(t), s=Math.sin(t), k=1-c;
    const m=Mat4.identity();
    m[0]=k*x*x+c;    m[4]=k*x*y-s*z;  m[8] =k*x*z+s*y;         // baris 1
    m[1]=k*x*y+s*z;  m[5]=k*y*y+c;    m[9] =k*y*z-s*x;         // baris 2
    m[2]=k*x*z-s*y;  m[6]=k*y*z+s*x;  m[10]=k*z*z+c;           // baris 3
    return m;
  }

  // PERSPEKTIF: fov = sudut pandang vertikal, asp = lebar/tinggi layar, n = near, f = far
  static perspective(fov,asp,n,f){
    const t=1/Math.tan(fov/2), m=new Array(16).fill(0);
    m[0]=t/asp; m[5]=t; m[10]=(f+n)/(n-f); m[11]=-1; m[14]=2*f*n/(n-f); return m;
  }
}