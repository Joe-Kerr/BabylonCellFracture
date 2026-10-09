import { Vector2, Vector3, MeshGeometry } from "../RendererApi";
import { Fragment } from "../entities/Fragment";
import { MeshVertex } from "../entities/MeshVertex";

const CoordinateSystemConversion = -1;

/**
 * Converts a THREE.BufferGeometry to our internal Fragment representation
 * 
 * IMPORTANT: The library operates in RH coordinate system - but Babylon expects LH.
 */
export function geometryToFragment(geometry: MeshGeometry): Fragment {
  const positions = geometry.positions;
  const normals = geometry.normals;
  const uvs = geometry.uvs;

  const fragment = new Fragment();
  for (let i = 0; i < positions.length / 3; i++) {
    const position = new Vector3(
      positions[3 * i],
      positions[3 * i + 1],
      positions[3 * i + 2]     * CoordinateSystemConversion
    );

    const normal = new Vector3(
      normals[3 * i],
      normals[3 * i + 1],
      normals[3 * i + 2]     * CoordinateSystemConversion
    );

    const uv = uvs
      ? new Vector2(uvs[2 * i], uvs[2 * i + 1])
      : new Vector2(0, 0);

    fragment.vertices.push(new MeshVertex(position, normal, uv));
  }

  // Generate index if it doesn't exist
  let indices: number[];
  if (geometry.indices.length > 0) {
    indices = Array.from(geometry.indices);
  } else {
    // Create sequential indices for non-indexed geometry
    const vertexCount = positions.length / 3;
    indices = Array.from({ length: vertexCount }, (_, i) => i);
  }

  // Preserve material groups if geometry has been previously sliced
  if (geometry.idxCutStart > 0) {
    // Split indices into two groups based on material groups
    const group0Indices: number[] = [];
    const group1Indices: number[] = [];

    for(let i=geometry.idxOrgStart; i<=geometry.idxOrgEnd; i++) {
      group0Indices.push(indices[i]);
    }

    for(let i=geometry.idxCutStart; i<=geometry.idxCutEnd; i++) {
      group1Indices.push(indices[i]);
    }

    fragment.triangles = [group0Indices, group1Indices];
  } else {
    // No groups or single group - treat as unsliced geometry
    fragment.triangles = [indices, []];
  }

  fragment.calculateBounds();

  return fragment;
}

/**
 * Converts our internal Fragment representation to a THREE.BufferGeometry
 */
export function fragmentToGeometry(fragment: Fragment): MeshGeometry {
  const vertexCount = fragment.vertices.length + fragment.cutVertices.length;
  const positions = new Array<number>(vertexCount * 3);
  const normals = new Array<number>(vertexCount * 3);
  const uvs = new Array<number>(vertexCount * 2);

  let posIdx = 0;
  let normIdx = 0;
  let uvIdx = 0;

  // Add the positions, normals and uvs for the non-cut-face geometry
  for (const vert of fragment.vertices) {
    positions[posIdx++] = vert.position.x;
    positions[posIdx++] = vert.position.y;
    positions[posIdx++] = vert.position.z     * CoordinateSystemConversion;

    normals[normIdx++] = vert.normal.x;
    normals[normIdx++] = vert.normal.y;
    normals[normIdx++] = vert.normal.z     * CoordinateSystemConversion;

    uvs[uvIdx++] = vert.uv.x;
    uvs[uvIdx++] = vert.uv.y;
  }

  // Next, add the positions, normals and uvs for the cut-face geometry
  for (const vert of fragment.cutVertices) {
    positions[posIdx++] = vert.position.x;
    positions[posIdx++] = vert.position.y;
    positions[posIdx++] = vert.position.z     * CoordinateSystemConversion;

    normals[normIdx++] = vert.normal.x;
    normals[normIdx++] = vert.normal.y;
    normals[normIdx++] = vert.normal.z     * CoordinateSystemConversion;

    uvs[uvIdx++] = vert.uv.x;
    uvs[uvIdx++] = vert.uv.y;
  }

  const geometry = MeshGeometry.FromArrays(
    positions,
    normals,
    uvs,
    fragment.triangles.flat()
  );

  geometry.setMaterialIndices(fragment.vertices.length, fragment.cutVertices.length);


  return geometry;
}
