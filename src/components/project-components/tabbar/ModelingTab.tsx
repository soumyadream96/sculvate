import { scene } from "../MainScene";

import React, { useEffect, useState } from "react";
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";

import TranslateMenu from "../babylonjs/ActionsBar/Transform/TranslateMenu";
import RotateMenu from "../babylonjs/ActionsBar/Transform/RotateMenu";
import ScaleMenu from "../babylonjs/ActionsBar/Transform/ScaleMenu";
import CubeMenu from "../babylonjs/ActionsBar/Create/CubeMenu";
import CylinderMenu from "../babylonjs/ActionsBar/Create/CylinderMenu";
import SphereMenu from "../babylonjs/ActionsBar/Create/SphereMenu";
import MyIcon from "assets/MyIcons";
// import { Storage } from "aws-amplify";
import { useAppSelector, useAppDispatch } from "state/hooks";
import { selectUsername } from "state/reducers/authSlice";
import { v4 as uuid } from "uuid";

import {
  modelAltered,
  selectModels,
  modelRemoved,
  selectFirstSelected,
  setFirstSelected,
  modelAdded,
} from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
// import Materials from "../babylonjs/types/materials";
import step2stl from "services/step2stl.service";
import { STLFileLoader } from "babylonjs-loaders";
import { hideMeshes, showMeshes } from "./TabUtils";
import { useParams } from "react-router-dom";
// import { CognitoUserPool } from "amazon-cognito-identity-js";
// import { read } from "fs";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectMaterials } from "state/reducers/userSlice";
import ExtrudeMenu from "../babylonjs/ActionsBar/Transform/ExtrudeMenu";

interface ModelingTabProps {
  projectId: string;
  objects: any[];
  selectedObjects: any[];
  setObjects: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedObjects: React.Dispatch<React.SetStateAction<any[]>>;
  mainScene: BABYLON.Scene | any;
}

