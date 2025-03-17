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

export interface CylinderProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  isEditableModal?: boolean;
  modelToBeAlter?: any;
}

function CylinderMenu({
  visible,
  setVisible,
  isEditableModal,
  modelToBeAlter,
}: CylinderProps) {
  const [name, setName] = useState("Cylinder");
  const [diameter, setDiameter] = useState("1");
  const [height, setHeight] = useState("1");
  const [topDiameter, setTopDiameter] = useState("1");
  const [bottomDiameter, setBottomDiameter] = useState("1");
  const [tessellation, setTessellation] = useState("32");
  const [subdivisions, setSubdivisions] = useState("1");
  const [material, setMaterial] = useState("PEC");
  const materials = useAppSelector(selectMaterials);
  const username = useAppSelector(selectUsername);
  const { projectId } = useParams();

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
        isNaN(parseFloat(calculate(replaceParametersToIds(height, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(topDiameter, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(bottomDiameter, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(tessellation, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(subdivisions, parameters), parameters).toString())) 
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
    height,
    topDiameter,
    bottomDiameter,
    tessellation,
    subdivisions,
    material,
    parameterMenuVisible,
  ]);


  useEffect(() => {
    if (isEditableModal != undefined && visible) {
      setName(modelToBeAlter.name);
      setDiameter(replaceIdsToParameters(modelToBeAlter.object.diameter, parameters));
      setHeight(replaceIdsToParameters(modelToBeAlter.object.height, parameters));
      setTopDiameter(replaceIdsToParameters(modelToBeAlter.object.topDiameter, parameters));
      setBottomDiameter(replaceIdsToParameters(modelToBeAlter.object.bottomDiameter, parameters));
      setTessellation(replaceIdsToParameters(modelToBeAlter.object.tessellation, parameters));
      setSubdivisions(replaceIdsToParameters(modelToBeAlter.object.subdivisions, parameters));
      setMaterial(modelToBeAlter.material);
    } else if (visible) {
      setName("Cylinder");
      setDiameter("");
      setHeight("");
      setTopDiameter("");
      setBottomDiameter("");
      setTessellation("32");
      setSubdivisions("1");
      setMaterial("PEC");
    }
    const keyDownFunc = (event: any) => {
      if (visible) {
        if (event.key == "Escape") {
          setVisible(false);
          document.removeEventListener("keydown", keyDownFunc);
        }
        else if (event.key == "Enter") {
          document.getElementById("cylinder-ok-btn")?.click();
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
      case "height":
        setHeight(e.target.value);
        break;
      case "topDiameter":
        setTopDiameter(e.target.value);
        break;
      case "bottomDiameter":
        setBottomDiameter(e.target.value);
        break;
      case "tessellation":
        setTessellation(e.target.value);
        break;
      case "subdivisions":
        setSubdivisions(e.target.value);
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
        type: "cylinder",
        object: {
          diameter: replaceParametersToIds(diameter, parameters),
          topDiameter: replaceParametersToIds(topDiameter, parameters),
          bottomDiameter: replaceParametersToIds(bottomDiameter, parameters),
          height: replaceParametersToIds(height, parameters),
          tessellation: replaceParametersToIds(tessellation, parameters),
          subdivisions: replaceParametersToIds(subdivisions, parameters),
        },
        status: "Added",
        category: "Objects",
        visible: true,
        parentId: 0,
        selected: false,
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
            create_cylinder: {
              name: name,
              id: model.id,
              diameter: replaceParametersToIds(diameter, parameters),
              topDiameter: replaceParametersToIds(topDiameter, parameters),
              bottomDiameter: replaceParametersToIds(bottomDiameter, parameters),
              height: replaceParametersToIds(height, parameters),
              tessellation: replaceParametersToIds(tessellation, parameters),
              subdivisions: replaceParametersToIds(subdivisions, parameters),
              material: material,
              parentId: model.parentId,
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
            edit_cylinder: {
              name: name,
              id: model.id,
              diameter: replaceParametersToIds(diameter, parameters),
              topDiameter: replaceParametersToIds(topDiameter, parameters),
              bottomDiameter: replaceParametersToIds(bottomDiameter, parameters),
              height: replaceParametersToIds(height, parameters),
              tessellation: replaceParametersToIds(tessellation, parameters),
              subdivisions: replaceParametersToIds(subdivisions, parameters),
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
            Cylinder
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
                id="cylinder-ok-btn"
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
                htmlFor="height"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Height
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="height"
                  value={height}
                  onChange={handleChanges}
                  id="height"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="topDiameter"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Top Diameter
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="topDiameter"
                  value={topDiameter}
                  onChange={handleChanges}
                  id="topDiameter"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="bottomDiameter"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Bottom Diameter
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="bottomDiameter"
                  value={bottomDiameter}
                  onChange={handleChanges}
                  id="bottomDiameter"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="tessellation"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Tessellation
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="tessellation"
                  value={tessellation}
                  onChange={handleChanges}
                  id="tessellation"
                  autoComplete="off"
                  className="w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="subdivisions"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Subdivisions
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="subdivisions"
                  value={subdivisions}
                  onChange={handleChanges}
                  id="subdivisions"
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

export default CylinderMenu;
