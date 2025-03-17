import * as React from "react";
import { useState, useEffect } from "react";
import * as BABYLON from "babylonjs";
import { useAppDispatch, useAppSelector } from "state/hooks";
import {
  Model,
  selectFirstSelected,
  selectModels,
  setFirstSelected,
  modelAltered,
  modelAdded,
} from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import { GizmoManager, Vector3 } from "babylonjs";
import DraggableModal from "components/DraggableModal";
import { calculate, replaceParametersToIds, replaceIdsToParameters, isParameter, round, centralPos, wait } from "utilities";
import { selectParameters } from "state/reducers/parametersSlice";
import { v4 as uuid } from "uuid";
import { selectClassifiedMesh } from "state/reducers/classifiedMeshSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectUsername } from "state/reducers/authSlice";
import { selectRefresh, setRefresh } from "state/reducers/refreshSlice";
import { useParams } from "react-router-dom";

export interface RotateProps {
  visible: boolean;
  setVisible: (value: boolean) => void;
  mainScene: BABYLON.Scene | any;
}

let gizmoManager: GizmoManager | null = null;

function RotateMenu({ visible, setVisible, mainScene }: RotateProps) {
  const [xAxis, setXAxis] = useState("0");
  const [yAxis, setYAxis] = useState("0");
  const [zAxis, setZAxis] = useState("0");
  const [factor, setFactor] = useState("1");
  const [xOrigin, setXOrigin] = useState("0");
  const [yOrigin, setYOrigin] = useState("0");
  const [zOrigin, setZOrigin] = useState("0");
  const [isShapeCenter, setIsShapeCenter] = useState(true);
  const [isRotationChanged, setIsRotationChanged] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [isCanCopy, setIsCanCopy] = useState(false);

  const models = useAppSelector(selectModels);
  const refresh = useAppSelector(selectRefresh);
  const modelsToDraw = Object.values(models);
  const arrayModel = modelsToDraw.flat();
  const dispatch = useAppDispatch();
  const firstSelected: any = useAppSelector(selectFirstSelected);
  const parameters = useAppSelector(selectParameters);
  const baseRotation: any = React.useRef({});
  const basePosition: any = React.useRef({});
  const username = useAppSelector(selectUsername);
  const { projectId } = useParams<{ projectId: string }>();

  const [isValid, setIsValid] = useState(true);
  const validateFields = () => {
    try {
      if (
        isNaN(parseFloat(calculate(replaceParametersToIds(xAxis, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(yAxis, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(zAxis, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(xOrigin, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(yOrigin, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(zOrigin, parameters), parameters).toString())) || 
        isNaN(parseInt(calculate(replaceParametersToIds(factor.toString(), parameters), parameters).toString()))
      ) {
        setIsValid(false);
        return;
      }

      setIsValid(true);
    } catch (error) {
      setIsValid(false);
    }
  };

  useEffect(() => {
    validateFields();
  }, [
    xAxis,
    yAxis,
    zAxis,
    isCanCopy,
    isShapeCenter,
    factor,
    xOrigin,
    yOrigin,
    zOrigin,
  ]);

  useEffect(() => {
    if (visible) {
      setSelectedModels(arrayModel.filter((model) => model.selected && model.type != "folder"));
      const keyDownFunc = (event: any) => {
        if (visible) {
          if (event.key == "Escape") {
            document.getElementById("rotate-cancel-btn")?.click();
            document.removeEventListener("keydown", keyDownFunc);
          } else if (event.key == "Enter") {
            document.getElementById("rotate-ok-btn")?.click();
            document.removeEventListener("keydown", keyDownFunc);
          }
        }
      };
      document.addEventListener("keydown", keyDownFunc);
    }
  }, [visible]);

  useEffect(() => {
    if (mainScene && !gizmoManager) {
      gizmoManager = new GizmoManager(mainScene);
    }
  }, [mainScene]);

  useEffect(() => {
    if (visible) {
      if (gizmoManager) {
        gizmoManager.rotationGizmoEnabled = true;
      }

      let selectedMesh = mainScene.getMeshById(firstSelected);
      let tSelectedModels = arrayModel.filter((model) => model.selected && model.type != "folder");
      if (selectedMesh && gizmoManager) {
        // gizmoManager.attachToMesh(selectedMesh);
        [
          gizmoManager.gizmos.rotationGizmo?.xGizmo,
          gizmoManager.gizmos.rotationGizmo?.yGizmo,
          gizmoManager.gizmos.rotationGizmo?.zGizmo,
        ].map((gizmo: any) => {
          if (gizmo) gizmo.updateGizmoRotationToMatchAttachedMesh = false;
        });

        if (!selectedMesh.parent) {
          let parent = new BABYLON.Mesh("parent", mainScene);
          parent.setBoundingInfo(
            new BABYLON.BoundingInfo(
              new BABYLON.Vector3(0, 0, 0),
              new BABYLON.Vector3(0, 0, 0)
            )
          );
          parent.position = new BABYLON.Vector3(
            centralPos(tSelectedModels, mainScene).x,
            centralPos(tSelectedModels, mainScene).y,
            centralPos(tSelectedModels, mainScene).z
          );

          tSelectedModels.map((m: any) => {
            let mesh = mainScene.getMeshById(m.id);
            mesh.parent = parent;
            mesh.position.x -= parent.position.x;
            mesh.position.y -= parent.position.y;
            mesh.position.z -= parent.position.z;
          });

          gizmoManager.attachToMesh(parent);

          gizmoManager.gizmos.rotationGizmo?.xGizmo.dragBehavior.onDragObservable.add(
            (e) => {
              let mesh: any = gizmoManager?.gizmos.rotationGizmo?.attachedMesh;
              setXAxis(round((mesh.rotation.x * 180) / Math.PI).toString());
              setYAxis(round((mesh.rotation.y * 180) / Math.PI).toString());
              setZAxis(round((mesh.rotation.z * 180) / Math.PI).toString());
            }
          );
          gizmoManager.gizmos.rotationGizmo?.yGizmo.dragBehavior.onDragObservable.add(
            (e) => {
              let mesh: any = gizmoManager?.gizmos.rotationGizmo?.attachedMesh;
              setXAxis(round((mesh.rotation.x * 180) / Math.PI).toString());
              setYAxis(round((mesh.rotation.y * 180) / Math.PI).toString());
              setZAxis(round((mesh.rotation.z * 180) / Math.PI).toString());
            }
          );
          gizmoManager.gizmos.rotationGizmo?.zGizmo.dragBehavior.onDragObservable.add(
            (e) => {
              let mesh: any = gizmoManager?.gizmos.rotationGizmo?.attachedMesh;
              setXAxis(round((mesh.rotation.x * 180) / Math.PI).toString());
              setYAxis(round((mesh.rotation.y * 180) / Math.PI).toString());
              setZAxis(round((mesh.rotation.z * 180) / Math.PI).toString());
            }
          );
        }
      }
    } else {
      if (gizmoManager) {
        gizmoManager.positionGizmoEnabled = false;
        gizmoManager.rotationGizmoEnabled = false;
        gizmoManager.scaleGizmoEnabled = false;
      }
    }
  }, [selectedModels, visible, mainScene]);

  useEffect(() => {
    try {
      let attachedMesh: any = gizmoManager?.gizmos.rotationGizmo?.attachedMesh;
      if (attachedMesh) {
        let parentPos = isShapeCenter
          ? new BABYLON.Vector3(
              centralPos(selectedModels, mainScene).x,
              centralPos(selectedModels, mainScene).y,
              centralPos(selectedModels, mainScene).z
            )
          : new BABYLON.Vector3(
              calculate(replaceParametersToIds(xOrigin, parameters), parameters),
              calculate(replaceParametersToIds(yOrigin, parameters), parameters),
              calculate(replaceParametersToIds(zOrigin, parameters), parameters)
            );
        selectedModels.map((model) => {
          let mesh = mainScene.getMeshById(model.id);
          mesh.position.x -= parentPos.x - mesh.parent.position.x;
          mesh.position.y -= parentPos.y - mesh.parent.position.y;
          mesh.position.z -= parentPos.z - mesh.parent.position.z;
        });
        attachedMesh.position = parentPos;
        gizmoManager?.attachToMesh(attachedMesh);
        console.log(attachedMesh.position);
      }
    } catch (err) {
      // toast.error("Invalid properties. Please try again.", {
      //   toastId: "error",
      // });
    }
  }, [isShapeCenter, xOrigin, yOrigin, zOrigin]);

  const isMultipleSelected = () => {
    if (selectedModels.length <= 1) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (visible) {
      setXAxis("0");
      setYAxis("0");
      setZAxis("0");
      setFactor("1");
      setIsCanCopy(false);
      setIsShapeCenter(true);
      setXOrigin("0");
      setYOrigin("0");
      setZOrigin("0");
      Object.assign(
        basePosition.current,
        centralPos(selectedModels, mainScene)
      );
    }
  }, [selectedModels, visible]);

  // useEffect(() => {
  //   if (isRotationChanged && mainScene && mainScene !== null) {
  //     if (isMultipleSelected()) {
  //       const currentRotation = selectedModels.find(
  //         (model) => model.id === firstSelected
  //       )?.rotation;
  //       if (currentRotation) {
  //         try {
  //           selectedModels.map((model) => {
  //             const mesh = mainScene.getMeshById(model.id);
  //             if (mesh) {
  //               mesh.rotation = new Vector3(
  //                 model.rotation.x +
  //                   (calculate(xAxis, parameters) * Math.PI) / 180,
  //                 model.rotation.y +
  //                   (calculate(yAxis, parameters) * Math.PI) / 180,
  //                 model.rotation.z +
  //                   (calculate(zAxis, parameters) * Math.PI) / 180
  //               );
  //             }
  //           });
  //         } catch (err) {
  //           toast.error("please input correct value");
  //           return;
  //         }
  //       }
  //     } else {
  //       const mesh = mainScene.getMeshById(firstSelected);
  //       try {
  //         isShapeCenter
  //           ? mesh.setPivotMatrix(BABYLON.Matrix.Translation(0, 0, 0))
  //           : mesh.setPivotMatrix(
  //               BABYLON.Matrix.Translation(
  //                 -calculate(xOrigin, parameters),
  //                 -calculate(yOrigin, parameters),
  //                 -calculate(zOrigin, parameters)
  //               )
  //             );
  //         mesh.rotation = new Vector3(
  //           (calculate(xAxis, parameters) * Math.PI) / 180,
  //           (calculate(yAxis, parameters) * Math.PI) / 180,
  //           (calculate(zAxis, parameters) * Math.PI) / 180
  //         );
  //       } catch (err) {
  //         toast.error("please input correct value");
  //         return;
  //       }
  //     }
  //     setIsRotationChanged(false);
  //   }
  // }, [xAxis, yAxis, zAxis, xOrigin, yOrigin, zOrigin, isRotationChanged]);

  const handleXAxisChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) setIsRotationChanged(true);
    setXAxis(e.target.value);
  };

  const handleYAxisChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) setIsRotationChanged(true);
    setYAxis(e.target.value);
  };

  const handleZAxisChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) setIsRotationChanged(true);
    setZAxis(e.target.value);
  };

  const handleFactorChanges = (e: any) => {
    setFactor(e.target.value);
  };

  const handleXOriginChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) setIsRotationChanged(true);
    setXOrigin(e.target.value);
  };

  const handleYOriginChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) setIsRotationChanged(true);
    setYOrigin(e.target.value);
  };

  const handleZOriginChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) setIsRotationChanged(true);
    setZOrigin(e.target.value);
  };

  const handleIsCanCopyChanges = (e: any) => {
    setIsCanCopy(e.target.checked);
  };

  const handleIsShapeCenterChanges = (e: any) => {
    setIsRotationChanged(true);
    setIsShapeCenter(e.target.checked);
  };

  const handleOk = async (e: any) => {
    let attachedMesh: any = gizmoManager?.gizmos.rotationGizmo?.attachedMesh;
    attachedMesh.position = new BABYLON.Vector3(
      basePosition.current._x,
      basePosition.current._y,
      basePosition.current._z
    );
    attachedMesh.rotation = new BABYLON.Vector3(0, 0, 0);
    if (isMultipleSelected()) {
      try {
        for (let i = 0; i < selectedModels.length; i++) {
          attachedMesh.rotation = new BABYLON.Vector3(0, 0, 0);
          let idArray = [];
          let model = selectedModels[i];
          if (isCanCopy) {
            let mesh = mainScene.getMeshById(model.id);
            for (let j = 1; j <= calculate(replaceParametersToIds(factor, parameters), parameters); j++) {
              attachedMesh.rotation = new BABYLON.Vector3(
                ((calculate(replaceParametersToIds(xAxis, parameters), parameters) * Math.PI) / 180) * j,
                ((calculate(replaceParametersToIds(yAxis, parameters), parameters) * Math.PI) / 180) * j,
                ((calculate(replaceParametersToIds(zAxis, parameters), parameters) * Math.PI) / 180) * j
              );
              await wait(100);
              let position = mesh.absolutePosition;
              let rotation = mesh.absoluteRotationQuaternion.toEulerAngles();

              let id = uuid();
              idArray.push(id);
              await dispatch(
                modelAdded({
                  ...model,
                  id: id,
                  name: model?.name + "_" + j,
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
                  origin: {
                    x: isShapeCenter
                      ? centralPos(selectedModels, mainScene).x
                      : xOrigin,
                    y: isShapeCenter
                      ? centralPos(selectedModels, mainScene).y
                      : yOrigin,
                    z: isShapeCenter
                      ? centralPos(selectedModels, mainScene).z
                      : zOrigin,
                  },
                  mergedMeshId:
                    model.type === "mergedMesh" ? model.id : undefined,
                })
              );
            }
          } else {
            let mesh = mainScene.getMeshById(model.id);
            attachedMesh.rotation = new BABYLON.Vector3(
              (calculate(replaceParametersToIds(xAxis, parameters), parameters) * Math.PI) / 180,
              (calculate(replaceParametersToIds(yAxis, parameters), parameters) * Math.PI) / 180,
              (calculate(replaceParametersToIds(zAxis, parameters), parameters) * Math.PI) / 180
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
                origin: {
                  x: isShapeCenter
                    ? centralPos(selectedModels, mainScene).x
                    : xOrigin,
                  y: isShapeCenter
                    ? centralPos(selectedModels, mainScene).y
                    : yOrigin,
                  z: isShapeCenter
                    ? centralPos(selectedModels, mainScene).z
                    : zOrigin,
                },
                selected: false,
              })
            );
          }
          await dispatch(
            addHistory({
              payloadData: {
                rotate: {
                  name: model.name,
                  id: model.id,
                  xAxis: replaceParametersToIds(xAxis, parameters),
                  yAxis: replaceParametersToIds(yAxis, parameters),
                  zAxis: replaceParametersToIds(zAxis, parameters),
                  xOrigin: isShapeCenter
                    ? centralPos(selectedModels, mainScene).x
                    : replaceParametersToIds(xOrigin, parameters),
                  yOrigin: isShapeCenter
                    ? centralPos(selectedModels, mainScene).y
                    : replaceParametersToIds(yOrigin, parameters),
                  zOrigin: isShapeCenter
                    ? centralPos(selectedModels, mainScene).z
                    : replaceParametersToIds(zOrigin, parameters),
                  isShapeCenter: isShapeCenter,
                  isCanCopy: isCanCopy,
                  factor: replaceParametersToIds(factor, parameters),
                  idArray: isCanCopy ? idArray : undefined,
                },
              },
              currentUsername: username,
              projectId: projectId || "",
            })
          );
        }

        selectedModels.map((model) => {
          let m = mainScene.getMeshById(model.id);
          m.parent = null;
          if (isCanCopy) {
            m.position.x += attachedMesh.position.x;
            m.position.y += attachedMesh.position.y;
            m.position.z += attachedMesh.position.z;
          }
        });
        setVisible(false);
        dispatch(setFirstSelected(undefined));
        await dispatch(setRefresh({ refresh: refresh + 1 }));
        return;
      } catch (err) {
        toast.error("Invalid properties. Please try again.", {
          toastId: "error",
        });
        return;
      }
    } else {
      const firstSelectedModel: any = arrayModel.find(
        (model) => model.id === firstSelected
      );
      const mesh = mainScene.getMeshById(firstSelected);

      let idArray = [];
      if (isCanCopy) {
        for (let i = 1; i <= calculate(replaceParametersToIds(factor, parameters), parameters); i++) {
          attachedMesh.rotation = new BABYLON.Vector3(
            ((calculate(replaceParametersToIds(xAxis, parameters), parameters) * Math.PI) / 180) * i,
            ((calculate(replaceParametersToIds(yAxis, parameters), parameters) * Math.PI) / 180) * i,
            ((calculate(replaceParametersToIds(zAxis, parameters), parameters) * Math.PI) / 180) * i
          );
          await wait(100);
          let position = mesh.absolutePosition;
          let rotation = mesh.absoluteRotationQuaternion.toEulerAngles();
          let id = uuid();
          idArray.push(id);
          await dispatch(
            modelAdded({
              ...firstSelectedModel,
              id: id,
              name: firstSelectedModel?.name + "_" + i,
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
              origin: {
                x: isShapeCenter
                  ? centralPos(selectedModels, mainScene).x
                  : xOrigin,
                y: isShapeCenter
                  ? centralPos(selectedModels, mainScene).y
                  : yOrigin,
                z: isShapeCenter
                  ? centralPos(selectedModels, mainScene).z
                  : zOrigin,
              },
              mergedMeshId:
                firstSelectedModel.type === "mergedMesh"
                  ? firstSelectedModel.id
                  : undefined,
            })
          );
        }
      } else {
        attachedMesh.rotation = new BABYLON.Vector3(
          (calculate(replaceParametersToIds(xAxis, parameters), parameters) * Math.PI) / 180,
          (calculate(replaceParametersToIds(yAxis, parameters), parameters) * Math.PI) / 180,
          (calculate(replaceParametersToIds(zAxis, parameters), parameters) * Math.PI) / 180
        );
        await wait(100);
        let position = mesh.absolutePosition;
        let rotation = mesh.absoluteRotationQuaternion.toEulerAngles();
        await dispatch(
          modelAltered({
            ...firstSelectedModel,
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
      mesh.position.x += attachedMesh.position.x;
      mesh.position.y += attachedMesh.position.y;
      mesh.position.z += attachedMesh.position.z;
      await dispatch(
        addHistory({
          payloadData: {
            rotate: {
              name: firstSelectedModel.name,
              id: firstSelectedModel.id,
              xAxis: replaceParametersToIds(xAxis, parameters),
              yAxis: replaceParametersToIds(yAxis, parameters),
              zAxis: replaceParametersToIds(zAxis, parameters),
              xOrigin: isShapeCenter
                ? centralPos(selectedModels, mainScene).x
                : replaceParametersToIds(xOrigin, parameters),
              yOrigin: isShapeCenter
                ? centralPos(selectedModels, mainScene).y
                : replaceParametersToIds(yOrigin, parameters),
              zOrigin: isShapeCenter
                ? centralPos(selectedModels, mainScene).z
                : replaceParametersToIds(zOrigin, parameters),
              isShapeCenter: isShapeCenter,
              isCanCopy: isCanCopy,
              factor: replaceParametersToIds(factor, parameters),
              idArray: isCanCopy ? idArray : undefined,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
    }
    setVisible(false);
    await dispatch(setRefresh({ refresh: refresh + 1 }));
    // dispatch(setFirstSelected(undefined));
  };

  const handleCancel = (e: any) => {
    let attachedMesh = gizmoManager?.gizmos.rotationGizmo?.attachedMesh;
    selectedModels.map((model) => {
      let mesh = mainScene.getMeshById(model.id);
      mesh.position.x += attachedMesh?.position.x;
      mesh.position.y += attachedMesh?.position.y;
      mesh.position.z += attachedMesh?.position.z;
      mesh.parent = null;
    });
    setVisible(false);
    // dispatch(setFirstSelected(undefined));
  };

  return (
    <DraggableModal
      title={
        <div className="pointer-events-auto cursor-pointer bg-red-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-gray-800">
          Rotate
        </div>
      }
      visible={visible}
      buttons={
        <div className="flex flex-row gap-1 justify-center">
          <button
            onClick={handleOk}
            id="rotate-ok-btn"
            disabled={!isValid}
            className={`rounded text-center px-4 py-1 disable-drag ${
              isValid
                ? "bg-green-300 hover:bg-green-400 active:bg-green-500"
                : "bg-[#D9D9D9]"
            }`}
          >
            OK
          </button>
          <button
            onClick={handleCancel}
            id="rotate-cancel-btn"
            className="bg-red-300 hover:bg-red-400 active:bg-red-500 rounded text-center px-4 py-1 disable-drag"
          >
            Cancel
          </button>
        </div>
      }
    >
      <form>
        <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-3">
          <div className="col-span-full flex items-center">
            <label
              htmlFor="xAxis"
              className="flex text-sm font-large leading-6 text-gray-900 mr-2"
            >
              X
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="xAxis"
                value={xAxis}
                onChange={handleXAxisChanges}
                id="xAxis"
                autoComplete="off"
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
            <label
              htmlFor="xAxis"
              className="flex text-sm font-large leading-6 text-gray-900 ml-2"
            >
              deg
            </label>
          </div>
          <div className="col-span-full flex items-center">
            <label
              htmlFor="yAxis"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              Y
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="yAxis"
                value={yAxis}
                onChange={handleYAxisChanges}
                id="yAxis"
                autoComplete="off"
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
            <label
              htmlFor="xAxis"
              className="flex text-sm font-large leading-6 text-gray-900 ml-2"
            >
              deg
            </label>
          </div>
          <div className="col-span-full flex items-center">
            <label
              htmlFor="xOrigin"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              Z
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="zAxis"
                value={zAxis}
                onChange={handleZAxisChanges}
                id="zAxis"
                autoComplete="off"
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
            <label
              htmlFor="xAxis"
              className="flex text-sm font-large leading-6 text-gray-900 ml-2"
            >
              deg
            </label>
          </div>
          <div className="col-span-full flex items-center">
            <label
              htmlFor="factor"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              Factor
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="factor"
                value={factor}
                onChange={handleFactorChanges}
                id="factor"
                autoComplete="off"
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
          </div>
          <div className="accent-primary-600 col-span-full flex items-center">
            <label
              htmlFor="copy"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              Copy
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="checkbox"
                name="copy"
                onChange={handleIsCanCopyChanges}
                id="copy"
                autoComplete="off"
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                checked={isCanCopy}
              />
            </div>
          </div>
          <div className="accent-primary-600 col-span-full flex items-center">
            <label
              htmlFor="shapeCenter"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              Shape Center
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="checkbox"
                name="shapeCenter"
                onChange={handleIsShapeCenterChanges}
                id="shapeCenter"
                autoComplete="off"
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                checked={isShapeCenter}
              />
            </div>
          </div>
          <div className="col-span-full flex items-center">
            <label
              htmlFor="zAxis"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              XOrigin
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="xOrigin"
                value={xOrigin}
                onChange={handleXOriginChanges}
                id="xOrigin"
                autoComplete="off"
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                disabled={isShapeCenter}
              />
            </div>
          </div>

          <div className="col-span-full flex items-center">
            <label
              htmlFor="yOrigin"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              YOrigin
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="yOrigin"
                value={yOrigin}
                onChange={handleYOriginChanges}
                id="yOrigin"
                autoComplete="off"
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                disabled={isShapeCenter}
              />
            </div>
          </div>

          <div className="col-span-full flex items-center">
            <label
              htmlFor="zOrigin"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              ZOrigin
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="zOrigin"
                value={zOrigin}
                onChange={handleZOriginChanges}
                id="zOrigin"
                autoComplete="off"
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                disabled={isShapeCenter}
              />
            </div>
          </div>
        </div>
      </form>
    </DraggableModal>
    // <Draggable>
    //   <div
    //     style={{ left: menuPosition.x, top: menuPosition.y }}
    //     className="absolute bg-white w-fit rounded shadow z-10"
    //   >
    //     <h1 className="cursor-pointer bg-red-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-gray-800">
    //       Rotate
    //     </h1>
    //     <div className="flex flex-col p-2">
    //       <div className="flex flex-col px-2 py-2 space-y-2">
    //         <div className="flex flex-row gap-4 items-center">
    //           <label className="text-center">X Axis:</label>
    //           <input
    //             type="text"
    //             step="0.01"
    //             name="xAxis"
    //             value={xAxis}
    //             onChange={handleXAxisChanges}
    //             className="w-32 px-1 py-1 border rounded-sm"
    //           />
    //         </div>
    //         <div className="flex flex-row gap-4 items-center">
    //           <label className="text-center">Y Axis:</label>
    //           <input
    //             type="text"
    //             step="0.01"
    //             name="yAxis"
    //             value={yAxis}
    //             onChange={handleYAxisChanges}
    //             className="w-32 px-1 py-1 border rounded-sm"
    //           />
    //         </div>
    //         <div className="flex flex-row gap-4 items-center">
    //           <label className="text-center">Z Axis:</label>
    //           <input
    //             type="text"
    //             step="0.01"
    //             name="zAxis"
    //             value={zAxis}
    //             onChange={handleZAxisChanges}
    //             className="w-32 px-1 py-1 border rounded-sm"
    //           />
    //         </div>
    //         <div className="flex flex-row gap-1 justify-center pt-4">
    //           <button
    //             onClick={handleOk}
    //             className="bg-green-300 hover:bg-green-400 rounded text-center px-4 py-1"
    //           >
    //             OK
    //           </button>
    //           <button
    //             onClick={handleCancel}
    //             className="bg-red-300 hover:bg-red-400 rounded text-center px-4 py-1"
    //           >
    //             Cancel
    //           </button>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </Draggable>
  );
}

export default RotateMenu;
