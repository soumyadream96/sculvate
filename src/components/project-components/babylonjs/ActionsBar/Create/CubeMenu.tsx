import * as React from "react";
import { useState, useEffect } from "react";
import Draggable from "react-draggable";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { Model, modelAdded, modelAltered } from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import Materials from "../../types/materials";
import { MaterialSelectOptions } from "components/project-components/MaterialSelectOptions";
import DraggableModal from "components/DraggableModal";
import { v4 as uuid } from "uuid";
import { calculate, replaceParametersToIds, replaceIdsToParameters } from "utilities";
import { selectParameters } from "state/reducers/parametersSlice";
import { selectUsername } from "state/reducers/authSlice";
import { Storage } from "aws-amplify";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ParameterMenu from "../Transform/ParameterMenu";
import classNames from "classnames";
import { selectMaterials } from "state/reducers/userSlice";
import { useParams } from "react-router-dom";
import { setRefresh, selectRefresh } from "state/reducers/refreshSlice";

export interface CubeProps {
  setVisible: (value: boolean) => void;
  visible: boolean;
  isEditableModal?: boolean;
  modelToBeAlter?: any;
}

function CubeMenu({
  visible,
  setVisible,
  isEditableModal,
  modelToBeAlter,
}: CubeProps) {
  const [name, setName] = useState("Cube");
  const [xMin, setXMin] = useState("0");
  const [xMax, setXMax] = useState("0");
  const [yMin, setYMin] = useState("0");
  const [yMax, setYMax] = useState("0");
  const [zMin, setZMin] = useState("0");
  const [zMax, setZMax] = useState("0");
  const [material, setMaterial] = useState("PEC");
  const materials = useAppSelector(selectMaterials);

  const [parameterMenuVisible, setParameterMenuVisible] = useState(false);
  const [parameter, setParameter] = useState({});

  const dispatch = useAppDispatch();
  const parameters = useAppSelector(selectParameters);
  const username = useAppSelector(selectUsername);
  const refresh = useAppSelector(selectRefresh);
  const { projectId } = useParams();

  const [isValid, setIsValid] = useState(true);

  // Function to validate form fields
  const validateFields = () => {
    try {
      if (
        isNaN(parseFloat(calculate(replaceParametersToIds(xMin, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(xMax, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(yMin, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(yMax, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(zMin, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(zMax, parameters), parameters).toString())) 
      ) {
        setIsValid(false);
        return;
      }

      setIsValid(true);
      if (name === "") setIsValid(false);
    } catch (error) {
      setIsValid(false);
    }
  };

  useEffect(() => {
    validateFields();
  }, [
    name,
    xMin,
    xMax,
    yMin,
    yMax,
    zMin,
    zMax,
    material,
    parameterMenuVisible,
  ]);

  useEffect(() => {
    if (isEditableModal != undefined && visible) {
      setName(modelToBeAlter.name);
      setXMin(replaceIdsToParameters(modelToBeAlter.object.xMin, parameters));
      setXMax(replaceIdsToParameters(modelToBeAlter.object.xMax, parameters));
      setYMin(replaceIdsToParameters(modelToBeAlter.object.yMin, parameters));
      setYMax(replaceIdsToParameters(modelToBeAlter.object.yMax, parameters));
      setZMin(replaceIdsToParameters(modelToBeAlter.object.zMin, parameters));
      setZMax(replaceIdsToParameters(modelToBeAlter.object.zMax, parameters));
      setMaterial(modelToBeAlter.material);
    } else if (visible) {
      setName("Cube");
      setXMin("");
      setXMax("");
      setYMin("");
      setYMax("");
      setZMin("");
      setZMax("");
      setMaterial("PEC");
    }
    const keyDownFunc = (event: any) => {
      if (visible) {
        if (event.key == "Escape") {
          setVisible(false);
          document.removeEventListener("keydown", keyDownFunc);
        }
        else if (event.key == "Enter") {
          document.getElementById("cube-ok-btn")?.click();
          document.removeEventListener("keydown", keyDownFunc);
        }
      }
    }
    document.addEventListener("keydown", keyDownFunc);
  }, [isEditableModal, visible]);

  const handleChanges = (e: any) => {
    switch (e.target.name) {
      case "name":
        setName(e.target.value);
        break;
      case "xMin":
        setXMin(e.target.value);
        break;
      case "xMax":
        setXMax(e.target.value);
        break;
      case "yMin":
        setYMin(e.target.value);
        break;
      case "yMax":
        setYMax(e.target.value);
        break;
      case "zMin":
        setZMin(e.target.value);
        break;
      case "zMax":
        setZMax(e.target.value);
        break;
      case "material":
        setMaterial(e.target.value);
        break;
    }
  };

  const handleOk = async (e: any) => {
    if (name === "") {
      toast.error("Object name cannot be empty.", {
        toastId: "error",
      });
      return;
    }
    let model;
    try {
      model = {
        id: uuid(),
        name: name,
        type: "cube",
        object: {
          name: name,
          xMin: replaceParametersToIds(xMin, parameters),
          xMax: replaceParametersToIds(xMax, parameters),
          yMin: replaceParametersToIds(yMin, parameters),
          yMax: replaceParametersToIds(yMax, parameters),
          zMin: replaceParametersToIds(zMin, parameters),
          zMax: replaceParametersToIds(zMax, parameters),
        },
        material: material,
        status: "Added",
        category: "Objects",
        parentId: 0,
        visible: true,
        selected: false,
        isEditProperty: false,
        position: {
          x:
            (parseFloat(calculate(replaceParametersToIds(xMax, parameters), parameters).toString()) +
              parseFloat(calculate(replaceParametersToIds(xMin, parameters), parameters).toString())) /
            2,
          y:
            (parseFloat(calculate(replaceParametersToIds(yMax, parameters), parameters).toString()) +
              parseFloat(calculate(replaceParametersToIds(yMin, parameters), parameters).toString())) /
            2,
          z:
            (parseFloat(calculate(replaceParametersToIds(zMax, parameters), parameters).toString()) +
              parseFloat(calculate(replaceParametersToIds(zMin, parameters), parameters).toString())) /
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
    } catch (err) {
      toast.error("Invalid properties. Please try again.", {
        toastId: "error",
      });
      return;
    }
    if (isEditableModal === undefined) {
      dispatch(modelAdded(model));
      await dispatch(
        addHistory({
          payloadData: {
            create_cube: {
              name: name,
              id: model.id,
              xMin: replaceParametersToIds(xMin, parameters),
              yMin: replaceParametersToIds(yMin, parameters),
              zMin: replaceParametersToIds(zMin, parameters),
              xMax: replaceParametersToIds(xMax, parameters),
              yMax: replaceParametersToIds(yMax, parameters),
              zMax: replaceParametersToIds(zMax, parameters),
              material: material,
              parentId: 0,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
    } else {
      model.id = modelToBeAlter.id;
      model.status = "Updated";
      model.isEditProperty = true;
      // dispatch(modelAltered(model));
      await dispatch(
        addHistory({
          payloadData: {
            edit_cube: {
              name: name,
              id: model.id,
              xMin: replaceParametersToIds(xMin, parameters),
              yMin: replaceParametersToIds(yMin, parameters),
              zMin: replaceParametersToIds(zMin, parameters),
              xMax: replaceParametersToIds(xMax, parameters),
              yMax: replaceParametersToIds(yMax, parameters),
              zMax: replaceParametersToIds(zMax, parameters),
              material: material,
              parentId: model.parentId,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
      await dispatch(
        setRefresh({
          refresh: refresh+1
        })
      );
    }
    setVisible(false);
  };

  // const handleDrag = (e: any, ui: any) => {
  //   // restrict the menu from going out of the screen
  //   if (menuPosition.x < 0) {
  //     menuPosition.x = 0;
  //   }
  //   if (menuPosition.y < 0) {
  //     menuPosition.y = 0;
  //   }
  //   if (menuPosition.x > window.innerWidth - 500) {
  //     menuPosition.x = window.innerWidth - 500;
  //   }
  //   if (menuPosition.y > window.innerHeight - 500) {
  //     menuPosition.y = window.innerHeight - 500;
  //   }
  // };

  return (
    <>
      <DraggableModal
        className={
          parameterMenuVisible ? "pointer-events-none" : "pointer-events-auto"
        }
        title={
          <div className="bg-green-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-primary-600">
            Cube
          </div>
        }
        visible={visible}
        buttonsClassName="sm:px-4"
        buttons={
          <div className="flex flex-row gap-1 w-full justify-between">
            <button
              onClick={() => {
                setParameterMenuVisible(true);
              }}
              id="add-parameter-btn"
              disabled={parameterMenuVisible}
              className={`rounded text-center px-4 py-1 disable-drag bg-blue-300 hover:bg-blue-400 active:bg-blue-500`}
            >
              Add parameter...
            </button>
            <div className="flex gap-2">
              <button
                onClick={(e) => setVisible(false)}
                className="bg-red-300 hover:bg-red-400 active:bg-red-500 rounded text-center px-4 py-1 disable-drag"
              >
                Cancel
              </button>
              <button
                onClick={handleOk}
                id="cube-ok-btn"
                disabled={!isValid}
                className={`rounded text-center px-4 py-1 disable-drag ${
                  isValid
                    ? "bg-green-300 hover:bg-green-400 active:bg-green-500"
                    : "bg-[#D9D9D9]"
                }`}
              >
                OK
              </button>
            </div>
          </div>
        }
      >
        <form>
          <div className="mt-4 grid grid-cols-12 gap-x-6 gap-y-4">
            <div className="col-span-full ">
              <label
                htmlFor="name"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Name
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={handleChanges}
                  id="name"
                  autoComplete="off"
                  className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="xMin"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                X Min
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="xMin"
                  value={xMin}
                  onChange={handleChanges}
                  id="xMin"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="xMax"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                X Max
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="xMax"
                  value={xMax}
                  onChange={handleChanges}
                  id="xMax"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="yMin"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Y Min
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="yMin"
                  value={yMin}
                  onChange={handleChanges}
                  id="yMin"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="yMax"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Y Max
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="yMax"
                  value={yMax}
                  onChange={handleChanges}
                  id="yMax"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="zMin"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Z Min
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="zMin"
                  value={zMin}
                  onChange={handleChanges}
                  id="zMin"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="zMax"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Z Max
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="zMax"
                  value={zMax}
                  onChange={handleChanges}
                  id="zMax"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-full ">
              <label
                htmlFor="material"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Material
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <select
                  name="material"
                  id="material"
                  value={material}
                  onChange={handleChanges}
                  className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                >
                  <MaterialSelectOptions options={materials ?? {}} />
                </select>
              </div>
            </div>
          </div>
        </form>
        {}
      </DraggableModal>
      {parameterMenuVisible && (
        <ParameterMenu
          visible={parameterMenuVisible}
          setVisible={setParameterMenuVisible}
          isEditable={false}
          isNewParameter={true}
          obj={parameter}
        />
      )}
    </>
  );
}

export default CubeMenu;
