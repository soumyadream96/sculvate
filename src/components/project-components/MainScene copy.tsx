import React, { useState, useEffect, useRef, useContext } from "react";
import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import { GridMaterial } from "babylonjs-materials";
import "./MainScene.css";
import { selectUsername } from "state/reducers/authSlice";
import { Storage } from "aws-amplify";

import {
  setFirstSelected,
  selectModels,
  modelCompleted,
  modelRemovedFromScene,
  modelAltered,
  modelAdded,
  modelSaved,
  modelRemoved,
  selectSavedModels,
} from "state/reducers/modelSlice";

import { STLFileLoader } from "babylonjs-loaders";
import { createBabylonScene } from "./babylonjs/Scenes/BabylonScene";
import { createAxisViewScene } from "./babylonjs/Scenes/AxisViewScene";
import { useAppDispatch, useAppSelector } from "state/hooks";
import Materials from "./babylonjs/types/materials";
import ParametersBar from "./ParametersBar";
import FooterBar from "./FooterBar";
import {
  addParameter,
  deleteParameter,
  editParameter,
  selectParameters,
} from "state/reducers/parametersSlice";
import { addHistory } from "state/reducers/historySlice";
import { calculate, replaceParametersToIds, replaceIdsToParameters, wait } from "utilities";
import { selectTab } from "state/reducers/selectedTabSlice";
import {
  isSceneClickable,
  setSceneClickable,
  setPickedPos,
} from "state/reducers/sceneSlice";
import { getVertices } from "utilities";
import { resourceLimits } from "worker_threads";
import step2stl from "services/step2stl.service";
import { v4 as uuid } from "uuid";
import { useParams } from "react-router-dom";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
import ContextMenu from "./babylonjs/ObjectComponent/ContextMenu";
import LumpedPortMenu from "./babylonjs/ActionsBar/Create/LumpedPortMenu";
import CylinderMenu from "./babylonjs/ActionsBar/Create/CylinderMenu";
import SphereMenu from "./babylonjs/ActionsBar/Create/SphereMenu";
import CubeMenu from "./babylonjs/ActionsBar/Create/CubeMenu";
import LumpedElementMenu from "./babylonjs/ActionsBar/Create/LumpedElementMenu";
import DistanceMenu from "./babylonjs/ActionsBar/Create/DistanceMenu";
import CreateMaterialMenu from "./babylonjs/ActionsBar/Create/CreateMaterialMenu";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectMaterials, setMaterials } from "state/reducers/userSlice";
import defaultMaterials from "materials.json";
import { ActiveContextMenuContext } from "../../contexts";
import { selectRefresh, setRefresh } from "state/reducers/refreshSlice";

const stringMath = require("string-math");
let scene: BABYLON.Scene;

interface MainSceneProps {
  getScene: Function;
  setObjects: React.Dispatch<React.SetStateAction<any[]>>;
  objects: any[];
}

