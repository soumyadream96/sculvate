import { useAppDispatch, useAppSelector } from "state/hooks";
import { Model, modelAltered } from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import { Storage } from "aws-amplify";
import { selectUsername } from "state/reducers/authSlice";
import { useEffect, useState } from "react";
import Materials from "../types/materials";
import MyIcon from "assets/MyIcons";
import { Tooltip } from "react-tooltip";
import CreateMaterialMenu from "../ActionsBar/Create/CreateMaterialMenu";
import { selectMaterials, setMaterials } from "state/reducers/userSlice";
import { useParams } from "react-router-dom";
import { wait } from "utilities";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  selectSimulationProperties,
  updateSimulationProperties,
} from "state/reducers/simulationPropertiesSlice";

interface MaterialMenuProps {
  models: Model[];
  isMultiSelect: boolean;
  materialMenuVisible: boolean;
  setMaterialMenuVisible: any;
}

const MaterialMenu = ({
  models,
  isMultiSelect,
  materialMenuVisible,
  setMaterialMenuVisible,
}: MaterialMenuProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const dispatch = useAppDispatch();
  const simulationProperties = useAppSelector(selectSimulationProperties);

  const materialToBeChangedModels = models.filter(
    (model) => model.selected === true && model.type != "folder"
  );

  const username = useAppSelector(selectUsername);
  const materials = useAppSelector(selectMaterials) || {};
  const { projectId } = useParams<{ projectId: string }>();

  const dimensionsUnit = simulationProperties.dimensionsUnit;
  const dimensionsMapping: { [unit: string]: number } = {
    m: 1,
    cm: 1e-2,
    mm: 1e-3,
    um: 1e-6,
    nm: 1e-9,
  };
  const dimensionsMultiplier = dimensionsMapping[dimensionsUnit];

  const frequencyUnit = simulationProperties.frequencyUnit;
  const frequencyMapping: { [unit: string]: number } = {
    Hz: 1,
    kHz: 1e3,
    MHz: 1e6,
    GHz: 1e9,
    THz: 1e12,
  };
  const frequencyMultiplier = frequencyMapping[frequencyUnit];

  const c = 299792458; // m/s

  const onMaterialChange = async (material: string, clickedObject: Model) => {
    return new Promise(async (res, rej) => {
      const alteredObject = {
        ...clickedObject,
        status: "Altered",
        material: material,
      };
      dispatch(modelAltered(alteredObject));
      await dispatch(
        addHistory({
          payloadData: {
            change_material: {
              ...alteredObject,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
      res(true);
    });
  };

  const menuItemClickHandler = async (material: string) => {
    const kappa =
      materials[material]?.kappa !== undefined
        ? materials[material].kappa
        : "-";
    if (typeof kappa === "number" && kappa > 1) {
      dispatch(
        updateSimulationProperties({
          ...simulationProperties,
          cpw_min: Math.min(
            Math.max(
              100,
              Math.max(
                Math.round(
                  (1e8 * dimensionsMultiplier * c) /
                    (frequencyMultiplier * simulationProperties.f_max)
                ),
                simulationProperties.cpw_min
              )
            ),
            90000
          ),
        })
      );
      toast.warn(
        "For optimal simulation performance, setting PEC for all metals is recommended for most high-frequency models.",
        {
          toastId: "warning",
          autoClose: 10000,
        }
      );
    } else if (material === "PEC") {
      dispatch(
        updateSimulationProperties({
          ...simulationProperties,
          cpw_min: 500,
        })
      );
    }

    if (isMultiSelect) {
      for (let i = 0; i < materialToBeChangedModels.length; i++) {
        await onMaterialChange(material, materialToBeChangedModels[i]);
      }
    } else {
      onMaterialChange(material, materialToBeChangedModels[0]);
    }
  };

  const showMaterialUsedMark = (material: string) => {
    if (isMultiSelect) {
      if (
        materialToBeChangedModels.some(
          (model) => model.selected && model.material === material
        )
      ) {
        return (
          <div className="mt-[1px]">
            <MyIcon name="check-square" />
          </div>
        );
      }
    } else {
      if (materialToBeChangedModels[0]?.material === material) {
        return (
          <div className="mt-[1px]">
            <MyIcon name="check-square" />
          </div>
        );
      }
    }
  };

  const openNewMaterialMenu = (e: any) => {
    setMaterialMenuVisible(true);
  };

  const deleteMaterialAndUpload = async (materialToDelete: string) => {
    // Delete the material from local state
    const newMaterials = { ...materials };
    delete newMaterials[materialToDelete];
    dispatch(setMaterials(newMaterials));
    await dispatch(
      addHistory({
        payloadData: {
          delete_material: {
            ...newMaterials,
          },
        },
        currentUsername: username,
        projectId: projectId || "",
      })
    );
    // Upload the new materials to S3
    try {
      await Storage.put(
        `${username}/materials.json`,
        JSON.stringify(newMaterials)
      );
    } catch (error) {
      console.error(
        "Failed to upload the updated materials.json to S3:",
        error
      );
    }
  };

  return (
    <div
      className="absolute left-40 top-5 z-50 w-64 bg-white rounded-lg divide-y divide-gray-100 shadow-xl ring-1 ring-inset ring-gray-200 cursor-default"
      style={{ maxHeight: "400px", overflow: "auto" }}
    >
      <ul className="text-sm text-gray-700 px-2 py-2">
        <li className="pb-2">
          <div className="py-1 hidden shadow-sm md:!flex align-middle border-2 border-[#D0D5DD] rounded-md cursor-default">
            <label htmlFor="search-material" className="ml-4 mr-1 my-auto">
              <MyIcon name="search" />
            </label>
            <input
              id="search-material"
              type="text"
              autoComplete="off"
              className="my-auto mr-1 px-2 py-1 text-sm flex items-center justify-center focus:outline-none placeholder-[#667085]"
              placeholder="Filter materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </li>
        <li>
          <button
            className="flex justify-between text-primary-600 rounded text-left w-full py-2 px-4 hover:bg-primary-200 active:bg-primary-300"
            onClick={openNewMaterialMenu}
          >
            <svg
              className="w-5 h-5 mt-0.5"
              width="10"
              height="10"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.335 5.63056V13.0394M5.63056 9.335H13.0394M5.44533 17.67H13.2247C14.7807 17.67 15.5587 17.67 16.153 17.3672C16.6758 17.1008 17.1008 16.6758 17.3672 16.153C17.67 15.5587 17.67 14.7807 17.67 13.2247V5.44533C17.67 3.88932 17.67 3.11131 17.3672 2.517C17.1008 1.99422 16.6758 1.56919 16.153 1.30282C15.5587 1 14.7807 1 13.2247 1H5.44533C3.88932 1 3.11131 1 2.517 1.30282C1.99422 1.56919 1.56919 1.99422 1.30282 2.517C1 3.11131 1 3.88932 1 5.44533V13.2247C1 14.7807 1 15.5587 1.30282 16.153C1.56919 16.6758 1.99422 17.1008 2.517 17.3672C3.11131 17.67 3.88932 17.67 5.44533 17.67Z"
                stroke="#7F56D9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            New material...
            <div></div>
          </button>
        </li>
        <li>
          {Object.keys(materials).filter(
            (material) => materials[material].custom === true
          ).length != 0 && (
            <div className="col-span-full my-2 pb-0 cursor-default">
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-400"></div>
                <span className="flex-shrink mx-4 text-gray-400">
                  Custom materials
                </span>
                <div className="flex-grow border-t border-gray-400"></div>
              </div>
            </div>
          )}
        </li>

        {/* Materials with 'custom' key set to true */}
        {Object.keys(materials)
          .filter(
            (material) =>
              materials[material].custom === true &&
              material.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((material, index) => {
            const epsilon =
              materials[material]?.epsilon !== undefined
                ? materials[material].epsilon
                : "-";
            const mu =
              materials[material]?.mu !== undefined
                ? materials[material].mu
                : "-";
            const kappa =
              materials[material]?.kappa !== undefined
                ? materials[material].kappa + " S/m"
                : "-";

            return (
              <>
                <li key={index + 1}>
                  <button
                    onClick={(e) => {
                      menuItemClickHandler(material);
                    }}
                    className={`flex justify-between rounded text-left w-full py-2 px-4 hover:bg-gray-200 active:bg-gray-300 ${
                      materialToBeChangedModels.some(
                        (model) => model.material === material
                      )
                        ? "font-bold bg-greenLight-200 hover:bg-greenLight-200 active:bg-greenLight-300"
                        : ""
                    }`}
                  >
                    {showMaterialUsedMark(material)}
                    {material}
                    <div className="flex">
                      <span
                        data-tooltip-id={"delete_" + String(index + 1)}
                        data-tooltip-content="Delete material"
                        data-tooltip-place="top"
                      >
                        <svg
                          width="18"
                          height="20"
                          viewBox="0 0 18 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMaterialAndUpload(material);
                          }}
                        >
                          <path
                            d="M12.3333 5V4.33333C12.3333 3.39991 12.3333 2.9332 12.1517 2.57668C11.9919 2.26308 11.7369 2.00811 11.4233 1.84832C11.0668 1.66667 10.6001 1.66667 9.66667 1.66667H8.33333C7.39991 1.66667 6.9332 1.66667 6.57668 1.84832C6.26308 2.00811 6.00811 2.26308 5.84832 2.57668C5.66667 2.9332 5.66667 3.39991 5.66667 4.33333V5M7.33333 9.58333V13.75M10.6667 9.58333V13.75M1.5 5H16.5M14.8333 5V14.3333C14.8333 15.7335 14.8333 16.4335 14.5608 16.9683C14.3212 17.4387 13.9387 17.8212 13.4683 18.0609C12.9335 18.3333 12.2335 18.3333 10.8333 18.3333H7.16667C5.76654 18.3333 5.06647 18.3333 4.53169 18.0609C4.06129 17.8212 3.67883 17.4387 3.43915 16.9683C3.16667 16.4335 3.16667 15.7335 3.16667 14.3333V5"
                            stroke="#D92D20"
                            strokeWidth="1.66667"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span
                        data-tooltip-id={"custom_" + String(index + 1)}
                        data-tooltip-content={
                          kappa === "0" ||
                          kappa === "0 S/m" ||
                          kappa === "-" ||
                          kappa === "undefined"
                            ? `εᵣ = ${epsilon}\nμᵣ = ${mu}`
                            : parseFloat(kappa) > 1
                            ? `εᵣ = ${epsilon}\nμᵣ = ${mu}\nσ = ${kappa}`
                            : `εᵣ = ${epsilon}\nμᵣ = ${mu}\ntan(δ) = ${String(
                                (
                                  parseFloat(kappa) /
                                  (2 *
                                    3.14159265359 *
                                    ((simulationProperties.f_min +
                                      simulationProperties.f_max) /
                                      2) *
                                    frequencyMultiplier *
                                    8.8541878128e-12 *
                                    parseFloat(epsilon as string))
                                ).toFixed(8)
                              )}\nat ƒ = ${String(
                                (simulationProperties.f_min +
                                  simulationProperties.f_max) /
                                  2
                              )} ${simulationProperties.frequencyUnit}`
                        }
                        data-tooltip-place="top"
                      >
                        <MyIcon className="ml-2 mt-0.5" name="info-circle" />
                      </span>
                    </div>
                  </button>
                  <Tooltip
                    id={"custom_" + String(index + 1)}
                    style={{ whiteSpace: "pre-wrap" }}
                    className="z-50"
                  />
                  <Tooltip
                    id={"delete_" + String(index + 1)}
                    style={{ whiteSpace: "pre-wrap" }}
                    className="z-50"
                  />
                </li>
              </>
            );
          })}

        <li>
          <div className="col-span-full my-2 pb-0 cursor-default">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-400"></div>
              <span className="flex-shrink mx-4 text-gray-400">
                Default library
              </span>
              <div className="flex-grow border-t border-gray-400"></div>
            </div>
          </div>
        </li>

        {/* Materials without 'custom' key */}
        {Object.keys(materials)
          .filter(
            (material) =>
              !(material in materials && "custom" in materials[material]) &&
              material.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((material, index) => {
            const epsilon =
              materials[material]?.epsilon !== undefined
                ? materials[material].epsilon
                : "-";
            const mu =
              materials[material]?.mu !== undefined
                ? materials[material].mu
                : "-";
            const kappa =
              materials[material]?.kappa !== undefined
                ? materials[material].kappa + " S/m"
                : "-";

            return (
              <li key={index + 1}>
                <button
                  onClick={(e) => {
                    menuItemClickHandler(material);
                  }}
                  className={`flex justify-between rounded text-left w-full py-2 px-4 hover:bg-gray-200 active:bg-gray-300 ${
                    materialToBeChangedModels.some(
                      (model) => model.material === material
                    )
                      ? "font-bold bg-greenLight-200 hover:bg-greenLight-200 active:bg-greenLight-300"
                      : ""
                  }`}
                >
                  {showMaterialUsedMark(material)}
                  {material}
                  <span
                    data-tooltip-id={"default_" + String(index + 1)}
                    data-tooltip-content={
                      kappa === "0" ||
                      kappa === "0 S/m" ||
                      kappa === "-" ||
                      kappa === "undefined"
                        ? `εᵣ = ${epsilon}\nμᵣ = ${mu}`
                        : parseFloat(kappa) > 1
                        ? `εᵣ = ${epsilon}\nμᵣ = ${mu}\nσ = ${kappa}`
                        : `εᵣ = ${epsilon}\nμᵣ = ${mu}\ntan(δ) = ${String(
                            (
                              parseFloat(kappa) /
                              (2 *
                                3.14159265359 *
                                ((simulationProperties.f_min +
                                  simulationProperties.f_max) /
                                  2) *
                                frequencyMultiplier *
                                8.8541878128e-12 *
                                parseFloat(epsilon as string))
                            ).toFixed(8)
                          )}\nat ƒ = ${String(
                            (simulationProperties.f_min +
                              simulationProperties.f_max) /
                              2
                          )} ${simulationProperties.frequencyUnit}`
                    }
                    data-tooltip-place="top"
                  >
                    <MyIcon className="ml-2 mt-0.5" name="info-circle" />
                  </span>
                </button>
                <Tooltip
                  id={"default_" + String(index + 1)}
                  style={{ whiteSpace: "pre-wrap" }}
                />
              </li>
            );
          })}
      </ul>
    </div>
  );
};

export default MaterialMenu;
