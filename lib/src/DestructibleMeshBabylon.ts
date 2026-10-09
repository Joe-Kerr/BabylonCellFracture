import { Material, Mesh, VertexBuffer, VertexData, Quaternion, Vector3, Matrix } from "@babylonjs/core/pure";

import { MeshGeometry, IVector3Thin, Vector3 as V3 } from "./RendererApi";
import { FractureOptions } from "./entities/FractureOptions";
import { SliceOptions } from "./entities/SliceOptions";
import { voronoiFracture } from "./fracture/VoronoiFracture";
import { fracture as simpleFracture } from "./fracture/Fracture";
import { slice } from "./fracture/Slice";

interface IBabylon {
  Mesh : typeof Mesh, 
  VertexBuffer : typeof VertexBuffer, 
  VertexData : typeof VertexData, 
  Quaternion : typeof Quaternion, 
  Vector3 : typeof Vector3
}

// https://playground.babylonjs.com/#0H33JG

/**
 * A THREE.Mesh that can be fractured or sliced into fragments.
 * Fragments are returned but NOT automatically added to the scene -
 * you must manually add them using scene.add(...fragments).
 */
export class DestructibleMesh {
  private readonly BABYLON : IBabylon;
  private _mesh : Mesh;
  private _outsideMaterial : Material|null = null;
  private _insideMaterial : Material|null = null;

  public get mesh() { return this._mesh; }

  constructor(
    BABYLON : IBabylon,
    mesh : Mesh,
    outerMaterial?: Material,
    innerMaterial?: Material,
  ) {
    // Always start with single outer material
    // Material arrays will be set explicitly in fracture/slice methods
    this._mesh = mesh;
    this._outsideMaterial = outerMaterial || mesh.material || null;
    this._insideMaterial = innerMaterial || null;
    this.BABYLON = BABYLON;
  }

  /**
   * Fractures the mesh into fragments
   * @param options Fracture options controlling the fracture behavior
   * @param onFragment Optional callback called for each fragment for custom setup
   * @param onComplete Optional callback called once after all fragments are created
   * @returns The array of created fragment meshes (NOT added to scene)
   */
  public fracture(
    options: FractureOptions,
    onFragment?: (fragment: DestructibleMesh, index: number) => void,
    onComplete?: () => void,
  ): DestructibleMesh[] {

    const source = this.extractMeshGeometry();

    if(source === null) {
      return [];
    }

    // Perform the fracture operation based on the method
    let fragmentGeometries: MeshGeometry[];

    if (options.fractureMethod === "voronoi") {
      options.voronoiOptions = options.voronoiOptions || {mode: "3D"};
      const voronoiOptions = {
        fragmentCount: options.fragmentCount,
        mode: options.voronoiOptions.mode,
        seedPoints: options.voronoiOptions.seedPoints,
        impactPoint: options.voronoiOptions.impactPoint,
        impactRadius: options.voronoiOptions.impactRadius,
        projectionAxis: options.voronoiOptions.projectionAxis || "auto",
        projectionNormal: options.voronoiOptions.projectionNormal,
        useApproximation: options.voronoiOptions.useApproximation || false,
        approximationNeighborCount:
        options.voronoiOptions.approximationNeighborCount || 12,
        textureScale: options.textureScale,
        textureOffset: options.textureOffset,
        seed: options.seed
      };

      fragmentGeometries = voronoiFracture(source, voronoiOptions);      
    } 
    else {
      fragmentGeometries = simpleFracture(source, options);
    }

    const parentMatrix = this._mesh.computeWorldMatrix();
    // Create mesh objects for each fragment
    const fragments = fragmentGeometries.map((fragmentGeometry, index) => {
      
      const fragMesh = this.convertGeometryToBabylonMesh(fragmentGeometry);
   
      this.applyFragmentTransformsToBabylonMesh(parentMatrix, fragMesh);

      const destMesh = new DestructibleMesh(this.BABYLON, fragMesh, this._outsideMaterial || undefined, this._insideMaterial || undefined);

      // Call the onFragment callback if provided
      if (onFragment) {        
        onFragment(destMesh, index);
      }

      return destMesh;
    });

    // Call the onComplete callback if provided
    if (onComplete) {
      onComplete();
    }

    return fragments;
  }

