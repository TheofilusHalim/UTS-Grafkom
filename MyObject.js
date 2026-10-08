// MyObject.js -- node hierarki (parent-child)
import { LIBS } from "./helpers/libs.js";

export class MyObject {
    GL = null;
    SHADER_PROGRAM = null;
    locs = null;             // lokasi attribute/uniform shader

    OBJECT_VERTEX = null;
    OBJECT_FACES = null;

    vertex = [];             // X,Y,Z, R,G,B, Nx,Ny,Nz  (Array 1D)
    faces = [];

    POSITION_MATRIX = LIBS.get_I4(); // Mpos  : pose awal (posisi sendi + kemiringan)
    MOVE_MATRIX     = LIBS.get_I4(); // Mmove : transformasi animasi (T · R_arbitrary(pivot) · R_euler · S)
    MODEL_MATRIX    = LIBS.get_I4();

    childs = [];             // HIERARKI
    tint = [1, 1, 1];        // pengali warna (untuk perubahan warna halus)
    emissive = 0;            // cahaya sendiri (lampu)

    constructor(GL, SHADER_PROGRAM, locs, geo = { vertex: [], faces: [] }) {
        this.GL = GL;
        this.SHADER_PROGRAM = SHADER_PROGRAM;
        this.locs = locs;
        this.vertex = geo.vertex;
        this.faces = geo.faces;
    }

    // pose awal: Mpos = T(pos) · R_euler(derajat)
    setPose(pos = [0,0,0], euler = [0,0,0]) {
        this.POSITION_MATRIX = LIBS.multiply(LIBS.translate(...pos), LIBS.rotateEuler(...euler));
    }

    // Mmove = T · R_arbitrary(axis, angle, pivot) · R_euler · S
    setTransform({ translate = [0,0,0], rotate = [0,0,0], scale = [1,1,1],
                   axis = null, angle = 0, pivot = [0,0,0] } = {}) {
        let M = LIBS.translate(...translate);
        if (axis) M = LIBS.multiply(M, LIBS.rotateAboutPivot(axis, angle, pivot));
        M = LIBS.multiply(M, LIBS.rotateEuler(...rotate));
        this.MOVE_MATRIX = LIBS.multiply(M, LIBS.scale(...scale));
    }

    add(child) { this.childs.push(child); return child; }

    setup() {
        const GL = this.GL;
        if (this.faces.length > 0) {
            this.OBJECT_VERTEX = GL.createBuffer();
            GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
            GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.vertex), GL.STATIC_DRAW);
            this.OBJECT_FACES = GL.createBuffer();
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
            GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), GL.STATIC_DRAW);
        }
        this.childs.forEach(child => child.setup());
    }

    render(PARENT_MATRIX) {
        const GL = this.GL, L = this.locs;
        // Model = Parent × Pose × Move
        this.MODEL_MATRIX = LIBS.multiply(PARENT_MATRIX, LIBS.multiply(this.POSITION_MATRIX, this.MOVE_MATRIX));

        if (this.faces.length > 0) {
            GL.useProgram(this.SHADER_PROGRAM);
            GL.uniformMatrix4fv(L.M, false, new Float32Array(this.MODEL_MATRIX));
            GL.uniform3fv(L.tint, this.tint);
            GL.uniform1f(L.emissive, this.emissive);
            GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
            GL.vertexAttribPointer(L.position, 3, GL.FLOAT, false, 36, 0);
            GL.vertexAttribPointer(L.color,    3, GL.FLOAT, false, 36, 12);
            GL.vertexAttribPointer(L.normal,   3, GL.FLOAT, false, 36, 24);
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
            GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
        }
        // HIERARKI: matriks dunia parent diwariskan ke semua anak
        this.childs.forEach(child => child.render(this.MODEL_MATRIX));
    }
}

// Helper: buat MyObject baru, atur pose awal, lalu pasang ke parent
export function makeNode(ctx, parent, geo, pos = [0,0,0], eul = [0,0,0]) {
    const o = new MyObject(ctx.GL, ctx.prog, ctx.locs, geo);
    o.setPose(pos, eul);
    parent.add(o);
    return o;
}