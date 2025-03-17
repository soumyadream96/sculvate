import * as React from "react";
import { useContext, useEffect, useState } from "react";
import MaterialMenu from "./MaterialMenu";
import {
  Model,
  modelAdded,
  modelRemoved,
  modelSaved,
  selectSavedModels,
} from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { selectUsername } from "state/reducers/authSlice";
import { useParams } from "react-router-dom";
import { ActiveContextMenuContext } from "contexts";
import MyIcon from "assets/MyIcons";
import { STLExport } from "babylonjs-serializers";
import * as BABYLON from "babylonjs";
import { selectMaterials } from "state/reducers/userSlice";
import { selectParameters } from "state/reducers/parametersSlice";
import { calculate } from "utilities";
import { v4 as uuid } from "uuid";

export interface IContextMenuProps {
  menuPosition: { x: number; y: number };
  visible: boolean;
  models: Model[];
  clickedObject: any;
  // selectAll: (e: any, clickedObject: Item) => void;
  setEditable?: (e: any, clickedObject: Model, status: boolean) => void;
  // setMaterial: (e: any, clickedObject: Item, material: string) => void;
  // createComponent: (e: any, clickedObject: any) => void;
  // deleteObject: (e: any, clickedObject: Item) => void;
  exportObject?: (e: any, clickedObject: Model) => void;
  isMultiSelect: boolean;
  showPropertyMenu?: (e: any, type: string) => void;
  pasteSavedModel: any;
  materialMenuVisible: boolean;
  setMaterialMenuVisible: any;
  setNewFolderMenuVisible?: any;
  mainScene: any;
}

