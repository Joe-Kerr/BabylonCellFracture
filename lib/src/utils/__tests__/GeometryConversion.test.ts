import { Vector2, Vector3, MeshGeometry } from "../../RendererApi";
import { geometryToFragment, fragmentToGeometry } from "../GeometryConversion";
import { Fragment } from "../../entities/Fragment";
import { MeshVertex } from "../../entities/MeshVertex";

describe("GeometryConversion", () => {

  const positions = [0.5,-0.5,0.5,-0.5,-0.5,0.5,-0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,-0.5,-0.5,0.5,-0.5,-0.5,-0.5,-0.5,0.5,-0.5,-0.5,0.5,0.5,-0.5,0.5,-0.5,-0.5,0.5,-0.5,0.5,0.5,0.5,0.5,-0.5,0.5,0.5,-0.5,-0.5,0.5,-0.5,-0.5,-0.5,-0.5,0.5,-0.5,-0.5,0.5,0.5,-0.5,0.5,-0.5,0.5,0.5,-0.5,0.5,0.5,0.5,0.5,-0.5,0.5,0.5,-0.5,-0.5,-0.5,-0.5,-0.5,-0.5,-0.5,0.5];
  const normals = [0,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0];
  const uvs = [1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0];
  const indices = [0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11,12,13,14,12,14,15,16,17,18,16,18,19,20,21,22,20,22,23];

  describe("geometryToFragment", () => {
    it("should convert BufferGeometry to Fragment", () => {
      const geo = MeshGeometry.FromArrays(positions, normals, uvs, indices);
      const fragment = geometryToFragment(geo);

      expect(fragment).toBeInstanceOf(Fragment);
      expect(fragment.vertices.length).toBe(24); // Cube has 24 vertices (4 per face * 6 faces)
      expect(fragment.triangles[0].length).toBe(36); // 12 triangles * 3 vertices
      expect(fragment.triangles[1].length).toBe(0); // No cut faces yet
    });

    it("should preserve vertex attributes", () => {
      const geo = MeshGeometry.FromArrays(positions, normals, uvs, indices);
      const fragment = geometryToFragment(geo);

      // Check first vertex
      expect(fragment.vertices[0].position.x).toBeCloseTo(positions[0]);
      expect(fragment.vertices[0].position.y).toBeCloseTo(positions[1]);
      expect(fragment.vertices[0].position.z).toBeCloseTo(positions[2] * -1); //coord sys

      expect(fragment.vertices[0].normal.x).toBeCloseTo(normals[0]);
      expect(fragment.vertices[0].normal.y).toBeCloseTo(normals[1]);
      expect(fragment.vertices[0].normal.z).toBeCloseTo(normals[2] * -1); //coord sys

      expect(fragment.vertices[0].uv.x).toBeCloseTo(uvs[0]);
      expect(fragment.vertices[0].uv.y).toBeCloseTo(uvs[1]);
    });
  });
  

  describe("fragmentToGeometry", () => {
    it("should convert Fragment back to BufferGeometry", () => {
      const fragment = new Fragment();

      // Add some test vertices
      fragment.vertices.push(
        new MeshVertex(
          new Vector3(0, 0, 0),
          new Vector3(0, 1, 0),
          new Vector2(0, 0),
        ),
        new MeshVertex(
          new Vector3(1, 0, 0),
          new Vector3(0, 1, 0),
          new Vector2(1, 0),
        ),
        new MeshVertex(
          new Vector3(0, 1, 0),
          new Vector3(0, 1, 0),
          new Vector2(0, 1),
        ),
      );

      // Add a triangle
      fragment.triangles[0] = [0, 1, 2];

      const geometry = fragmentToGeometry(fragment);

      expect(geometry).toBeInstanceOf(MeshGeometry);
      expect(geometry.positions.length).toBe(3 * 3); //Originally compared num vertices in Three.js data structure
      expect(geometry.normals.length).toBe(3 * 3);
      expect(geometry.uvs.length).toBe(3 * 2);
      expect(geometry.indices.length).toBe(3);
    });

    it("should handle cut faces correctly", () => {
      const fragment = new Fragment();

      // Add regular vertices
      fragment.vertices.push(
        new MeshVertex(
          new Vector3(0, 0, 0),
          new Vector3(0, 1, 0),
          new Vector2(0, 0),
        ),
      );

      // Add cut face vertices
      fragment.cutVertices.push(
        new MeshVertex(
          new Vector3(1, 0, 0),
          new Vector3(0, 1, 0),
          new Vector2(1, 0),
        ),
      );

      // Add triangles for both submeshes
      fragment.triangles = [[0], [0]];

      const geometry = fragmentToGeometry(fragment);

      //expect(geometry.groups.length).toBe(2);
      expect(geometry.idxOrgStart).toBe(0);
      expect(geometry.idxOrgEnd).toBe(2);
      expect(geometry.idxCutStart).toBe(3);
      expect(geometry.idxCutEnd).toBe(5);
    });
  });
});
