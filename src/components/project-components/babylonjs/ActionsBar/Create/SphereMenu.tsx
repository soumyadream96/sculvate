import * as React from "react";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { modelAdded, modelAltered } from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import Materials from "../../types/materials";
import { MaterialSelectOptions } from "components/project-components/MaterialSelectOptions";
import DraggableModal from "components/DraggableModal";
import { v4 as uuid } from "uuid";
import { selectParameters } from "state/reducers/parametersSlice";
import { selectUsername } from "state/reducers/authSlice";
import { Storage } from "aws-amplify";
import { calculate, replaceParametersToIds, replaceIdsToParameters } from "utilities";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ParameterMenu from "../Transform/ParameterMenu";
import { selectMaterials } from "state/reducers/userSlice";
import { useParams } from "react-router-dom";
import { setRefresh, selectRefresh } from "state/reducers/refreshSlice";

export interface SphereProps {
  visible: boolean;
  setVisible: (value: boolean) => void;
  isEditableModal?: boolean;
  modelToBeAlter?: any;
}

function SphereMenu({
  visible,
  setVisible,
  isEditableModal,
  modelToBeAlter,
}: SphereProps) {
  const [name, setName] = useState("Sphere");
  const [diameter, setDiameter] = useState("1");
  const [diameterX, setDiameterX] = useState("1");
  const [diameterY, setDiameterY] = useState("1");
  const [diameterZ, setDiameterZ] = useState("1");
  const [segments, setSegments] = useState("32");
  const [material, setMaterial] = useState("PEC");
  const materials = useAppSelector(selectMaterials);
  const username = useAppSelector(selectUsername);

  const { projectId } = useParams<{ projectId: string }>();

  const [parameterMenuVisible, setParameterMenuVisible] = useState(false);
  const [parameter, setParameter] = useState({});

  const dispatch = useAppDispatch();
  const parameters = useAppSelector(selectParameters);
  const refresh = useAppSelector(selectRefresh);

  const [isValid, setIsValid] = useState(true);
  const validateFields = () => {
    try {
      if (
        isNaN(parseFloat(calculate(replaceParametersToIds(diameter, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(diameterX, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(diameterY, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(diameterZ, parameters), parameters).toString())) ||
        isNaN(parseInt(calculate(replaceParametersToIds(segments, parameters), parameters).toString()))
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
    diameter,
    diameterX,
    diameterY,
    diameterZ,
    segments,
    material,
    parameterMenuVisible,
  ]);

  useEffect(() => {
    if (isEditableModal != undefined && visible) {
      setName(modelToBeAlter.name);
      setDiameter(replaceIdsToParameters(modelToBeAlter.object.diameter, parameters));
      setDiameterX(replaceIdsToParameters(modelToBeAlter.object.diameterX, parameters));
      setDiameterY(replaceIdsToParameters(modelToBeAlter.object.diameterY, parameters));
      setDiameterZ(replaceIdsToParameters(modelToBeAlter.object.diameterZ, parameters));
      setSegments(replaceIdsToParameters(modelToBeAlter.object.segments, parameters));
      setMaterial(modelToBeAlter.material);
    } else if (visible) {
      setName("Sphere");
      setDiameter("");
      setDiameterX("");
      setDiameterY("");
      setDiameterZ("");
      setSegments("32");
      setMaterial("PEC");
    }
    const keyDownFunc = (event: any) => {
      if (visible) {
        if (event.key == "Escape") {
          setVisible(false);
          document.removeEventListener("keydown", keyDownFunc);
        }
        else if (event.key == "Enter") {
          document.getElementById("sphere-ok-btn")?.click();
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
      case "diameter":
        setDiameter(e.target.value);
        break;
      case "diameterX":
        setDiameterX(e.target.value);
        break;
      case "diameterY":
        setDiameterY(e.target.value);
        break;
      case "diameterZ":
        setDiameterZ(e.target.value);
        break;
      case "segments":
        setSegments(e.target.value);
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
        type: "sphere",
        object: {
          name: name,
          diameter: replaceParametersToIds(diameter, parameters),
          diameterX: replaceParametersToIds(diameterX, parameters),
          diameterY: replaceParametersToIds(diameterY, parameters),
          diameterZ: replaceParametersToIds(diameterZ, parameters),
          segments: replaceParametersToIds(segments, parameters),
        },
        status: "Added",
        category: "Objects",
        parentId: 0,
        selected: false,
        visible: true,
        isEditProperty: false,
        material: material,
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
            create_sphere: {
              name: name,
              id: model.id,
              diameter: replaceParametersToIds(diameter, parameters),
              diameterX: replaceParametersToIds(diameterX, parameters),
              diameterY: replaceParametersToIds(diameterY, parameters),
              diameterZ: replaceParametersToIds(diameterZ, parameters),
              segments: replaceParametersToIds(segments, parameters),
              material: material,
              parentId: model.parentId
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
            edit_sphere: {
              name: name,
              id: model.id,
              diameter: replaceParametersToIds(diameter, parameters),
              diameterX: replaceParametersToIds(diameterX, parameters),
              diameterY: replaceParametersToIds(diameterY, parameters),
              diameterZ: replaceParametersToIds(diameterZ, parameters),
              segments: replaceParametersToIds(segments, parameters),
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

  return (
    <>
      <DraggableModal
        className={
          parameterMenuVisible ? "pointer-events-none" : "pointer-events-auto"
        }
        title={
          <div className="bg-green-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-primary-600">
            Sphere
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
                id="sphere-ok-btn"
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
                htmlFor="diameter"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Diameter
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="diameter"
                  value={diameter}
                  onChange={handleChanges}
                  id="diameter"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="diameterX"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Diameter X
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="diameterX"
                  value={diameterX}
                  onChange={handleChanges}
                  id="diameterX"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="diameterY"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Diameter Y
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="diameterY"
                  value={diameterY}
                  onChange={handleChanges}
                  id="diameterY"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="diameterZ"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Diameter Z
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="diameterZ"
                  value={diameterZ}
                  onChange={handleChanges}
                  id="diameterZ"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="segments"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Tessellation
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="segments"
                  value={segments}
                  onChange={handleChanges}
                  id="segments"
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

export default SphereMenu;