  /**
   * Slices the mesh into top and bottom parts using a plane in local space
   * @deprecated Untested, #todo
   * @param sliceNormal Normal of the slice plane in local space (points towards the top slice)
   * @param sliceOrigin Origin of the slice plane in local space
   * @param options Optional slice options
   * @param onSlice Optional callback called for each piece for custom setup (material, physics, etc.)
   * @param onComplete Optional callback called once after all pieces are created
   * @returns Array of DestructibleMesh pieces created by the slice (NOT added to scene)
   */
  public slice(
    sliceNormal: IVector3Thin,
    sliceOrigin: IVector3Thin,
    options?: SliceOptions,
    onSlice?: (piece: DestructibleMesh, index: number) => void,
    onComplete?: () => void,
  ): DestructibleMesh[] {
   
    const source = this.extractMeshGeometry();

    if(source === null) {
      throw new Error("DestructibleMesh has no geometry to slice");
    }    

    // Use default options if not provided
    const sliceOptions = options || new SliceOptions();

    const sliceNormalV3 = new V3(sliceNormal.x, sliceNormal.y, sliceNormal.z);
    const sliceOriginV3 = new V3(sliceOrigin.x, sliceOrigin.y, sliceOrigin.z);

    // Perform the slice operation
    const fragments = slice(
      source,
      sliceNormalV3,
      sliceOriginV3,
      sliceOptions.textureScale,
      sliceOptions.textureOffset,
    );

    // Create DestructibleMesh instances for all fragments
    const pieces = fragments.map((geometry, index) => {
      // Create piece with inherited properties and materials
      const piece = this.convertGeometryToBabylonMesh(geometry);

      // Apply world transform
      piece.position.copyFrom(this._mesh.position);
      piece.rotationQuaternion!.copyFrom(this._mesh.rotationQuaternion || this._mesh.rotation.toQuaternion());
      piece.scaling.copyFrom(this._mesh.scaling);

      const destMesh = new DestructibleMesh(this.BABYLON, piece, this._outsideMaterial || undefined, this._insideMaterial || undefined);

      // Call the onSlice callback if provided
      if (onSlice) {
        onSlice(destMesh, index);
      }

      return destMesh;
    });

    // Call the onComplete callback if provided
    if (onComplete) {
      onComplete();
    }

    return pieces;
  }

  /**
   * Slices the mesh using a plane defined in world space
   * @param worldNormal Normal of the slice plane in world space
   * @param worldOrigin Origin of the slice plane in world space
   * @param options Optional slice options
   * @param onSlice Optional callback called for each piece for custom setup (material, physics, etc.)
   * @param onComplete Optional callback called once after all pieces are created
   * @returns Array of DestructibleMesh pieces created by the slice (NOT added to scene)
   */
  public sliceWorld(
    worldNormal: IVector3Thin,
    worldOrigin: IVector3Thin,
    options?: SliceOptions,
    onSlice?: (piece: DestructibleMesh, index: number) => void,
    onComplete?: () => void,
  ): DestructibleMesh[] {
    const worldNormalV3 = new V3(worldNormal.x, worldNormal.y, worldNormal.z);
    const worldOriginV3 = new V3(worldOrigin.x, worldOrigin.y, worldOrigin.z);

    // Update the object's matrix to ensure accurate transformation
    this.updateMatrixWorld(true);

    // Transform slice normal and origin to object's local space
    const worldToLocal = new THREE.Matrix4().copy(this.matrixWorld).invert();

    const localNormal = worldNormalV3
      .clone()
      .transformDirection(worldToLocal)
      .normalize();

    const localOrigin = worldOriginV3.clone().applyMatrix4(worldToLocal);

    // Call the regular slice method with local coordinates
    return this.slice(localNormal, localOrigin, options, onSlice, onComplete);
  }

  private extractMeshGeometry() : MeshGeometry|null {
    if(this._mesh.geometry === null) {
      console.warn("Destructible mesh has no geometry.");
      return null;
    }

    const ps = this._mesh.getVerticesData(this.BABYLON.VertexBuffer.PositionKind);
    const ns = this._mesh.getVerticesData(this.BABYLON.VertexBuffer.NormalKind);
    const us = this._mesh.getVerticesData(this.BABYLON.VertexBuffer.UVKind);
    const is = this._mesh.getIndices() || [];

    if(ps === null || ns === null || us === null) {
      console.warn("Destructible mesh unexpected buffers.");
      return null;      
    } 
    
    return MeshGeometry.FromArrays(ps, ns, us, is);
  }

  private convertGeometryToBabylonMesh(geometry : MeshGeometry) : Mesh {
      const fragMesh = new this.BABYLON.Mesh("Frag", this._mesh.getScene());
      const vertexData = new this.BABYLON.VertexData();
      const normals : number[] = [];
      this.BABYLON.VertexData.ComputeNormals(geometry.positions, geometry.indices, normals);

      vertexData.positions = geometry.positions;
      vertexData.uvs = geometry.uvs;
      vertexData.indices = geometry.indices;
      vertexData.normals = normals;
      vertexData.applyToMesh(fragMesh, false); //not updatable? why should it? #todo  

      fragMesh.rotationQuaternion = this.BABYLON.Quaternion.Identity();

      return fragMesh;
  }

  private applyFragmentTransformsToBabylonMesh(parentMatrix : Matrix, fragMesh : Mesh) {
      fragMesh.material = this._outsideMaterial;      
      fragMesh.computeWorldMatrix(true);
      fragMesh.refreshBoundingInfo(true);

      const bbxCenter = fragMesh.getBoundingInfo().boundingBox.centerWorld;
      fragMesh.position.x -= bbxCenter.x;
      fragMesh.position.y -= bbxCenter.y;
      fragMesh.position.z -= bbxCenter.z;

      // Needed
      fragMesh.computeWorldMatrix(true);
      fragMesh.refreshBoundingInfo(true);      

      // Apply the parent's transform to the fragment position
      const worldCenter = this.BABYLON.Vector3.TransformCoordinates(bbxCenter, parentMatrix);
      fragMesh.position.copyFrom(worldCenter);
      fragMesh.rotationQuaternion!.copyFrom(this._mesh.rotationQuaternion || this._mesh.rotation.toQuaternion());
      fragMesh.scaling.copyFrom(this._mesh.scaling);

      // Needed, if e.g. immediate physics setup
      fragMesh.computeWorldMatrix(true);
      fragMesh.refreshBoundingInfo(true);    
  }
}
