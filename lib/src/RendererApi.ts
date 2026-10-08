export class Vector2 {
    public x : number = 0;
    public y : number = 0;

    constructor(x : number = 0, y : number = 0) {
        this.x = x;
        this.y = y;
    }

    public clone() : Vector2 {
        return new Vector2(this.x, this.y);
    }    
}

export class Vector3 {
    public x : number = 0;
    public y : number = 0;
    public z : number = 0;

    constructor(x : number = 0, y : number = 0, z : number = 0) {
        this.x = x;
        this.y = y;        
        this.z = z;        
    }

    public clone() : Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    public normalize() : Vector3 {
        const scalar = 1 / (this.length() || 1);

		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;   
        
        return this;
    }

    public sub(minusThis : Vector3) {
        this.x -= minusThis.x;
        this.y -= minusThis.y;
        this.z -= minusThis.z;
        return this;
    }

    public negate() : Vector3 {
		this.x = - this.x;
		this.y = - this.y;
		this.z = - this.z;

		return this;
    }

    public dot(v : Vector3) : number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    
    public crossVectors(a : Vector3, b : Vector3) : Vector3 {
		const ax = a.x, ay = a.y, az = a.z;
		const bx = b.x, by = b.y, bz = b.z;

		this.x = ay * bz - az * by;
		this.y = az * bx - ax * bz;
		this.z = ax * by - ay * bx;

		return this;
    }

    private length() {
        return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z )
    }
}

export class Box3 {
    public min : Vector3 = new Vector3();
    public max : Vector3 = new Vector3();

    constructor(min : Vector3 = new Vector3(), max : Vector3 = new Vector3()) {
        this.min = min;
        this.max = max;
    }

    public getCenter(out : Vector3) : void {
        out.x = (this.min.x + this.max.x) * 0.5;
        out.x = (this.min.y + this.max.y) * 0.5;
        out.x = (this.min.z + this.max.z) * 0.5;
    }

    public clone() : Box3 {
        return new Box3(this.min, this.max);
    }
}

export class MeshGeometry {
    public positions : Float32Array;
    public normals : Float32Array;
    public uvs : Float32Array;
    public indices : Uint32Array;

    public idxOrgStart : number = 0;
    public idxOrgEnd : number = 0;
    public idxCutStart : number = 0;
    public idxCutEnd : number = 0;

    constructor(positions : Float32Array, normals : Float32Array, uvs : Float32Array, indices : Uint32Array) {
        this.positions = positions;
        this.normals = normals;
        this.uvs = uvs;
        this.indices = indices;
    }

    public static FromArrays(positions : ArrayLike<number>, normals : ArrayLike<number>, uvs : ArrayLike<number>, indices : ArrayLike<number>) {
        return new MeshGeometry(
            positions instanceof Float32Array ? positions : new Float32Array(positions),
            normals instanceof Float32Array ? normals : new Float32Array(normals),
            uvs instanceof Float32Array ? uvs : new Float32Array(uvs),
            indices instanceof Uint32Array ? indices : new Uint32Array(indices)
        );
    }

    public setMaterialIndices(numOriginalMeshTris : number, numCutFacesTris : number) {
        if(numCutFacesTris === 0) {
            return;
        }

        this.idxOrgStart = 0;
        this.idxOrgEnd = numOriginalMeshTris - 1;

        this.idxCutStart = this.idxOrgEnd + 1;
        this.idxCutEnd = this.idxCutStart + numCutFacesTris - 1;
    }
}