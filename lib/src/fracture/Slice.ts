import { Vector2, Vector3, MeshGeometry } from "../RendererApi";
import { sliceFragment } from "./SliceFragment";
import {
  geometryToFragment,
  fragmentToGeometry,
} from "../utils/GeometryConversion";
import { findIsolatedGeometry } from "./FractureFragment";

/**
 * Slices the mesh by the plane specified by `sliceNormal` and `sliceOrigin`
 * @param geometry The geometry to slice
 * @param sliceNormal The normal of the slice plane (points towards the top slice)
 * @param sliceOrigin The origin of the slice plane
 * @param textureScale Scale factor to apply to UV coordinates
 * @param textureOffset Offset to apply to UV coordinates
 * @returns An object containing the geometries above and below the slice plane
 */
export function slice(
  geometry: MeshGeometry,
  sliceNormal: Vector3,
  sliceOrigin: Vector3,
  textureScale: Vector2,
  textureOffset: Vector2,
): MeshGeometry[] {
  // Convert THREE.BufferGeometry to our internal Fragment representation
  const fragment = geometryToFragment(geometry);

  // Perform the slice operation using our existing code
  const { topSlice, bottomSlice } = sliceFragment(
    fragment,
    sliceNormal,
    sliceOrigin,
    textureScale,
    textureOffset,
  );

  // Find isolated fragments in both slices
  const topFragments = findIsolatedGeometry(topSlice);
  const bottomFragments = findIsolatedGeometry(bottomSlice);

  // Combine all fragments (filtering is done by findIsolatedGeometry)
  const fragments = [...topFragments, ...bottomFragments];

  return fragments.map((fragment) => fragmentToGeometry(fragment));
}
