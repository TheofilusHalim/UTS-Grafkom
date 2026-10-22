// =====================================================================
// part.js -> node hierarki (parent-child) buat nyusun badan karakter & lingkungan
// =====================================================================
class Part {
  // mesh = bentuknya (null kalau cuma titik pivot), pos = posisi lokal [x,y,z], rot = rotasi [x,y,z] radian
  constructor(mesh,pos=[0,0,0],rot=[0,0,0]){
    this.mesh=mesh; this.pos=pos; this.rot=rot; this.children=[];
    this.scl=1;        // SCALING: faktor skala seragam (1 = ukuran asli), diubah di update()
    this.axis=null;    // ROTATE ARBITRARY AXIS: sumbu putar bebas [x,y,z]; null = tidak dipakai
    this.angle=0;      // sudut putar (radian) mengelilingi this.axis
  }

  add(c){ this.children.push(c); return c; }   // nempelin anak ke bagian ini

  draw(gl,prog,parent){
    // urutan perkalian: parent * Translate * rotZ * rotY * rotX * rotateAxis * Scale
    // (yang paling kanan dikerjain duluan ke vertex: di-scale dulu, lalu diputar, lalu digeser)
    let m=Mat4.multiply(parent,Mat4.translate(...this.pos));        // TRANSLATE
    m=Mat4.multiply(m,Mat4.rotZ(this.rot[2]));                      // ROTATE Z
    m=Mat4.multiply(m,Mat4.rotY(this.rot[1]));                      // ROTATE Y
    m=Mat4.multiply(m,Mat4.rotX(this.rot[0]));                      // ROTATE X
    if(this.axis) m=Mat4.multiply(m,Mat4.rotateAxis(this.axis,this.angle)); // ROTATE ARBITRARY AXIS (kalau axis diset)
    if(this.scl!==1) m=Mat4.multiply(m,Mat4.scale(this.scl));       // SCALING (kalau bukan 1)

    if(this.mesh){
      if(!prog.uModelLoc) prog.uModelLoc=gl.getUniformLocation(prog,"uModel"); // lokasi uniform disimpan, gak dicari terus tiap frame
      gl.uniformMatrix4fv(prog.uModelLoc,false,new Float32Array(m));
      this.mesh.draw(prog);
    }
    // HIERARCHICAL: matriks m (sudah mengandung transformasi bapak) diteruskan ke semua anak
    this.children.forEach(c=>c.draw(gl,prog,m));
  }
}