import * as React from "react";
import { useState, useEffect, useRef } from "react";
import * as BABYLON from "babylonjs";
import { Vector3 } from "babylonjs";
import { useAppSelector, useAppDispatch } from "state/hooks";
import DraggableModal from "components/DraggableModal";
import {
  modelAdded,
  modelAltered,
  selectModels,
} from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import { addParameter, editParameter } from "state/reducers/parametersSlice";
import { v4 as uuid } from "uuid";
import { selectParameters } from "state/reducers/parametersSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectUsername } from "state/reducers/authSlice";
import { useParams } from "react-router-dom";
import { setRefresh, selectRefresh } from "state/reducers/refreshSlice";

export interface NewFolderMenu {
  visible: boolean;
  setVisible: any;
  isEditable: boolean;
}

function NewFolderMenu({ visible, setVisible, isEditable }: NewFolderMenu) {
  const [folderName, setFolderName] = useState("");

  const dispatch = useAppDispatch();
  var models = useAppSelector(selectModels);
  var refresh = useAppSelector(selectRefresh);

  const username = useAppSelector(selectUsername);
  const { projectId } = useParams<{ projectId: string }>();

  useEffect(() => {
    if (visible) setFolderName("");
    const keyDownFunc = (event: any) => {
      if (visible) {
        if (event.key === "Escape") {
          setVisible(false);
          document.removeEventListener("keydown", keyDownFunc);
        } else if (event.key === "Enter") {
          event.preventDefault();
          document.getElementById("newfolder-ok-btn")?.click();
          document.removeEventListener("keydown", keyDownFunc);
        }
      }
    };
    document.addEventListener("keydown", keyDownFunc);
  }, [visible]);

  useEffect(() => {}, [isEditable]);

  const handleOk = async (e: any) => {
    if (folderName === "") {
      toast.error("Folder name cannot be empty.", {
        toastId: "error",
      });
      return;
    }
    let model = {
      id: uuid(),
      name: folderName,
      parentId: 0,
      type: "folder",
      status: "Added",
      category: "Objects",
      editable: false,
      visible: true,
      selected: false,
    };
    dispatch(modelAdded(model));
    await dispatch(
      addHistory({
        payloadData: {
          create_folder: {
            name: folderName,
            id: model.id,
            parentId: 0,
          },
        },
        currentUsername: username,
        projectId: projectId || "",
      })
    );
    setVisible(false);
  };
  const handleCancel = (e: any) => {
    setVisible(!visible);
  };

  const handleFolderName = (e: any) => {
    setFolderName(e.target.value);
  };
  return (
    <DraggableModal
      className="z-[51]"
      title={
        <div className="cursor-pointer bg-red-300 w-full text-xl font-semibold rounded-t-md py-2 text-center border-b-2 border-gray-800">
          New group
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
              id="newfolder-cancel-btn"
              className="bg-red-300 hover:bg-red-400 active:bg-red-500 rounded text-center px-4 py-1 disable-drag"
            >
              Cancel
            </button>
            <button
              onClick={handleOk}
              id="newfolder-ok-btn"
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
                value={folderName}
                onChange={handleFolderName}
                className="flex flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm rounded-md shadow-sm ring-1 ring-inset ring-primary-600"
              />
            </div>
          </div>
        </div>
      </form>
    </DraggableModal>
  );
}

export default NewFolderMenu;