function MainScene({ getScene, setObjects, objects }: MainSceneProps) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement>();
  const [engine, setEngine] = useState<BABYLON.Engine>();
  const [mainScene, setMainScene] = useState<BABYLON.Scene>();
  const [axisViewScene, setAxisViewScene] = useState<BABYLON.Scene>();
  const [loadedIndex, setLoadedIndex] = useState(-1);
  const [jsonArray, setJsonArray] = useState([]);
  const [loadedParameterIndex, setLoadedParameterIndex] = useState(-1);
  const [parametersArray, setParametersArray] = useState<any>([]);
  const [meshPosition, setMeshPosition] = useState({ x: 0, y: 0, z: 0 });
  const [meshAbsolutePosition, setMeshAbsolutePosition] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  const [previousCamPostion, setPreviousCamPosition] =
    useState<BABYLON.Vector3>(BABYLON.Vector3.Zero());
  const { activeContextMenu, contextMenuLocation, setActiveContextMenu } =
    useContext(ActiveContextMenuContext) as any;

  const [modelMeshes, setModelMeshes] = useState<any[]>([]);
  const [isResettingCamera, setIsResettingCamera] = useState(false);

  var cam: any = undefined;

  const simulationProperties = useAppSelector(selectSimulationProperties);
  const materials = useAppSelector(selectMaterials);
  const [isCameraPanning, setIsCameraPanning] = useState(false);

  if (mainScene) {
    scene = mainScene;
  }

  const dispatch = useAppDispatch();
  const refresh = useAppSelector(selectRefresh);
  const username = useAppSelector(selectUsername);
  const { projectId } = useParams();
  var sceneClickable = useAppSelector(isSceneClickable);

  var sphere: any;
  var offset = 1.5;

  const fetchData = async () => {
    const data = await Storage.get(`${username}/materials.json`, {
      download: true,
      cacheControl: "no-cache",
    });
    const dataBody: any = data.Body;
    const dataString = await dataBody.text();
    const json = JSON.parse(dataString);

    dispatch(setMaterials(json || defaultMaterials));
  };

  useEffect(() => {
    dispatch(setMaterials(defaultMaterials));

    fetchData();
  }, [username]);

  const removeModels = async () => {
    for (let i = 0; i < models.length; i++) {
      await dispatch(modelRemoved(models[i].id));
    }
  };

  const removeParameters = async () => {
    for (let i = 0; i < parameters.length; i++) {
      await dispatch(deleteParameter(parameters[i].id));
    }
  };

  useEffect(() => {
    removeModels();
    removeParameters();
    setLoadedIndex(-1);
    setLoadedParameterIndex(-1);
    fetchJson();
  }, [refresh]);

  const models = useAppSelector(selectModels);
  const parameters = useAppSelector(selectParameters);
  const tabIndex = useAppSelector(selectTab);

  useEffect(() => {
    setCanvas(document.querySelectorAll("canvas")[0]);
  }, []);

  useEffect(() => {
    if (canvas) {
      canvas.style.background = "rgb(185, 190, 205)";
      canvas.style.background =
        "linear-gradient(180deg, rgb(185, 190, 205) 0%, rgba(255, 255, 255) 100%)";

      if (mainScene) {
        if (mainScene.activeCamera) {
          let camera = mainScene.activeCamera as BABYLON.ArcRotateCamera;
          // Adapt camera clipping settings to zoom level
          canvas.addEventListener("wheel", (e) => {
            if (camera.mode === BABYLON.Camera.PERSPECTIVE_CAMERA) {
              camera.minZ = camera.radius ** 1.5 / 10000;
              camera.maxZ = camera.radius ** 5;
            } else {
              camera.minZ = 0.4;
              camera.maxZ = 10000;
            }
          });

          canvas.addEventListener("keypress", (e) => {
            if (e.key === "0") {
              // Reset view
              resetCamera();
            } else if (e.key === "1") {
              // Nearest plane
              camera.alpha =
                Math.round(camera.alpha / (Math.PI / 2)) * (Math.PI / 2);
              camera.beta =
                Math.round(camera.beta / (Math.PI / 2)) * (Math.PI / 2);
            } else if (e.key === "2") {
              // Bottom view
              camera.alpha = 0;
              camera.beta = Math.PI;
            } else if (e.key === "3") {
              // Back view
              camera.alpha = -Math.PI / 2;
              camera.beta = Math.PI / 2;
            } else if (e.key === "4") {
              // Left view
              camera.alpha = -Math.PI;
              camera.beta = Math.PI / 2;
            } else if (e.key === "5") {
              // Front view
              camera.alpha = Math.PI / 2;
              camera.beta = Math.PI / 2;
            } else if (e.key === "6") {
              // Right view
              camera.alpha = 0;
              camera.beta = Math.PI / 2;
            } else if (e.key === "8") {
              // Top view
              camera.alpha = 0;
              camera.beta = 0.0000001;
            }
          });
        }
      }

      if (!engine) {
        const originalLog = console.log;
        console.log = () => { };
        setEngine(
          new BABYLON.Engine(canvas, true, {
            disableWebGL2Support: false,
            preserveDrawingBuffer: false,
          })
        );
        console.log = originalLog;
      }
    }
  }, [canvas, mainScene, modelMeshes]);

  var [flag, setFlag] = useState(false);

  const handleResize = () => {
    if (
      document.getElementById("sidebar-container")?.clientWidth &&
      canvas &&
      !flag
    ) {
      let parameterBarHeight: any =
        document.getElementsByClassName("parameters-bar")[0]?.clientHeight || 0;
      let navHeight: any =
        document.getElementsByTagName("nav")[0]?.clientHeight;
      let tabHeight: any =
        document.getElementsByClassName("tab-bar")[0]?.clientHeight;
      const footerBarHeight =
        document.getElementsByClassName("footer-bar")[0]?.clientHeight;
      const canvasRenderer = document.getElementById("renderCanvas");

      let height =
        window.innerHeight -
        parameterBarHeight -
        navHeight -
        tabHeight -
        (footerBarHeight || 0) -
        10;

      if (!parameterBarHeight && !footerBarHeight) return;

      if (canvasRenderer?.style) {
        canvasRenderer.style.height = `${height}px`;
        canvasRenderer.style.maxHeight = `${height}px`;
      }

      engine?.resize(true);
    }
  };

  useEffect(() => {
    handleResize();
  }, [
    canvas?.width,
    engine,
    flag,
    tabIndex,
    document.getElementById("sidebar-container"),
    document.getElementsByClassName("parameters-bar")[0]?.clientHeight,
    document.getElementsByClassName("footer-bar")[0]?.clientHeight,
  ]);

  useEffect(() => {
    if (canvas && engine) {
      engine.disablePerformanceMonitorInBackground = true;
      engine.enableOfflineSupport = false;
      engine.doNotHandleContextLost = false;
      engine.loadingUIBackgroundColor = "#000000e1";

      setMainScene(createBabylonScene(canvas, engine));
      setAxisViewScene(createAxisViewScene(canvas, engine));
    }
  }, [engine, canvas]);

  const makeClickResponse = (mesh: any) => {
    mesh.actionManager = new BABYLON.ActionManager(mainScene);
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOverTrigger,
        function (m) {
          if (m.meshUnderPointer?.material)
            m.meshUnderPointer.material.alpha = 1;
        }
      )
    );

    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOutTrigger,
        function (m) {
          if (m.meshUnderPointer?.material)
            m.meshUnderPointer.material.alpha = 0;
        }
      )
    );
  };

  var createFacePoints = function () {
    var mat = new BABYLON.StandardMaterial("material", mainScene);
    mat.emissiveColor = new BABYLON.Color3(1, 0, 0);
    mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    mat.alpha = 1;

    sphere = BABYLON.MeshBuilder.CreateSphere(
      "_spherePoint",
      { diameter: offset, segments: 16 },
      mainScene
    );
    sphere.material = mat;
    makeClickResponse(sphere);
  };

  var removeFacePoints = function () {
    mainScene?.meshes.forEach(function (mesh) {
      if (mesh.name === "_spherePoint") {
        if (mesh.parent) {
          mesh.parent = null;
        }
        mesh.dispose();
      }
    });
  };

  useEffect(() => {
    const handleDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      if (mainScene && !sceneClickable) {
        let ray = mainScene.createPickingRay(
          mainScene.pointerX,
          mainScene.pointerY,
          null,
          mainScene.activeCamera
        );

        // let meshes: any = mainScene.multiPickWithRay(ray);
        let result: any = mainScene.pickWithRay(ray);

        const model = models.find((m) => m.id === result?.pickedMesh?.id);

        if (model && model.visible) {
          const selectedModel = {
            ...model,
            status: "Altered",
            selected: true,
          };
          dispatch(modelAltered(selectedModel));
          dispatch(setFirstSelected(result?.pickedMesh?.id));
        }

        if (!event.ctrlKey && !event.metaKey) {
          const updatedModels = models
            .filter((m) => m.id !== model?.id)
            .map((m) => ({
              ...m,
              status: "Altered",
              selected: false,
            }));
          updatedModels.forEach((m) => dispatch(modelAltered(m)));
        }
      }
    };

    if (canvas && mainScene) {
      canvas.addEventListener("dblclick", handleDoubleClick);
      return () => {
        canvas.removeEventListener("dblclick", handleDoubleClick);
      };
    }
  }, [canvas, mainScene, models, sceneClickable]);

  useEffect(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    // Loop through all meshes in the scene and find the min/max
    mainScene?.meshes.forEach((mesh) => {
      if (
        mesh.id !== "_ground" &&
        mesh.id !== "_meshLines" &&
        mesh.id !== "_meshLinesSecondary"
      ) {
        let boundingInfo = mesh.getBoundingInfo();
        let boundingBox = boundingInfo.boundingBox;
        let boundingBoxVertices = boundingBox.vectorsWorld;

        // Loop through the bounding box vertices and find the min/max
        boundingBoxVertices.forEach((vertex) => {
          if (vertex.x < minX) minX = vertex.x;
          if (vertex.x > maxX) maxX = vertex.x;
          if (vertex.y < minY) minY = vertex.y;
          if (vertex.y > maxY) maxY = vertex.y;
          if (vertex.z < minZ) minZ = vertex.z;
          if (vertex.z > maxZ) maxZ = vertex.z;
        });
      }
    });

    let ground = mainScene?.getMeshById("_ground");
    if (
      ground &&
      minX !== Infinity &&
      maxX !== -Infinity &&
      minY !== Infinity &&
      maxY !== -Infinity &&
      minZ !== Infinity &&
      maxZ !== -Infinity
    ) {
      if (mainScene && mainScene.meshes.length > 1) {
        ground.position.x = (minX + maxX) / 2;
        ground.position.y = (minY + maxY) / 2;
        ground.position.z = (minZ + maxZ) / 2;

        let scaling =
          0.03 *
          Math.max(
            Math.abs(maxX - minX),
            Math.abs(maxY - minY),
            Math.abs(maxZ - minZ)
          );

        ground.scaling.x = scaling;
        ground.scaling.z = scaling;
      } else {
        ground.position.x = 0;
        ground.position.y = 0;
        ground.position.z = 0;

        ground.scaling.x = 100;
        ground.scaling.z = 100;
      }
    }
  }, [models]);

  useEffect(() => {
    if (canvas && engine && mainScene) {
      getScene(mainScene);
      let groundMaterial = new GridMaterial("groundMaterial", mainScene);
      groundMaterial.majorUnitFrequency = 5;
      groundMaterial.minorUnitVisibility = 0.5;
      groundMaterial.gridRatio = 2;
      groundMaterial.opacity = 0.99;
      groundMaterial.useMaxLine = true;
      groundMaterial.lineColor = new BABYLON.Color3(
        135 / 255,
        135 / 255,
        135 / 255
      );
      groundMaterial.backFaceCulling = false;
      let ground = BABYLON.MeshBuilder.CreateGround(
        "_ground",
        { width: 100, height: 100, updatable: false },
        mainScene
      );

      // Rotate ground to the XY plane
      ground.rotation.x = Math.PI / 2;
      ground.isPickable = false;

      ground.material = groundMaterial;
      ground.material.zOffset = 10;
      mainScene.render();
    }
    //eslint-disable-next-line
  }, [canvas, engine, mainScene]);

  const euclideanDistance3D = (pos1: any, pos2: any) => {
    if (pos2 == undefined) {
      return 1e9;
    }

    let dx = pos2.x - pos1.x;
    let dy = pos2.y - pos1.y;
    let dz = pos2.z - pos1.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  useEffect(() => {
    if (mainScene) {
      if (sceneClickable) createFacePoints();
      else removeFacePoints();
      canvas?.addEventListener("pointermove", (e) => {
        e.preventDefault();
        if (models.length == 0) return;
        if (sceneClickable == false) return;

        sphere.isVisible = false;

        var vertInfo;

        var result = mainScene?.pick(mainScene.pointerX, mainScene.pointerY);
        if (
          result?.hit &&
          result.pickedMesh?.id !== "_spherePoint" &&
          result.pickedMesh?.id !== "_meshLines" &&
          result.pickedMesh?.id !== "_meshLinesSecondary"
        ) {
          vertInfo = getVertices(result.pickedMesh);
          if (vertInfo && result.pickedPoint) {
            let closestVertex;
            let closestDistance = Infinity;
            for (var i = 0; i < vertInfo.global.length; i++) {
              let dist = euclideanDistance3D(
                result.pickedPoint,
                vertInfo.global[i]
              );
              if (dist < closestDistance) {
                closestDistance = dist;
                closestVertex = vertInfo.global[i];
              }
            }
            if (closestVertex) {
              if (sphere) {
                let modifiedVertex = new BABYLON.Vector3(
                  closestVertex.x + 1,
                  closestVertex.y + 1,
                  closestVertex.z + 1
                );

                // Handle potential null case for activeCamera
                if (mainScene.activeCamera) {
                  // Create immutable vectors for the distance calculation
                  let cameraPos = new BABYLON.Vector3(
                    mainScene.activeCamera.position.x,
                    mainScene.activeCamera.position.y,
                    mainScene.activeCamera.position.z
                  );
                  let vertexPos = new BABYLON.Vector3(
                    closestVertex.x,
                    closestVertex.y,
                    closestVertex.z
                  );

                  // Get the distance between the camera and the sphere
                  let cameraDistance = BABYLON.Vector3.Distance(
                    cameraPos,
                    vertexPos
                  );

                  // Decide on a factor to scale the sphere by - you can adjust this to fit your needs
                  let scaleFactor = cameraDistance / 100;

                  sphere.scaling = new BABYLON.Vector3(
                    euclideanDistance3D(closestVertex, modifiedVertex) *
                    scaleFactor,
                    euclideanDistance3D(closestVertex, modifiedVertex) *
                    scaleFactor,
                    euclideanDistance3D(closestVertex, modifiedVertex) *
                    scaleFactor
                  );

                  sphere.isVisible = true;
                  sphere.position = closestVertex;
                }
              }
            }
          }
        }
      });

      canvas?.addEventListener("dblclick", (event) => {
        event.preventDefault();
        if (sceneClickable && mainScene) {
          let ray = mainScene?.createPickingRay(
            mainScene.pointerX,
            mainScene.pointerY,
            null,
            mainScene.activeCamera
          );

          if (sphere?.isVisible) {
            dispatch(
              setPickedPos({
                x: sphere.position._x,
                y: sphere.position._y,
                z: sphere.position._z,
              })
            );
            return;
          }
        }
      });
      mainScene?.render();
    }
  }, [sceneClickable]);

  async function loadMesh(
    fileName: string,
    url: string,
    extension: string,
    id: string
  ) {
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
      parentId: 0,
      selected: false,
      position: { x: 0, y: 0, z: 0 },
      scaling: { x: undefined, y: undefined, z: undefined },
      rotation: { x: 0, y: 0, z: 0 },
      origin: { x: 0, y: 0, z: 0 },
      url: url,
      extension: extension,
    };
    await dispatch(modelAdded(obj));
  }

  const dataURLtoFile = (dataurl: any, filename: any) => {
    var arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[arr.length - 1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const loadSTEPMesh = (obj: any) => {
    for (let i = 0; i < obj.idArray.length; i++) {
      loadMesh(obj.fileNames[i], obj.urls[i], ".stl", obj.idArray[i]);
    }
  };

  useEffect(() => {
    if (parametersArray == undefined || parametersArray.length == 0) {
      if (jsonArray == undefined) return;
      if (jsonArray.length > 0 && materials) {
        if (loadedIndex < 0) {
          setLoadedIndex(0);
        }
      }
      return;
    }
    if (jsonArray == undefined || jsonArray.length == 0) return;
    if (parametersArray.length > 0) {
      if (loadedParameterIndex < 0) setLoadedParameterIndex(0);
    }
  }, [jsonArray, parametersArray, materials]);

  useEffect(() => {
    if (loadedParameterIndex < 0) return;
    if (loadedParameterIndex === parametersArray.length) {
      if (jsonArray == undefined) return;
      if (jsonArray.length > 0 && materials) {
        if (loadedIndex < 0) {
          setLoadedIndex(0);
        }
      }
      return;
    }

    if (parametersArray) {
      const fetchParameter = async () => {
        let mdl = {
          id: parametersArray[loadedParameterIndex].id,
          name: parametersArray[loadedParameterIndex].name,
          expression: parametersArray[loadedParameterIndex].expression,
          value: stringMath(parametersArray[loadedParameterIndex].expression),
          description: parametersArray[loadedParameterIndex].description,
        };
        await dispatch(addParameter(mdl));
        setLoadedParameterIndex(loadedParameterIndex + 1);
      };
      fetchParameter();
    }
  }, [loadedParameterIndex]);

  useEffect(() => {
    if (loadedIndex < 0) return;
    if (loadedIndex === jsonArray.length) {
      const modelMeshes: any[] = [];
      models.forEach((model) => {
        const mesh = mainScene?.getMeshById(model.id);
        if (mesh && mesh !== null) {
          modelMeshes.push(mesh);
        }
      });
      setModelMeshes(modelMeshes);
    }
  }, [models, loadedIndex, jsonArray]);

  useEffect(() => {
    console.log(modelMeshes.length, isResettingCamera);
    if (isResettingCamera && modelMeshes.length > 0) {
      resetCamera();
      setIsResettingCamera(false);
    }
  }, [isResettingCamera]);

  const resetCamera = () => {
    if (modelMeshes.length > 0) {
      let boundingInfo = new BABYLON.BoundingInfo(
        BABYLON.Vector3.Zero(),
        BABYLON.Vector3.Zero()
      );
      let maxDim = 0;
      let minBounding =
        modelMeshes[0].getBoundingInfo().boundingBox.minimumWorld;
      let maxBounding =
        modelMeshes[0].getBoundingInfo().boundingBox.maximumWorld;
      if (modelMeshes.length > 1) {
        modelMeshes.slice(1).forEach((mesh: any) => {
          const minBound = mesh.getBoundingInfo().boundingBox.minimumWorld;
          const maxBound = mesh.getBoundingInfo().boundingBox.maximumWorld;
          minBounding.minimizeInPlace(minBound);
          maxBounding.maximizeInPlace(maxBound);
        });
      }
      boundingInfo = new BABYLON.BoundingInfo(minBounding, maxBounding);
      const xDim =
        boundingInfo.boundingBox.maximumWorld.x -
        boundingInfo.boundingBox.minimumWorld.x;
      const yDim =
        boundingInfo.boundingBox.maximumWorld.y -
        boundingInfo.boundingBox.minimumWorld.y;
      const zDim =
        boundingInfo.boundingBox.maximumWorld.z -
        boundingInfo.boundingBox.minimumWorld.z;
      maxDim = Math.max(xDim, yDim, zDim);
      const camera = mainScene?.activeCamera as BABYLON.ArcRotateCamera;
      camera.target = new BABYLON.Vector3(
        (boundingInfo.boundingBox.minimumWorld.x +
          boundingInfo.boundingBox.maximumWorld.x) /
        2,
        (boundingInfo.boundingBox.minimumWorld.y +
          boundingInfo.boundingBox.maximumWorld.y) /
        2,
        (boundingInfo.boundingBox.minimumWorld.z +
          boundingInfo.boundingBox.maximumWorld.z) /
        2
      );
      camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
      camera.radius = maxDim * 1.5;
      camera.alpha = Math.PI / 3.5;
      camera.beta = Math.PI / 2.7;
      setIsResettingCamera(false);
    }
  };

  useEffect(() => {
    if (loadedIndex < 0) return;
    if (jsonArray == undefined) return;
    if (loadedIndex === jsonArray.length) {
      models.forEach((model: any) => {
        if (model.selected === true) {
          let obj: any = {};
          if (model.selected) {
            Object.assign(obj, model);
            obj.selected = false;
            obj.status = "Updated";
            dispatch(modelAltered(obj));
          }
        }
      });
      setIsResettingCamera(true);
      return;
    }
    console.log(parameters);
    console.log(jsonArray)
    if (jsonArray && materials) {
      const fetchMesh = async () => {
        let obj: any =
          jsonArray[loadedIndex][Object.keys(jsonArray[loadedIndex])[0]];
        let key = Object.keys(jsonArray[loadedIndex])[0];
        let mdl: any = {};
        let model: any;
        let mesh: any;

        if (!materials) return;
        switch (key) {
          case "create_cube":
          case "edit_cube":
            console.log(obj);
            mdl = {
              id: obj.id,
              name: obj.name,
              type: "cube",
              object: {
                name: obj.name,
                xMin: obj.xMin,
                xMax: obj.xMax,
                yMin: obj.yMin,
                yMax: obj.yMax,
                zMin: obj.zMin,
                zMax: obj.zMax,
              },
              material: obj.material,
              status: key === "create_cube" ? "Added" : "Updated",
              category: "Objects",
              visible: true,
              selected: false,
              parentId: obj.parentId,
              position: {
                x:
                  (parseFloat(calculate(obj.xMax, parameters).toString()) +
                    parseFloat(calculate(obj.xMin, parameters).toString())) /
                  2,
                y:
                  (parseFloat(calculate(obj.yMax, parameters).toString()) +
                    parseFloat(calculate(obj.yMin, parameters).toString())) /
                  2,
                z:
                  (parseFloat(calculate(obj.zMax, parameters).toString()) +
                    parseFloat(calculate(obj.zMin, parameters).toString())) /
                  2,
              },
              rotation: {
                x: 0,
                y: 0,
                z: 0,
              },
              scaling: {
                x: undefined,
                y: undefined,
                z: undefined,
              },
            };
            if (key === "create_cube") await dispatch(modelAdded(mdl));
            else if (key === "edit_cube") await dispatch(modelAltered(mdl));
            break;

          case "create_sphere":
          case "edit_sphere":
            mdl = {
              id: obj.id,
              name: obj.name,
              type: "sphere",
              object: {
                name: obj.name,
                diameter: obj.diameter,
                diameterX: obj.diameterX,
                diameterY: obj.diameterY,
                diameterZ: obj.diameterZ,
                segments: obj.segments,
              },
              status: key === "create_sphere" ? "Added" : "Updated",
              category: "Objects",
              visible: true,
              parentId: obj.parentId,
              material: obj.material,
              position: {
                x: 0,
                y: 0,
                z: 0,
              },
              rotation: {
                x: 0,
                y: 0,
                z: 0,
              },
              scaling: {
                x: undefined,
                y: undefined,
                z: undefined,
              },
            };
            if (key === "create_sphere") await dispatch(modelAdded(mdl));
            else await dispatch(modelAltered(mdl));
            break;

          case "create_cylinder":
          case "edit_cylinder":
            mdl = {
              id: obj.id,
              name: obj.name,
              type: "cylinder",
              object: {
                diameter: obj.diameter,
                topDiameter: obj.topDiameter,
                bottomDiameter: obj.bottomDiameter,
                height: obj.height,
                tessellation: obj.tessellation,
                subdivisions: obj.subdivisions,
              },
              status: key === "create_cylinder" ? "Added" : "Updated",
              category: "Objects",
              parentId: obj.parentId,
              visible: true,
              selected: false,
              material: obj.material,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scaling: { x: undefined, y: undefined, z: undefined },
            };
            if (key === "create_cylinder") await dispatch(modelAdded(mdl));
            else await dispatch(modelAltered(mdl));
            break;

          case "create_element":
          case "edit_element":
            mdl = {
              id: obj.id,
              number: obj.number,
              name:
                "Element " +
                obj.number +
                " (" +
                calculate(obj.resistance, parameters) +
                " Ω, " +
                calculate(obj.inductance, parameters) +
                " H, " +
                calculate(obj.capacitance, parameters) +
                " F)",
              type: "element",
              parentId: obj.parentId,
              object: {
                element_type: obj.element_type,
                resistance: obj.resistance,
                inductance: obj.inductance,
                capacitance: obj.capacitance,
                x: {
                  min: obj.x1,
                  max: obj.x2,
                },
                y: {
                  min: obj.y1,
                  max: obj.y2,
                },
                z: {
                  min: obj.z1,
                  max: obj.z2,
                },
              },
              status: key === "create_element" ? "Added" : "Updated",
              category: "Lumped Elements",
              visible: true,
              selected: false,
              material: "PEC",
              position: {
                x: 0,
                y: 0,
                z: 0,
              },
              rotation: {
                x: 0,
                y: 0,
                z: 0,
              },
              scaling: {
                x: undefined,
                y: undefined,
                z: undefined,
              },
            };
            if (key === "create_element") await dispatch(modelAdded(mdl));
            else await dispatch(modelAltered(mdl));
            break;

          case "create_port":
          case "edit_port":
            mdl = {
              id: obj.id,
              number: obj.number,
              name:
                "Port " +
                obj.number +
                " (" +
                calculate(obj.impedance, parameters) +
                " Ω)",
              type: "port",
              object: {
                impedance: obj.impedance,
                amplitude: obj.amplitude,
                phase_shift: obj.phase_shift,
                f_ref: obj.f_ref,
                x: {
                  min: obj.x1,
                  max: obj.x2,
                },
                y: {
                  min: obj.y1,
                  max: obj.y2,
                },
                z: {
                  min: obj.z1,
                  max: obj.z2,
                },
              },
              status: key === "create_port" ? "Added" : "Updated",
              category: "Ports",
              parentId: obj.parentId,
              visible: true,
              selected: false,
              material: "PEC",
              position: {
                x: 0,
                y: 0,
                z: 0,
              },
              rotation: {
                x: 0,
                y: 0,
                z: 0,
              },
              scaling: {
                x: undefined,
                y: undefined,
                z: undefined,
              },
            };
            if (key === "create_port") await dispatch(modelAdded(mdl));
            else await dispatch(modelAltered(mdl));
            break;

          case "create_distance":
          case "edit_distance":
            mdl = {
              id: obj.id,
              number: obj.number,
              name:
                "Distance " +
                obj.number +
                " (" +
                Number(
                  Math.sqrt(
                    Math.pow(
                      calculate(obj.x2, parameters) -
                      calculate(obj.x1, parameters),
                      2
                    ) +
                    Math.pow(
                      calculate(obj.y2, parameters) -
                      calculate(obj.y1, parameters),
                      2
                    ) +
                    Math.pow(
                      calculate(obj.z2, parameters) -
                      calculate(obj.z1, parameters),
                      2
                    )
                  ).toFixed(3)
                ).toString() +
                " " +
                simulationProperties.dimensionsUnit.replace("um", "μm") +
                ")",
              type: "distance",
              object: {
                x: {
                  min: obj.x1,
                  max: obj.x2,
                },
                y: {
                  min: obj.y1,
                  max: obj.y2,
                },
                z: {
                  min: obj.z1,
                  max: obj.z2,
                },
              },
              status: key === "create_distance" ? "Added" : "Updated",
              category: "Distances",
              parentId: obj.parentId,
              visible: true,
              selected: false,
              material: obj.material,
              position: {
                x: 0,
                y: 0,
                z: 0,
              },
              rotation: {
                x: 0,
                y: 0,
                z: 0,
              },
              scaling: {
                x: undefined,
                y: undefined,
                z: undefined,
              },
            };
            if (key === "create_distance") await dispatch(modelAdded(mdl));
            else await dispatch(modelAltered(mdl));
            break;

          case "create_parameter":
          case "edit_parameter":
            mdl = {
              id: obj.id,
              name: obj.name,
              expression: obj.expression,
              value: obj.value,
              description: obj.description,
            };
            if (key === "create_parameter") await dispatch(addParameter(mdl));
            else await dispatch(editParameter(mdl));
            break;

          case "create_folder":
            mdl = {
              id: obj.id,
              name: obj.name,
              parentId: obj.parentId,
              type: "folder",
              status: "Added",
              category: "Objects",
              visible: true,
              selected: false,
            };
            dispatch(modelAdded(mdl));
            break;

          case "translate":
            mesh = mainScene?.getMeshById(obj.id);
            model = models.find((m: any) => m.id == obj.id);
            if (obj.isCanCopy) {
              for (let i = 1; i <= calculate(obj.factor, parameters); i++) {
                let m;
                try {
                  m = {
                    ...model,
                    name: model?.name + "_" + (i + 1),
                    id: obj.idArray[i - 1],
                    selected: false,
                    status: "Added",
                    position: {
                      x:
                        mesh?.position.y + calculate(obj.xAxis, parameters) * i,
                      y:
                        mesh?.position.y + calculate(obj.yAxis, parameters) * i,
                      z:
                        mesh?.position.z + calculate(obj.zAxis, parameters) * i,
                    },
                  };
                } catch (err) {
                  console.log(err);
                  toast.error("Invalid properties. Please try again.", {
                    toastId: "error",
                  });
                  return;
                }
                await dispatch(modelAdded(m));
              }
            } else {
              try {
                mdl = {
                  ...model,
                  name: model.name,
                  id: model.id,
                  selected: false,
                  status: "Updated",
                  position: {
                    x:
                      mesh?.position.x +
                      calculate(obj.xAxis, parameters) * calculate(obj.factor, parameters),
                    y:
                      mesh?.position.y +
                      calculate(obj.yAxis, parameters) * calculate(obj.factor, parameters),
                    z:
                      mesh?.position.z +
                      calculate(obj.zAxis, parameters) * calculate(obj.factor, parameters),
                  },
                };
              } catch (err) {
                toast.error("Invalid properties. Please try again.", {
                  toastId: "error",
                });
                return;
              }
              await dispatch(modelAltered(mdl));
            }
            break;

          case "rotate":
            mesh = mainScene?.getMeshById(obj.id);
            model = models.find((model: any) => model.id === obj.id);
            if (!mesh) break;

            let parent: BABYLON.Mesh = new BABYLON.Mesh("parent", mainScene);
            parent.setBoundingInfo(
              new BABYLON.BoundingInfo(
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(0, 0, 0)
              )
            );
            parent.position = new BABYLON.Vector3(
              calculate(obj.xOrigin, parameters),
              calculate(obj.yOrigin, parameters),
              calculate(obj.zOrigin, parameters)
            );
            mesh.parent = parent;
            mesh.position.x -= parent.position.x;
            mesh.position.y -= parent.position.y;
            mesh.position.z -= parent.position.z;

            if (obj.isCanCopy) {
              for (let i = 1; i <= calculate(obj.factor, parameters); i++) {
                parent.rotation = new BABYLON.Vector3(
                  ((calculate(obj.xAxis, parameters) * Math.PI) / 180) * i,
                  ((calculate(obj.yAxis, parameters) * Math.PI) / 180) * i,
                  ((calculate(obj.zAxis, parameters) * Math.PI) / 180) * i
                );
                await wait(100);
                let position = mesh.absolutePosition;
                let rotation = mesh.absoluteRotationQuaternion.toEulerAngles();

                await dispatch(
                  modelAdded({
                    ...model,
                    id: obj.idArray[i - 1],
                    name: obj?.name + "_" + i,
                    status: "Added",
                    selected: false,
                    position: {
                      x: position.x,
                      y: position.y,
                      z: position.z,
                    },
                    rotation: {
                      x: rotation.x,
                      y: rotation.y,
                      z: rotation.z,
                    },
                    mergedMeshId:
                      model.type === "mergedMesh" ? model.id : undefined,
                  })
                );
              }
            } else {
              parent.rotation = new BABYLON.Vector3(
                (calculate(obj.xAxis, parameters) * Math.PI) / 180,
                (calculate(obj.yAxis, parameters) * Math.PI) / 180,
                (calculate(obj.zAxis, parameters) * Math.PI) / 180
              );
              await wait(100);
              let position = mesh.absolutePosition;
              let rotation = mesh.absoluteRotationQuaternion.toEulerAngles();
              await dispatch(
                modelAltered({
                  ...model,
                  status: "Updated",
                  position: {
                    x: position.x,
                    y: position.y,
                    z: position.z,
                  },
                  rotation: {
                    x: rotation.x,
                    y: rotation.y,
                    z: rotation.z,
                  },
                  selected: false,
                })
              );
            }
            mesh.parent = null;
            mesh.position.x += parent.position.x;
            mesh.position.y += parent.position.y;
            mesh.position.z += parent.position.z;
            break;

          case "scale":
            mesh = mainScene?.getMeshById(obj.id);
            model = models.find((model: any) => model.id === obj.id);
            if (obj.isCanCopy) {
              for (let i = 1; i <= calculate(obj.factor, parameters); i++) {
                mdl = {
                  ...model,
                  id: obj.idArray[i - 1],
                  name: model?.name + "_2",
                  scaling: {
                    x:
                      mesh?.scaling?.x *
                      Math.pow(calculate(obj.xAxis, parameters), i),
                    y:
                      mesh?.scaling?.y *
                      Math.pow(calculate(obj.yAxis, parameters), i),
                    z:
                      mesh?.scaling?.z *
                      Math.pow(calculate(obj.zAxis, parameters), i),
                  },
                  status: "Added",
                  selected: false,
                  mergedMeshId:
                    model.type === "mergedMesh" ? model.id : undefined,
                };
                await dispatch(modelAdded(mdl));
              }
            } else {
              await dispatch(
                modelAltered({
                  ...model,
                  position: {
                    x: obj?.position?.x ? obj.position?.x : mesh.position.x,
                    y: obj?.position?.y ? obj.position?.y : mesh.position.y,
                    z: obj?.position?.z ? obj.position?.z : mesh.position.z,
                  },
                  scaling: {
                    x:
                      mesh?.scaling?.x *
                      Math.pow(
                        calculate(obj.xAxis, parameters),
                        calculate(obj.factor, parameters)
                      ),
                    y:
                      mesh?.scaling?.y *
                      Math.pow(
                        calculate(obj.yAxis, parameters),
                        calculate(obj.factor, parameters)
                      ),
                    z:
                      mesh?.scaling?.z *
                      Math.pow(
                        calculate(obj.zAxis, parameters),
                        calculate(obj.factor, parameters)
                      ),
                  },
                  status: "Updated",
                  selected: false,
                })
              );
            }
            break;

          case "extrude":
            console.log("Object:",obj);
            await dispatch(modelAdded({
              id: obj.id,
              name: obj.name,
              height: obj.height,
              type: "extrudedMesh",
              material: obj.material,
              status: "Added",
              category: "Objects",
              parentId: 0,
              visible: true,
              selected: false,
              isEditProperty: false,
              selectedFacePoints: obj.selectedFacePoints,
              selectedFaceScaling: obj.selectedFaceScaling,
              offsetPosition: obj.offsetPosition,
              diameter:obj.diameter,
              topDiameter:obj.topDiameter,
              bottomDiameter:obj.bottomDiameter,
              tessellation:obj.tessellation,
              subdivisions:obj.subdivisions,
              position: {
                x: 0,
                y: 0,
                z: 0,
              },
              rotation: {
                x: 0,
                y: 0,
                z: 0,
              },
              scaling: {
                x: undefined,
                y: undefined,
                z: undefined
              }
            }))
            break;

          case "save":
          case "delete":
            if (key === "save") await dispatch(modelSaved(obj.id));
            else await dispatch(modelRemoved(obj.id));
            break;

          case "paste":
            break;

          case "merge":
            let firstSelectedModel = obj.firstSelectedModel;
            let selectedModels = obj.selectedModels;
            let firstSelectedMesh = mainScene?.getMeshById(
              firstSelectedModel.id
            ) as BABYLON.Mesh;
            let finalCSG = BABYLON.CSG.FromMesh(firstSelectedMesh);
            for (let i = 0; i < selectedModels.length; i++) {
              const currentMesh = scene.getMeshById(
                selectedModels[i].id
              ) as BABYLON.Mesh;
              if (selectedModels[i].id === firstSelectedModel.id) {
                currentMesh.dispose();
                dispatch(modelRemoved(currentMesh.id));
                continue;
              }
              let currentCSG = BABYLON.CSG.FromMesh(currentMesh);

              finalCSG = finalCSG.union(currentCSG);
              currentMesh.dispose();
              dispatch(modelRemoved(currentMesh.id));
            }

            let mergedMesh = finalCSG.toMesh(
              "mergedMesh",
              getMaterial(firstSelectedModel.material),
              mainScene,
              false
            );
            mergedMesh.id = firstSelectedModel.id;

            let obj1 = {
              ...firstSelectedModel,
              type: "mergedMesh",
              selected: false,
            };
            dispatch(modelAltered(obj1));
            break;

          case "subtract":
            let otherSelectedModel = obj.selectedModels.find(
              (model: any) => model.id !== obj.firstSelectedModel.id
            );
            let mesh1 = mainScene?.getMeshById(
              obj.firstSelectedModel.id
            ) as BABYLON.Mesh;
            let mesh2 = mainScene?.getMeshById(
              otherSelectedModel.id
            ) as BABYLON.Mesh;
            if (mesh1 && mesh2) {
              const c2cgs = BABYLON.CSG.FromMesh(mesh1);
              const subcgs = BABYLON.CSG.FromMesh(mesh2);
              const sub = c2cgs.subtract(subcgs);
              const mesh = sub.toMesh(
                "subMesh",
                getMaterial(obj.firstSelectedModel.material),
                mainScene,
                false
              );
              mesh1.dispose();
              mesh2.dispose();
              mesh.id = obj.firstSelectedModel.id;
              const object2 = otherSelectedModel;
              dispatch(modelRemoved(object2.id));
              const object1 = {
                ...obj.firstSelectedModel,
                type: "mergedMesh",
                selected: false,
              };
              dispatch(modelAltered(object1));
            }
            break;

          case "intersect":
            let intersectFirstSelectedMesh = mainScene?.getMeshById(
              obj.firstSelectedModel.id
            ) as BABYLON.Mesh;
            let intersectFinalCSG = BABYLON.CSG.FromMesh(
              intersectFirstSelectedMesh
            );
            for (let i = 0; i < obj.selectedModels.length; i++) {
              const currentMesh = mainScene?.getMeshById(
                obj.selectedModels[i].id
              ) as BABYLON.Mesh;
              if (obj.selectedModels[i].id === obj.firstSelectedModel.id) {
                currentMesh.dispose();
                dispatch(modelRemoved(currentMesh.id));
                continue;
              }

              const currentCSG = BABYLON.CSG.FromMesh(currentMesh);

              intersectFinalCSG = intersectFinalCSG.intersect(currentCSG);
              currentMesh.dispose();
              dispatch(modelRemoved(currentMesh.id));
            }
            let intersectMergedMesh = intersectFinalCSG.toMesh(
              "mergedMesh",
              getMaterial(obj.firstSelectedModel.material),
              mainScene,
              false
            );
            intersectMergedMesh.id = obj.firstSelectedModel.id;
            let intersectObj1 = {
              ...obj.firstSelectedModel,
              type: "mergedMesh",
              selected: false,
            };
            dispatch(modelAltered(intersectObj1));
            break;

          case "insert":
            const insertOtherSelectedModel = obj.selectedModels.find(
              (model: any) => model.id !== obj.firstSelectedModel.id
            );
            const insertMesh1 = scene.getMeshById(
              obj.firstSelectedModel.id
            ) as BABYLON.Mesh;
            const insertMesh2 = scene.getMeshById(
              insertOtherSelectedModel.id
            ) as BABYLON.Mesh;

            if (insertMesh1 && insertMesh2) {
              const mesh1CSG = BABYLON.CSG.FromMesh(insertMesh1);
              const mesh2CSG = BABYLON.CSG.FromMesh(insertMesh2);
              let resultCSG = mesh1CSG.subtract(mesh2CSG);

              insertMesh1.dispose();
              const resultMesh = resultCSG.toMesh(
                "modifiedMesh1",
                getMaterial(obj.firstSelectedModel.material),
                mainScene,
                false
              );
              resultMesh.id = obj.firstSelectedModel.id;

              for (let model of obj.selectedModels) {
                if (model.id !== obj.firstSelectedModel.id) {
                  dispatch(modelAltered({ ...model, selected: false }));
                }
              }

              const object1 = {
                ...obj.firstSelectedModel,
                type: "mergedMesh",
                selected: false,
              };
              dispatch(modelAltered(object1));
            }
            break;

          case "change_material":
            dispatch(modelAltered(obj));
            break;

          case "change_name":
            dispatch(modelAltered(obj));
            break;
          case "loadSTLMesh":
            let file = dataURLtoFile(obj.filesrc, obj.filename);
            let url = URL.createObjectURL(file);
            loadMesh(obj.filename, url, obj.ext, obj.id);
            break;
          case "loadSTEPMesh":
            await loadSTEPMesh(obj);
            break;

          case "update_parentId":
            mdl = models.find((m) => m.id === obj.id);
            await dispatch(
              modelAltered({
                ...mdl,
                parentId: obj.parentId,
                status: "Updated",
              })
            );
            break;
        }
        setLoadedIndex(loadedIndex + 1);
      };
      fetchMesh();
    }
  }, [loadedIndex]);

  const fetchJson = async () => {
    const data = await Storage.get(
      `${username}/projects/${projectId}/history.json`,
      {
        download: true,
        cacheControl: "no-cache",
      }
    );
    const dataBody = data.Body;
    if (dataBody) {
      const dataString = await dataBody.text();
      const arr = JSON.parse(dataString);
      setParametersArray(arr.parameters);
      setJsonArray(arr.historyList);
    }
  };

  const isParameterUsed = (paramId: string) => {
    if (paramId === undefined) return false;
    let flag = false;
    if (jsonArray != undefined) {
      jsonArray.map((data: any) => {
        let key = Object.keys(data)[0];
        if (typeof (data[key]) === "object") {
          Object.keys(data[key]).map((k) => {
            if (typeof (data[key][k]) === "object") {
              Object.keys(data[key][k]).map((k1) => {
                if (data[key][k][k1].toString().indexOf(paramId) != -1) {
                  flag = true;
                  return;
                }
              })
            } else {
              console.log(data[key][k]);
              if (data[key][k].toString().indexOf(paramId) != -1) {
                console.log(data[key][k]);
                flag = true;
                return;
              }
            }
          })
        }
      })
    }
    models.some((model) => {
      let values: any = { ...model.object };

      if (model.category !== "Objects") {
        const { x, y, z, ...cleanedObjs } = Object.assign({}, values);

        values = cleanedObjs;

        values.xMin = replaceIdsToParameters(x.min, parameters);
        values.xMax = replaceIdsToParameters(x.max, parameters);
        values.yMin = replaceIdsToParameters(y.min, parameters);
        values.yMax = replaceIdsToParameters(y.max, parameters);
        values.zMin = replaceIdsToParameters(z.min, parameters);
        values.zMax = replaceIdsToParameters(z.max, parameters);
      }

      if (Object.keys(values).some((val) => values[val].includes(paramId)) == true) {
        flag = true;
        return;
      }
    });

    return flag;
  }

  useEffect(() => {
    if (canvas && engine && mainScene && axisViewScene) {
      engine.runRenderLoop(function () {
        mainScene.render();
        axisViewScene.render();
        if (axisViewScene.activeCamera && mainScene.activeCamera) {
          // mainScene.activeCamera.attachControl(canvas);
          let camera = mainScene.activeCamera as BABYLON.ArcRotateCamera;
          let axisViewCamera =
            axisViewScene.activeCamera as BABYLON.ArcRotateCamera;
          var axisViewport = new BABYLON.Viewport(0.78, 0, 0.24, 0.24);
          axisViewCamera.alpha = camera.alpha;
          axisViewCamera.beta = camera.beta;
          axisViewCamera.viewport = axisViewport;
          mainScene.autoClear = true;
        }
      });

      window.addEventListener("resize", () => {
        handleResize();
      });

      window.addEventListener("mousemove", () => {
        handleResize();
      });

      console.log("fetch json");
      fetchJson();
    }
  }, [canvas, engine, mainScene, axisViewScene]);

  const setPortMeshColor = (alteredMesh: BABYLON.AbstractMesh, model: any) => {
    if (alteredMesh instanceof BABYLON.LinesMesh) {
      const linesMesh = alteredMesh as BABYLON.LinesMesh;
      if (model.type === "port") {
        linesMesh.color = BABYLON.Color3.FromHexString("#00008B");
      } else if (model.type === "element") {
        linesMesh.color = BABYLON.Color3.FromHexString("#008D00");
      } else if (model.type === "distance") {
        linesMesh.color = BABYLON.Color3.FromHexString("#FF8C00");
      }
    }
  };
  // add models that are stored and not in scene
  useEffect(() => {
    if (canvas && engine && mainScene && axisViewScene && models) {
      const modelsToDraw = Object.values(models);

      const arrayModel = modelsToDraw.flat();
      arrayModel.forEach((model: any) => {
        if (model.status === "Added") {
          const modelType = model.type;
          const objectToCreate = {
            id: model.id,
            name: model.name,
            status: "Added",
            isEditProperty: model.isEditProperty,
            material: model.material,
            position: {
              ...model.position,
            },
            scaling: {
              ...model.scaling,
            },
            rotation: {
              ...model.rotation,
            },
            origin: {
              ...model.origin,
            },
            url: model.url,
            extension: model.extension,
            mergedMeshId: model.mergedMeshId,
            selectedFacePoints: model.selectedFacePoints,
            selectedFaceScaling: model.selectedFaceScaling,
            offsetPosition: model.offsetPosition,
            height: model.height,
            ...model.object,
          };
          console.log(objectToCreate.id);
          addShape(modelType, objectToCreate);
          // alter the state to completed
          dispatch(modelCompleted(model.id));
        }
        if (model.status === "Altered") {
          const alteredMesh = mainScene.getMeshById(model.id);
          if (!alteredMesh) {
            return;
          }
          if (
            model.type !== "port" &&
            model.type !== "element" &&
            model.type !== "distance"
          ) {
            alteredMesh.material = getMaterial(model.material);
            alteredMesh.material.zOffset = 0.5;
          }
          if (model.visible) {
            setPortMeshColor(alteredMesh, model);
            if (model.selected) {
              alteredMesh.visibility = 1;
              alteredMesh.showBoundingBox = true;
            } else {
              alteredMesh.visibility = 0.5;
              alteredMesh.showBoundingBox = false;
            }

            if (model.type === "distance") {
              let distanceLength = model.name.split("(");
              distanceLength =
                distanceLength[distanceLength.length - 1].split(")")[0];

              mainScene?.meshes.forEach(function (mesh) {
                if (
                  mesh?.name?.startsWith("TextPlane") &&
                  mesh?.id === "distance-label" + model.id
                ) {
                  mesh.visibility = 1;
                }
              });
            }
          } else {
            alteredMesh.showBoundingBox = false;
            alteredMesh.visibility = 0;

            if (model.type === "distance") {
              let distanceLength = model.name.split("(");
              distanceLength =
                distanceLength[distanceLength.length - 1].split(")")[0];

              mainScene?.meshes.forEach(function (mesh) {
                if (
                  mesh?.name?.startsWith("TextPlane") &&
                  mesh?.id === "distance-label" + model.id
                ) {
                  mesh.visibility = 0;
                }
              });
            }
          }
          dispatch(modelCompleted(model.id));
        }
        if (model.status === "Updated") {
          // let mesh = mainScene.getMeshById(model.id);
          // if (mesh && model.type !== "mergedMesh") mesh.dispose();
          const modelType = model.type;
          const objectToCreate = {
            id: model.id,
            name: model.name,
            material: model.material,
            status: "Updated",
            isEditProperty: model.isEditProperty,
            position: {
              ...model.position,
            },
            scaling: {
              ...model.scaling,
            },
            rotation: {
              ...model.rotation,
            },
            origin: {
              ...model.origin,
            },
            url: model.url,
            extension: model.extension,
            ...model.object,
          };
          addShape(modelType, objectToCreate);
          dispatch(modelCompleted(model.id));
        }
        if (model.status === "Removed") {
          const deletedMesh = mainScene.getMeshById(model.id);
          if (deletedMesh) {
            deletedMesh.dispose();
            if (model.type === "distance")
              mainScene.getMeshById("distance-label" + model.id)?.dispose();
          }
          // get this models length if its distance and remove a text plane with that distance
          if (model.type === "distance") {
            let distanceLength = model.name.split("(");
            distanceLength =
              distanceLength[distanceLength.length - 1].split(")")[0];

            mainScene?.meshes.forEach(function (mesh) {
              if (
                mesh?.name?.startsWith("TextPlane") &&
                mesh?.id === "TextPlane " + distanceLength
              ) {
                mesh.dispose();
              }
            });
          }

          dispatch(modelRemovedFromScene(model.id));
        }
        const selectedCount = arrayModel.filter(
          (model: any) => model.selected && model.type != "folder"
        ).length;
        if (selectedCount === 0) {
          for (let model of arrayModel) {
            const mesh: any = mainScene.getMeshById(model.id);
            if (
              mesh &&
              !(model.type == "distance" && tabIndex.selectedTab == 1)
            ) {
              if (model.visible) {
                mesh.visibility = 1;
                mesh.isPickable = true;
              } else {
                mesh.visibility = 0;
                mesh.isPickable = false;
              }
              mesh.showBoundingBox = false;
            }
          }
        }
      });
    }
    //eslint-disable-next-line
  }, [
    canvas,
    engine,
    mainScene,
    mainScene?.meshes,
    axisViewScene,
    models,
    parameters,
  ]);

  const getMaterial = (color: any) => {
    if (!materials) {
      return new BABYLON.StandardMaterial("PEC", scene);
    }
    const material = Object.keys(materials).find(
      (material) => material === color
    );
    if (material) {
      const meshMaterial = new BABYLON.StandardMaterial(material, scene);
      meshMaterial.diffuseColor = BABYLON.Color3.FromHexString(
        materials[material]?.color
      );
      meshMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      return meshMaterial;
    }
    const meshMaterial = new BABYLON.StandardMaterial("PEC", scene);
    meshMaterial.diffuseColor = BABYLON.Color3.FromHexString(
      materials["PEC"]?.color
    );
    meshMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    return meshMaterial;
  };

  function calculateScaleFactor(
    distanceFromCamera: any,
    referenceDistance: any
  ) {
    return distanceFromCamera / referenceDistance;
  }

  function adjustCylinderPosition(
    mesh: any,
    position: any,
    direction: any,
    mainScene: any,
    distanceLabel: any
  ) {
    if (mainScene?.activeCamera) {
      const distanceFromCamera = BABYLON.Vector3.Distance(
        position,
        mainScene.activeCamera.position
      );
      const referenceDistance = 10;
      const scaleFactor = calculateScaleFactor(
        distanceFromCamera,
        referenceDistance
      );

      const adjustedDiameter = 0.05 * scaleFactor;
      mesh.scaling.x = mesh.scaling.z = adjustedDiameter / 0.05;

      // Adjust position of distanceLabel based on mesh's position and direction
      // I'm using a small offset from the cylinder's direction to place the label.
      // This can be adjusted as needed.
      const offsetFromCylinder = 0.6 * adjustedDiameter;
      distanceLabel.position = position.add(
        direction.scale(offsetFromCylinder)
      );
    }
  }

  const addShape = async (type: string, obj: any) => {
    var mesh: any;
    if (type === "cube") {
      mesh = mainScene?.getMeshById(obj.id);
      mesh?.dispose();
      mesh = BABYLON.MeshBuilder.CreateBox(obj.name, {}, mainScene);

      if (
        obj.scaling.x === undefined &&
        obj.scaling.y === undefined &&
        obj.scaling.z === undefined
      ) {
        mesh.scaling.x =
          calculate(obj.xMax, parameters) - calculate(obj.xMin, parameters);
        mesh.scaling.y =
          calculate(obj.yMax, parameters) - calculate(obj.yMin, parameters);
        mesh.scaling.z =
          calculate(obj.zMax, parameters) - calculate(obj.zMin, parameters);
      } else {
        mesh.scaling.x = obj.scaling.x;
        mesh.scaling.y = obj.scaling.y;
        mesh.scaling.z = obj.scaling.z;
      }

      if (mesh.scaling.x === 0) mesh.scaling.x = 0.000001;
      if (mesh.scaling.y === 0) mesh.scaling.y = 0.000001;
      if (mesh.scaling.z === 0) mesh.scaling.z = 0.000001;
      if (obj.position) {
        mesh.position.x = obj.position.x;
        mesh.position.y = obj.position.y;
        mesh.position.z = obj.position.z;
      }
      if (obj.rotation) {
        mesh.rotation.x = obj.rotation.x;
        mesh.rotation.y = obj.rotation.y;
        mesh.rotation.z = obj.rotation.z;
      }
      mesh.id = obj.id;
      mesh.material = getMaterial(obj.material);
      mesh.material.zOffset = 0.5;
    } else if (type === "sphere") {
      mesh = mainScene?.getMeshById(obj.id);
      mesh?.dispose();
      mesh = BABYLON.MeshBuilder.CreateSphere(
        obj.name,
        {
          segments: calculate(obj.segments, parameters),
          diameter: calculate(obj.diameter, parameters),
          diameterX: calculate(obj.diameterX, parameters),
          diameterY: calculate(obj.diameterY, parameters),
          diameterZ: calculate(obj.diameterZ, parameters),
        },
        mainScene
      );

      if (obj.position) {
        mesh.position.x = obj.position.x;
        mesh.position.y = obj.position.y;
        mesh.position.z = obj.position.z;
      }
      if (obj.rotation) {
        mesh.rotation.x = obj.rotation.x;
        mesh.rotation.y = obj.rotation.y;
        mesh.rotation.z = obj.rotation.z;
      }
      if (
        !(
          obj.scaling.x === undefined &&
          obj.scaling.y === undefined &&
          obj.scaling.z === undefined
        )
      ) {
        mesh.scaling.x = obj.scaling.x;
        mesh.scaling.y = obj.scaling.y;
        mesh.scaling.z = obj.scaling.z;
      }

      mesh.id = obj.id;
      mesh.material = getMaterial(obj.material);
      mesh.material.zOffset = 0.5;
    } else if (type === "cylinder") {
      mesh = mainScene?.getMeshById(obj.id);
      mesh?.dispose();
      mesh = BABYLON.MeshBuilder.CreateCylinder(
        obj.name,
        {
          height: calculate(obj.height, parameters),
          diameter: calculate(obj.diameter, parameters),
          diameterTop: calculate(obj.topDiameter, parameters),
          diameterBottom: calculate(obj.bottomDiameter, parameters),
          tessellation: calculate(obj.tessellation, parameters),
          subdivisions: calculate(obj.subdivisions, parameters),
        },
        mainScene
      );

      if (obj.position) {
        mesh.position.x = obj.position.x;
        mesh.position.y = obj.position.y;
        mesh.position.z = obj.position.z;
      }
      if (obj.rotation) {
        mesh.rotation.x = obj.rotation.x;
        mesh.rotation.y = obj.rotation.y;
        mesh.rotation.z = obj.rotation.z;
      }
      if (
        !(
          obj.scaling.x === undefined &&
          obj.scaling.y === undefined &&
          obj.scaling.z === undefined
        )
      ) {
        mesh.scaling.x = obj.scaling.x;
        mesh.scaling.y = obj.scaling.y;
        mesh.scaling.z = obj.scaling.z;
      }
      mesh.id = obj.id;
      mesh.material = getMaterial(obj.material);
      mesh.material.zOffset = 0.5;
    } else if (type === "port") {
      mesh = mainScene?.getMeshById(obj.id);
      mesh?.dispose();
      mesh = BABYLON.MeshBuilder.CreateLines(
        obj.name,
        {
          points: [
            new BABYLON.Vector3(
              calculate(obj.x.min, parameters),
              calculate(obj.y.min, parameters),
              calculate(obj.z.min, parameters)
            ),
            new BABYLON.Vector3(
              calculate(obj.x.max, parameters),
              calculate(obj.y.max, parameters),
              calculate(obj.z.max, parameters)
            ),
          ],
        },
        mainScene
      );
      mesh.color = BABYLON.Color3.FromHexString("#00008B");
      mesh.id = obj.id;
    } else if (type === "element") {
      mesh = mainScene?.getMeshById(obj.id);
      mesh?.dispose();
      mesh = BABYLON.MeshBuilder.CreateLines(
        obj.name,
        {
          points: [
            new BABYLON.Vector3(
              calculate(obj.x.min, parameters),
              calculate(obj.y.min, parameters),
              calculate(obj.z.min, parameters)
            ),
            new BABYLON.Vector3(
              calculate(obj.x.max, parameters),
              calculate(obj.y.max, parameters),
              calculate(obj.z.max, parameters)
            ),
          ],
        },
        mainScene
      );
      mesh.color = BABYLON.Color3.FromHexString("#008D00");
      mesh.id = obj.id;
    } else if (type === "distance") {
      mainScene?.getMeshById(obj.id)?.dispose();
      mainScene?.getMeshById("distance-label" + obj.id)?.dispose();
      const point1 = new BABYLON.Vector3(
        calculate(obj.x.min, parameters),
        calculate(obj.y.min, parameters),
        calculate(obj.z.min, parameters)
      );
      const point2 = new BABYLON.Vector3(
        calculate(obj.x.max, parameters),
        calculate(obj.y.max, parameters),
        calculate(obj.z.max, parameters)
      );

      const direction = point2.subtract(point1).normalize();
      const length = BABYLON.Vector3.Distance(point1, point2);
      const position = point1.add(direction.scale(length / 2)); // midpoint of the cylinder

      let mesh = BABYLON.MeshBuilder.CreateCylinder(
        obj.name,
        {
          height: length,
          diameter: 0.05, // Start with the basic diameter
          tessellation: 32,
          updatable: true,
        },
        mainScene
      );

      const up = new BABYLON.Vector3(0, 1, 0);
      const axis = BABYLON.Vector3.Cross(up, direction);
      const angle = Math.acos(BABYLON.Vector3.Dot(up, direction));
      mesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis, angle);

      mesh.position = position;

      const material = new BABYLON.StandardMaterial("material", mainScene);
      material.diffuseColor = BABYLON.Color3.FromHexString("#FF8C00");
      mesh.material = material;

      mesh.id = obj.id;

      // Create distanceLabel before adjusting the cylinder's position
      const distanceLabel = makeTextPlane(
        Number(length.toFixed(3)).toString() +
        " " +
        simulationProperties.dimensionsUnit.replace("um", "μm"),
        "#FF8C00",
        30
      );

      distanceLabel.position = new BABYLON.Vector3(0, 0, 0);
      distanceLabel.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      distanceLabel.rotation.z = Math.PI;
      distanceLabel.renderingGroupId = 1;
      distanceLabel.id = "distance-label" + obj.id;

      if (distanceLabel.material) {
        if (distanceLabel.material instanceof BABYLON.StandardMaterial) {
          distanceLabel.material.specularColor = new BABYLON.Color3(0, 0, 0);
        }
        distanceLabel.material.zOffset = 50;
      }

      // Now, adjust the cylinder and label position after creating both
      adjustCylinderPosition(
        mesh,
        position,
        direction,
        mainScene,
        distanceLabel
      );

      // Attach an observer to adjust the cylinder diameter and label position whenever the camera view changes
      if (mainScene?.activeCamera) {
        mainScene.activeCamera.onViewMatrixChangedObservable.add(() => {
          adjustCylinderPosition(
            mesh,
            position,
            direction, // pass the direction of the cylinder
            mainScene,
            distanceLabel
          );
        });
      }

      if (distanceLabel.material) {
        if (distanceLabel.material instanceof BABYLON.StandardMaterial) {
          distanceLabel.material.specularColor = new BABYLON.Color3(0, 0, 0);
        }
        distanceLabel.material.zOffset = 50;
      }

      //distanceLabel.parent = mesh;
    } else if (type === "mesh") {
      mesh = mainScene?.getMeshById(obj.id);
      mesh?.dispose();
      BABYLON.SceneLoader.ImportMesh(
        "",
        "",
        obj.url,
        mainScene,
        function (newMeshes) {
          mesh = newMeshes[0];
          mesh.name = obj.fileName;

          mesh.id = obj.id;
          mesh.material = getMaterial(obj.material);

          if (obj.position) {
            mesh.position.x = obj.position.x;
            mesh.position.y = obj.position.y;
            mesh.position.z = obj.position.z;
          }
          if (obj.rotation) {
            mesh.rotation.x = obj.rotation.x;
            mesh.rotation.y = obj.rotation.y;
            mesh.rotation.z = obj.rotation.z;
          }
        },
        null,
        null,
        obj.extension
      );
    } else if (type === "mergedMesh") {
      if (obj.mergedMeshId) {
        let m = mainScene?.getMeshById(obj.mergedMeshId);
        mesh = m?.clone(obj.id, null);
        mesh.id = mesh.id.replace("." + obj.mergedMeshId, "");
      } else mesh = mainScene?.getMeshById(obj.id);

      if (obj.position) {
        mesh.position.x = obj.position.x;
        mesh.position.y = obj.position.y;
        mesh.position.z = obj.position.z;
      }
      if (obj.rotation) {
        mesh.rotation.x = obj.rotation.x;
        mesh.rotation.y = obj.rotation.y;
        mesh.rotation.z = obj.rotation.z;
      }
      mesh.id = obj.id;
      mesh.material = getMaterial(obj.material);
      mesh.material.zOffset = 0.5;
    } else if (type === "extrudedMesh") {
      mesh = mainScene?.getMeshById(obj.id);
      mesh?.dispose();
      let myShape = obj.selectedFacePoints;
      let ax = 0, ay = 0, az = 0;
      myShape.forEach((pos: BABYLON.Vector3) => {
        ax += pos.x;
        ay += pos.y;
        az += pos.z;
      });
      //Caclulate the center of plane
      ax /= myShape.length;
      ay /= myShape.length;
      az /= myShape.length;
      //Move to 0 point that center of plane is fit as 0 point.
      let myShapes: BABYLON.Vector3[] = myShape.map((pos: BABYLON.Vector3) => {
        return new BABYLON.Vector3(pos.x - ax, pos.y - ay, pos.z - az);
      });
      //Calculate normal vector
      const vec1 = myShapes[1].subtract(myShapes[0]);
      const vec2 = myShapes[2].subtract(myShapes[0]);
      const normalVec = BABYLON.Vector3.Cross(vec2, vec1); // Note the order of vec2 and vec1

      // Normalize the normal vector
      normalVec.normalize();
      let rotationMatrixz: any;
      let anys: any;
      //Magnify plane
      for (let i = 0; i < myShapes.length; i++) {
        myShapes[i] = new BABYLON.Vector3(
          obj.selectedFaceScaling.x * myShapes[i].x,
          obj.selectedFaceScaling.y * myShapes[i].y,
          obj.selectedFaceScaling.z * myShapes[i].z,
        )
      }
      console.log(obj);
      console.log(myShape);
      let right_direction=0;
      if(myShape.every((point:any)=>point.x===myShape[0].x&&point.x>0)){
        right_direction=1;
      }
      else if(myShape.every((point:any)=>point.x===myShape[0].x&&point.x<0)){
        right_direction=-1;
      }

      if(myShape.every((point:any)=>point.y===myShape[0].y&&point.y>0)){
        right_direction=1;
      }
      else if(myShape.every((point:any)=>point.y===myShape[0].y&&point.y<0)){
        right_direction=-1;
      }

      if(myShape.every((point:any)=>point.z===myShape[0].z&&point.z>0)){
        right_direction=1;
      }
      else if(myShape.every((point:any)=>point.z===myShape[0].z&&point.z<0)){
        right_direction=-1;
      }
      console.log(right_direction);

      if ((normalVec.y + normalVec.x) != 0) {
        if ((normalVec.y + normalVec.z) == 0) {///normal vector (1,0,0)
          rotationMatrixz = BABYLON.Matrix.RotationAxis(BABYLON.Axis.Y, Math.PI / 2);
          anys = 1
        }
        else if ((normalVec.x + normalVec.z) == 0) {///normal vector (0,1,0)
          rotationMatrixz = BABYLON.Matrix.RotationAxis(BABYLON.Axis.X, Math.PI / 2);
          anys = 2
        }
        for (let i = 0; i < myShapes.length; i++) {
          myShapes[i] = BABYLON.Vector3.TransformCoordinates(myShapes[i], rotationMatrixz);
        }
      }
      else anys = 3;
      console.log(myShapes);

      // Create a path for extrusion
      const myPath = [
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, right_direction*parseFloat(obj.height))
      ];
      // Extrude the shape along the path
      let extrusion = BABYLON.MeshBuilder.ExtrudeShape(obj.name,
        { shape: myShapes, closeShape: true, path: myPath, cap: BABYLON.Mesh.CAP_ALL, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
        mainScene);

      console.log(right_direction);
      extrusion.id = obj.id;
      if (anys == 1) {console.log("aa");
        extrusion.rotation.y = Math.PI / 2;
        if(right_direction==1)extrusion.position = new BABYLON.Vector3(parseFloat(obj.offsetPosition.x)+parseFloat(obj.selectedFaceScaling.x), parseFloat(obj.offsetPosition.y)+obj.selectedFaceScaling.y/2,parseFloat(obj.offsetPosition.z)+obj.selectedFaceScaling.z/2);
        else extrusion.position = new BABYLON.Vector3(parseFloat(obj.offsetPosition.x), parseFloat(obj.offsetPosition.y)+obj.selectedFaceScaling.y/2,parseFloat(obj.offsetPosition.z)+obj.selectedFaceScaling.z/2);
      }
      else if (anys == 2) {console.log("bb");
        extrusion.rotation.x = Math.PI / 2;
        if(right_direction==1)extrusion.position = new BABYLON.Vector3(parseFloat(obj.offsetPosition.x)+obj.selectedFaceScaling.x/2, parseFloat(obj.offsetPosition.y)+parseFloat(obj.selectedFaceScaling.y)+parseFloat(obj.height), parseFloat(obj.offsetPosition.z)+obj.selectedFaceScaling.z/2);
        else extrusion.position = new BABYLON.Vector3(parseFloat(obj.offsetPosition.x)+obj.selectedFaceScaling.x/2, parseFloat(obj.offsetPosition.y)-parseFloat(obj.height), parseFloat(obj.offsetPosition.z)+obj.selectedFaceScaling.z/2);
      }
      else {
        console.log("cc");
        if(right_direction==1)extrusion.position = new BABYLON.Vector3(parseFloat(obj.offsetPosition.x)+obj.selectedFaceScaling.x/2, parseFloat(obj.offsetPosition.y)+obj.selectedFaceScaling.y/2, parseFloat(obj.offsetPosition.z)+parseFloat(obj.selectedFaceScaling.z));
        else extrusion.position = new BABYLON.Vector3(parseFloat(obj.offsetPosition.x)+obj.selectedFaceScaling.x/2, parseFloat(obj.offsetPosition.y)+obj.selectedFaceScaling.y/2, parseFloat(obj.offsetPosition.z));
      }
      extrusion.id = obj.id;
      extrusion.material = getMaterial(obj.material);
      extrusion.material.zOffset = 0.5;
    }

    if (obj.status === "Updated" && mesh) {
      if (type === "port" || type === "element" || type === "distance") return;
      if (mesh.id !== obj.id) return;

      if (obj.scaling.x) {
        mesh.scaling.x = obj.scaling.x;
        mesh.scaling.y = obj.scaling.y;
        mesh.scaling.z = obj.scaling.z;
      }

      if (obj.position) {
        mesh.position.x = obj.position.x;
        mesh.position.y = obj.position.y;
        mesh.position.z = obj.position.z;
      }

      mesh.rotation.x = obj.rotation.x;
      mesh.rotation.y = obj.rotation.y;
      mesh.rotation.z = obj.rotation.z;

      mesh.material.zOffset = 0.5;
    }
    let model = models.find((model) => model.id === obj.id);
    if (mesh) {
      dispatch(
        modelAltered({
          ...model,
          scaling: {
            x: mesh.scaling?.x,
            y: mesh.scaling?.y,
            z: mesh.scaling?.z,
          },
          status: "Updated",
          selected: false,
        })
      );
    }
    mainScene?.render();
  };

  var makeTextPlane = function (text: any, color: any, size: any) {
    const plane = BABYLON.MeshBuilder.CreatePlane(
      "TextPlane",
      {
        size: size,
        updatable: true,
      },
      scene
    );

    plane.id = "TextPlane " + text;

    var dynamicTexture = new BABYLON.DynamicTexture(
      "dynamic texture",
      1500,
      scene
    );
    dynamicTexture.hasAlpha = true;

    var materialGround = new BABYLON.StandardMaterial("Mat", scene);
    materialGround.diffuseTexture = dynamicTexture;
    plane.material = materialGround;
    plane.material.backFaceCulling = false;

    var font = "bold 200px Inter";

    // Define the outline color and width (offset)
    var outlineColor = "black";
    var outlineWidth = 5;

    // Draw text multiple times for outline effect
    for (let x = -outlineWidth; x <= outlineWidth; x += outlineWidth) {
      for (let y = -outlineWidth; y <= outlineWidth; y += outlineWidth) {
        dynamicTexture.drawText(
          text,
          180 + x,
          200 + y,
          font,
          outlineColor,
          "transparent",
          false,
          true
        );
      }
    }

    // Draw the main text
    dynamicTexture.drawText(
      text,
      180,
      200,
      font,
      color,
      "transparent",
      false,
      true
    );

    return plane;
  };

  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [materialMenuVisible, setMaterialMenuVisible] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);

  useEffect(() => {
    setShowContextMenu(false);
    document.addEventListener("click", (e) => {
      if (e.target !== document.getElementById("canvas")) {
        setShowContextMenu(false);
        models.forEach((model: any) => {
          const newModel = { ...model, selected: false };
          dispatch(modelAltered(newModel));
        });
      }
    });
  }, []);

  const savedModels = useAppSelector(selectSavedModels);

  const getElementNumber = () => {
    let elementLength = 0;
    for (let i = 0; i < models.length; i++)
      if (models[i].type == "element") elementLength++;
    for (let i = 0; i < models.length; i++) {
      let f = false;
      for (let j = 0; j < models.length; j++) {
        if (models[j].type == "element") {
          if (models[j]?.number == (i + 1).toString()) {
            f = true;
            break;
          }
        }
      }
      if (f == false) return i + 1;
    }
    return elementLength + 1;
  };

  const getPortNumber = () => {
    let portLength = 0;
    for (let i = 0; i < models.length; i++)
      if (models[i].type == "port") portLength++;
    for (let i = 0; i < models.length; i++) {
      let f = false;
      for (let j = 0; j < models.length; j++) {
        if (models[j].type == "port") {
          if (models[j]?.number == (i + 1).toString()) {
            f = true;
            break;
          }
        }
      }
      if (f == false) return i + 1;
    }
    return portLength + 1;
  };

  const getDistanceNumber = () => {
    let distanceLength = 0;
    for (let i = 0; i < models.length; i++)
      if (models[i].type == "distance") distanceLength++;
    for (let i = 0; i < models.length; i++) {
      let f = false;
      for (let j = 0; j < models.length; j++) {
        if (models[j].type == "distance") {
          if (models[j]?.number == (i + 1).toString()) {
            f = true;
            break;
          }
        }
      }
      if (f == false) return i + 1;
    }
    return distanceLength + 1;
  };

  var cubePastedCnt = useRef(1);
  var spherePastedCnt = useRef(1);
  var cylinderPastedCnt = useRef(1);

  const pasteSavedModel = async () => {
    setShowContextMenu(false);
    let objs: any = [];
    savedModels.map(async (savedModel, index) => {
      let savedModelObj: any = savedModel.object;
      if (savedModel.type == "element") {
        objs.push({
          ...savedModel,
          number: getElementNumber() + index,
          name:
            "Element " +
            (getElementNumber() + index) +
            " (" +
            savedModelObj.resistance +
            " Ω, " +
            savedModelObj.inductance +
            " H, " +
            savedModelObj.capacitance +
            " F)",
          id: uuid(),
          selected: false,
          status: "Added",
        });
      } else if (savedModel.type == "port") {
        objs.push({
          ...savedModel,
          number: getPortNumber() + index,
          name:
            "Port " +
            (getPortNumber() + index) +
            " (" +
            savedModelObj.impedance +
            " Ω)",
          id: uuid(),
          selected: false,
          status: "Added",
        });
      } else if (savedModel.type == "distance") {
        objs.push({
          ...savedModel,
          number: getDistanceNumber() + index,
          name:
            "Distance " +
            (getDistanceNumber() + index) +
            " (" +
            Number(
              Math.sqrt(
                Math.pow(savedModelObj.x.max - savedModelObj.x.min, 2) +
                Math.pow(savedModelObj.y.max - savedModelObj.y.min, 2) +
                Math.pow(savedModelObj.z.max - savedModelObj.z.min, 2)
              ).toFixed(3)
            ).toString() +
            " " +
            simulationProperties.dimensionsUnit.replace("um", "μm") +
            ")",
          id: uuid(),
          selected: false,
          status: "Added",
        });
      } else {
        let cnt = 1;
        if (savedModel.type === "cube") {
          cnt = cubePastedCnt.current;
          cubePastedCnt.current++;
        } else if (savedModel.type === "sphere") {
          cnt = spherePastedCnt.current;
          spherePastedCnt.current++;
        } else if (savedModel.type === "cylinder") {
          cnt = cylinderPastedCnt.current;
          cylinderPastedCnt.current++;
        }
        objs.push({
          ...savedModel,
          name: savedModel.name + "_" + cnt,
          id: uuid(),
          selected: false,
          status: "Added",
        });
      }
    });
    objs.map(async (obj: any) => {
      if (obj.parentId != 0 && obj.category === "Objects") {
        savedModels.map((model: any, j: number) => {
          if (obj.parentId === model?.id && model.category === "Objects")
            obj.parentId = objs[j]?.id;
        });
      }
      dispatch(modelAdded(obj));
      await dispatch(
        addHistory({
          payloadData: {
            paste: {
              ...obj,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
    });
  };

  const [cubeMenuVisible, setCubeMenuVisible] = useState(false);
  const [sphereMenuVisible, setSphereMenuVisible] = useState(false);
  const [cylinderMenuVisible, setCylinderMenuVisible] = useState(false);
  const [lumpedPortMenuVisible, setLumpedPortMenuVisible] = useState(false);
  const [lumpedElementMenuVisible, setLumpedElementMenuVisible] =
    useState(false);
  const [distanceMenuVisible, setDistanceMenuVisible] = useState(false);

  const showPropertyMenu = (e: any, type: string) => {
    setCubeMenuVisible(false);
    setSphereMenuVisible(false);
    setCylinderMenuVisible(false);
    setLumpedPortMenuVisible(false);
    setLumpedElementMenuVisible(false);

    if (type === "cube") {
      setCubeMenuVisible(true);
    } else if (type === "sphere") {
      setSphereMenuVisible(true);
    } else if (type === "cylinder") {
      setCylinderMenuVisible(true);
    } else if (type === "port") {
      setLumpedPortMenuVisible(true);
    } else if (type === "element") {
      setLumpedElementMenuVisible(true);
    } else if (type === "distance") {
      setDistanceMenuVisible(true);
    }
  };

  const selectedModels = models.filter(
    (model: any) => model.selected && model.type != "folder"
  );
  let clickedObject = {} as any;
  if (selectedModels[0]) {
    clickedObject = selectedModels[0];
  } else if (savedModels[0]) {
    clickedObject = savedModels[0];
  }

  useEffect(() => {
    if (showContextMenu) {
      if (Object.keys(clickedObject).length !== 0) {
        setActiveContextMenu(clickedObject.category, 2);
      }
    } else {
      setActiveContextMenu("", 0);
    }
  }, [showContextMenu]);

  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [isShiftOrCtrlPressed, setIsShiftOrCtrlPressed] = useState(false);

  const getCursorStyle = () => {
    if (isCameraPanning || isShiftOrCtrlPressed) {
      return "cursor-move";
    } else if (isDragging) {
      return "cursor-grabbing";
    } else {
      return "cursor-crosshair";
    }
  };

  return (
    <div
      className={`relative z-10 w-full h-full max-h-full border-t-2 border-[#EAECF0] ${getCursorStyle()}`}
      id="canvas"
    >
      <canvas
        className="focus:outline-none w-full max-h-full"
        id="renderCanvas"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Context menu logic is now handled in onPointerUp
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1 && (e.shiftKey || e.ctrlKey)) {
            setIsCameraPanning(true);
          } else if (e.buttons === 2) {
            setIsCameraPanning(true);
            setHasMoved(true);
          } else if (e.buttons === 0) {
            setIsCameraPanning(false);
          }
        }}
        onPointerDown={(e) => {
          if (e.button === 0) {
            // Left mouse button
            setIsDragging(true);
          }
          if (e.shiftKey || e.ctrlKey || e.button === 2) {
            setIsCameraPanning(true);
          }
        }}
        onPointerUp={(e) => {
          if (e.button === 0) {
            // Left mouse button
            setIsDragging(false);
          }
          if (!e.shiftKey && !e.ctrlKey) {
            setIsCameraPanning(false);
          }
          if (e.button === 2 && !hasMoved) {
            setContextMenuPosition({ x: e.pageX, y: e.pageY });
            setShowContextMenu(true);
            if (Object.keys(clickedObject).length > 0) {
              setActiveContextMenu(clickedObject.category, 2);
            }
          }
          setHasMoved(false);
        }}
        onKeyDown={(e) => {
          if (e.shiftKey || e.ctrlKey) {
            setIsShiftOrCtrlPressed(true);
          }
        }}
        onKeyUp={(e) => {
          if (!(e.shiftKey || e.ctrlKey)) {
            setIsShiftOrCtrlPressed(false);
          }
        }}
      ></canvas>
      {tabIndex.selectedTab == 0 && <ParametersBar isParameterUsed={(paramId: string) => isParameterUsed(paramId)} />}
      {tabIndex.selectedTab == 1 && <FooterBar />}

      <ContextMenu
        visible={
          showContextMenu &&
          activeContextMenu === clickedObject.category &&
          contextMenuLocation === 2
        }
        menuPosition={contextMenuPosition}
        models={models.filter(
          (model) =>
            model.category === clickedObject.category &&
            model.selected &&
            model.type != "folder"
        )}
        isMultiSelect={
          models.filter(
            (model: any) => model.selected && model.type != "folder"
          ).length !== 1
        }
        clickedObject={clickedObject}
        exportObject={() => { }}
        showPropertyMenu={showPropertyMenu}
        pasteSavedModel={pasteSavedModel}
        materialMenuVisible={materialMenuVisible}
        setMaterialMenuVisible={setMaterialMenuVisible}
        mainScene={mainScene}
      />

      <CubeMenu
        visible={cubeMenuVisible}
        setVisible={(value: boolean) => setCubeMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <SphereMenu
        visible={sphereMenuVisible}
        setVisible={(value: boolean) => setSphereMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <CylinderMenu
        visible={cylinderMenuVisible}
        setVisible={(value: boolean) => setCylinderMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <LumpedPortMenu
        portLength={
          models.filter((model: any) => model.type === "Ports").length
        }
        // portLength={1}
        visible={lumpedPortMenuVisible}
        // addLumpedPort={addPort}
        setVisible={(value: boolean) => setLumpedPortMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <LumpedElementMenu
        elementLength={
          models.filter((model: any) => model.type === "Lumped Elements").length
        }
        // elementLength={1}
        visible={lumpedElementMenuVisible}
        // addLumpedElement={addElement}
        setVisible={(value: boolean) => setLumpedElementMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <DistanceMenu
        distanceLength={
          models.filter((model: any) => model.type === "Distance").length
        }
        // distanceLength={1}
        visible={distanceMenuVisible}
        // addDistance={addDistance}
        setVisible={(value: boolean) => setDistanceMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <CreateMaterialMenu
        visible={materialMenuVisible}
        setVisible={setMaterialMenuVisible}
      />
    </div>
  );
}

export default MainScene;
export { scene };
