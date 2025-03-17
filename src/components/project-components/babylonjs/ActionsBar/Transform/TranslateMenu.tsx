import * as React from "react";
import { useState, useEffect } from "react";
import * as BABYLON from "babylonjs";
import { GizmoManager, Vector3 } from "babylonjs";
import {
  Model,
  setFirstSelected,
  selectModels,
  selectFirstSelected,
  modelAltered,
  modelAdded,
} from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import { useAppSelector, useAppDispatch } from "state/hooks";
import DraggableModal from "components/DraggableModal";
import { calculate, replaceParametersToIds, replaceIdsToParameters, centralPos, isParameter, round, wait } from "utilities";
import { selectParameters } from "state/reducers/parametersSlice";
import { v4 as uuid } from "uuid";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectUsername } from "state/reducers/authSlice";
import { selectRefresh, setRefresh } from "state/reducers/refreshSlice";
import { useParams } from "react-router-dom";

export interface TranslateProps {
  visible: boolean;
  setVisible: (value: boolean) => void;
  mainScene: BABYLON.Scene | any;
}

let gizmoManager: GizmoManager | null = null;

function TranslateMenu({ visible, setVisible, mainScene }: TranslateProps) {
  const [xAxis, setXAxis] = useState("0");
  const [yAxis, setYAxis] = useState("0");
  const [zAxis, setZAxis] = useState("0");
  const [factor, setFactor] = useState("1");
  const [isCanCopy, setIsCanCopy] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);

  const [isPositionChanged, setIsPositionChanged] = useState(false);

  const models = useAppSelector(selectModels);
  const refresh = useAppSelector(selectRefresh);
  const modelsToDraw = Object.values(models);
  const arrayModel = modelsToDraw.flat();
  const dispatch = useAppDispatch();
  const firstSelected: any = useAppSelector(selectFirstSelected);
  const parameters = useAppSelector(selectParameters);
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
    // Initialize GizmoManager here
    if (mainScene && !gizmoManager) {
      gizmoManager = new GizmoManager(mainScene);
    }
  }, [mainScene]);

  useEffect(() => {
    if (visible) {
      const keyDownFunc = (event: any) => {
        if (visible) {
          if (event.key == "Escape") {
            document.getElementById("translate-cancel-btn")?.click();
            document.removeEventListener("keydown", keyDownFunc);
          } else if (event.key == "Enter") {
            document.getElementById("translate-ok-btn")?.click();
            document.removeEventListener("keydown", keyDownFunc);
          }
        }
      };
      document.addEventListener("keydown", keyDownFunc);
      // Enable the position gizmo when the menu becomes visible
      if (gizmoManager) {
        gizmoManager.positionGizmoEnabled = true;
      }

      // Attach the gizmo to the currently selected mesh
      let selectedMesh = mainScene.getMeshById(firstSelected);
      let tSelectedModels = arrayModel.filter((model) => model.selected && model.type != "folder");
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
          parent.position = new BABYLON.Vector3(
            centralPos(tSelectedModels, mainScene).x,
            centralPos(tSelectedModels, mainScene).y,
            centralPos(tSelectedModels, mainScene).z
          );
          console.log(selectedModels);
          selectedModels.map((m: any) => {
            let mesh = mainScene.getMeshById(m.id);
            mesh.parent = parent;
            mesh.position.x -= parent.position.x;
            mesh.position.y -= parent.position.y;
            mesh.position.z -= parent.position.z;
          });

          gizmoManager.attachToMesh(parent);
        } else {
          gizmoManager.attachToMesh(selectedMesh);
        }

        gizmoManager.gizmos.positionGizmo?.xGizmo.dragBehavior.onDragObservable.add(
          (e) => {
            let m: any = gizmoManager?.gizmos.positionGizmo?.attachedMesh;
            setXAxis(round(m.position.x - basePosition.current._x).toString());
            setYAxis(round(m.position.y - basePosition.current._y).toString());
            setZAxis(round(m.position.z - basePosition.current._z).toString());
          }
        );
        gizmoManager.gizmos.positionGizmo?.yGizmo.dragBehavior.onDragObservable.add(
          (e) => {
            let m: any = gizmoManager?.gizmos.positionGizmo?.attachedMesh;
            setXAxis(round(m.position.x - basePosition.current._x).toString());
            setYAxis(round(m.position.y - basePosition.current._y).toString());
            setZAxis(round(m.position.z - basePosition.current._z).toString());
          }
        );
        gizmoManager.gizmos.positionGizmo?.zGizmo.dragBehavior.onDragObservable.add(
          (e) => {
            let m: any = gizmoManager?.gizmos.positionGizmo?.attachedMesh;
            setXAxis(round(m.position.x - basePosition.current._x).toString());
            setYAxis(round(m.position.y - basePosition.current._y).toString());
            setZAxis(round(m.position.z - basePosition.current._z).toString());
          }
        );
      }
    } else {
      // Clear the gizmos when the menu is hidden
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
      setXAxis("0");
      setYAxis("0");
      setZAxis("0");
      setFactor("1");
      setIsCanCopy(false);
      Object.assign(
        basePosition.current,
        centralPos(selectedModels, mainScene)
      );
    }
  }, [selectedModels, visible]);

  // useEffect(() => {
  //   if (isPositionChanged && mainScene && mainScene !== null) {
  //     if (isMultipleSelected()) {
  //       const currentPosition = selectedModels.find(
  //         (model) => model.id === firstSelected
  //       )?.position;
  //       if (currentPosition) {
  //         selectedModels.map((model) => {
  //           const mesh = mainScene.getMeshById(model.id);
  //           if (mesh) {
  //             mesh.position = new Vector3(
  //               model.position.x + calculate(xAxis, parameters),
  //               model.position.y + calculate(yAxis, parameters),
  //               model.position.z + calculate(zAxis, parameters)
  //             );
  //           }
  //         });
  //       }
  //     } else {
  //       const mesh = mainScene.getMeshById(firstSelected);
  //       mesh.position = new Vector3(
  //         calculate(xAxis, parameters),
  //         calculate(yAxis, parameters),
  //         calculate(zAxis, parameters)
  //       );
  //     }
  //     setIsPositionChanged(false);
  //   }
  // }, [isPositionChanged]);

  const handleXAxisChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) {
      setIsPositionChanged(true);
    }
    setXAxis(e.target.value);
  };

  const handleYAxisChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) {
      setIsPositionChanged(true);
    }
    setYAxis(e.target.value);
  };

  const handleZAxisChanges = (e: any) => {
    if (isParameter(e.target.value, parameters)) {
      setIsPositionChanged(true);
    }
    setZAxis(e.target.value);
  };

  const handleFactorChanges = (e: any) => {
    setFactor(e.target.value);
  };

  const handleIsCanCopyChanges = (e: any) => {
    setIsCanCopy(e.target.checked);
  };

  const handleOk = async (e: any) => {
    let attachedMesh: any = gizmoManager?.gizmos.positionGizmo?.attachedMesh;
    attachedMesh.position = new BABYLON.Vector3(
      basePosition.current._x,
      basePosition.current._y,
      basePosition.current._z
    );
    selectedModels.map((model) => {
      let m = mainScene.getMeshById(model.id);
      if (m.parent) {
        m.parent = null;
        m.position.x += attachedMesh.position.x;
        m.position.y += attachedMesh.position.y;
        m.position.z += attachedMesh.position.z;
      }
    });
    var obj: any;
    let modelIdArray: any = [];
    if (isMultipleSelected()) {
      try {
        for (let i = 0; i < selectedModels.length; i++) {
          let model = selectedModels[i];
          let mesh = mainScene.getMeshById(model.id);
          let obj: any;
          modelIdArray = [];
          if (isCanCopy) {
            for (let j = 1; j <= calculate(replaceParametersToIds(factor, parameters), parameters); j++) {
              let id = uuid();
              modelIdArray.push(id);
              obj = {
                ...model,
                name: model.name + "_" + (j + 1),
                id: id,
                selected: false,
                status: "Added",
                position: {
                  x:
                    (model.position ? model.position.x : mesh.position.x) +
                    calculate(replaceParametersToIds(xAxis, parameters), parameters) * j,
                  y:
                    (model.position ? model.position.y : mesh.position.y) +
                    calculate(replaceParametersToIds(yAxis, parameters), parameters) * j,
                  z:
                    (model.position ? model.position.z : mesh.position.z) +
                    calculate(replaceParametersToIds(zAxis, parameters), parameters) * j,
                },
                mergedMeshId:
                  model.type === "mergedMesh" ? model.id : undefined,
              };
              dispatch(modelAdded(obj));
            }
          } else {
            obj = {
              ...model,
              name: model.name,
              id: model.id,
              selected: false,
              status: "Updated",
              position: {
                x:
                  (model.position ? model.position.x : mesh.position.x) +
                  calculate(replaceParametersToIds(xAxis, parameters), parameters),
                y:
                  (model.position ? model.position.y : mesh.position.y) +
                  calculate(replaceParametersToIds(yAxis, parameters), parameters),
                z:
                  (model.position ? model.position.z : mesh.position.z) +
                  calculate(replaceParametersToIds(zAxis, parameters), parameters),
              },
            };
            dispatch(modelAltered(obj));
          }

          await dispatch(
            addHistory({
              payloadData: {
                translate: {
                  name: model.name,
                  id: model.id,
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
        return;
      } catch (err) {
        console.log(err);
        toast.error("Invalid properties. Please try again.", {
          toastId: "error",
        });
        return;
      }
    }
    const model = selectedModels[0];
    const mesh = mainScene.getMeshById(model.id);
    mesh.position.x = basePosition.current._x;
    mesh.position.y = basePosition.current._y;

    if (isCanCopy) {
      for (let i = 1; i <= calculate(replaceParametersToIds(factor, parameters), parameters); i++) {
        try {
          let id = uuid();
          modelIdArray.push(id);
          obj = {
            ...model,
            name: model.name + "_" + (i + 1),
            id: id,
            selected: false,
            status: "Added",
            position: {
              x:
                (model.position ? model.position.x : mesh.position.x) +
                calculate(replaceParametersToIds(xAxis, parameters), parameters) * i,
              y:
                (model.position ? model.position.y : mesh.position.y) +
                calculate(replaceParametersToIds(yAxis, parameters), parameters) * i,
              z:
                (model.position ? model.position.z : mesh.position.z) +
                calculate(replaceParametersToIds(zAxis, parameters), parameters) * i,
            },
            mergedMeshId: model.type === "mergedMesh" ? model.id : undefined,
          };
        } catch (err) {
          toast.error("Invalid properties. Please try again.", {
            toastId: "error",
          });
          return;
        }
        dispatch(modelAdded(obj));
      }
    } else {
      try {
        obj = {
          ...model,
          name: model.name,
          id: model.id,
          selected: false,
          status: "Updated",
          position: {
            x:
              (model.position ? model.position.x : mesh.position.x) +
              calculate(replaceParametersToIds(xAxis, parameters), parameters) * calculate(replaceParametersToIds(factor, parameters), parameters),
            y:
              (model.position ? model.position.y : mesh.position.y) +
              calculate(replaceParametersToIds(yAxis, parameters), parameters) * calculate(replaceParametersToIds(factor, parameters), parameters),
            z:
              (model.position ? model.position.z : mesh.position.z) +
              calculate(replaceParametersToIds(zAxis, parameters), parameters) * calculate(replaceParametersToIds(factor, parameters), parameters),
          },
        };
      } catch (err) {
        toast.error("Invalid properties. Please try again.", {
          toastId: "error",
        });
        return;
      }
      dispatch(modelAltered(obj));
    }
    await dispatch(
      addHistory({
        payloadData: {
          translate: {
            name: model.name,
            id: model.id,
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
    setVisible(false);
    await dispatch(setRefresh({ refresh: refresh + 1 }));
    // dispatch(setFirstSelected(undefined));
  };

  const handleCancel = (e: any) => {
    let attachedMesh: any = gizmoManager?.gizmos.positionGizmo?.attachedMesh;
    attachedMesh.position = new BABYLON.Vector3(
      basePosition.current._x,
      basePosition.current._y,
      basePosition.current._z
    );
    selectedModels.map((model) => {
      let mesh = mainScene.getMeshById(model.id);
      if (mesh.parent) {
        mesh.position.x += attachedMesh?.position.x;
        mesh.position.y += attachedMesh?.position.y;
        mesh.position.z += attachedMesh?.position.z;
        mesh.parent = null;
      }
    });
    setVisible(false);
    // dispatch(setFirstSelected(undefined));
  };

  return (
    <DraggableModal
      title={
        <div className="pointer-events-auto cursor-pointer bg-red-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-gray-800">
          Translate
        </div>
      }
      visible={visible}
      buttons={
        <div className="flex flex-row gap-1 justify-center">
          <button
            onClick={handleOk}
            id="translate-ok-btn"
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
            id="translate-cancel-btn"
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

export default TranslateMenu;
