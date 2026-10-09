import { MeshGeometry, IMeshGeometryThin, IVector3Thin, Vector3 as V3 } from "./RendererApi";
import { FractureOptions } from "./entities/FractureOptions";
import { SliceOptions } from "./entities/SliceOptions";
import { voronoiFracture } from "./fracture/VoronoiFracture";
import { fracture as simpleFracture } from "./fracture/Fracture";
import { slice } from "./fracture/Slice";

/**
 * A THREE.Mesh that can be fractured or sliced into fragments.
 * Fragments are returned but NOT automatically added to the scene -
 * you must manually add them using scene.add(...fragments).
 */
export class DestructibleMesh {
  protected _geometry : MeshGeometry;

  constructor(geometry : IMeshGeometryThin) {
    this._geometry = geometry instanceof MeshGeometry ? geometry : MeshGeometry.FromObject(geometry);
  }

  public get geometry() { return this._geometry; }

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

    const source = this._geometry;

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
   * 
   * @deprecated Untested, #todo
   * 
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
   
    const source = this._geometry;  

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
   * 
   * @deprecated Not porting this until I need it
   * 
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
}
