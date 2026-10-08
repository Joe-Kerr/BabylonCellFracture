import { MeshBuilder, Mesh } from "@babylonjs/core/pure";
import { Vector2, Vector3, MeshGeometry } from "../../RendererApi";
import { geometryToFragment, fragmentToGeometry } from "../GeometryConversion";
import { Fragment } from "../../entities/Fragment";
import { MeshVertex } from "../../entities/MeshVertex";

describe("GeometryConversion", () => {
  let cube: Mesh;

  // #todo
  /*
  beforeEach(() => {
    // Create a simple cube geometry for testing
    cube = MeshBuilder.CreateBox("test", {size: 1});
  });

  describe("geometryToFragment", () => {
    it("should convert BufferGeometry to Fragment", () => {
      const fragment = geometryToFragment(cube);

      expect(fragment).toBeInstanceOf(Fragment);
      expect(fragment.vertices.length).toBe(24); // Cube has 24 vertices (4 per face * 6 faces)
      expect(fragment.triangles[0].length).toBe(36); // 12 triangles * 3 vertices
      expect(fragment.triangles[1].length).toBe(0); // No cut faces yet
    });

    it("should preserve vertex attributes", () => {
      const fragment = geometryToFragment(cube);
      const positions = cube.attributes.position;
      const normals = cube.attributes.normal;
      const uvs = cube.attributes.uv;

      // Check first vertex
      expect(fragment.vertices[0].position.x).toBeCloseTo(positions.getX(0));
      expect(fragment.vertices[0].position.y).toBeCloseTo(positions.getY(0));
      expect(fragment.vertices[0].position.z).toBeCloseTo(positions.getZ(0));

      expect(fragment.vertices[0].normal.x).toBeCloseTo(normals.getX(0));
      expect(fragment.vertices[0].normal.y).toBeCloseTo(normals.getY(0));
      expect(fragment.vertices[0].normal.z).toBeCloseTo(normals.getZ(0));

      expect(fragment.vertices[0].uv.x).toBeCloseTo(uvs.getX(0));
      expect(fragment.vertices[0].uv.y).toBeCloseTo(uvs.getY(0));
    });
  });
  */

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

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(geometry.positions.length).toBe(3);
      expect(geometry.normals.length).toBe(3);
      expect(geometry.uvs.length).toBe(3);
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
      expect(geometry.idxOrgEnd).toBe(1);
      expect(geometry.idxCutStart).toBe(1);
      expect(geometry.idxCutEnd).toBe(2);
    });
  });
});
