// =====================================================================
// part.js -> node hierarki (parent-child) buat nyusun badan karakter
// =====================================================================
class Part {
  // mesh = bentuknya (boleh null kalau cuma titik pivot), pos = posisi lokal, rot = rotasi [x,y,z] radian
  constructor(mesh,pos=[0,0,0],rot=[0,0,0]){
    this.mesh=mesh; this.pos=pos; this.rot=rot; this.children=[];
  }

  add(c){ this.children.push(c); return c; }   // nempelin anak ke bagian ini

  draw(gl,prog,parent){
    // urutan: translate * rotZ * rotY * rotX (rotasi X dulu, baru Y, lalu Z)
    let m=Mat4.multiply(parent,Mat4.translate(...this.pos));
    m=Mat4.multiply(m,Mat4.rotZ(this.rot[2]));
    m=Mat4.multiply(m,Mat4.rotY(this.rot[1]));
    m=Mat4.multiply(m,Mat4.rotX(this.rot[0]));

    if(this.mesh){
      gl.uniformMatrix4fv(gl.getUniformLocation(prog,"uModel"),false,new Float32Array(m));
      this.mesh.draw(prog);
    }
    this.children.forEach(c=>c.draw(gl,prog,m));   // anak ikut transformasi bapaknya
  }
}