function ContextMenu({
  menuPosition,
  visible,
  models,
  clickedObject,
  setEditable,
  // setMaterial,
  // selectAll,
  // createComponent,
  // deleteObject,
  exportObject,
  isMultiSelect,
  showPropertyMenu,
  pasteSavedModel,
  materialMenuVisible,
  setMaterialMenuVisible,
  setNewFolderMenuVisible,
  mainScene,
}: IContextMenuProps) {
  const [, setIsComponent] = useState(false);
  const [, setIsComponentChild] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);

  const dispatch = useAppDispatch();
  const savedModels = useAppSelector(selectSavedModels);
  const materials = useAppSelector(selectMaterials);
  const parameters = useAppSelector(selectParameters);

  const username = useAppSelector(selectUsername);
  const { projectId } = useParams<{ projectId: string }>();
  const { setActiveContextMenu } = useContext(ActiveContextMenuContext) as any;

  useEffect(() => {
    setIsComponent(false);
    setIsComponentChild(false);
    setShowSubMenu(false);

    if (clickedObject.name === "Component") {
      setIsComponent(true);
    } else {
      let idx = models.findIndex((object) => object.id === clickedObject.id);
      if (idx < 0) {
        setIsComponentChild(true);
      }
    }
  }, [menuPosition, clickedObject.id, clickedObject.name, models]);

  const handleExport = (e: any) => {
    console.log(models);
    if (models.length > 0) {
      models.forEach((model: any) => {
        if (model.selected === true) {
          let mesh = mainScene.getMeshById(model.id);
          if (mesh) {
            let meshString = STLExport.CreateSTL([mesh], false, mesh.id);

            const lines = meshString.split("\n");
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.startsWith("\t\t\tvertex")) {
                const components = line.trim().split(/\s+/);
                const y = components[2];
                const z = components[3];
                components[2] = z;
                components[3] = y;
                lines[i] = components.join(" ");
              }
            }

            meshString = lines.join("\n");

            const blob = new Blob([meshString], {
              type: "application/octet-stream",
            });
            const url = URL.createObjectURL(blob);

            // create a download link
            const link = document.createElement("a");
            link.href = url;
            link.download = model.name + ".stl";
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }
      });
    }
  };

  const saveObject = async (clickedObject: Model) => {
    dispatch(modelSaved(clickedObject.id));
    await dispatch(
      addHistory({
        payloadData: {
          save: {
            name: clickedObject.name,
            id: clickedObject.id,
            type: clickedObject.type,
          },
        },
        currentUsername: username,
        projectId: projectId || "",
      })
    );
  };

  const deleteObject = async (e: any, clickedObject: Model) => {
    return new Promise(async (res, rej) => {
      dispatch(modelRemoved(clickedObject.id));
      await dispatch(
        addHistory({
          payloadData: {
            delete: {
              name: clickedObject.name,
              id: clickedObject.id,
              type: clickedObject.type,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
      res(true);
    });
  };

  const isEmptyFolder = (folderId: any) => {
    return models.filter((mdl: any) => mdl.parentId === folderId).length > 0
      ? false
      : true;
  };

  const areModelsSelected = models.filter((m) => m.selected).length > 0;

  return (
    <>
      {(models.filter((m: any) => m.selected).length > 0 ||
        savedModels.length > 0) && (
        <div
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
            display: visible ? "block" : "none",
          }}
          className="fixed z-50 w-44 bg-white rounded-lg divide-y divide-gray-100 shadow-xl ring-1 ring-inset ring-gray-200"
        >
          <ul className="py-2 text-sm text-gray-700 text-left px-2">
            {/* New Component Button */}
            {models[0] &&
              setNewFolderMenuVisible &&
              models[0].type != "port" &&
              models[0].type != "element" &&
              models[0].type != "distance" && (
                <li>
                  <button
                    onClick={() => setNewFolderMenuVisible(true)}
                    className="flex rounded text-left w-full py-2 px-4 hover:bg-gray-200 active:bg-gray-300"
                  >
                    <MyIcon name="new-folder" />
                    <span className="flex-1 ml-3.5 whitespace-nowrap">
                      Create group
                    </span>
                  </button>
                </li>
              )}
            {/* Rename Button */}
            {models[0] &&
            ((models[0].category === "Objects" && !isMultiSelect) ||
              clickedObject.type === "folder") &&
            setEditable ? (
              <li>
                <button
                  onClick={(e) => {
                    setEditable(e, clickedObject.id, true);
                  }}
                  className="flex rounded text-left w-full py-2 px-4 hover:bg-gray-200 active:bg-gray-300"
                >
                  <MyIcon name="rename" />
                  <span className="flex-1 ml-3.5 whitespace-nowrap">
                    Rename
                  </span>
                </button>
              </li>
            ) : null}
            {/* Material Menu */}
            {models[0] &&
            models[0].category === "Objects" &&
            areModelsSelected &&
            !(models[0].type === "folder" && isEmptyFolder(models[0].id)) ? (
              <li>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseEnter={(e) => {
                    setShowSubMenu(true);
                  }}
                  onMouseLeave={(e) => {
                    setShowSubMenu(false);
                  }}
                  style={{ cursor: "pointer" }}
                  className="flex justify-between rounded items-center py-2 px-4 w-full hover:bg-gray-200"
                >
                  <MyIcon name="material" />
                  <span className="flex-1 ml-3.5 whitespace-nowrap">
                    Material
                  </span>
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  {showSubMenu && (
                    <MaterialMenu
                      isMultiSelect={isMultiSelect}
                      models={models}
                      materialMenuVisible={materialMenuVisible}
                      setMaterialMenuVisible={setMaterialMenuVisible}
                    />
                  )}
                </div>
              </li>
            ) : null}
            {/* Create Component Button */}
            {/* {!isComponent && !isComponentChild && (
          <li>
            <button
              onClick={(e) => {
                createComponent(e, clickedObject);
              }}
              className="block w-full rounded text-left py-2 px-4 hover:bg-gray-100"
            >
              Create Component
            </button>
          </li>
        )} */}
            {/* Export button */}
            {/* <li>
          <button
            onClick={(e) => {
              exportObject(e, clickedObject);
            }}
            className="block w-full rounded text-left py-2 px-4"
          >
            Export
          </button>
        </li> */}
            {/* Download STL button */}
            {models[0] &&
              models[0].type != "port" &&
              models[0].type != "element" &&
              models[0].type != "distance" &&
              (!(models[0].type === "folder" && isEmptyFolder(models[0].id)) ? (
                <li>
                  <button
                    onClick={(e) => {
                      handleExport(e);
                    }}
                    className="flex w-full rounded text-left py-2 px-4 hover:bg-gray-200 active:bg-gray-300"
                  >
                    <MyIcon name="download" />
                    <span className="flex-1 ml-3.5 whitespace-nowrap">
                      Download STL
                    </span>
                  </button>
                </li>
              ) : null)}
            {/* Coopy button */}
            {areModelsSelected && (
              <li>
                <button
                  onClick={(e) => {
                    let selectedModels = models.filter(
                      (model) => model.selected
                    );
                    dispatch(modelSaved(selectedModels));
                    setActiveContextMenu("", 0);
                  }}
                  className="flex w-full rounded text-left py-2 px-4 hover:bg-gray-200 active:bg-gray-300"
                >
                  <MyIcon name="copy" />
                  <span className="flex-1 ml-3.5 whitespace-nowrap">Copy</span>
                </button>
              </li>
            )}
            {/* Paste button */}
            {savedModels.length > 0 && (
              <li>
                <button
                  onClick={(e) => {
                    pasteSavedModel();
                  }}
                  className="flex w-full rounded text-left py-2 px-4 hover:bg-gray-200 active:bg-gray-300"
                >
                  <MyIcon name="paste" />
                  <span className="flex-1 ml-3.5 whitespace-nowrap">Paste</span>
                </button>
              </li>
            )}
            {/* Properties button */}
            {clickedObject.type !== "mesh" &&
              clickedObject.type !== "mergedMesh" &&
              showPropertyMenu &&
              !isMultiSelect && (
                <li>
                  <button
                    onClick={(e) => {
                      if (isMultiSelect) {
                        return;
                      } else {
                        if (showPropertyMenu) {
                          showPropertyMenu(e, clickedObject.type);
                        }
                      }
                    }}
                    className="flex w-full rounded text-left py-2 px-4 hover:bg-gray-200 active:bg-gray-300"
                  >
                    <MyIcon name="properties" />
                    <span className="flex-1 ml-3.5 whitespace-nowrap">
                      Properties...
                    </span>
                  </button>
                </li>
              )}
            {/* Delete button */}

            {areModelsSelected && (
              <li>
                <button
                  onClick={async (e) => {
                    if (isMultiSelect) {
                      const toBeDeletedModels = models.filter(
                        (model) => model.selected === true
                      );
                      for (let i = 0; i < toBeDeletedModels.length; i++) {
                        await deleteObject(e, toBeDeletedModels[i]);
                      }
                    } else {
                      await deleteObject(e, clickedObject);
                    }
                  }}
                  className="flex w-full rounded text-left py-2 px-4 hover:bg-error-200 active:bg-error-300 text-error-600"
                >
                  <MyIcon name="delete" />
                  <span className="flex-1 ml-3.5 whitespace-nowrap">
                    Delete
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}

export default ContextMenu;

/* Create Component Button */

/* {!isComponent && !isComponentChild && (
          <li>
            <button
              onClick={(e) => {
                createComponent(e, clickedObject);
              }}
              className="block w-full rounded text-left py-2 px-4 hover:bg-gray-100"
            >
              Create Component
            </button>
          </li>
        )} */

/* {!isComponent ? (
          <li>
            <button
              onClick={(e) => {
                setEditable(e, clickedObject, true);
              }}
              className="block rounded text-left w-full py-2 px-4 hover:bg-gray-100"
            >
              Rename
            </button>
          </li>
        ) : (
          <li>
            <button
              onClick={(e) => {
                selectAll(e, clickedObject);
              }}
              className="block rounded text-left w-full py-2 px-4 hover:bg-gray-100"
            >
              Select All
            </button>
          </li>
        )} */
