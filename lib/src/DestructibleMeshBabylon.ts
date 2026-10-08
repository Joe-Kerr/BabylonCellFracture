import { Material, Mesh, VertexBuffer, VertexData, Quaternion, Vector3 } from "@babylonjs/core/pure";

import { MeshGeometry } from "./RendererApi";
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

    
    
    if(this._mesh.geometry === null) {
      console.warn("Destructible mesh has no geometry.");
      return [];
    }

    const ps = this._mesh.getVerticesData(this.BABYLON.VertexBuffer.PositionKind);
    const ns = this._mesh.getVerticesData(this.BABYLON.VertexBuffer.NormalKind);
    const us = this._mesh.getVerticesData(this.BABYLON.VertexBuffer.UVKind);
    const is = this._mesh.getIndices() || [];

    if(ps === null || ns === null || us === null) {
      console.warn("Destructible mesh unexpected buffers.");
      return [];      
    }

    const source = MeshGeometry.FromArrays(ps, ns, us, is);
    // Perform the fracture operation based on the method
    let fragmentGeometries: MeshGeometry[];

    try {
      if (options.fractureMethod === "voronoi") {
        if (!options.voronoiOptions) {
          throw new Error(
            "voronoiOptions is required when fractureMethod is 'voronoi'",
          );
        }

        // Convert FractureOptions to VoronoiFractureOptions format for the voronoiFracture function
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
          seed: options.seed,
        };

        fragmentGeometries = voronoiFracture(source, voronoiOptions);
      } else {
        fragmentGeometries = simpleFracture(source, options);
      }
    } catch (error) {
      console.error("Fracture operation failed:", error);
      throw error;
    }

    const parentMatrix = this._mesh.computeWorldMatrix();
    // Create mesh objects for each fragment
    const fragments = fragmentGeometries.map((fragmentGeometry, index) => {

      const fragMesh = new this.BABYLON.Mesh("Frag"+index, this._mesh.getScene());
      const vertexData = new this.BABYLON.VertexData();
      const normals : number[] = [];
      this.BABYLON.VertexData.ComputeNormals(fragmentGeometry.positions, fragmentGeometry.indices, normals);

      vertexData.positions = fragmentGeometry.positions;
      vertexData.uvs = fragmentGeometry.uvs;
      vertexData.indices = fragmentGeometry.indices;
      vertexData.normals = normals;
      vertexData.applyToMesh(fragMesh);     
      
      fragMesh.material = this._outsideMaterial;
      fragMesh.rotationQuaternion = this.BABYLON.Quaternion.Identity();
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
      fragMesh.rotationQuaternion.copyFrom(this._mesh.rotationQuaternion || this._mesh.rotation.toQuaternion());
      fragMesh.scaling.copyFrom(this._mesh.scaling);

      // Needed, if e.g. immediate physics setup
      fragMesh.computeWorldMatrix(true);
      fragMesh.refreshBoundingInfo(true);        

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
   * @param sliceNormal Normal of the slice plane in local space (points towards the top slice)
   * @param sliceOrigin Origin of the slice plane in local space
   * @param options Optional slice options
   * @param onSlice Optional callback called for each piece for custom setup (material, physics, etc.)
   * @param onComplete Optional callback called once after all pieces are created
   * @returns Array of DestructibleMesh pieces created by the slice (NOT added to scene)
   */
  public slice(
    sliceNormal: THREE.Vector3,
    sliceOrigin: THREE.Vector3,
    options?: SliceOptions,
    onSlice?: (piece: DestructibleMesh, index: number) => void,
    onComplete?: () => void,
  ): DestructibleMesh[] {
    if (!this.geometry) {
      throw new Error("DestructibleMesh has no geometry to slice");
    }

    // Use default options if not provided
    const sliceOptions = options || new SliceOptions();

    // Perform the slice operation
    const fragments = slice(
      this.geometry,
      sliceNormal,
      sliceOrigin,
      sliceOptions.textureScale,
      sliceOptions.textureOffset,
    );

    // Create DestructibleMesh instances for all fragments
    const pieces = fragments.map((geometry, index) => {
      // Create piece with inherited properties and materials
      const piece = this.createFragment(geometry);

      // Apply world transform
      piece.position.copy(this.position);
      piece.quaternion.copy(this.quaternion);
      piece.scale.copy(this.scale);

      // Call the onSlice callback if provided
      if (onSlice) {
        onSlice(piece, index);
      }

      return piece;
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
    worldNormal: THREE.Vector3,
    worldOrigin: THREE.Vector3,
    options?: SliceOptions,
    onSlice?: (piece: DestructibleMesh, index: number) => void,
    onComplete?: () => void,
  ): DestructibleMesh[] {
    // Update the object's matrix to ensure accurate transformation
    this.updateMatrixWorld(true);

    // Transform slice normal and origin to object's local space
    const worldToLocal = new THREE.Matrix4().copy(this.matrixWorld).invert();

    const localNormal = worldNormal
      .clone()
      .transformDirection(worldToLocal)
      .normalize();

    const localOrigin = worldOrigin.clone().applyMatrix4(worldToLocal);

    // Call the regular slice method with local coordinates
    return this.slice(localNormal, localOrigin, options, onSlice, onComplete);
  }

}
