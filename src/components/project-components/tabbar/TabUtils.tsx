export const showMeshes = (
  targetMeshName: string,
  mainScene: BABYLON.Scene
) => {
  mainScene.meshes.forEach((mesh: any) => {
    if (typeof mesh.name !== "undefined") {
      if (mesh.name === targetMeshName) {
        mesh.visibility = 1;
      } else if (
        mesh.name.startsWith(targetMeshName) &&
        mesh.name.endsWith(")")
      ) {
        mesh.visibility = 1;
      }
    }
  });
};

export const hideMeshes = (
  targetMeshName: string,
  mainScene: BABYLON.Scene
) => {
  mainScene.meshes?.forEach((mesh: any) => {
    if (typeof mesh.name !== "undefined") {
      if (mesh.name === targetMeshName) {
        mesh.visibility = 0;
      } else if (
        mesh.name.startsWith(targetMeshName) &&
        mesh.name.endsWith(")")
      ) {
        mesh.visibility = 0;
      }
    }
  });
};
