import { useState, useEffect } from "react";
import { scene } from "components/project-components/MainScene";
import { Storage } from "aws-amplify";
import * as BABYLON from "babylonjs";
import Materials from "../../types/materials";

import { useAppDispatch, useAppSelector } from "state/hooks";
import { selectModels } from "state/reducers/modelSlice";
import DraggableModal from "components/DraggableModal";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
import {
  setMesh,
  setMeshXY,
  setMeshXZ,
  setMeshYZ,
} from "state/reducers/generatedMeshSlice";
import { selectGeneratedMeshXZ } from "state/reducers/generatedMeshSlice";
import { selectUsername } from "state/reducers/authSlice";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectGeneratedMesh } from "state/reducers/generatedMeshSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectMaterials } from "state/reducers/userSlice";

export interface EditXZProps {
  setVisible: (value: boolean) => void;
  visible: boolean;
}

function EditXZMenu({ visible, setVisible }: EditXZProps) {
  const [XZ, setXZ] = useState("");
  const models = useAppSelector(selectModels);
  const modelsToDraw = Object.values(models);
  const arrayModel = modelsToDraw.flat() as any[];
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const { projectId } = useParams();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUsername);
  const generatedMeshXZ = useAppSelector(selectGeneratedMeshXZ);
  let currentMesh = useSelector(selectGeneratedMesh);
  const materials = useAppSelector(selectMaterials);

  const keyDownFunc = (event: any) => {
    if (visible) {
      if (event.key == "Escape") {
        document.getElementById("editxz-btn-cancel")?.click();
        document.removeEventListener("keydown", keyDownFunc);
      }
      else if (event.key == "Enter") {
        document.getElementById("editxz-btn-ok")?.click();
        document.removeEventListener("keydown", keyDownFunc);
      }
    }
  }
  document.addEventListener("keydown", keyDownFunc);

  useEffect(() => {
    if (visible) {
      if (generatedMeshXZ.length != 0) setXZ(generatedMeshXZ.toString());
    }
  }, [visible]);

  const handleChanges = (e: any) => {
    switch (e.target.name) {
      case "XZ":
        setXZ(e.target.value);
        break;
    }
  };

  const getArray = (data: string) => {
    // Check if data is a string
    if (typeof data !== "string") {
      toast.error("Input must be a string", {
        toastId: "error",
      });
      return [];
    }

    // Split string into array and remove leading/trailing spaces
    let array = data.split(",").map((item) => item.trim());

    // Parse string elements to float and filter out non-numeric values
    let floatArray = array
      .map((item) => parseFloat(item))
      .filter((item) => !isNaN(item));

    // Remove duplicates
    floatArray = Array.from(new Set(floatArray));

    // Sort array
    floatArray.sort((a, b) => a - b);

    // Check if any NaN values exist after sorting
    if (floatArray.some(isNaN)) {
      toast.error("Input string contains non-numeric values", {
        toastId: "error",
      });
      return [];
    }

    return floatArray;
  };

  const applyMesh = (isCancel: boolean, previewOnly: boolean = false) => {
    if (!isCancel && getArray(XZ).length < 20) {
      toast.error("Each axis/plane must consist of at least 20 mesh lines.", {
        toastId: "error",
      });
      return 1;
    }
    if (arrayModel.length > 0) {
      arrayModel.forEach((model) => {
        const mesh = scene.getMeshById(model.id);
        if (mesh !== null) {
          for (let i = 0; i < 100; i++) {
            scene.meshes.forEach(function (mesh) {
              if (mesh.name === "_meshLines") {
                if (mesh.parent) {
                  mesh.parent = null;
                }
                mesh.dispose();
              }
            });
          }
        }
      });

      const x = currentMesh.x;
      const y = isCancel ? currentMesh.y : getArray(XZ);
      const z = currentMesh.z;

      if (!previewOnly) {
        dispatch(setMeshXY(z));
        dispatch(setMeshYZ(x));
        dispatch(setMeshXZ(y));
        dispatch(
          setMesh({
            x: x,
            y: y,
            z: z,
          })
        );
      }

      const boundaries = {
        xMin: simulationProperties.xMin,
        xMax: simulationProperties.xMax,
        yMin: simulationProperties.yMin,
        yMax: simulationProperties.yMax,
        zMin: simulationProperties.zMin,
        zMax: simulationProperties.zMax,
      };

      let pml_n = simulationProperties.pml_n;
      const pml_opacity = 0;

      let lines;
      let pml_n_min;
      let pml_n_max;

      pml_n_min = boundaries.xMin === "PML" ? pml_n : 0;
      pml_n_max = boundaries.xMax === "PML" ? pml_n : 0;
      const xClean = x.slice(pml_n_min, x.length - pml_n_max);

      pml_n_min = boundaries.yMin === "PML" ? pml_n : 0;
      pml_n_max = boundaries.yMax === "PML" ? pml_n : 0;
      const yClean = y.slice(pml_n_min, y.length - pml_n_max);

      pml_n_min = boundaries.zMin === "PML" ? pml_n : 0;
      pml_n_max = boundaries.zMax === "PML" ? pml_n : 0;
      const zClean = z.slice(pml_n_min, z.length - pml_n_max);

      pml_n = 0;

      // Primary mesh lines

      // X (YZ plane)
      pml_n_min = boundaries.xMin === "PML" ? pml_n : 0;
      pml_n_max = boundaries.xMax === "PML" ? pml_n : 0;

      pml_n_min = 0;
      pml_n_max = 0;

      for (let i = 0; i < xClean.length; i++) {
        const isPML =
          (boundaries.xMin === "PML" && i < pml_n_min) ||
          (boundaries.xMax === "PML" && i >= xClean.length - pml_n_max);
        const colors = [
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
        ];

        const point1 = new BABYLON.Vector3(
          xClean[i],
          yClean[pml_n_min],
          zClean[pml_n_min]
        );
        const point2_max = new BABYLON.Vector3(
          xClean[i],
          yClean[pml_n_max],
          zClean[zClean.length - 1 - pml_n_max]
        );
        const point2_min = new BABYLON.Vector3(
          xClean[i],
          yClean[yClean.length - 1 - pml_n_max],
          zClean[pml_n_max]
        );

        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLines",
          { points: [point1, point2_max], colors: colors },
          scene
        );
        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLines",
          { points: [point1, point2_min], colors: colors },
          scene
        );
      }

      // Y (XZ plane)
      pml_n_min = boundaries.yMin === "PML" ? pml_n : 0;
      pml_n_max = boundaries.yMax === "PML" ? pml_n : 0;

      for (let i = 0; i < yClean.length; i++) {
        const isPML =
          (boundaries.yMin === "PML" && i < pml_n_min) ||
          (boundaries.yMax === "PML" && i >= yClean.length - pml_n_max);
        const colors = [
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
        ];

        const point1 = new BABYLON.Vector3(
          xClean[pml_n_min],
          yClean[i],
          zClean[pml_n_min]
        );
        const point2_max = new BABYLON.Vector3(
          xClean[pml_n_max],
          yClean[i],
          zClean[zClean.length - 1 - pml_n_max]
        );
        const point2_min = new BABYLON.Vector3(
          xClean[xClean.length - 1 - pml_n_max],
          yClean[i],
          zClean[pml_n_max]
        );

        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLines",
          { points: [point1, point2_max], colors: colors },
          scene
        );
        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLines",
          { points: [point1, point2_min], colors: colors },
          scene
        );
      }

      // Z (XY plane)
      pml_n_min = boundaries.zMin === "PML" ? pml_n : 0;
      pml_n_max = boundaries.zMax === "PML" ? pml_n : 0;

      for (let i = 0; i < zClean.length; i++) {
        const isPML =
          (boundaries.zMin === "PML" && i < pml_n_min) ||
          (boundaries.zMax === "PML" && i >= zClean.length - pml_n_max);
        const colors = [
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
        ];

        const point1 = new BABYLON.Vector3(
          xClean[pml_n_min],
          yClean[pml_n_min],
          zClean[i]
        );
        const point2_max = new BABYLON.Vector3(
          xClean[pml_n_max],
          yClean[yClean.length - 1 - pml_n_max],
          zClean[i]
        );
        const point2_min = new BABYLON.Vector3(
          xClean[xClean.length - 1 - pml_n_max],
          yClean[pml_n_max],
          zClean[i]
        );

        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLines",
          { points: [point1, point2_max], colors: colors },
          scene
        );
        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLines",
          { points: [point1, point2_min], colors: colors },
          scene
        );
      }

      // Secondary mesh lines

      // X (YZ plane)
      pml_n_min = boundaries.xMin === "PML" ? pml_n : 0;
      pml_n_max = boundaries.xMax === "PML" ? pml_n : 0;

      for (let i = 0; i < xClean.length; i++) {
        const isPML =
          (boundaries.xMin === "PML" && i < pml_n_min) ||
          (boundaries.xMax === "PML" && i >= xClean.length - pml_n_max);
        const colors = [
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
        ];

        const point2 = new BABYLON.Vector3(
          xClean[i],
          yClean[yClean.length - 1 - pml_n_max],
          zClean[zClean.length - 1 - pml_n_max]
        );
        const point1_max = new BABYLON.Vector3(
          xClean[i],
          yClean[yClean.length - 1 - pml_n_max],
          zClean[pml_n_min]
        );
        const point1_min = new BABYLON.Vector3(
          xClean[i],
          yClean[pml_n_min],
          zClean[zClean.length - 1 - pml_n_max]
        );

        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLinesSecondary",
          { points: [point1_max, point2], colors: colors },
          scene
        );
        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLinesSecondary",
          { points: [point1_min, point2], colors: colors },
          scene
        );
      }

      // Y (XZ plane)
      pml_n_min = boundaries.yMin === "PML" ? pml_n : 0;
      pml_n_max = boundaries.yMax === "PML" ? pml_n : 0;

      for (let i = 0; i < yClean.length; i++) {
        const isPML =
          (boundaries.yMin === "PML" && i < pml_n_min) ||
          (boundaries.yMax === "PML" && i >= yClean.length - pml_n_max);
        const colors = [
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
        ];

        const point2 = new BABYLON.Vector3(
          xClean[xClean.length - 1 - pml_n_max],
          yClean[i],
          zClean[zClean.length - 1 - pml_n_max]
        );
        const point1_max = new BABYLON.Vector3(
          xClean[xClean.length - 1 - pml_n_max],
          yClean[i],
          zClean[pml_n_min]
        );
        const point1_min = new BABYLON.Vector3(
          xClean[pml_n_min],
          yClean[i],
          zClean[zClean.length - 1 - pml_n_max]
        );

        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLinesSecondary",
          { points: [point1_max, point2], colors: colors },
          scene
        );
        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLinesSecondary",
          { points: [point1_min, point2], colors: colors },
          scene
        );
      }

      // Z (XY plane)
      pml_n_min = boundaries.zMin === "PML" ? pml_n : 0;
      pml_n_max = boundaries.zMax === "PML" ? pml_n : 0;

      for (let i = 0; i < zClean.length; i++) {
        const isPML =
          (boundaries.zMin === "PML" && i < pml_n_min) ||
          (boundaries.zMax === "PML" && i >= zClean.length - pml_n_max);
        const colors = [
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
        ];

        const point2 = new BABYLON.Vector3(
          xClean[xClean.length - 1 - pml_n_max],
          yClean[yClean.length - 1 - pml_n_max],
          zClean[i]
        );
        const point1_max = new BABYLON.Vector3(
          xClean[xClean.length - 1 - pml_n_max],
          yClean[pml_n_min],
          zClean[i]
        );
        const point1_min = new BABYLON.Vector3(
          xClean[pml_n_min],
          yClean[yClean.length - 1 - pml_n_max],
          zClean[i]
        );

        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLinesSecondary",
          { points: [point1_max, point2], colors: colors },
          scene
        );
        lines = BABYLON.MeshBuilder.CreateLines(
          "_meshLinesSecondary",
          { points: [point1_min, point2], colors: colors },
          scene
        );
      }

      // Hide secondary mesh lines
      scene.meshes.forEach((mesh: any) => {
        if (mesh.name === "_meshLinesSecondary") {
          mesh.visibility = 0;
        }
      });
    }
    return 0;
  };

  const handleOk = (e: any) => {
    if (applyMesh(false) === 0) setVisible(false);
  };

  let note: string = "";
  if (
    !simulationProperties.yMin.startsWith("PML") &&
    !simulationProperties.yMax.startsWith("PML")
  ) {
    note = "";
  } else if (
    simulationProperties.yMin.startsWith("PML") &&
    simulationProperties.yMax.startsWith("PML")
  ) {
    note = `*Note: the first and last ${simulationProperties.pml_n} lines will be treated as PML cells.`;
  } else if (
    simulationProperties.yMin.startsWith("PML") &&
    !simulationProperties.yMax.startsWith("PML")
  ) {
    note = `*Note: the first ${simulationProperties.pml_n} lines will be treated as PML cells.`;
  } else if (
    !simulationProperties.yMin.startsWith("PML") &&
    simulationProperties.yMax.startsWith("PML")
  ) {
    note = `*Note: the last ${simulationProperties.pml_n} lines will be treated as PML cells.`;
  } else {
    note = "";
  }

  return (
    <DraggableModal
      title={
        <div className="bg-green-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-primary-600">
          Edit XZ
        </div>
      }
      visible={visible}
      buttonsClassName="sm:px-4"
      buttons={
        <div className="flex flex-row gap-1 w-full justify-between">
          <button
            onClick={() => applyMesh(false, true)}
            className="bg-blue-300 hover:bg-blue-400 active:bg-blue-500 rounded text-center px-4 py-1 disable-drag"
          >
            Preview
          </button>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                setVisible(false);
                applyMesh(true);
              }}
              id="editxz-btn-cancel"
              className="bg-red-300 hover:bg-red-400 active:bg-red-500 rounded text-center px-4 py-1 disable-drag"
            >
              Cancel
            </button>
            <button
              onClick={handleOk}
              id="editxz-btn-ok"
              className="bg-green-300 hover:bg-green-400 active:bg-green-500 rounded text-center px-4 py-1 disable-drag"
            >
              OK
            </button>
          </div>
        </div>
      }
    >
      <form>
        <div className="mt-4 grid grid-cols-20 gap-x-6 gap-y-4">
          <div className="col-span-full">
            <label
              htmlFor="name"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Comma-separated list of mesh lines{note !== "" ? `*` : ``} for the
              XZ plane (y-axis):
            </label>
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-primary-600 disable-drag">
              <textarea
                name="XZ"
                value={XZ}
                onChange={handleChanges}
                id="XZ"
                autoComplete="off"
                rows={10}
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm max-w-full ring-1 ring-inset ring-primary-600"
              />
            </div>
            <label
              htmlFor="name"
              className="block text-sm font-medium leading-6 text-gray-400"
            >
              <i>{note}</i>
            </label>
          </div>
        </div>
      </form>
      {}
    </DraggableModal>
  );
}

export default EditXZMenu;
