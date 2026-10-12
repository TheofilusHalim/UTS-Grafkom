// =====================================================================
// mesh.js -> bikin vertex dari fungsi parametrik P(u,v), lalu simpan ke buffer GPU
// =====================================================================
class Mesh {
  // fn = fungsi P(u,v) -> [x,y,z]; u0..u1 & v0..v1 = range parameter
  // nu,nv = jumlah pembagian grid; colorFn = fungsi penentu warna vertex
  constructor(gl, fn, u0,u1, v0,v1, nu,nv, colorFn){
    const pos=[], nor=[], col=[], idx=[], e=1e-3;

    // --- 1. Hitung semua vertex ---
    for(let i=0;i<=nu;i++) for(let j=0;j<=nv;j++){
      const u=u0+(u1-u0)*i/nu, v=v0+(v1-v0)*j/nv;   // interpolasi linear u dan v
      const p=fn(u,v);                               // titik di permukaan

      // normal = cross(dP/du, dP/dv), turunannya dihitung numerik (beda hingga)
      // v di-clamp dikit biar di kutub / puncak cone normalnya gak nol
      const vv=Math.min(Math.max(v,v0+e*2),v1-e*2);
      const q=fn(u,vv), qu=fn(u+e,vv), qv=fn(u,vv+e);
      const a=[qu[0]-q[0],qu[1]-q[1],qu[2]-q[2]], b=[qv[0]-q[0],qv[1]-q[1],qv[2]-q[2]];
      let n=[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
      const l=Math.hypot(...n)||1; n=n.map(x=>x/l);  // normalisasi jadi panjang 1

      pos.push(...p); nor.push(...n);
      col.push(...colorFn(p,u,v));
    }

    // --- 2. Susun segitiga (index) ---
    for(let i=0;i<nu;i++) for(let j=0;j<nv;j++){   // 1 kotak grid = 2 segitiga
      const a=i*(nv+1)+j, b=a+nv+1;
      idx.push(a,b,a+1, b,b+1,a+1);
    }

    // --- 3. Kirim ke GPU ---
    this.gl=gl; this.count=idx.length;
    const mk=(t,d,A)=>{const bf=gl.createBuffer();gl.bindBuffer(t,bf);gl.bufferData(t,new A(d),gl.STATIC_DRAW);return bf;};
    this.bPos=mk(gl.ARRAY_BUFFER,pos,Float32Array);
    this.bNor=mk(gl.ARRAY_BUFFER,nor,Float32Array);
    this.bCol=mk(gl.ARRAY_BUFFER,col,Float32Array);
    this.bIdx=mk(gl.ELEMENT_ARRAY_BUFFER,idx,Uint16Array);
  }

  // gambar mesh ini ke layar
  draw(prog){
    const gl=this.gl;
    [["aPos",this.bPos],["aNormal",this.bNor],["aColor",this.bCol]].forEach(([n,b])=>{
      const loc=gl.getAttribLocation(prog,n);       // cari lokasi attribute di shader
      gl.bindBuffer(gl.ARRAY_BUFFER,b);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0); // 3 angka per vertex
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.bIdx);
    gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
  }
}