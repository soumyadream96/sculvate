import DraggableModal from "components/DraggableModal";
import * as React from "react";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "state/hooks";
import {
  modelAdded,
  modelAltered,
  selectModels,
} from "state/reducers/modelSlice";
import {
  isSceneClickable,
  setSceneClickable,
  selectPickedPos,
} from "state/reducers/sceneSlice";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
import { selectParameters } from "state/reducers/parametersSlice";
import { calculate, replaceParametersToIds, replaceIdsToParameters } from "utilities";
import { v4 as uuid } from "uuid";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ParameterMenu from "../Transform/ParameterMenu";
import { addHistory } from "state/reducers/historySlice";
import { selectUsername } from "state/reducers/authSlice";
import { useParams } from "react-router-dom";
import { setRefresh, selectRefresh } from "state/reducers/refreshSlice";

export interface DistanceProps {
  distanceLength: number;
  visible: boolean;
  setVisible: (value: boolean) => void;
  isEditableModal?: boolean;
  modelToBeAlter?: any;
}

function DistanceMenu({
  distanceLength,
  visible,
  setVisible,
  isEditableModal,
  modelToBeAlter,
}: DistanceProps) {
  const [distanceNumber, setDistanceNumber] = useState(distanceLength + 1);

  const [x1, setX1] = useState("0");
  const [x2, setX2] = useState("0");
  const [y1, setY1] = useState("0");
  const [y2, setY2] = useState("0");
  const [z1, setZ1] = useState("0");
  const [z2, setZ2] = useState("0");
  const [clickedButton, setClickedButton] = useState("");

  const [parameterMenuVisible, setParameterMenuVisible] = useState(false);
  const [parameter, setParameter] = useState({});

  const dispatch = useAppDispatch();
  const models = useAppSelector(selectModels);
  const parameters = useAppSelector(selectParameters);
  const sceneClickalbe = useAppSelector(isSceneClickable);
  const pickedPos = useAppSelector(selectPickedPos);
  const username = useAppSelector(selectUsername);
  const refresh = useAppSelector(selectRefresh);

  const { projectId } = useParams();

  const [isValid, setIsValid] = useState(true);

  const simulationProperties = useAppSelector(selectSimulationProperties);

  const validateFields = () => {
    try {
      if (
        isNaN(parseFloat(calculate(replaceParametersToIds(x1, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(x2, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(y1, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(y2, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(z1, parameters), parameters).toString())) ||
        isNaN(parseFloat(calculate(replaceParametersToIds(z2, parameters), parameters).toString())) 
      ) {
        setIsValid(false);
        return;
      }

      setIsValid(true);
      if (!distanceNumber) setIsValid(false);
    } catch (error) {
      setIsValid(false);
    }
  };

  useEffect(() => {
    validateFields();
  }, [distanceNumber, x1, x2, y1, y2, z1, z2, parameterMenuVisible]);

  const getDistanceNumber = () => {
    for (let i = 0; i < models.length; i++) {
      let f = false;
      for (let j = 0; j < models.length; j++) {
        if (models[j].type === "distance") {
          if (models[j]?.number == (i + 1).toString()) {
            f = true;
            break;
          }
        }
      }
      if (f === false) return i + 1;
    }
    return distanceLength + 1;
  };

  const isAvailableDistanceNumber = (pn: number) => {
    if (pn % 1 !== 0) return false;
    if (pn <= 0) return false;
    for (let i = 0; i < models.length; i++) {
      if (models[i].type === "distance") {
        if (models[i]?.number == pn.toString() && !isEditableModal)
          return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (sceneClickalbe) {
      if (clickedButton == "start") {
        setX1(
          pickedPos.x != null
            ? (Math.round(pickedPos.x * 100000) / 100000).toString()
            : "NaN"
        );
        setY1(
          pickedPos.y != null
            ? (Math.round(pickedPos.y * 100000) / 100000).toString()
            : "NaN"
        );
        setZ1(
          pickedPos.z != null
            ? (Math.round(pickedPos.z * 100000) / 100000).toString()
            : "NaN"
        );
      } else if (clickedButton == "end") {
        setX2(
          pickedPos.x != null
            ? (Math.round(pickedPos.x * 100000) / 100000).toString()
            : "NaN"
        );
        setY2(
          pickedPos.y != null
            ? (Math.round(pickedPos.y * 100000) / 100000).toString()
            : "NaN"
        );
        setZ2(
          pickedPos.z != null
            ? (Math.round(pickedPos.z * 100000) / 100000).toString()
            : "NaN"
        );
      }
      setClickedButton("");
      dispatch(setSceneClickable(false));
    }
  }, [pickedPos]);

  useEffect(() => {
    if (isEditableModal != undefined && visible) {
      setDistanceNumber(modelToBeAlter.number);
      setX1(replaceIdsToParameters(modelToBeAlter.object.x.min, parameters));
      setX2(replaceIdsToParameters(modelToBeAlter.object.x.max, parameters));
      setY1(replaceIdsToParameters(modelToBeAlter.object.y.min, parameters));
      setY2(replaceIdsToParameters(modelToBeAlter.object.y.max, parameters));
      setZ1(replaceIdsToParameters(modelToBeAlter.object.z.min, parameters));
      setZ2(replaceIdsToParameters(modelToBeAlter.object.z.max, parameters));
    } else if (visible) {
      let distanceNumber = getDistanceNumber();
      setDistanceNumber(distanceNumber);
      setX1("");
      setX2("");
      setY1("");
      setY2("");
      setZ1("");
      setZ2("");
    }
    const keyDownFunc = (event: any) => {
      if (visible) {
        if (event.key == "Escape") {
          setVisible(false);
          document.removeEventListener("keydown", keyDownFunc);
        } else if (event.key == "Enter") {
          document.getElementById("distance-ok-btn")?.click();
          document.removeEventListener("keydown", keyDownFunc);
        }
      }
    };
    document.addEventListener("keydown", keyDownFunc);
  }, [isEditableModal, visible]);

  const handleChanges = (e: any) => {
    switch (e.target.name) {
      case "name":
        setDistanceNumber(e.target.value);
        break;
      case "x1":
        setX1(e.target.value);
        break;
      case "x2":
        setX2(e.target.value);
        break;
      case "y1":
        setY1(e.target.value);
        break;
      case "y2":
        setY2(e.target.value);
        break;
      case "z1":
        setZ1(e.target.value);
        break;
      case "z2":
        setZ2(e.target.value);
        break;
    }
  };

  const handleOk = async (e: any) => {
    if (!distanceNumber) {
      toast.error("Measurement number cannot be empty.", {
        toastId: "error",
      });
      return;
    }
    if (!isAvailableDistanceNumber(distanceNumber)) {
      toast.error("Measurement number must be an available positive integer.", {
        toastId: "error",
      });
      return;
    }
    try {
      calculate(replaceParametersToIds(x1, parameters), parameters);
      calculate(replaceParametersToIds(x2, parameters), parameters);
      calculate(replaceParametersToIds(y1, parameters), parameters);
      calculate(replaceParametersToIds(y2, parameters), parameters);
      calculate(replaceParametersToIds(z1, parameters), parameters);
      calculate(replaceParametersToIds(z2, parameters), parameters);
    } catch (err) {
      toast.error("Invalid properties. Please try again.", {
        toastId: "error",
      });
      return;
    }

    const model = {
      id: uuid(),
      number: distanceNumber,
      name:
        "Distance " +
        distanceNumber +
        " (" +
        Number(
          Math.sqrt(
            Math.pow(calculate(replaceParametersToIds(x2, parameters), parameters) - calculate(replaceParametersToIds(x1, parameters), parameters), 2) +
              Math.pow(
                calculate(replaceParametersToIds(y2, parameters), parameters) - calculate(replaceParametersToIds(y1, parameters), parameters),
                2
              ) +
              Math.pow(calculate(replaceParametersToIds(z2, parameters), parameters) - calculate(replaceParametersToIds(z1, parameters), parameters), 2)
          ).toFixed(3)
        ).toString() +
        " " +
        simulationProperties.dimensionsUnit.replace("um", "μm") +
        ")",
      type: "distance",
      object: {
        x: {
          min: replaceParametersToIds(x1, parameters),
          max: replaceParametersToIds(x2, parameters),
        },
        y: {
          min: replaceParametersToIds(y1, parameters),
          max: replaceParametersToIds(y2, parameters),
        },
        z: {
          min: replaceParametersToIds(z1, parameters),
          max: replaceParametersToIds(z2, parameters),
        },
      },
      status: "Added",
      category: "Distances",
      parentId: 0,
      visible: true,
      selected: false,
      isEditProperty: false,
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

    if (isEditableModal === undefined) {
      dispatch(modelAdded(model));
      await dispatch(
        addHistory({
          payloadData: {
            create_distance: {
              number: distanceNumber,
              id: model.id,
              x1: replaceParametersToIds(x1, parameters),
              y1: replaceParametersToIds(y1, parameters),
              z1: replaceParametersToIds(z1, parameters),
              x2: replaceParametersToIds(x2, parameters),
              y2: replaceParametersToIds(y2, parameters),
              z2: replaceParametersToIds(z2, parameters),
              material: model.material,
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
            edit_distance: {
              number: distanceNumber,
              id: model.id,
              x1: replaceParametersToIds(x1, parameters),
              y1: replaceParametersToIds(y1, parameters),
              z1: replaceParametersToIds(z1, parameters),
              x2: replaceParametersToIds(x2, parameters),
              y2: replaceParametersToIds(y2, parameters),
              z2: replaceParametersToIds(z2, parameters),
              material: model.material,
              parentId: model.parentId,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
      await dispatch(
        setRefresh({
          refresh: refresh + 1,
        })
      );
    }
    setVisible(false);
    dispatch(setSceneClickable(false));
  };

  const handleStart = (e: any) => {
    e.preventDefault();
    setClickedButton("start");
    dispatch(setSceneClickable(true));
    toast.info("To pick the start point, double click on an object's vertex.", {
      toastId: "info",
    });
  };

  const handleEnd = (e: any) => {
    e.preventDefault();
    setClickedButton("end");
    dispatch(setSceneClickable(true));
    toast.info("To pick the end point, double click on an object's vertex.", {
      toastId: "info",
    });
  };

  return (
    <>
      <DraggableModal
        className={
          parameterMenuVisible ? "pointer-events-none" : "pointer-events-auto"
        }
        title={
          <div className="bg-green-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-primary-600">
            Distance
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
                onClick={(e) => {
                  setClickedButton("");
                  setVisible(false);
                  dispatch(setSceneClickable(false));
                }}
                className="bg-red-300 hover:bg-red-400 active:bg-red-500 rounded text-center px-4 py-1 disable-drag"
              >
                Cancel
              </button>
              <button
                onClick={handleOk}
                id="distance-ok-btn"
                disabled={!isValid || clickedButton !== ""}
                className={`rounded text-center px-4 py-1 disable-drag ${
                  isValid && clickedButton === ""
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
                Measurement number
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="number"
                  name="name"
                  value={distanceNumber}
                  onChange={handleChanges}
                  id="name"
                  autoComplete="off"
                  className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600"
                />
              </div>
            </div>
            <div className="col-span-full">
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-400"></div>
                <div className="flex-grow border-t border-gray-400"></div>
              </div>
            </div>
            <div className="col-span-6">
              <div className="flex rounded-md sm:max-w-lg ring-1 ring-inset disable-drag">
                <button
                  className={`block flex-1 py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md sm:max-w-lg ring-1 ring-inset ring-primary-600
                  ${
                    clickedButton !== "start"
                      ? "bg-teal-400 hover:bg-teal-500 active:bg-teal-600 hover:transition duration-150"
                      : "bg-[#D9D9D9]"
                  }`}
                  onClick={handleStart}
                  disabled={clickedButton === "start"}
                  type="button"
                >
                  Pick start point
                </button>
              </div>
            </div>
            <div className="col-span-6">
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <button
                  className={`block flex-1 py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md sm:max-w-lg ring-1 ring-inset ring-primary-600
                  ${
                    clickedButton !== "end"
                      ? "bg-teal-400 hover:bg-teal-500 active:bg-teal-600 hover:transition duration-150"
                      : "bg-[#D9D9D9]"
                  }`}
                  onClick={handleEnd}
                  disabled={clickedButton === "end"}
                  type="button"
                >
                  Pick end point
                </button>
              </div>
            </div>
            <div className="col-span-full mb-0 pb-0">
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-400"></div>
                <span className="flex-shrink mx-4 text-gray-400">
                  Or set manually
                </span>
                <div className="flex-grow border-t border-gray-400"></div>
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="x1"
                className="block text-sm font-medium text-gray-900"
              >
                X1
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="x1"
                  value={x1}
                  onChange={handleChanges}
                  disabled={clickedButton === "start"}
                  id="x1"
                  autoComplete="off"
                  className={`w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600
                  ${clickedButton !== "start" ? "opacity-100" : "opacity-50"}
                `}
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="x2"
                className="block text-sm font-medium text-gray-900"
              >
                X2
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="x2"
                  value={x2}
                  onChange={handleChanges}
                  disabled={clickedButton === "end"}
                  id="x2"
                  autoComplete="off"
                  className={`w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600
                  ${clickedButton !== "end" ? "opacity-100" : "opacity-50"}
                `}
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="x1"
                className="block text-sm font-medium text-gray-900"
              >
                Y1
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="y1"
                  value={y1}
                  onChange={handleChanges}
                  disabled={clickedButton === "start"}
                  id="y1"
                  autoComplete="off"
                  className={`w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600
                  ${clickedButton !== "start" ? "opacity-100" : "opacity-50"}
                `}
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="y2"
                className="block text-sm font-medium text-gray-900"
              >
                Y2
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="y2"
                  value={y2}
                  onChange={handleChanges}
                  disabled={clickedButton === "end"}
                  id="y2"
                  autoComplete="off"
                  className={`w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600
                  ${clickedButton !== "end" ? "opacity-100" : "opacity-50"}
                `}
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="x1"
                className="block text-sm font-medium text-gray-900"
              >
                Z1
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="z1"
                  value={z1}
                  onChange={handleChanges}
                  disabled={clickedButton === "start"}
                  id="z1"
                  autoComplete="off"
                  className={`w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600
                  ${clickedButton !== "start" ? "opacity-100" : "opacity-50"}
                `}
                />
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="z2"
                className="block text-sm font-medium text-gray-900"
              >
                Z2
              </label>
              <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="z2"
                  value={z2}
                  onChange={handleChanges}
                  disabled={clickedButton === "end"}
                  id="z2"
                  autoComplete="off"
                  className={`w-full block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600
                  ${clickedButton !== "end" ? "opacity-100" : "opacity-50"}
                `}
                />
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
    // <Draggable>
    //   <div
    //     style={{ left: menuPosition.x, top: menuPosition.y, position: "fixed" }}
    //     className="absolute bg-white w-fit rounded shadow z-10"
    //   >
    //     <h1 className="cursor-pointer bg-green-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-gray-800">
    //       Lumped port
    //     </h1>
    //     <div className="flex flex-col p-2">
    //       <div className="flex flex-col px-2 py-2 space-y-2">
    //         <div className="flex flex-row gap-2 items-center">
    //           <label className="text-center">Port number:</label>
    //           <input
    //             disabled
    //             type="text"
    //             name="name"
    //             min={portLength + 1}
    //             max="64"
    //             value={portNumber}
    //             onChange={handleChanges}
    //             className="w-12 px-1 py-1 border rounded-sm bg-gray-100"
    //           />
    //           <label className="text-center">Impedance:</label>
    //           <input
    //             type="text"
    //             name="impedance"
    //             min="0"
    //             max="10000"
    //             value={impedance}
    //             onChange={handleChanges}
    //             className="w-14 px-1 py-1 border rounded-sm"
    //           />
    //           <label className="text-center">Ω</label>
    //         </div>
    //         <div className="flex flex-row gap-2 items-center">
    //           <label className="text-center">Amplitude:</label>
    //           <input
    //             type="text"
    //             name="amplitude"
    //             min="0"
    //             max="1000"
    //             value={amplitude}
    //             onChange={handleChanges}
    //             className="w-14 px-1 py-1 border rounded-sm"
    //           />
    //           <label className="text-center">Phase shift:</label>
    //           <input
    //             type="text"
    //             name="phase_shift"
    //             min="0"
    //             max="360000"
    //             value={phase_shift}
    //             onChange={handleChanges}
    //             className="w-14 px-1 py-1 border rounded-sm"
    //           />
    //           <label className="text-center">° (ref: </label>
    //           <input
    //             type="text"
    //             name="f_ref"
    //             min="1"
    //             max="360000"
    //             value={f_ref}
    //             onChange={handleChanges}
    //             className="w-32 px-1 py-1 border rounded-sm"
    //           />
    //           <label className="text-center"> Hz)</label>
    //         </div>
    //         <div className="flex flex-row gap-4 items-center">
    //           <div className="flex flex-row gap-2">
    //             <label className="text-center">X1:</label>
    //             <input
    //               type="text"
    //               name="x1"
    //               value={x1}
    //               onChange={handleChanges}
    //               className="w-32 px-1 py-1 border rounded-sm"
    //             />
    //           </div>
    //           <div className="flex flex-row gap-2">
    //             <label className="text-center">X2:</label>
    //             <input
    //               type="text"
    //               name="x2"
    //               value={x2}
    //               onChange={handleChanges}
    //               className="w-32 px-1 py-1 border rounded-sm"
    //             />
    //           </div>
    //         </div>
    //         <div className="flex flex-row gap-4 items-center">
    //           <div className="flex flex-row gap-2">
    //             <label className="text-center">Y1:</label>
    //             <input
    //               type="text"
    //               name="y1"
    //               value={y1}
    //               onChange={handleChanges}
    //               className="w-32 px-1 py-1 border rounded-sm"
    //             />
    //           </div>
    //           <div className="flex flex-row gap-2">
    //             <label className="text-center">Y2:</label>
    //             <input
    //               type="text"
    //               name="y2"
    //               value={y2}
    //               onChange={handleChanges}
    //               className="w-32 px-1 py-1 border rounded-sm"
    //             />
    //           </div>
    //         </div>
    //         <div className="flex flex-row gap-4 items-center">
    //           <div className="flex flex-row gap-2">
    //             <label className="text-center">Z1:</label>
    //             <input
    //               type="text"
    //               name="z1"
    //               value={z1}
    //               onChange={handleChanges}
    //               className="w-32 px-1 py-1 border rounded-sm"
    //             />
    //           </div>
    //           <div className="flex flex-row gap-2">
    //             <label className="text-center">Z2:</label>
    //             <input
    //               type="text"
    //               name="z2"
    //               value={z2}
    //               onChange={handleChanges}
    //               className="w-32 px-1 py-1 border rounded-sm"
    //             />
    //           </div>
    //         </div>

    //         <div className="flex flex-row gap-1 justify-center pt-4">
    //           <button
    //             onClick={handleOk}
    //             className="bg-green-300 hover:bg-green-400 rounded text-center px-4 py-1"
    //           >
    //             OK
    //           </button>
    //           <button
    //             onClick={closeMenu}
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

export default DistanceMenu;
