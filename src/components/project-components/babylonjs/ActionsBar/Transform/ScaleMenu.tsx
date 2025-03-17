import * as React from "react";
import { useState, useEffect } from "react";
import * as BABYLON from "babylonjs";
import { GizmoManager, Vector3 } from "babylonjs";
import { useAppSelector, useAppDispatch } from "state/hooks";
import {
  Model,
  selectModels,
  selectFirstSelected,
  modelAdded,
  modelAltered,
  setFirstSelected,
} from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import DraggableModal from "components/DraggableModal";
import { calculate, replaceParametersToIds, replaceIdsToParameters, isParameter, round, wait } from "utilities";
import { selectParameters } from "state/reducers/parametersSlice";
import { v4 as uuid } from "uuid";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectUsername } from "state/reducers/authSlice";
import { selectRefresh, setRefresh } from "state/reducers/refreshSlice";
import { useParams } from "react-router-dom";

export interface ScaleProps {
  visible: boolean;
  setVisible: (value: boolean) => void;
  mainScene: BABYLON.Scene | any;
}

let gizmoManager: GizmoManager | null = null;

function ScaleMenu({ visible, setVisible, mainScene }: ScaleProps) {
  const [xAxis, setXAxis] = useState("1");
  const [yAxis, setYAxis] = useState("1");
  const [zAxis, setZAxis] = useState("1");
  const [factor, setFactor] = useState("1");
  const [isScalingChanged, setIsScalingChanged] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [isCanCopy, setIsCanCopy] = useState(false);

  const models = useAppSelector(selectModels);
  const refresh = useAppSelector(selectRefresh);
  const modelsToDraw = Object.values(models);
  const arrayModel = modelsToDraw.flat();
  const dispatch = useAppDispatch();
  const firstSelected: any = useAppSelector(selectFirstSelected);
  const parameters = useAppSelector(selectParameters);
  const baseScale: any = React.useRef({});

  const username = useAppSelector(selectUsername);
  const { projectId } = useParams<{ projectId: string }>();

  const [isValid, setIsValid] = useState(true);
  const validateFields = () => {
    try {
      if (
        isNaN(parseFloat(calculate(replaceParametersToIds(xAxis, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(yAxis, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(zAxis, parameters), parameters).toString())) ||
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
  }, [xAxis, yAxis, zAxis, factor, isCanCopy]);

  useEffect(() => {
    if (mainScene && !gizmoManager) {
      gizmoManager = new GizmoManager(mainScene);
    }
  }, [mainScene]);

  useEffect(() => {
    if (visible) {
      const keyDownFunc = (event: any) => {
        if (visible) {
          if (event.key == "Escape") {
            document.getElementById("scale-cancel-btn")?.click();
            document.removeEventListener("keydown", keyDownFunc);
          } else if (event.key == "Enter") {
            document.getElementById("scale-ok-btn")?.click();
            document.removeEventListener("keydown", keyDownFunc);
          }
        }
      };
      document.addEventListener("keydown", keyDownFunc);
      if (gizmoManager) {
        gizmoManager.scaleGizmoEnabled = true;
      }

      let selectedMesh = mainScene.getMeshById(firstSelected);
      let parent: any;
      if (selectedMesh && gizmoManager) {
        if (isMultipleSelected()) {
          parent = new BABYLON.Mesh("parent", mainScene);
          parent.setBoundingInfo(
            new BABYLON.BoundingInfo(
              new BABYLON.Vector3(0, 0, 0),
              new BABYLON.Vector3(0, 0, 0)
            )
          );
          let parentPos: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 0);
          selectedModels.map((m: any) => {
            let mesh: any = mainScene.getMeshById(m.id);
            mesh.parent = parent;
            parentPos.x += mesh.position.x;
            parentPos.y += mesh.position.y;
            parentPos.z += mesh.position.z;
          });
          parent.position = new BABYLON.Vector3(
            round(parentPos?.x / selectedModels.length),
            round(parentPos?.y / selectedModels.length),
            round(parentPos?.z / selectedModels.length)
          );

          selectedModels.map((m: any) => {
            mainScene.getMeshById(m.id).position.x -= parent.position.x;
            mainScene.getMeshById(m.id).position.y -= parent.position.y;
            mainScene.getMeshById(m.id).position.z -= parent.position.z;
          });

          gizmoManager.attachToMesh(parent);
        } else {
          gizmoManager.attachToMesh(selectedMesh);
        }

        let bScale: any = {
          x: isMultipleSelected() ? parent.scaling.x : selectedMesh.scaling.x,
          y: isMultipleSelected() ? parent.scaling.y : selectedMesh.scaling.y,
          z: isMultipleSelected() ? parent.scaling.z : selectedMesh.scaling.z,
        };
        gizmoManager.gizmos.scaleGizmo?.xGizmo.dragBehavior.onDragObservable.add(
          (e) => {
            if (isMultipleSelected())
              setXAxis(round(parent.scaling.x / bScale.x).toString());
            else setXAxis(round(selectedMesh.scaling.x / bScale.x).toString());
          }
        );
        gizmoManager.gizmos.scaleGizmo?.yGizmo.dragBehavior.onDragObservable.add(
          (e) => {
            if (isMultipleSelected())
              setYAxis(round(parent.scaling.y / bScale.y).toString());
            else setYAxis(round(selectedMesh.scaling.y / bScale.y).toString());
          }
        );
        gizmoManager.gizmos.scaleGizmo?.zGizmo.dragBehavior.onDragObservable.add(
          (e) => {
            if (isMultipleSelected())
              setZAxis(round(parent.scaling.z / bScale.z).toString());
            else setZAxis(round(selectedMesh.scaling.z / bScale.z).toString());
          }
        );
        gizmoManager.gizmos.scaleGizmo?.uniformScaleGizmo.dragBehavior.onDragObservable.add(
          (e) => {
            if (isMultipleSelected()) {
              setXAxis(round(parent.scaling.x / bScale.x).toString());
              setYAxis(round(parent.scaling.y / bScale.y).toString());
              setZAxis(round(parent.scaling.z / bScale.z).toString());
            } else {
              setXAxis(round(selectedMesh.scaling.x / bScale.x).toString());
              setYAxis(round(selectedMesh.scaling.y / bScale.y).toString());
              setZAxis(round(selectedMesh.scaling.z / bScale.z).toString());
            }
          }
        );
      }
    } else {
      if (gizmoManager) {
        gizmoManager.positionGizmoEnabled = false;
        gizmoManager.rotationGizmoEnabled = false;
        gizmoManager.scaleGizmoEnabled = false;
      }
    }
  }, [visible, selectedModels, mainScene]);

  const isMultipleSelected = () => {
    if (selectedModels.length <= 1) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    setSelectedModels(arrayModel.filter((model) => model.selected && model.type != "folder"));
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setXAxis("1");
      setYAxis("1");
      setZAxis("1");
      setIsCanCopy(false);
      setFactor("1");
      let selectedMesh = mainScene.getMeshById(firstSelected);
      Object.assign(baseScale.current, selectedMesh.scaling);
    }
  }, [selectedModels, visible]);

  // useEffect(() => {
  //   if (isScalingChanged && mainScene && mainScene !== null) {
  //     if (isMultipleSelected()) {
  //       const currentPosition = selectedModels.find(
  //         (model) => model.id === firstSelected
  //       )?.scaling;
  //       if (currentPosition) {
  //         try {
  //           selectedModels.map((model) => {
  //             const mesh = mainScene.getMeshById(model.id);
  //             if (mesh) {
  //               mesh.scaling = new Vector3(
  //                 model.scaling.x * calculate(xAxis, parameters),
  //                 model.scaling.y * calculate(yAxis, parameters),
  //                 model.scaling.z * calculate(zAxis, parameters)
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
  //         console.log(firstSelected);
  //         mesh.scaling = new Vector3(
  //           mesh.scaling.x * calculate(xAxis, parameters),
  //           mesh.scaling.y * calculate(yAxis, parameters),
  //           mesh.scaling.z * calculate(zAxis, parameters)
  //         );
  //       } catch (err) {
  //         toast.error("please input correct value");
  //         return;
  //       }
  //     }
  //     setIsScalingChanged(false);
  //   }
  // }, [xAxis, yAxis, zAxis, isScalingChanged]);

  const handleXAxisChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) setIsScalingChanged(true);
    setXAxis(e.target.value);
  };

  const handleYAxisChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) setIsScalingChanged(true);
    setYAxis(e.target.value);
  };

  const handleZAxisChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) setIsScalingChanged(true);
    setZAxis(e.target.value);
  };

  const handleFactorChanges = (e: any) => {
    setFactor(e.target.value);
  };

  const handleIsCanCopyChanges = (e: any) => {
    setIsCanCopy(e.target.checked);
  };

  const handleOk = async (e: any) => {
    let attachedMesh: any = gizmoManager?.gizmos.scaleGizmo?.attachedMesh;
    let meshPositions: any = [];
    selectedModels.map((model) => {
      let mesh = mainScene.getMeshById(model.id);
      if (mesh.parent) {
        mesh.position.x += attachedMesh.position.x;
        mesh.position.y += attachedMesh.position.y;
        mesh.position.z += attachedMesh.position.z;
        meshPositions.push({
          x: mesh.absolutePosition.x,
          y: mesh.absolutePosition.y,
          z: mesh.absolutePosition.z,
        });
        mesh.parent = null;
      }
    });
    let modelIdArray: any = [];
    if (isMultipleSelected()) {
      try {
        for (let j = 0; j < selectedModels.length; j++) {
          let model = selectedModels[j];
          modelIdArray = [];
          let mesh = mainScene.getMeshById(model.id);
          if (isCanCopy) {
            for (let i = 1; i <= calculate(replaceParametersToIds(factor, parameters), parameters); i++) {
              let id = uuid();
              modelIdArray.push(id);
              let obj = {
                ...model,
                id: id,
                name: model?.name + "_2",
                scaling: {
                  x: mesh.scaling.x * Math.pow(calculate(replaceParametersToIds(xAxis, parameters), parameters), i),
                  y: mesh.scaling.y * Math.pow(calculate(replaceParametersToIds(yAxis, parameters), parameters), i),
                  z: mesh.scaling.z * Math.pow(calculate(replaceParametersToIds(zAxis, parameters), parameters), i),
                },
                status: "Added",
                selected: false,
                mergedMeshId:
                  model.type === "mergedMesh" ? model.id : undefined,
              };
              dispatch(modelAdded(obj));
            }
          } else {
            let obj = {
              ...model,
              position: {
                x: meshPositions[j].x,
                y: meshPositions[j].y,
                z: meshPositions[j].z,
              },
              scaling: {
                x: mesh.scaling.x * Math.pow(calculate(replaceParametersToIds(xAxis, parameters), parameters), calculate(replaceParametersToIds(factor, parameters), parameters)),
                y: mesh.scaling.y * Math.pow(calculate(replaceParametersToIds(yAxis, parameters), parameters), calculate(replaceParametersToIds(factor, parameters), parameters)),
                z: mesh.scaling.z * Math.pow(calculate(replaceParametersToIds(zAxis, parameters), parameters), calculate(replaceParametersToIds(factor, parameters), parameters)),
              },
              status: "Updated",
              selected: false,
            };
            dispatch(modelAltered(obj));
          }
          await dispatch(
            addHistory({
              payloadData: {
                scale: {
                  name: model.name,
                  id: model.id,
                  xAxis: replaceParametersToIds(xAxis, parameters),
                  yAxis: replaceParametersToIds(yAxis, parameters),
                  zAxis: replaceParametersToIds(zAxis, parameters),
                  position: {
                    x: meshPositions[j].x,
                    y: meshPositions[j].y,
                    z: meshPositions[j].z,
                  },
                  isCanCopy: isCanCopy,
                  factor: replaceParametersToIds(factor, parameters),
                  idArray: isCanCopy ? modelIdArray : undefined,
                },
              },
              currentUsername: username,
              projectId: projectId || "",
            })
          );
        }
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
      const firstSelectedModel = selectedModels[0];
      const mesh = mainScene.getMeshById(firstSelected);
      mesh.scaling.x = baseScale.current._x;
      mesh.scaling.y = baseScale.current._y;
      mesh.scaling.z = baseScale.current._z;

      if (isCanCopy) {
        for (let i = 1; i <= calculate(replaceParametersToIds(factor, parameters), parameters); i++) {
          let id = uuid();
          modelIdArray.push(id);
          let obj = {
            ...firstSelectedModel,
            id: id,
            name: firstSelectedModel?.name + "_2",
            scaling: {
              x:
                mesh.scaling.x *
                Math.pow(calculate(replaceParametersToIds(xAxis, parameters), parameters), i),
              y:
                mesh.scaling.y *
                Math.pow(calculate(replaceParametersToIds(yAxis, parameters), parameters), i),
              z:
                mesh.scaling.z *
                Math.pow(calculate(replaceParametersToIds(zAxis, parameters), parameters), i),
            },
            status: "Added",
            selected: false,
            mergedMeshId:
              firstSelectedModel.type === "mergedMesh"
                ? firstSelectedModel.id
                : undefined,
          };
          dispatch(modelAdded(obj));
        }
      } else {
        dispatch(
          modelAltered({
            ...firstSelectedModel,
            scaling: {
              x: mesh?.scaling?.x * Math.pow(calculate(replaceParametersToIds(xAxis, parameters), parameters), calculate(replaceParametersToIds(factor, parameters), parameters)),
              y: mesh?.scaling?.y * Math.pow(calculate(replaceParametersToIds(yAxis, parameters), parameters), calculate(replaceParametersToIds(factor, parameters), parameters)),
              z: mesh?.scaling?.z * Math.pow(calculate(replaceParametersToIds(zAxis, parameters), parameters), calculate(replaceParametersToIds(factor, parameters), parameters)),
            },
            status: "Updated",
            selected: false,
          })
        );
      }
      await dispatch(
        addHistory({
          payloadData: {
            scale: {
              name: firstSelectedModel.name,
              id: firstSelectedModel.id,
              xAxis: replaceParametersToIds(xAxis, parameters),
              yAxis: replaceParametersToIds(yAxis, parameters),
              zAxis: replaceParametersToIds(zAxis, parameters),
              isCanCopy: isCanCopy,
              factor: replaceParametersToIds(factor, parameters),
              idArray: isCanCopy ? modelIdArray : undefined,
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
    selectedModels.map((model) => {
      let m = mainScene.getMeshById(model.id);
      m.parent = null;
    });
    const mesh = mainScene.getMeshById(firstSelected);
    mesh.scaling.x = baseScale.current._x;
    mesh.scaling.y = baseScale.current._y;
    mesh.scaling.z = baseScale.current._z;

    setVisible(false);
    // dispatch(setFirstSelected(undefined));
  };

  return (
    <DraggableModal
      title={
        <div className="pointer-events-auto cursor-pointer bg-red-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-gray-800">
          Scale
        </div>
      }
      visible={visible}
      buttons={
        <div className="flex flex-row gap-1 justify-center">
          <button
            onClick={handleOk}
            id="scale-ok-btn"
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
            id="scale-cancel-btn"
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
          </div>
          <div className="col-span-full flex items-center">
            <label
              htmlFor="zAxis"
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
        </div>
      </form>
    </DraggableModal>
  );
}

export default ScaleMenu;
