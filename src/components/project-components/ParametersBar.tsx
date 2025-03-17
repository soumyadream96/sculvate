// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "state/hooks";
import "./ParametersBar.css";
import ParameterMenu from "./babylonjs/ActionsBar/Transform/ParameterMenu";
import {
  selectParameters,
  deleteParameter,
  addParameter,
  editParameter,
} from "state/reducers/parametersSlice";
import { addHistory } from "state/reducers/historySlice";
import MyIcon from "assets/MyIcons";
import { modelAltered, selectModels } from "state/reducers/modelSlice";
import Sphere from "./babylonjs/types/sphere";
import Cube from "./babylonjs/types/cube";
import DraggableModal from "components/DraggableModal";
import Modal from "components/Modal";
import { selectUsername } from "state/reducers/authSlice";
import { useParams } from "react-router-dom";
import { selectRefresh, setRefresh } from "state/reducers/refreshSlice";
import { Tooltip } from "react-tooltip";
import { calculate, replaceIdsToParameters, replaceParametersToIds } from "utilities";

export interface ParameterBarProps {
  isParameterUsed: any
}

function ParametersBar({
  isParameterUsed
}: ParameterBarProps) {
  const [visible, setVisible] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [parameter, setParameter] = useState({});
  const models = useAppSelector(selectModels);
  const parameters = useAppSelector(selectParameters);
  const parameterNames = parameters.map((p) => p.name);
  const [confirmDelete, setConfirmDelete] = useState("");
  const username = useAppSelector(selectUsername);
  const refresh = useAppSelector(selectRefresh);
  const { projectId } = useParams();

  const dispatch = useAppDispatch();

  function openAddParameterDialog() {
    setIsEditable(false);
    setVisible(true);
    setParameter({});
  }

  function editParameterFunc(id: string) {
    parameters.map((parameter) => {
      if (parameter.id === id) {
        setIsEditable(true);
        setVisible(true);
        setParameter(parameter);
        return;
      }
    });
  }

  async function removeParameter(id: string) {
    console.log("removing", id);
    dispatch(deleteParameter(id));
    for (let i = 0; i < parameters.length; i++) {
      if (parameters[i].id === id) {
        await dispatch(
          addHistory({
            payloadData: {
              delete_parameter: {
                name: parameters[i].name,
                id: parameters[i]?.id,
                type: "parameter",
              },
            },
            currentUsername: username,
            projectId,
          })
        );
        await dispatch(setRefresh({ refresh: refresh + 1 }));
        break;
      }
    }
  }

  const isNumberOrOperator = (char: string) => {
    return (
      char === "+" ||
      char === "-" ||
      char === "*" ||
      char === "/" ||
      char === "(" ||
      char === ")" ||
      char === "." ||
      char.match(/[0-9]/) !== null
    );
  };

  const paramToFixed = (arithmetic: string, pName: string, value: string) => {
    // const pIdx = arithmetic.indexOf(pName);
    // if (pIdx === -1) return arithmetic;

    // let startIdx = pIdx;
    // let endIdx = pIdx + pName.length;

    // if (startIdx === 0 || isNumberOrOperator(arithmetic[startIdx - 1])) {
    //   if (
    //     endIdx === arithmetic.length ||
    //     isNumberOrOperator(arithmetic[endIdx])
    //   ) {
    //     return arithmetic.slice(0, startIdx) + value + arithmetic.slice(endIdx);
    //   }
    // }

    arithmetic = arithmetic.replaceAll(pName, value);

    return arithmetic;
  };

  // const isParameterUsed = (paramId: string) => {
  //   return models.some((model) => {
  //     let values = { ...model.object };

  //     if (model.category !== "Objects") {
  //       const { x, y, z, ...cleanedObjs } = Object.assign({}, values);

  //       values = cleanedObjs;

  //       values.xMin = replaceIdsToParameters(x.min, parameters);
  //       values.xMax = replaceIdsToParameters(x.max, parameters);
  //       values.yMin = replaceIdsToParameters(y.min, parameters);
  //       values.yMax = replaceIdsToParameters(y.max, parameters);
  //       values.zMin = replaceIdsToParameters(z.min, parameters);
  //       values.zMax = replaceIdsToParameters(z.max, parameters);
  //     }

  //     return Object.keys(values).some((val) => values[val].includes(paramId));
  //   });
  // };

  useEffect(() => {
    console.log(parameters);
  }, [parameters]);

  return (
    <div
      id="parameters-bar"
      className="parameters-bar max-h-[30rem] MuiBox-root css-38zrbw"
    >
      <Modal
        visible={confirmDelete !== ""}
        buttons={
          <>
            <button
              id="element-delete-btn"
              onClick={() => {
                // replace all instances of the parameter with a fixed value
                models.map((model) => {
                  let values = {};

                  if (model.type === "cube") {
                    let xMin = model.object.xMin;
                    let xMax = model.object.xMax;
                    let yMin = model.object.yMin;
                    let yMax = model.object.yMax;
                    let zMin = model.object.zMin;
                    let zMax = model.object.zMax;

                    values = {
                      xMin,
                      xMax,
                      yMin,
                      yMax,
                      zMin,
                      zMax,
                    };
                  } else {
                    Object.keys(model.object).forEach((key) => {
                      if (key === "name") return;

                      values[key] = model.object[key];
                    });

                    if (model.category !== "Objects") {
                      const { x, y, z, ...cleanedObjs } = Object.assign(
                        {},
                        model.object
                      );

                      values = cleanedObjs;

                      values.xMin = x.min;
                      values.xMax = x.max;
                      values.yMin = y.min;
                      values.yMax = y.max;
                      values.zMin = z.min;
                      values.zMax = z.max;
                    }
                  }

                  const param = parameters.find((p) => p.id === confirmDelete);
                  Object.keys(values).forEach((key) => {
                    values[key] = paramToFixed(
                      values[key],
                      param?.id,
                      param?.value
                    );
                  });

                  if (model.category !== "Objects") {
                    const { xMin, xMax, yMin, yMax, zMin, zMax, ...rest } =
                      values;

                    values = {
                      ...rest,
                      x: { min: xMin, max: xMax },
                      y: { min: yMin, max: yMax },
                      z: { min: zMin, max: zMax },
                    };
                  }

                  dispatch(
                    modelAltered({
                      ...model,
                      object: {
                        ...model.object,
                        ...values,
                      },
                    })
                  );
                });

                removeParameter(confirmDelete);
                setConfirmDelete("");
              }}
              className={`relative ml-2 my-auto px-3 py-2 font-medium text-sm flex items-center justify-center align-middle rounded-md focus:outline-none text-white bg-error-600 hover:bg-error-700 active:bg-error-800 hover:transition duration-150 shadow-sm hover:shadow-error-600/50`}
            >
              Delete
            </button>
            <button
              className={`mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 active:bg-gray-100 sm:mt-0 sm:w-auto`}
              onClick={() => {
                setConfirmDelete("");
              }}
            >
              Cancel
            </button>
          </>
        }
      >
        <form>
          <div className="grid grid-cols-1 gap-y-4 mx-2">
            <div className="grid grid-cols-1 gap-x-2">
              <div className="ml-2 col-span-1">
                <h3>
                  <a className="font-medium underline">Delete parameter</a>{" "}
                  {/* <a className="italic">: {parameter.name}</a> */}
                </h3>
                <a className="pt-4 block text-md text-gray-900">
                  Are you sure you wish to delete this parameter?
                </a>
                <a className="mt-4 block text-sm leading-6 text-gray-400">
                  This parameter is currently in use. Deleting it will replace
                  all instances of the parameter name
                  {/* <b>({parameter.name})</b> */} with its associated value
                  {/* <b>({parameter.value})</b> */}.
                </a>
              </div>
            </div>
          </div>
        </form>
      </Modal>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg mx-2">
        <table className="w-full text-sm text-left">
          <thead className="text-s text-gray-700 bg-gray-100 scrollable-table-head">
            <tr className="cursor-auto">
              <th scope="col" className="px-6 py-2">
                Name
              </th>
              <th scope="col" className="px-6 py-2">
                Expression
              </th>
              <th scope="col" className="px-6 py-2">
                Value
              </th>
              <th scope="col" className="px-6 py-2">
                Description
              </th>
              <th scope="col" className="px-6 py-2">
                Delete
              </th>
            </tr>
          </thead>
          <tbody className="scrollable-table-body">
            {parameters.map((parameter) => {
              const used = isParameterUsed(parameter.id);
              const textStyle = used ? "text-gray-700" : "text-gray-400";

              return (
                <tr
                  key={parameter.name}
                  className={`bg-white border-b hover:bg-gray-50 active:bg-gray-200 scrollable-table-row ${textStyle}`}
                  onClick={() => editParameterFunc(parameter.id)}
                >
                  <td
                    scope="row"
                    className={`px-6 py-1 font-medium whitespace-nowrap ${textStyle}`}
                  >
                    {parameter.name}
                  </td>
                  <td className={`px-6 py-1 ${textStyle}`}>
                    {parameter.expression}
                  </td>
                  <td className={`px-6 py-1 ${textStyle}`}>
                    {parameter.value}
                  </td>
                  <td className={`px-6 py-1 ${textStyle}`}>
                    {parameter.description === "" ? "-" : parameter.description}
                  </td>
                  <td>
                    <button
                      className="w-24 h-1 pr-1 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        let foundUsed = false;
                        models.map((model) => {
                          let objs = { ...model.object };

                          if (model.category !== "Objects") {
                            const { x, y, z, ...cleanedObjs } = Object.assign(
                              {},
                              objs
                            );

                            objs = cleanedObjs;

                            objs.xMin = x.min;
                            objs.xMax = x.max;
                            objs.yMin = y.min;
                            objs.yMax = y.max;
                            objs.zMin = z.min;
                            objs.zMax = z.max;
                          }

                          let values = {};

                          Object.keys(objs).forEach((key) => {
                            if (key === "name") return;

                            values[key] = objs[key];
                          });

                          // Using length as a work around for checking if the parameter is used in the model
                          const parametersByLength = parameterNames.sort(
                            (a, b) => b.length - a.length
                          );

                          parametersByLength.map((p) => {
                            if (p === parameter.name) return;

                            Object.keys(values).map((key) => {
                              if (values[key].includes(p)) {
                                let startIdx = values[key].indexOf(p);
                                let endIdx = startIdx + p.length;
                                let arithmetic = values[key];

                                if (
                                  startIdx === 0 ||
                                  isNumberOrOperator(arithmetic[startIdx])
                                ) {
                                  if (
                                    endIdx === arithmetic.length ||
                                    isNumberOrOperator(arithmetic[endIdx])
                                  ) {
                                    values[key] =
                                      arithmetic.slice(0, startIdx) +
                                      parameters.find((prm) => prm.name === p)
                                        .value +
                                      arithmetic.slice(endIdx);
                                  }
                                }
                              }
                            });
                          });

                          if (
                            Object.keys(values)
                              .map((val) =>
                                values[val].includes(parameter.id)
                              )
                              .includes(true)
                          ) {
                            foundUsed = true;
                            setConfirmDelete(parameter.id);
                            return;
                          }
                        });

                        if (!foundUsed && confirmDelete === "") {
                          removeParameter(parameter.id);
                        }
                      }}
                    >
                      <span
                        data-tooltip-id="delete-parameter-tooltip"
                        data-tooltip-content="Delete parameter"
                      >
                        <svg
                          width="18"
                          height="20"
                          viewBox="0 0 18 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
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
                    </button>
                    <Tooltip id="delete-parameter-tooltip" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button
          className="flex items-center px-2 py-1 text-sm font-normal rounded-lg text-gray-700 active:text-gray-900 hover:underline"
          onClick={openAddParameterDialog}
        >
          <MyIcon name="add-item" />
          <span className="flex-1 ml-3.5 text-base font-semibold whitespace-nowrap">
            Add parameter...
          </span>
        </button>
      </div>
      <ParameterMenu
        visible={visible}
        setVisible={setVisible}
        isEditable={isEditable}
        isNewParameter={!isEditable}
        obj={parameter}
      />
    </div>
  );
}

export default ParametersBar;
