// =====================================================================
// mat4.js -> class matriks 4x4 (ditulis manual karena dilarang library)
// Format column-major (sesuai WebGL)
// =====================================================================
class Mat4 {
  static identity(){ return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }

  static multiply(a,b){                 // hasil = a * b
    const o = new Array(16).fill(0);
    for(let c=0;c<4;c++) for(let r=0;r<4;r++)
      for(let k=0;k<4;k++) o[c*4+r] += a[k*4+r]*b[c*4+k];
    return o;
  }

  static translate(x,y,z){ const m=Mat4.identity(); m[12]=x; m[13]=y; m[14]=z; return m; }
  static scale(s){ const m=Mat4.identity(); m[0]=m[5]=m[10]=s; return m; } // uniform scale

  static rotX(t){ const m=Mat4.identity(),c=Math.cos(t),s=Math.sin(t); m[5]=c;m[6]=s;m[9]=-s;m[10]=c; return m; }
  static rotY(t){ const m=Mat4.identity(),c=Math.cos(t),s=Math.sin(t); m[0]=c;m[2]=-s;m[8]=s;m[10]=c; return m; }
  static rotZ(t){ const m=Mat4.identity(),c=Math.cos(t),s=Math.sin(t); m[0]=c;m[1]=s;m[4]=-s;m[5]=c; return m; }

  static perspective(fov,asp,n,f){      // proyeksi perspektif
    const t=1/Math.tan(fov/2), m=new Array(16).fill(0);
    m[0]=t/asp; m[5]=t; m[10]=(f+n)/(n-f); m[11]=-1; m[14]=2*f*n/(n-f); return m;
  }
}