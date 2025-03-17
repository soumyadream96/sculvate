import * as React from "react";
import { useState, useEffect, useRef } from "react";
import * as BABYLON from "babylonjs";
import { Vector3 } from "babylonjs";
import { useAppSelector, useAppDispatch } from "state/hooks";
import DraggableModal from "components/DraggableModal";
import { modelAltered, selectModels } from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import { addParameter, editParameter } from "state/reducers/parametersSlice";
import { v4 as uuid } from "uuid";
import { selectParameters } from "state/reducers/parametersSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectUsername } from "state/reducers/authSlice";
import { useParams } from "react-router-dom";
import { setRefresh, selectRefresh } from "state/reducers/refreshSlice";

const stringMath = require("string-math");

export interface ParameterMenu {
  visible: boolean;
  setVisible: any;
  isEditable: boolean;
  isNewParameter: boolean;
  obj?: any;
}

function ParameterMenu({
  visible,
  setVisible,
  isEditable,
  isNewParameter,
  obj,
}: ParameterMenu) {
  const [parameterName, setParameterName] = useState("");
  const [parameterExpression, setParameterExpression] = useState("");
  const [parameterDescription, setParameterDescription] = useState("");

  const dispatch = useAppDispatch();
  var models = useAppSelector(selectModels);
  var refresh = useAppSelector(selectRefresh);
  var parameters = useAppSelector(selectParameters);

  const username = useAppSelector(selectUsername);
  const { projectId } = useParams<{ projectId: string }>();

  useEffect(() => {
    const keyDownFunc = (event: any) => {
      if (visible) {
        if (event.key === "Escape") {
          setVisible(false);
          document.removeEventListener("keydown", keyDownFunc);
        } else if (event.key === "Enter") {
          event.preventDefault();
          document.getElementById("parameter-ok-btn")?.click();
          document.removeEventListener("keydown", keyDownFunc);
        }
      }
    };
    document.addEventListener("keydown", keyDownFunc);
  }, [visible]);

  useEffect(() => {
    if (isEditable) {
      setParameterName(obj.name);
      setParameterExpression(obj.expression);
      setParameterDescription(obj.description);
    }
    if (isNewParameter) {
      setParameterName("");
      setParameterExpression("");
      setParameterDescription("");
    }
  }, [obj, isEditable, isNewParameter]);

  const isValidIdentifier = (str: string) => {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
  };

  const handleOk = async (e: any) => {
    if (!isValidIdentifier(parameterName)) {
      toast.error(
        "Invalid parameter name; must begin with a letter or underscore and contain only letters, numbers, and underscores.",
        {
          toastId: "error",
        }
      );
      return;
    }
    for (let i = 0; i < parameters.length; i++) {
      if (parameters[i].name === parameterName) {
        if ((isEditable && obj.name !== parameterName) || !isEditable) {
          toast.error("Parameter name already exists!", {
            toastId: "error",
          });
          return;
        }
      }
    }
    if (isEditable) {
      try {
        let value = stringMath(parameterExpression);
        dispatch(
          editParameter({
            id: obj.id,
            name: parameterName,
            expression: parameterExpression,
            value: value,
            description: parameterDescription,
          })
        );
        await dispatch(
          addHistory({
            payloadData: {
              edit_parameter: {
                id: obj.id,
                name: parameterName,
                expression: parameterExpression,
                description: parameterDescription,
              },
            },
            currentUsername: username,
            projectId: projectId || "",
          })
        );
        await dispatch(setRefresh({ refresh: refresh + 1 }));
        setVisible(!visible);
      } catch (err) {
        toast.error("Please type correct expression", {
          toastId: "error",
        });
      }
    } else {
      try {
        let value = stringMath(parameterExpression);
        let id = uuid();
        dispatch(
          addParameter({
            id: id,
            name: parameterName,
            expression: parameterExpression,
            value: value,
            description: parameterDescription,
          })
        );
        await dispatch(
          addHistory({
            payloadData: {
              create_parameter: {
                id: id,
                name: parameterName,
                expression: parameterExpression,
                description: parameterDescription,
              },
            },
            currentUsername: username,
            projectId: projectId || "",
          })
        );
        setVisible(!visible);
      } catch (err) {
        toast.error("Invalid expression.", {
          toastId: "error",
        });
      }
    }
  };
  const handleCancel = (e: any) => {
    setParameterName(obj.name);
    setParameterExpression(obj.expression);
    setParameterDescription(obj.description);
    setVisible(!visible);
  };

  const handleParameterName = (e: any) => {
    setParameterName(e.target.value);
  };
  const handleParameterExpression = (e: any) => {
    setParameterExpression(e.target.value);
  };
  const handleParameterDescription = (e: any) => {
    setParameterDescription(e.target.value);
  };
  return (
    <DraggableModal
      className="z-[51]"
      title={
        <div className="cursor-pointer bg-red-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-gray-800">
          Parameter
        </div>
      }
      visible={visible}
      buttonsClassName="sm:px-4"
      buttons={
        <div className="flex flex-row gap-1 w-full justify-between">
          <div></div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              id="parameter-cancel-btn"
              className="bg-red-300 hover:bg-red-400 active:bg-red-500 rounded text-center px-4 py-1 disable-drag"
            >
              Cancel
            </button>
            <button
              onClick={handleOk}
              id="parameter-ok-btn"
              className="bg-green-300 hover:bg-green-400 active:bg-green-500 rounded text-center px-4 py-1 disable-drag"
            >
              OK
            </button>
          </div>
        </div>
      }
    >
      <form>
        <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-3">
          <div className="col-span-full flex items-center">
            <label
              htmlFor="name"
              className="flex text-sm font-large leading-6 text-gray-900 mr-2"
            >
              Name:
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="name"
                id="name"
                autoComplete="off"
                value={parameterName}
                onChange={handleParameterName}
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
          </div>
          <div className="col-span-full flex items-center">
            <label
              htmlFor="expression"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              Expression:
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="expression"
                id="expression"
                autoComplete="off"
                value={parameterExpression}
                onChange={handleParameterExpression}
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
          </div>
          <div className="col-span-full flex items-center">
            <label
              htmlFor="description"
              className="block text-sm font-medium leading-6 text-gray-900 mr-2"
            >
              Description:
            </label>
            <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-primary-600 disable-drag">
              <input
                type="text"
                name="description"
                id="description"
                autoComplete="off"
                value={parameterDescription}
                onChange={handleParameterDescription}
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
          </div>
        </div>
      </form>
    </DraggableModal>
  );
}

export default ParameterMenu;
