import { MeshGeometry } from "../RendererApi";
import { FractureOptions } from "../entities/FractureOptions";
import { fractureFragment } from "./FractureFragment";
import {
  geometryToFragment,
  fragmentToGeometry,
} from "../utils/GeometryConversion";

/**
 * Fractures the mesh into multiple fragments
 * @param mesh The source mesh to fracture
 * @param options Options for fracturing
 */
export function fracture(
  geometry: MeshGeometry,
  options: FractureOptions,
): MeshGeometry[] {
  const fragments = fractureFragment(geometryToFragment(geometry), options);
  return fragments.map((fragment) => fragmentToGeometry(fragment));
}
