import { Material, Mesh, VertexBuffer, VertexData, Quaternion, Vector3, Matrix, Scene } from "@babylonjs/core/pure";

import { MeshGeometry, IMeshGeometryThin, IVector3Thin, Vector3 as V3 } from "./RendererApi";
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

// https://playground.babylonjs.com/#0H33JG#1

/**
 * A THREE.Mesh that can be fractured or sliced into fragments.
 * Fragments are returned but NOT automatically added to the scene -
 * you must manually add them using scene.add(...fragments).
 */
export class DestructibleMesh {
  private geometry : MeshGeometry;

  constructor(
    geometry : IMeshGeometryThin
  ) {
    // Always start with single outer material
    // Material arrays will be set explicitly in fracture/slice methods
    this.geometry = geometry instanceof MeshGeometry ? geometry : MeshGeometry.FromObject(geometry);
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

    const source = this.geometry;

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
    
    // Create mesh objects for each fragment
    const fragments = fragmentGeometries.map((fragmentGeometry, index) => {
      const destMesh = new DestructibleMesh(fragmentGeometry);

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
   
    const source = this.geometry;  

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
      const destMesh = new DestructibleMesh(geometry);

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
   * @deprecated Not porting this until I need it
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
  ) {
    /*
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
    */
  }

  public static ExtractBabylonMeshGeometry(mesh : Mesh, BABYLON : IBabylon) : MeshGeometry|null {
    if(mesh.geometry === null) {
      console.warn("Destructible mesh has no geometry.");
      return null;
    }

    const ps = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const ns = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    const us = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind);
    const is = mesh.getIndices() || [];

    if(ps === null || ns === null || us === null) {
      console.warn("Destructible mesh unexpected buffers.");
      return null;      
    } 
    
    return MeshGeometry.FromArrays(ps, ns, us, is);
  }

  public convertGeometryToBabylonMesh(BABYLON : IBabylon, scene : Scene) : Mesh {
      const geometry = this.geometry;
      const fragMesh = new BABYLON.Mesh("Frag", scene);
      const vertexData = new BABYLON.VertexData();
      const normals : number[] = [];
      BABYLON.VertexData.ComputeNormals(geometry.positions, geometry.indices, normals);

      vertexData.positions = geometry.positions;
      vertexData.uvs = geometry.uvs;
      vertexData.indices = geometry.indices;
      vertexData.normals = normals;
      vertexData.applyToMesh(fragMesh, false); //not updatable? why should it? #todo  

      fragMesh.rotationQuaternion = BABYLON.Quaternion.Identity();

      return fragMesh;
  }

  public applyFractureTransformsToBabylonMesh(parent : Mesh, fragMesh : Mesh, BABYLON : IBabylon) {
      const parentMatrix = parent.computeWorldMatrix();

      //fragMesh.material = this._outsideMaterial;      
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
      const worldCenter = BABYLON.Vector3.TransformCoordinates(bbxCenter, parentMatrix);
      fragMesh.position.copyFrom(worldCenter);
      fragMesh.rotationQuaternion!.copyFrom(parent.rotationQuaternion || parent.rotation.toQuaternion());
      fragMesh.scaling.copyFrom(parent.scaling);

      // Needed, if e.g. immediate physics setup
      fragMesh.computeWorldMatrix(true);
      fragMesh.refreshBoundingInfo(true);    
  }

  public applySliceTransformsToBabylonMesh(parent : Mesh, slice : Mesh) {
      // Apply world transform
      slice.position.copyFrom(parent.position);
      slice.rotationQuaternion!.copyFrom(parent.rotationQuaternion || parent.rotation.toQuaternion());
      slice.scaling.copyFrom(parent.scaling);
  }
}
