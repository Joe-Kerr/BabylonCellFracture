import { Mesh, VertexBuffer, VertexData, Quaternion, Vector3, Scene } from "@babylonjs/core/pure";
import { MeshGeometry } from "./RendererApi";

interface IBabylon {
  Mesh : typeof Mesh, 
  VertexBuffer : typeof VertexBuffer, 
  VertexData : typeof VertexData, 
  Quaternion : typeof Quaternion, 
  Vector3 : typeof Vector3
}

// https://playground.babylonjs.com/#0H33JG#2

export function extractBabylonMeshGeometry(mesh : Mesh, BABYLON : IBabylon) : MeshGeometry|null {
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

export function convertGeometryToBabylonMesh(geometry : MeshGeometry, BABYLON : IBabylon, scene : Scene) : Mesh {
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

export function applyFractureTransformsToBabylonMesh(parent : Mesh, fragMesh : Mesh, BABYLON : IBabylon) {
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

export function applySliceTransformsToBabylonMesh(parent : Mesh, slice : Mesh) {
    // Apply world transform
    slice.position.copyFrom(parent.position);
    slice.rotationQuaternion!.copyFrom(parent.rotationQuaternion || parent.rotation.toQuaternion());
    slice.scaling.copyFrom(parent.scaling);
}