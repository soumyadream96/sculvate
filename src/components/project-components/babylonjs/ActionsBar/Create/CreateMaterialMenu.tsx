import * as React from "react";
import { useState, useEffect, useRef } from "react";
import * as BABYLON from "babylonjs";
import { Vector3 } from "babylonjs";
import { useAppSelector, useAppDispatch } from "state/hooks";
import DraggableModal from "components/DraggableModal";
import { modelAltered, selectModels } from "state/reducers/modelSlice";

import { addParameter, editParameter } from "state/reducers/parametersSlice";
import { v4 as uuid } from "uuid";
import { selectParameters } from "state/reducers/parametersSlice";
import { selectUsername } from "state/reducers/authSlice";
import { Storage } from "aws-amplify";
import Materials from "../../types/materials";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectMaterials, setMaterials } from "state/reducers/userSlice";
import { calculate, replaceParametersToIds, replaceIdsToParameters } from "utilities";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";

const stringMath = require("string-math");

export interface CreateMaterialMenu {
  visible: boolean;
  setVisible: any;
}

function CreateMaterialMenu({ visible, setVisible }: CreateMaterialMenu) {
  const [materialName, setMaterialName] = useState("");
  const [materialEpsilon, setMaterialEpsilon] = useState("");
  const [materialMu, setMaterialMu] = useState("");
  const [materialLossTangent, setMaterialLossTangent] = useState("");
  const [materialLossTangentFrequency, setMaterialLossTangentFrequency] =
    useState("");
  const [materialKappa, setMaterialKappa] = useState("");
  const [inputMode, setInputMode] = useState("lossTangent");

  const materials = useAppSelector(selectMaterials);

  const dispatch = useAppDispatch();
  const username = useAppSelector(selectUsername);
  const parameters = useAppSelector(selectParameters);
  const simulationProperties = useAppSelector(selectSimulationProperties);

  const frequencyMapping: { [unit: string]: number } = {
    Hz: 1,
    kHz: 1e3,
    MHz: 1e6,
    GHz: 1e9,
    THz: 1e12,
  };

  const frequencyMultiplier =
    frequencyMapping[simulationProperties.frequencyUnit];

  useEffect(() => {
    setMaterialName("");
    setMaterialEpsilon("");
    setMaterialMu("");
    setMaterialLossTangent("");
    setMaterialLossTangentFrequency("");
    setMaterialKappa("");
    setInputMode("lossTangent");
    const keyDownFunc = (event: any) => {
      if (visible) {
        if (event.key === "Escape") {
          setVisible(false);
          document.removeEventListener("keydown", keyDownFunc);
        } else if (event.key === "Enter") {
          event.preventDefault();
          document.getElementById("material-ok-btn")?.click();
          document.removeEventListener("keydown", keyDownFunc);
        }
      }
    };
    document.addEventListener("keydown", keyDownFunc);
  }, [visible]);

  useEffect(() => {
    if (
      materialEpsilon !== "" &&
      materialLossTangent !== "" &&
      materialLossTangentFrequency !== ""
    ) {
      setMaterialKappa(
        String(
          Math.round(
            2 *
              3.14159265359 *
              frequencyMultiplier *
              parseFloat(
                calculate(replaceParametersToIds(materialLossTangentFrequency, parameters), parameters).toString()
              ) *
              8.8541878128e-12 *
              parseFloat(calculate(replaceParametersToIds(materialEpsilon, parameters), parameters).toString()) *
              parseFloat(
                calculate(replaceParametersToIds(materialLossTangent, parameters), parameters).toString()
              ) *
              100000
          ) / 100000
        )
      );
    } else if (
      materialLossTangent === "" &&
      materialLossTangentFrequency === ""
    ) {
      setMaterialKappa("");
    }
  }, [
    materialEpsilon,
    materialLossTangent,
    materialLossTangentFrequency,
    parameters,
    frequencyMultiplier,
  ]);

  const getRandomHexColor = (): string => {
    const letters = "0123456789abcdef";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const isValidIdentifier = (str: string) => {
    return /^[a-zA-Z_][a-zA-Z0-9_ ]*$/.test(str);
  };

  const handleOk = async (e: any) => {
    if (!isValidIdentifier(materialName)) {
      toast.error(
        "Invalid material name; must begin with a letter or underscore and contain only letters, numbers, underscores, and spaces.",
        {
          toastId: "error",
        }
      );
      return;
    }

    if (
      isNaN(parseFloat(calculate(replaceParametersToIds(materialEpsilon, parameters), parameters).toString())) ||
      parseFloat(calculate(replaceParametersToIds(materialEpsilon, parameters), parameters).toString()) < 1 ||
      isNaN(parseFloat(calculate(replaceParametersToIds(materialMu, parameters), parameters).toString())) ||
      parseFloat(calculate(replaceParametersToIds(materialMu, parameters), parameters).toString()) < 1 ||
      isNaN(parseFloat(calculate(replaceParametersToIds(materialKappa, parameters), parameters).toString())) ||
      parseFloat(calculate(replaceParametersToIds(materialKappa, parameters), parameters).toString()) < 0 ||
      parseFloat(calculate(replaceParametersToIds(materialLossTangent, parameters), parameters).toString()) < 0 ||
      parseFloat(
        calculate(replaceParametersToIds(materialLossTangentFrequency, parameters), parameters).toString()
      ) < 0 ||
      (materialLossTangent === "" && materialLossTangentFrequency !== "") ||
      (materialLossTangent !== "" && materialLossTangentFrequency === "")
    ) {
      toast.error("Invalid material properties. Please try again.", {
        toastId: "error",
      });
      return;
    }

    const newMaterial = {
      color: getRandomHexColor(),
      epsilon: parseFloat(calculate(replaceParametersToIds(materialEpsilon, parameters), parameters).toString()),
      mu: parseFloat(calculate(replaceParametersToIds(materialMu, parameters), parameters).toString()),
      ...(!isNaN(parseFloat(calculate(replaceParametersToIds(materialKappa, parameters), parameters).toString()))
        ? { kappa: parseFloat(calculate(replaceParametersToIds(materialKappa, parameters), parameters).toString()) }
        : {}),
      custom: true,
    };

    const updatedMaterials = {
      ...materials,
      [materialName]: newMaterial,
    };

    try {
      const updatedDataString = JSON.stringify(updatedMaterials);

      await Storage.put(`${username}/materials.json`, updatedDataString, {
        contentType: "application/json",
        cacheControl: "no-cache",
      });

      dispatch(setMaterials(updatedMaterials));

      setVisible(!visible);
    } catch (error) {
      console.error("Error adding material:", error);
    }
  };

  const handleCancel = (e: any) => {
    setVisible(!visible);
  };

  const handleMaterialName = (e: any) => {
    setMaterialName(e.target.value);
  };
  const handleMaterialEpsilon = (e: any) => {
    setMaterialEpsilon(e.target.value);
  };
  const handleMaterialMu = (e: any) => {
    setMaterialMu(e.target.value);
  };
  const handleMaterialLossTangent = (e: any) => {
    setMaterialLossTangent(e.target.value);
  };
  const handleMaterialLossTangentFrequency = (e: any) => {
    setMaterialLossTangentFrequency(e.target.value);
  };
  const handleMaterialKappa = (e: any) => {
    setMaterialKappa(e.target.value);
    setMaterialLossTangent("");
    setMaterialLossTangentFrequency("");
  };
  // Update handleMaterialKappa to clear Loss Tangent and Frequency when kappa is set
  // const handleMaterialKappa = (e: any) => {
  //   setMaterialKappa(e.target.value);
  //   if (e.target.value !== "") {
  //     setMaterialLossTangent("");
  //     setMaterialLossTangentFrequency("");
  //   }
  // };

  // Function to handle switching the mode
  const toggleInputMode = (mode: string) => {
    setInputMode(mode);
    // Clear out values when switching modes
    setMaterialLossTangent("");
    setMaterialLossTangentFrequency("");
    setMaterialKappa("");
  };

  return (
    <DraggableModal
      title={
        <div className="cursor-pointer bg-primary-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-primary-600">
          New material
        </div>
      }
      visible={visible}
      buttons={
        <div className="flex flex-row w-full gap-2 justify-center">
          <button
            onClick={handleCancel}
            id="material-cancel-btn"
            className="relative h-9 items-center my-auto mt-3 inline-flex w-24 justify-center rounded-md bg-white py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 active:bg-gray-100 sm:mt-0 disable-drag"
          >
            Cancel
          </button>
          <button
            onClick={handleOk}
            id="material-ok-btn"
            className="relative h-9 inline-flex w-24 items-center justify-center my-auto font-medium text-sm rounded-md focus:outline-none text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 hover:transition duration-150 shadow-sm enabled:hover:shadow-primary-600/50 disable-drag disabled:bg-primary-300"
            disabled={
              !isValidIdentifier(materialName) ||
              isNaN(
                parseFloat(calculate(replaceParametersToIds(materialEpsilon, parameters), parameters).toString())
              ) ||
              parseFloat(calculate(replaceParametersToIds(materialEpsilon, parameters), parameters).toString()) <
                1 ||
              isNaN(parseFloat(calculate(replaceParametersToIds(materialMu, parameters), parameters).toString())) ||
              parseFloat(calculate(replaceParametersToIds(materialMu, parameters), parameters).toString()) < 1 ||
              isNaN(
                parseFloat(calculate(replaceParametersToIds(materialKappa, parameters), parameters).toString())
              ) ||
              parseFloat(calculate(replaceParametersToIds(materialKappa, parameters), parameters).toString()) < 0 ||
              parseFloat(
                calculate(replaceParametersToIds(materialLossTangent, parameters), parameters).toString()
              ) < 0 ||
              parseFloat(
                calculate(replaceParametersToIds(materialLossTangentFrequency, parameters), parameters).toString()
              ) < 0 ||
              (materialLossTangent === "" &&
                materialLossTangentFrequency !== "") ||
              (materialLossTangent !== "" &&
                materialLossTangentFrequency === "")
            }
          >
            Create
          </button>
        </div>
      }
    >
      <form>
        <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-3">
          <div className="col-span-full">
            <label
              htmlFor="name"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Material name
            </label>
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="name"
                id="name"
                autoComplete="off"
                value={materialName}
                onChange={handleMaterialName}
                className="flex flex-1 border-0 bg-transparent py-1.5 px-2 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
          </div>
          <div className="mt-2 col-span-full">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-400"></div>
              <span className="flex-shrink mx-4 text-gray-400">
                Material properties
              </span>
              <div className="flex-grow border-t border-gray-400"></div>
            </div>
          </div>
          <div className="col-span-full">
            <label
              htmlFor="epsilon"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              Relative permittivity,{" "}
              <i>
                ε<sub>r</sub>
              </i>
            </label>
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="epsilon"
                id="epsilon"
                autoComplete="off"
                value={materialEpsilon}
                onChange={handleMaterialEpsilon}
                className="flex flex-1 border-0 bg-transparent py-1.5 px-2 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
          </div>
          <div className="col-span-full">
            <label
              htmlFor="mu"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              Relative permeability,{" "}
              <i>
                μ<sub>r</sub>
              </i>
            </label>
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="mu"
                id="mu"
                autoComplete="off"
                value={materialMu}
                onChange={handleMaterialMu}
                className="flex flex-1 border-0 bg-transparent py-1.5 px-2 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
          </div>
          <div className="mt-2 col-span-full">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-400"></div>
              <span className="flex-shrink mx-4 text-gray-400">
                Electrical conductivity
              </span>
              <div className="flex-grow border-t border-gray-400"></div>
            </div>
          </div>
          {/* Radio buttons for switching input modes */}
          <div className="accent-primary-600 col-span-full mb-1">
            <div className="flex items-center">
              <div className="flex items-center mr-4">
                <input
                  id="lossTangentMode"
                  type="radio"
                  name="inputMode"
                  value="lossTangent"
                  checked={inputMode === "lossTangent"}
                  onChange={() => toggleInputMode("lossTangent")}
                  className="text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <label
                  htmlFor="lossTangentMode"
                  className="ml-2 block text-sm font-medium text-gray-900"
                >
                  Loss tangent
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="conductivityMode"
                  type="radio"
                  name="inputMode"
                  value="conductivity"
                  checked={inputMode === "conductivity"}
                  onChange={() => toggleInputMode("conductivity")}
                  className="text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <label
                  htmlFor="conductivityMode"
                  className="ml-2 block text-sm font-medium text-gray-900"
                >
                  Conductivity
                </label>
              </div>
            </div>
          </div>

          {/* Conditional rendering based on the selected input mode */}
          {inputMode === "lossTangent" && (
            <div className="col-span-full">
              <label
                htmlFor="lossTangent"
                className="block text-sm font-medium leading-6 text-gray-900 mr-2"
              >
                Loss tangent, <i>tan(δ)</i>
              </label>
              <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-primary-600 disable-drag">
                <input
                  type="text"
                  name="lossTangent"
                  id="lossTangent"
                  autoComplete="off"
                  value={materialLossTangent}
                  onChange={handleMaterialLossTangent}
                  className="flex flex-1 border-0 bg-transparent py-1.5 px-2 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                />
              </div>
              <label
                htmlFor="lossTangentFrequency"
                className="block text-sm font-medium leading-6 text-gray-900 mt-2"
              >
                Frequency, <i>ƒ</i>
              </label>
              <div className="flex">
                <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                  <input
                    type="text"
                    name="lossTangentFrequency"
                    id="lossTangentFrequency"
                    autoComplete="off"
                    value={materialLossTangentFrequency}
                    onChange={handleMaterialLossTangentFrequency}
                    className="flex flex-1 border-0 bg-transparent py-1.5 pl-2 pr-5 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                  />
                </div>
                <label
                  htmlFor="lossTangentFrequency"
                  className="block text-sm font-medium leading-6 text-gray-900 ml-2 mt-0.5"
                >
                  {simulationProperties.frequencyUnit}
                </label>
              </div>
            </div>
          )}
          {inputMode === "conductivity" && (
            <div className="col-span-full">
              <label
                htmlFor="conductivity"
                className="block text-sm font-medium leading-6 text-gray-900 mr-2"
              >
                Conductivity, <i>σ</i>
              </label>
              <div className="flex">
                <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
                  <input
                    type="text"
                    name="conductivity"
                    id="conductivity"
                    autoComplete="off"
                    value={materialKappa}
                    onChange={handleMaterialKappa}
                    className="flex flex-1 border-0 bg-transparent py-1.5 pl-2 pr-5 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
                  />
                </div>
                <label
                  htmlFor="conductivity"
                  className="block text-sm font-medium leading-6 text-gray-900 ml-2 mt-0.5"
                >
                  S/m
                </label>
              </div>
            </div>
          )}
        </div>
      </form>
    </DraggableModal>
  );
}

export default CreateMaterialMenu;