const ModelingTab = ({
  // objects,
  // setObjects,
  // selectedObjects,
  // setSelectedObjects,
  mainScene,
}: ModelingTabProps) => {
  const username = useAppSelector(selectUsername);
  // const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [cubeMenuVisible, setCubeMenuVisible] = useState(false);
  const [sphereMenuVisible, setSphereMenuVisible] = useState(false);
  const [cylinderMenuVisible, setCylinderMenuVisible] = useState(false);
  const [lumpedPortMenuVisible, setLumpedPortMenuVisible] = useState(false);
  const [lumpedElementMenuVisible, setLumpedElementMenuVisible] =
    useState(false);
  const [distanceMenuVisible, setDistanceMenuVisible] = useState(false);
  const [translateMenuVisible, setTranslateMenuVisible] = useState(false);
  const [rotateMenuVisible, setRotateMenuVisible] = useState(false);
  const [scaleMenuVisible, setScaleMenuVisible] = useState(false);
  const [extrudeMenuVisible, setExtrudeMenuVisible] = useState(false);
  const [isUploadLoading, setIsUploadLoading] = useState(false);

  const models = useAppSelector(selectModels);
  const modelsToDraw = Object.values(models);
  const arrayModel = modelsToDraw.flat();
  const dispatch = useAppDispatch();

  const firstSelected: any = useAppSelector(selectFirstSelected);
  const materials = useAppSelector(selectMaterials);

  const { projectId } = useParams();

  const [selectedModelsLength, setSelectedModelsLength] = useState(0);
  const [selectedModelsObjectCategory, setSelectedModelsObjectCategory] =
    useState(false);

  useEffect(() => {
    hideMeshes("_meshLines", mainScene);
    hideMeshes("_meshLinesSecondary", mainScene);
    showMeshes("Distance ", mainScene);
    showMeshes("TextPlane", mainScene);
    showMeshes("_ground", mainScene);
  }, [mainScene]);

  useEffect(() => {
    let selectedModels: any[] = arrayModel.filter(
      (model: any) => model.selected && model.type !== "folder"
    );

    if (selectedModels.length > 0) {
      const objectCategory = selectedModels.every(
        (model: any) => model.category === "Objects"
      );
      setSelectedModelsObjectCategory(objectCategory);
    } else {
      setSelectedModelsObjectCategory(false);
    }

    setSelectedModelsLength(selectedModels.length);
  }, [arrayModel]);

  const showMenu = (e: any, type: string) => {
    setCubeMenuVisible(type === "cube");
    setSphereMenuVisible(type === "sphere");
    setCylinderMenuVisible(type === "cylinder");
    setLumpedPortMenuVisible(type === "lumpedPort");
    setLumpedElementMenuVisible(type === "lumpedElement");
    setDistanceMenuVisible(type === "distance");
    setTranslateMenuVisible(false);
    setRotateMenuVisible(false);
    setScaleMenuVisible(false);
    setExtrudeMenuVisible(false);

    const selectedModels = arrayModel.filter(
      (model) => model.selected && model.type !== "folder"
    );
    if (type === "translate") {
      if (selectedModels.length > 0) {
        setTranslateMenuVisible(true);
      } else {
        toast.error("Please select an object to translate.", {
          toastId: "error",
        });
      }
    } else if (type === "rotate") {
      if (selectedModels.length > 0) {
        setRotateMenuVisible(true);
      } else {
        toast.error("Please select an object to rotate.", {
          toastId: "error",
        });
      }
    } else if (type === "scale") {
      if (selectedModels.length > 0) {
        setScaleMenuVisible(true);
      } else {
        toast.error("Please select an object to scale", {
          toastId: "error",
        });
      }
    } else if (type === "extrude") {
      if (selectedModels.length > 0) {
        setExtrudeMenuVisible(true);
      } else {
        toast.error("Please select an object to extrude", {
          toastId: "error",
        });
      }
    }
    // setMenuPosition({ x: e.pageX - 100, y: e.pageY + 30 });
  };

  const getMaterial = (color: string) => {
    if (materials) {
      const material = Object.keys(materials).find(
        (material) => material === color
      );
      if (material) {
        const meshMaterial = new BABYLON.StandardMaterial(material, scene);
        meshMaterial.diffuseColor = BABYLON.Color3.FromHexString(
          materials[material].color
        );
        return meshMaterial;
      }
      const meshMaterial = new BABYLON.StandardMaterial("PEC", scene);
      meshMaterial.diffuseColor = BABYLON.Color3.FromHexString(
        materials["PEC"].color
      );
      return meshMaterial;
    }
    return null;
  };

  const handleOpenUploader = (e: any) => {
    let fileInput = document.getElementById("fileInput");
    if (fileInput) {
      fileInput.click();
    }
  };

  function loadMesh(
    fileName: string,
    url: string,
    extension: string,
    id: string
  ) {
    // let object: Item = {
    //   id: Date.now().toString(),
    //   name: fileName,
    //   type: "Objects",
    //   editable: false,
    //   icon: "mesh",
    //   visible: true,
    //   material: "PEC",
    //   category: "Objects",
    //   selected: false,
    // };

    STLFileLoader.DO_NOT_ALTER_FILE_COORDINATES = true;

    let obj = {
      id: id,
      name: fileName,
      editable: false,
      status: "Added",
      type: "mesh",
      visible: true,
      material: "PEC",
      category: "Objects",
      selected: false,
      parentId: 0,
      position: { x: 0, y: 0, z: 0 },
      scaling: { x: undefined, y: undefined, z: undefined },
      rotation: { x: 0, y: 0, z: 0 },
      origin: { x: 0, y: 0, z: 0 },
      url: url,
      extension: extension,
    };
    dispatch(modelAdded(obj));
    // BABYLON.SceneLoader.ImportMesh(
    //   "",
    //   "",
    //   url,
    //   scene,
    //   function (newMeshes) {
    //     const mesh = newMeshes[0];
    //     mesh.name = fileName;
    //     mesh.id = uuid();
    //     mesh.scaling = new BABYLON.Vector3(1, 1, 1);
    //     mesh.rotation = new BABYLON.Vector3(0, 0, 0);
    //     mesh.position = new BABYLON.Vector3(0, 0, 0);
    //     // let matrix = BABYLON.Matrix.RotationYawPitchRoll(
    //     //   0,
    //     //   (3 * Math.PI) / 2,
    //     //   0
    //     // );
    //     // (mesh as BABYLON.Mesh).bakeTransformIntoVertices(matrix);
    //     // mesh.scaling = new BABYLON.Vector3(1, 1, -1);
    //     mesh.material = getMaterial("PEC");

    //     dispatch(
    //       modelAdded({
    //         id: mesh.id,
    //         name: fileName,
    //         editable: false,
    //         type: "mesh",
    //         visible: true,
    //         material: "PEC",
    //         category: "Objects",
    //         selected: false,
    //       })
    //     );
    //   },
    //   null,
    //   null,
    //   extension
    // );
  }

  const handleUploadSTL = (e: any) => {
    let file = e.target.files[0];
    let fileName = file.name.split(".")[0];
    const ext = `.${file.name.split(".").at(-1).toLowerCase()}`;

    if (ext !== ".stl" && ext !== ".step" && ext !== ".stp") {
      toast.error(
        ext +
          " file format is not supported. Please upload a STEP or STL file.",
        {
          toastId: "error",
        }
      );
    } else if (ext === ".step" || ext === ".stp") {
      const reader = new FileReader();
      let idArray: any = [];
      let fileNames: any = [];
      let urls: any = [];
      reader.onload = function (evt) {
        if (evt.target && typeof evt.target.result === "string") {
          setIsUploadLoading(true);
          step2stl(username, projectId, evt.target.result)
            .then((response) => {
              const files = response.files;
              Object.keys(files).forEach((file) => {
                let id = uuid();
                idArray.push(id);
                fileNames.push(file.toString());
                urls.push(`data:;base64,${files[file]}`);
                loadMesh(
                  file.toString(),
                  `data:;base64,${files[file]}`,
                  ".stl",
                  id
                );
              });
              const reader1 = new FileReader();
              reader1.onload = async function () {
                await dispatch(
                  addHistory({
                    payloadData: {
                      loadSTEPMesh: {
                        fileNames: fileNames,
                        urls: urls,
                        idArray: idArray,
                      },
                    },
                    currentUsername: username,
                    projectId: projectId || "",
                  })
                );
              };
              reader1.readAsDataURL(file);
              setIsUploadLoading(false);
            })
            .catch((err) => {
              console.log(err);
              setIsUploadLoading(false);
            });
        }
      };
      reader.readAsText(file);
    } else {
      let id = uuid();
      const reader = new FileReader();
      reader.onload = async function (evt) {
        let filesrc = reader.result;
        await dispatch(
          addHistory({
            payloadData: {
              loadSTLMesh: {
                filesrc: filesrc,
                filename: fileName,
                ext: ext,
                id: id,
              },
            },
            currentUsername: username,
            projectId: projectId || "",
          })
        );
      };
      reader.readAsDataURL(file);
      const url = URL.createObjectURL(file);
      loadMesh(fileName, url, ext, id);
    }
    e.target.value = null;
  };

  const handleMerge = async (e: any) => {
    let selectedModels: any[] = arrayModel.filter(
      (model: any) => model.selected && model.type !== "folder"
    );
    if (selectedModels.length < 2) {
      toast.error("Please select at least two objects to merge.", {
        toastId: "error",
      });
      return;
    }

    if (scene) {
      const firstSelectedModel = selectedModels.find(
        (model) => model.id === firstSelected
      );
      const firstSelectedMesh = scene.getMeshById(
        firstSelected
      ) as BABYLON.Mesh;
      let finalCSG = BABYLON.CSG.FromMesh(firstSelectedMesh);

      for (let i = 0; i < selectedModels.length; i++) {
        const currentMesh = scene.getMeshById(
          selectedModels[i].id
        ) as BABYLON.Mesh;
        if (selectedModels[i].id === firstSelected) {
          currentMesh.dispose();
          dispatch(modelRemoved(currentMesh.id));
          continue;
        }

        const currentCSG = BABYLON.CSG.FromMesh(currentMesh);

        finalCSG = finalCSG.union(currentCSG);
        currentMesh.dispose();
        dispatch(modelRemoved(currentMesh.id));
      }
      var mergedMesh = finalCSG.toMesh(
        "mergedMesh",
        getMaterial(firstSelectedModel.material),
        scene,
        false
      );
      mergedMesh.id = firstSelected;

      const object1 = {
        ...firstSelectedModel,
        type: "mergedMesh",
        selected: false,
      };
      dispatch(modelAltered(object1));
      dispatch(setFirstSelected(undefined));
      await dispatch(
        addHistory({
          payloadData: {
            merge: {
              firstSelectedModel: firstSelectedModel,
              selectedModels: selectedModels,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
    }
  };

  const handleSubtract = async (e: any) => {
    let selectedModels: any[] = arrayModel.filter(
      (model: any) => model.selected && model.type !== "folder"
    );
    if (selectedModels.length !== 2) {
      toast.error("Please select two objects to subtract.", {
        toastId: "error",
      });
      return;
    }

    if (scene) {
      const firstSelectedModel = selectedModels.find(
        (model) => model.id === firstSelected
      );
      const otherSelectedModel = selectedModels.find(
        (model) => model.id !== firstSelected
      );
      const mesh1 = scene.getMeshById(firstSelected) as BABYLON.Mesh;
      const mesh2 = scene.getMeshById(otherSelectedModel.id) as BABYLON.Mesh;
      if (mesh1 && mesh2) {
        const c2cgs = BABYLON.CSG.FromMesh(mesh1);
        const subcgs = BABYLON.CSG.FromMesh(mesh2);
        const sub = c2cgs.subtract(subcgs);
        const mesh = sub.toMesh(
          "subMesh",
          getMaterial(firstSelectedModel.material),
          scene,
          false
        );
        mesh1.dispose();
        mesh2.dispose();
        mesh.id = firstSelected;
        const object2 = otherSelectedModel;
        dispatch(modelRemoved(object2.id));
        const object1 = {
          ...firstSelectedModel,
          type: "mergedMesh",
          selected: false,
        };
        dispatch(modelAltered(object1));
        dispatch(setFirstSelected(undefined));
        await dispatch(
          addHistory({
            payloadData: {
              subtract: {
                firstSelectedModel: firstSelectedModel,
                selectedModels: selectedModels,
              },
            },
            currentUsername: username,
            projectId: projectId || "",
          })
        );
      }
    }
  };

  const handleIntersect = async (e: any) => {
    let selectedModels: any[] = arrayModel.filter(
      (model: any) => model.selected && model.type !== "folder"
    );
    if (selectedModels.length !== 2) {
      toast.error("Please select two objects to intersect.", {
        toastId: "error",
      });
      return;
    }

    if (scene) {
      const firstSelectedModel = selectedModels.find(
        (model) => model.id === firstSelected
      );
      const firstSelectedMesh = scene.getMeshById(
        firstSelected
      ) as BABYLON.Mesh;
      let finalCSG = BABYLON.CSG.FromMesh(firstSelectedMesh);

      for (let i = 0; i < selectedModels.length; i++) {
        const currentMesh = scene.getMeshById(
          selectedModels[i].id
        ) as BABYLON.Mesh;
        if (selectedModels[i].id === firstSelected) {
          currentMesh.dispose();
          dispatch(modelRemoved(currentMesh.id));
          continue;
        }

        const currentCSG = BABYLON.CSG.FromMesh(currentMesh);

        finalCSG = finalCSG.intersect(currentCSG);
        currentMesh.dispose();
        dispatch(modelRemoved(currentMesh.id));
      }
      var mergedMesh = finalCSG.toMesh(
        "mergedMesh",
        getMaterial(firstSelectedModel.material),
        scene,
        false
      );
      mergedMesh.id = firstSelected;

      const object1 = {
        ...firstSelectedModel,
        type: "mergedMesh",
        selected: false,
      };
      dispatch(modelAltered(object1));
      dispatch(setFirstSelected(undefined));
      await dispatch(
        addHistory({
          payloadData: {
            intersect: {
              firstSelectedModel: firstSelectedModel,
              selectedModels: selectedModels,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
    }
  };

  const handleInsert = async (e: any) => {
    let selectedModels: any[] = arrayModel.filter(
      (model: any) => model.selected && model.type !== "folder"
    );
    if (selectedModels.length !== 2) {
      toast.error("Please select two objects to insert.", {
        toastId: "error",
      });
      return;
    }

    if (scene) {
      const firstSelectedModel = selectedModels.find(
        (model) => model.id === firstSelected
      );
      const otherSelectedModel = selectedModels.find(
        (model) => model.id !== firstSelected
      );
      const mesh1 = scene.getMeshById(firstSelected) as BABYLON.Mesh;
      const mesh2 = scene.getMeshById(otherSelectedModel.id) as BABYLON.Mesh;

      if (mesh1 && mesh2) {
        const mesh1CSG = BABYLON.CSG.FromMesh(mesh1);
        const mesh2CSG = BABYLON.CSG.FromMesh(mesh2);
        let resultCSG = mesh1CSG.subtract(mesh2CSG);

        mesh1.dispose();
        const resultMesh = resultCSG.toMesh(
          "modifiedMesh1",
          getMaterial(firstSelectedModel.material),
          scene,
          false
        );
        resultMesh.id = firstSelected;

        for (let model of selectedModels) {
          if (model.id !== firstSelected) {
            dispatch(modelAltered({ ...model, selected: false }));
          }
        }

        const object1 = {
          ...firstSelectedModel,
          type: "mergedMesh",
          selected: false,
        };
        dispatch(modelAltered(object1));
        dispatch(setFirstSelected(undefined));
        await dispatch(
          addHistory({
            payloadData: {
              insert: {
                firstSelectedModel: firstSelectedModel,
                selectedModels: selectedModels,
              },
            },
            currentUsername: username,
            projectId: projectId || "",
          })
        );
      }
    }
  };

  return (
    <div>
      <div className="font-inter flex items-center justify-center mx-auto max-w-fit w-fit gap-3 p-3 min-[1540px]:p-0">
        {/* Upload STL */}
        <div className="text-center">
          <button
            onClick={handleOpenUploader}
            className={`relative text-[#344054] my-auto enabled:shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] text-sm flex items-center justify-center rounded-md focus:outline-none w-max min-[1540px]:w-auto
            ${
              !isUploadLoading
                ? "bg-[#EEF4FF] hover:bg-[#D3E2EF] active:bg-[#B1C7DE]"
                : "bg-[#CCD2E6]"
            }`}
            disabled={isUploadLoading}
            style={{ whiteSpace: "nowrap" }}
          >
            <div
              className={`absolute inset-0 flex items-center justify-center ${
                isUploadLoading ? "block" : "hidden"
              }`}
            >
              <svg
                aria-hidden="true"
                className="w-6 h-6 animate-spin dark:text-gray-600 fill-gray-200 inline"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
            </div>
            <div
              className={`absolute inset-0 flex items-center justify-center ${
                isUploadLoading ? "hidden" : "block"
              }`}
            >
              <MyIcon name="file-upload" />
              <input
                type="file"
                id="fileInput"
                accept=".stl,.step,.stp"
                multiple={false}
                onChange={handleUploadSTL}
                className="absolute w-full h-full hidden z-10"
              />
              Upload STEP/STL
            </div>
            <div className="flex items-center justify-center opacity-0">
              <MyIcon name="file-upload" />
              Upload STEP/STL
            </div>
          </button>
          <p className="mt-1.5 text-sm font-normal text-[#475467]">
            Import CAD
          </p>
        </div>

        {/* Create */}
        <div className="text-center">
          <div className="flex w-max min-[1540px]:w-auto">
            {/* Cube Button */}
            <button
              onClick={(e) => {
                showMenu(e, "cube");
              }}
              className="text-[#344054] my-auto shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] bg-[#F3FEE7] hover:bg-[#E2EFD4] active:bg-[#BFCDB0] text-sm flex items-center justify-center rounded-bl-md rounded-tl-md focus:outline-none"
            >
              <MyIcon name="cube" />
              Cube
            </button>

            {/* Sphere Button */}
            <button
              onClick={(e) => {
                showMenu(e, "sphere");
              }}
              className="text-[#344054] my-auto shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] bg-[#F3FEE7] hover:bg-[#E2EFD4] active:bg-[#BFCDB0] text-sm flex items-center justify-center focus:outline-none border-l-0"
            >
              <MyIcon name="sphere" />
              Sphere
            </button>

            {/* Cylinder Button */}
            <button
              onClick={(e) => {
                showMenu(e, "cylinder");
              }}
              className="text-[#344054] my-auto shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] bg-[#F3FEE7] hover:bg-[#E2EFD4] active:bg-[#BFCDB0] text-sm flex items-center justify-center rounded-tr-md rounded-br-md focus:outline-none border-l-0"
            >
              <MyIcon name="cylinder" />
              Cylinder
            </button>
          </div>
          <p className="mt-1.5 text-sm font-normal text-[#475467]">
            Create shape
          </p>
        </div>

        {/* Transform */}
        <div className="text-center">
          <div className="flex w-max min-[1540px]:w-auto">
            <button
              onClick={(e) => {
                showMenu(e, "translate");
              }}
              disabled={
                selectedModelsLength === 0 || !selectedModelsObjectCategory
              }
              className={`text-[#344054] my-auto enabled:shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] text-sm flex items-center justify-center rounded-bl-md rounded-tl-md focus:outline-none bg-rose-50 enabled:hover:bg-[#EDD0D4] enabled:active:bg-[#E0AFB5] disabled:opacity-50`}
            >
              <MyIcon name="translate" />
              Translate
            </button>
            <button
              onClick={(e) => {
                showMenu(e, "rotate");
              }}
              disabled={
                selectedModelsLength === 0 || !selectedModelsObjectCategory
              }
              className={`text-[#344054] my-auto enabled:shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] text-sm flex items-center justify-center focus:outline-none border-l-0 bg-rose-50 enabled:hover:bg-[#EDD0D4] enabled:active:bg-[#E0AFB5] disabled:opacity-50`}
            >
              <MyIcon name="rotate" />
              Rotate
            </button>
            <button
              onClick={(e) => {
                showMenu(e, "scale");
              }}
              disabled={
                selectedModelsLength === 0 || !selectedModelsObjectCategory
              }
              className={`text-[#344054] my-auto enabled:shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] text-sm flex items-center justify-center focus:outline-none border-l-0 rounded-tr-md rounded-br-md bg-rose-50 enabled:hover:bg-[#EDD0D4] enabled:active:bg-[#E0AFB5] disabled:opacity-50`}
            >
              <MyIcon name="scale" />
              Scale
            </button>
            <button
              onClick={(e) => {
                showMenu(e, "extrude");
              }}
              disabled={
                selectedModelsLength === 0 || !selectedModelsObjectCategory
              }
              className={`text-[#344054] my-auto enabled:shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] text-sm flex items-center justify-center focus:outline-none border-l-0 rounded-tr-md rounded-br-md bg-rose-50 enabled:hover:bg-[#EDD0D4] enabled:active:bg-[#E0AFB5] disabled:opacity-50`}
            >
              <MyIcon name="extrude" />
              Extrude
            </button>
          </div>
          <p
            className={`mt-1.5 text-sm font-normal text-[#475467]
            ${selectedModelsLength === 0 ? "opacity-50" : ""}
            `}
          >
            Tools
          </p>
        </div>

        {/* Operate */}
        <div className="text-center">
          <div className="flex w-max min-[1540px]:w-auto">
            <button
              onClick={handleMerge}
              disabled={
                selectedModelsLength < 2 || !selectedModelsObjectCategory
              }
              className={`text-[#344054] my-auto enabled:shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] text-sm flex items-center justify-center rounded-bl-md rounded-tl-md focus:outline-none bg-yellow-50 enabled:hover:bg-[#E3E2C3] enabled:active:bg-[#C8C9A8] disabled:opacity-50`}
            >
              <MyIcon name="merge" />
              Merge
            </button>
            <button
              onClick={handleSubtract}
              disabled={
                selectedModelsLength !== 2 || !selectedModelsObjectCategory
              }
              className={`text-[#344054] my-auto enabled:shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] text-sm flex items-center justify-center focus:outline-none border-l-0  bg-yellow-50 enabled:hover:bg-[#E3E2C3] enabled:active:bg-[#C8C9A8] disabled:opacity-50`}
            >
              <MyIcon name="subtract" />
              Subtract
            </button>
            <button
              onClick={handleIntersect}
              disabled={
                selectedModelsLength !== 2 || !selectedModelsObjectCategory
              }
              className={`text-[#344054] my-auto enabled:shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] text-sm flex items-center justify-center focus:outline-none border-l-0  bg-yellow-50 enabled:hover:bg-[#E3E2C3] enabled:active:bg-[#C8C9A8] disabled:opacity-50`}
            >
              <MyIcon name="intersect" />
              Intersect
            </button>
            <button
              onClick={handleInsert}
              disabled={
                selectedModelsLength !== 2 || !selectedModelsObjectCategory
              }
              className={`text-[#344054] my-auto enabled:shadow-sm px-3 py-1.5 font-medium border border-[#D0D5DD] text-sm flex items-center justify-center rounded-tr-md rounded-br-md focus:outline-none border-l-0  bg-yellow-50 enabled:hover:bg-[#E3E2C3] enabled:active:bg-[#C8C9A8] disabled:opacity-50`}
            >
              <MyIcon name="insert" />
              Insert
            </button>
          </div>
          <p
            className={`mt-1.5 text-sm font-normal text-[#475467]
            ${selectedModelsLength <= 1 ? "opacity-50" : ""}
            `}
          >
            Boolean operations
          </p>
        </div>
      </div>
      <CubeMenu
        visible={cubeMenuVisible}
        setVisible={(value: boolean) => setCubeMenuVisible(value)}
      />
      <SphereMenu
        visible={sphereMenuVisible}
        setVisible={(value: boolean) => setSphereMenuVisible(value)}
      />
      <CylinderMenu
        visible={cylinderMenuVisible}
        setVisible={(value: boolean) => setCylinderMenuVisible(value)}
      />
      <TranslateMenu
        visible={translateMenuVisible}
        setVisible={(value: boolean) => setTranslateMenuVisible(value)}
        mainScene={scene}
      />
      <ExtrudeMenu
        visible={extrudeMenuVisible}
        setVisible={(value: boolean) => setExtrudeMenuVisible(value)}
        mainScene={scene}
      />
      <RotateMenu
        visible={rotateMenuVisible}
        setVisible={(value: boolean) => setRotateMenuVisible(value)}
        mainScene={scene}
      />
      <ScaleMenu
        visible={scaleMenuVisible}
        setVisible={(value: boolean) => setScaleMenuVisible(value)}
        mainScene={scene}
      />
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        pauseOnHover
        theme="colored"
      />
    </div>
  );
};

export default ModelingTab;
