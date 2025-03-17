import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import MyIcon from "../../../../assets/MyIcons";
import { DndProvider } from "react-dnd";
import {
  Tree,
  NodeModel,
  MultiBackend,
  getBackendOptions,
} from "@minoru/react-dnd-treeview";
// import { UncontrolledTreeEnvironment, Tree, StaticTreeDataProvider } from "react-complex-tree";

import SidebarItem from "./SidebarItem";
import ContextMenu from "../../babylonjs/ObjectComponent/ContextMenu";
import CubeMenu from "components/project-components/babylonjs/ActionsBar/Create/CubeMenu";
import SphereMenu from "components/project-components/babylonjs/ActionsBar/Create/SphereMenu";
import CylinderMenu from "components/project-components/babylonjs/ActionsBar/Create/CylinderMenu";
import LumpedPortMenu from "components/project-components/babylonjs/ActionsBar/Create/LumpedPortMenu";
import LumpedElementMenu from "components/project-components/babylonjs/ActionsBar/Create/LumpedElementMenu";
import NewFolderMenu from "components/project-components/babylonjs/ActionsBar/Create/NewFolderMenu";
import { v4 as uuid } from "uuid";

// Type and reducers
import {
  Model,
  selectFirstSelected,
  setFirstSelected,
  modelAltered,
  modelSaved,
  modelAdded,
  selectModels,
} from "state/reducers/modelSlice";

import { selectParameters } from "state/reducers/parametersSlice";
import { calculate } from "utilities";

import { useAppDispatch, useAppSelector } from "state/hooks";
import { selectSavedModels } from "state/reducers/modelSlice";

import { STLExport } from "babylonjs-serializers";
import { Mesh } from "babylonjs";
import CreateMaterialMenu from "components/project-components/babylonjs/ActionsBar/Create/CreateMaterialMenu";
import DistanceMenu from "components/project-components/babylonjs/ActionsBar/Create/DistanceMenu";
import { hideMeshes } from "components/project-components/tabbar/TabUtils";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
import { addHistory } from "state/reducers/historySlice";
import { selectUsername } from "state/reducers/authSlice";
import { useParams } from "react-router-dom";
import { ActiveContextMenuContext } from "../../../../contexts";
import { render } from "@headlessui/react/dist/utils/render";

export interface SidebarItemListProps {
  itemType: string;
  scene: BABYLON.Scene;
  models: Model[];
  objCounter: number;
  pasteSavedModel: any;
  isCollapsed: boolean;
  setChildContextMenuEnabled?: (value: boolean) => void;
}

function SidebarItemList({
  itemType,
  scene,
  models,
  objCounter,
  pasteSavedModel,
  isCollapsed,
  setChildContextMenuEnabled,
}: SidebarItemListProps) {
  const [maxHeight, setMaxHeight] = useState(isCollapsed ? "0" : "auto");
  const listRef = useRef<HTMLUListElement>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [clickedObject, setClickedObject] = useState({} as any);
  const [showMenu, setShowMenu] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [isSelectedProperty, selectProperty] = useState(false);

  const [cubeMenuVisible, setCubeMenuVisible] = useState(false);
  const [sphereMenuVisible, setSphereMenuVisible] = useState(false);
  const [cylinderMenuVisible, setCylinderMenuVisible] = useState(false);
  const [lumpedPortMenuVisible, setLumpedPortMenuVisible] = useState(false);
  const [lumpedElementMenuVisible, setLumpedElementMenuVisible] =
    useState(false);
  const [distanceMenuVisible, setDistanceMenuVisible] = useState(false);
  const [materialMenuVisible, setMaterialMenuVisible] = useState(false);
  const [newFolderMenuVisible, setNewFolderMenuVisible] = useState(false);
  const { activeContextMenu, contextMenuLocation, setActiveContextMenu } =
    useContext(ActiveContextMenuContext) as any;

  const [isFolderOpen, setIsFolderOpen] = useState(false);
  var savedModels = useAppSelector(selectSavedModels);
  var prevKeyCode = "";
  const dispatch = useAppDispatch();
  const allModels = useAppSelector(selectModels);
  const parameters = useAppSelector(selectParameters);
  const firstSelected = useAppSelector(selectFirstSelected);

  const simulationProperties = useAppSelector(selectSimulationProperties);

  const [treeData, setTreeData] = useState<any>([]);
  let dragStartPosY: number;

  const handleDrop = (newTreeData: any, options: any) => {
    let selectedModels = models.filter((model) => model.selected === true);
    if (selectedModels.length > 1) {
      let tempTree: any = [];
      let parent: any;
      newTreeData.map((data: any, index: any) => {
        if (data.selected === true) {
          let originalTreeData = treeData.find((d: any) => data.id === d.id);
          if (data.parent != originalTreeData.parent) {
            parent = data.parent;
            return;
          }
        }
      });
      if (parent === undefined) return;
      newTreeData.map((data: any, index: any) => {
        console.log(data.parent);
        tempTree.push(data);
        console.log(tempTree[index].parent);
        if (data.selected === true) {
          tempTree[index].selected = data.selected;
          if (
            selectedModels.filter(
              (mdl: any) => data.parent === mdl.id && data.id !== mdl.id
            ).length === 0
          )
            tempTree[index].parent = parent;
        }
      });
      setTreeData(tempTree);
    } else setTreeData(newTreeData);
  };

  document.ondragstart = (e: any) => {
    dragStartPosY = e.y;
  };

  document.ondragend = (e: any) => {
    if (e.y - dragStartPosY > -40 && e.y - dragStartPosY < 20) return;
    if (e.target.id === "") {
      let selectedModels = models.filter((mdl) => mdl.selected);
      let tempTree: any = [];
      treeData.map((data: any) => {
        tempTree.push(data);
      });
      selectedModels.map((mdl: any) => {
        tempTree.map((data: any) => {
          if (data.id === mdl.id) {
            if (
              selectedModels.filter(
                (m) => m.id === mdl.parentId && m.id !== mdl.id
              ).length === 0
            )
              data.parent = 0;
          }
        });
      });
      setTreeData(tempTree);
    }
  };

  useEffect(() => {
    const updateModels = async () => {
      for (let i = 0; i < treeData.length; i++) {
        let data = treeData[i];
        let mdl: any = models.find((model) => model.id === data.id);
        if (mdl === undefined) return;
        if (mdl.parentId != data.parent && data.parent != undefined) {
          dispatch(
            modelAltered({
              ...mdl,
              status: "Updated",
              parentId: data.parent,
            })
          );
          await dispatch(
            addHistory({
              payloadData: {
                update_parentId: {
                  id: mdl.id,
                  parentId: data.parent,
                },
              },
              currentUsername: username,
              projectId: projectId || "",
            })
          );
        }
      }
    };
    updateModels();
  }, [treeData]);

  useEffect(() => {
    if (setChildContextMenuEnabled) {
      if (showMenu) {
        setActiveContextMenu(itemType, 1);
        setChildContextMenuEnabled(true);
      } else {
        setActiveContextMenu("", 0);
        setChildContextMenuEnabled(false);
      }
    }
  }, [showMenu, itemType]);
  const username = useAppSelector(selectUsername);
  const { projectId } = useParams();

  useEffect(() => {
    setShowMenu(false);
    document.addEventListener("click", () => {
      setShowMenu(false);
    });
  }, []);

  useEffect(() => {
    if (itemType != "Objects") return;
    if (models.length > 0) {
      let tempTree: any = [];
      models.map((model: any) => {
        tempTree.push({
          id: model.id,
          parent: model.parentId,
          droppable: model.type === "folder" ? true : false,
          text: model.name,
          editable: model.editable,
          selected: model.selected,
          visible: model.visible,
          type: model.type,
        });
      });
      setTreeData(tempTree);
    } else {
      setTreeData([]);
    }
  }, [models]);

  var lastCode: String = "";
  useEffect(() => {
    if (clickedObject.id) {
      document.onkeydown = (e) => {
        if (lastCode != "" && lastCode === e.code) return;
        lastCode = e.code;
        if (
          prevKeyCode === "ControlLeft" ||
          prevKeyCode === "MetaLeft" ||
          prevKeyCode === "MetaRight"
        ) {
          if (e.code === "KeyC" && !Object.is(clickedObject, {})) {
            let selectedModels = models.filter((model) => model.selected);
            dispatch(modelSaved(selectedModels));
          } else if (e.code === "KeyV" && savedModels[0]) {
            pasteSavedModel();
          }
        }
        prevKeyCode = e.code;
      };

      document.addEventListener("keyup", () => {
        lastCode = "";
        prevKeyCode = "";
      });
    }
  }, [models, clickedObject]);

  useEffect(() => {
    if (models.length > 0) {
      models.map((model: any) => {
        switch (model.type) {
          case "port":
            console.log(
              model.number,
              calculate(model.object.impedance, parameters)
            );
            dispatch(
              modelAltered({
                ...model,
                name:
                  "Port " +
                  model.number +
                  " (" +
                  calculate(model.object.impedance, parameters) +
                  " Ω)",
                status: "Updated",
              })
            );
            break;
          case "element":
            dispatch(
              modelAltered({
                ...model,
                name:
                  "Element " +
                  model.number +
                  " (" +
                  calculate(model.object.resistance, parameters) +
                  " Ω, " +
                  calculate(model.object.inductance, parameters) +
                  " H, " +
                  calculate(model.object.capacitance, parameters) +
                  " F)",
                status: "Updated",
              })
            );
            break;
          case "distance":
            dispatch(
              modelAltered({
                ...model,
                name:
                  "Distance " +
                  model.number +
                  " (" +
                  Number(
                    Math.sqrt(
                      Math.pow(
                        calculate(model.object.x.max, parameters) -
                          calculate(model.object.x.min, parameters),
                        2
                      ) +
                        Math.pow(
                          calculate(model.object.y.max, parameters) -
                            calculate(model.object.y.min, parameters),
                          2
                        ) +
                        Math.pow(
                          calculate(model.object.z.max, parameters) -
                            calculate(model.object.z.min, parameters),
                          2
                        )
                    ).toFixed(3)
                  ).toString() +
                  " " +
                  simulationProperties.dimensionsUnit.replace("um", "μm") +
                  ")",
                status: "Updated",
              })
            );
            break;
        }
      });
    }
  }, [parameters]);

  const changeName = (e: any, clickedObjectId: any) => {
    e.preventDefault();
    let clickedObject = models.find((model) => model.id === clickedObjectId);
    const editableObject = {
      ...clickedObject,
      name: e.target.value,
      status: "Altered",
    };
    // setEditable(e, clickedObject, false);
    dispatch(modelAltered(editableObject));
  };

  const removeFocus = async (e: any) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      e.target.blur();
    }
  };

  const showContextMenu = (e: any, clickedObjectId: any) => {
    e.preventDefault();
    e.stopPropagation();
    let clickedObject: any = models.find(
      (model) => model.id === clickedObjectId
    );
    console.log(clickedObject.category);
    setActiveContextMenu(clickedObject.category, 1);
    if (e.button === 2) {
      setMenuPosition({ x: e.pageX, y: e.pageY });
      setClickedObject(clickedObject);
      const modelsToDraw = Object.values(allModels);
      const arrayModel = modelsToDraw.flat();
      const selectedModels = arrayModel.filter((model) => model.selected);

      if (!isMultiSelect || selectedModels.length === 0) {
        for (let model of models) {
          const alteredObject = {
            ...model,
            selected: false,
          };
          dispatch(modelAltered(alteredObject));
        }
        const alteredObject = {
          ...clickedObject,
          selected: true,
        };
        dispatch(modelAltered(alteredObject));
      }
      setActiveContextMenu(clickedObject.category, 1);
      setShowMenu(true);
    }
  };

  const showPropertyMenu = (e: any, type: string) => {
    setCubeMenuVisible(false);
    setSphereMenuVisible(false);
    setCylinderMenuVisible(false);
    setLumpedPortMenuVisible(false);
    setLumpedElementMenuVisible(false);

    if (type === "cube") {
      setCubeMenuVisible(true);
    } else if (type === "sphere") {
      setSphereMenuVisible(true);
    } else if (type === "cylinder") {
      setCylinderMenuVisible(true);
    } else if (type === "port") {
      setLumpedPortMenuVisible(true);
    } else if (type === "element") {
      setLumpedElementMenuVisible(true);
    } else if (type === "distance") {
      setDistanceMenuVisible(true);
    }
  };

  const setEditable = async (e: any, clickedObjectId: any, status: boolean) => {
    e.preventDefault();
    let clickedObject: any = models.find(
      (model) => model.id === clickedObjectId
    );
    let tempTree: any = [];
    treeData.map((data: any) => {
      tempTree.push(data);
      if (data.id === clickedObject.id) {
        tempTree.editable = status;
        tempTree.status = "Altered";
      }
    });
    setTreeData(tempTree);

    const editableObject = {
      ...clickedObject,
      editable: status,
      status: "Altered",
    };
    dispatch(modelAltered(editableObject));
    if (status === false) {
      await dispatch(
        addHistory({
          payloadData: {
            change_name: {
              ...clickedObject,
              status: "Altered",
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
    }
  };

  const exportObject = (e: any, clickedObjectId: any) => {
    e.preventDefault();
    let clickedObject: any = models.find(
      (model) => model.id === clickedObjectId
    );
    // find clickedObject in objects and in object's childrens
    let exportObject = models.find((object) => object.id === clickedObject.id);
    let meshToExport: any = exportObject && scene.getMeshById(exportObject.id);
    if (meshToExport) {
      meshToExport = meshToExport as unknown as Mesh;
      STLExport.CreateSTL([meshToExport as Mesh], true);
    }
  };

  const clickedObjectDetails = (e: any, clickedObjectId: any) => {
    let clickedObject: any = models.find(
      (model) => model.id === clickedObjectId
    );
    setClickedObject(clickedObject);
    const modelsToDraw = Object.values(allModels);
    const arrayModel = modelsToDraw.flat();

    if (e.shiftKey) {
      const selectedModels = arrayModel.filter((model) => model.selected);
      if (selectedModels.length > 0) {
        setIsMultiSelect(true);
        const firstSelectedIndex = arrayModel.findIndex(
          (model) => model.id === (firstSelected || "")
        );
        const clickedObjectIndex = arrayModel.findIndex(
          (model) => model.id === clickedObject.id
        );

        if (
          arrayModel[firstSelectedIndex].category !==
          arrayModel[clickedObjectIndex].category
        )
          return;
        // unselect all
        for (let i = 0; i < arrayModel.length; i++) {
          const selectedModel = {
            ...arrayModel[i],
            selected: false,
            status: "Altered",
          };
          dispatch(modelAltered(selectedModel));
        }

        // select specific ones
        if (firstSelectedIndex < clickedObjectIndex) {
          for (let i = firstSelectedIndex; i <= clickedObjectIndex; i++) {
            console.log(
              arrayModel[i].category,
              arrayModel[firstSelectedIndex].category
            );
            if (
              arrayModel[i].category == arrayModel[firstSelectedIndex].category
            ) {
              const selectedModel = {
                ...arrayModel[i],
                selected: true,
                status: "Altered",
              };
              dispatch(modelAltered(selectedModel));
              if (selectedModel.type === "folder")
                clickFolder(selectedModel.id);
            }
          }
        } else {
          for (let i = clickedObjectIndex; i <= firstSelectedIndex; i++) {
            if (
              arrayModel[i].category == arrayModel[clickedObjectIndex].category
            ) {
              const selectedModel = {
                ...arrayModel[i],
                selected: true,
                status: "Altered",
              };
              dispatch(modelAltered(selectedModel));
              if (selectedModel.type === "folder")
                clickFolder(selectedModel.id);
            }
          }
        }
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      setIsMultiSelect(true);
      const selectedModel = {
        ...clickedObject,
        selected: !clickedObject.selected,
        status: "Altered",
      };
      const selectedModelsCount = models.filter(
        (model) => model.selected
      ).length;
      if (selectedModelsCount === 0) {
        dispatch(setFirstSelected(selectedModel.id));
      }
      if (selectedModelsCount === 1 && selectedModel.selected === false) {
        dispatch(setFirstSelected(undefined));
      }
      dispatch(modelAltered(selectedModel));
    } else {
      setIsMultiSelect(false);
      dispatch(setFirstSelected(undefined));
      console.log(clickedObjectId);
      arrayModel.forEach((model) => {
        if (model.id !== clickedObject.id) {
          const updatedModel = {
            ...model,
            status: "Altered",
            selected: false,
          };
          dispatch(modelAltered(updatedModel));
        }
      });
      const selectedModel = {
        ...clickedObject,
        status: "Altered",
        selected: true,
      };
      dispatch(modelAltered(selectedModel));
      dispatch(setFirstSelected(clickedObject.id));
    }
  };

  const clickFolder = (folderId: any) => {
    if (models.find((mdl) => mdl.id === folderId)?.type !== "folder") return;
    setIsMultiSelect(true);
    let selectedModelsCount = 0;
    models.map((model: any) => {
      if (model.parentId === folderId) {
        dispatch(
          modelAltered({
            ...model,
            status: "Altered",
            selected: true,
          })
        );
        if (selectedModelsCount === 0) dispatch(setFirstSelected(model.id));
        if (model.type === "folder") clickFolder(model.id);
      }
    });
  };

  const toggleVisibility = (e: any, clickedObjectId: any) => {
    e.stopPropagation();
    let clickedObject: any = models.find(
      (model) => model.id === clickedObjectId
    );
    if (clickedObject.type === "folder") {
      models.map((mdl: any) => {
        if (mdl.parentId === clickedObject.id) {
          const data = {
            ...mdl,
            visible: !mdl.visible,
            status: "Altered",
          };
          dispatch(modelAltered(data));
        }
      });
    }
    const data = {
      ...clickedObject,
      visible: !clickedObject.visible,
      status: "Altered",
    };
    dispatch(modelAltered(data));
  };

  // const isDisabled = (object: Item) => {
  //   return object.editable;
  // };

  useEffect(() => {
    if (models.length > 0) {
      setMaxHeight(
        isCollapsed
          ? "0"
          : `${listRef.current ? listRef.current.scrollHeight : 0}px`
      );
    }
  }, [isCollapsed, models, isFolderOpen, treeData]);

  return (
    <>
      <ul
        style={{ maxHeight }}
        className={`overflow-hidden transition-max-height duration-500 ease-in-out select-none`}
        ref={listRef}
      >
        {itemType === "Objects" ? (
          <DndProvider backend={MultiBackend} options={getBackendOptions()}>
            <Tree
              tree={treeData}
              rootId={0}
              sort={false}
              onDrop={handleDrop}
              render={(node: any, { depth, isOpen, onToggle }) => (
                <div
                  onClick={(e: any) => {
                    clickedObjectDetails(e, node.id);
                    clickFolder(node.id);
                  }}
                  onContextMenu={(e) => {
                    let selectedModels = models.filter((mdl) => mdl.selected);
                    if (
                      selectedModels.filter((m) => m.id === node.id).length ===
                      0
                    ) {
                      clickedObjectDetails(e, node.id);
                      clickFolder(node.id);
                    }
                    showContextMenu(e, node.id);
                  }}
                  className={`flex items-center px-2 py-1 text-base font-medium text-gray-700 hover:bg-gray-200 rounded-lg ${
                    node.selected ? "bg-gray-300 hover:bg-gray-300" : ""
                  }`}
                  style={{ marginInlineStart: depth * 10 }}
                >
                  {node.droppable && (
                    <span onClick={onToggle}>
                      {isOpen ? (
                        <MyIcon name={node.type + "-minus"} />
                      ) : (
                        <MyIcon name={node.type} />
                      )}
                    </span>
                  )}
                  {!node.droppable && <MyIcon name={node.type} />}
                  {/* Icon */}

                  {/* Name */}
                  {!node.editable ? (
                    <p className="w-full py-1 mx-1 px-1 bg-transparent focus:outline-black rounded">
                      {node.text}
                    </p>
                  ) : (
                    <input
                      type="text"
                      className="w-full py-1 mx-1 px-1 bg-transparent focus:outline-black rounded"
                      value={node.text}
                      onChange={(e) => changeName(e, node.id)}
                      onBlur={(e) => {
                        setEditable(e, node.id, false);
                      }}
                      onKeyUp={(e) => removeFocus(e)}
                      autoFocus={node.editable}
                    />
                  )}

                  {/* Toggle visibility */}
                  <button onClick={(e) => toggleVisibility(e, node.id)}>
                    {node.visible ? (
                      <MyIcon name="eye-open" />
                    ) : (
                      <MyIcon name="eye-close" />
                    )}
                  </button>
                </div>
              )}
            />
          </DndProvider>
        ) : (
          models.map((model: Model) => {
            return (
              <li key={model.id} className="bg-green hover:bg-green">
                <div
                  onClick={(e) => clickedObjectDetails(e, model.id)}
                  onContextMenu={(e) => showContextMenu(e, model.id)}
                  className={`flex items-center px-2 py-1 text-base font-medium text-gray-700 hover:bg-gray-200 rounded-lg ${
                    model.selected ? "bg-gray-300 hover:bg-gray-300" : ""
                  }`}
                >
                  {/* Icon */}
                  <MyIcon name={model.type} />

                  {/* Name */}
                  {!model.editable ? (
                    <p className="w-full py-1 mx-1 px-1 bg-transparent focus:outline-black rounded">
                      {model.name}
                    </p>
                  ) : (
                    <input
                      type="text"
                      className="w-full py-1 mx-1 px-1 bg-transparent focus:outline-black rounded"
                      value={model.name}
                      onChange={(e) => changeName(e, model.id)}
                      onBlur={(e) => {
                        setEditable(e, model, false);
                      }}
                      onKeyUp={(e) => removeFocus(e)}
                      autoFocus={model.editable}
                    />
                  )}

                  {/* Toggle visibility */}
                  <button onClick={(e) => toggleVisibility(e, model)}>
                    {model.visible ? (
                      <MyIcon name="eye-open" />
                    ) : (
                      <MyIcon name="eye-close" />
                    )}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
      <ContextMenu
        visible={
          showMenu &&
          activeContextMenu === itemType &&
          contextMenuLocation === 1
        }
        menuPosition={menuPosition}
        models={models.filter((model) => model.selected)}
        isMultiSelect={
          isMultiSelect || models.filter((model) => model.selected).length > 1
        }
        setEditable={setEditable}
        clickedObject={clickedObject}
        exportObject={exportObject}
        showPropertyMenu={showPropertyMenu}
        pasteSavedModel={pasteSavedModel}
        materialMenuVisible={materialMenuVisible}
        setMaterialMenuVisible={setMaterialMenuVisible}
        setNewFolderMenuVisible={setNewFolderMenuVisible}
        mainScene={scene}
      />

      <CubeMenu
        visible={cubeMenuVisible}
        setVisible={(value: boolean) => setCubeMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <SphereMenu
        visible={sphereMenuVisible}
        setVisible={(value: boolean) => setSphereMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <CylinderMenu
        visible={cylinderMenuVisible}
        setVisible={(value: boolean) => setCylinderMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <LumpedPortMenu
        portLength={objCounter}
        // portLength={1}
        visible={lumpedPortMenuVisible}
        // addLumpedPort={addPort}
        setVisible={(value: boolean) => setLumpedPortMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <LumpedElementMenu
        elementLength={objCounter}
        // elementLength={1}
        visible={lumpedElementMenuVisible}
        // addLumpedElement={addElement}
        setVisible={(value: boolean) => setLumpedElementMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <DistanceMenu
        distanceLength={objCounter}
        // distanceLength={1}
        visible={distanceMenuVisible}
        // addDistance={addDistance}
        setVisible={(value: boolean) => setDistanceMenuVisible(value)}
        isEditableModal={true}
        modelToBeAlter={clickedObject}
      />
      <CreateMaterialMenu
        visible={materialMenuVisible}
        setVisible={setMaterialMenuVisible}
      />
      <NewFolderMenu
        visible={newFolderMenuVisible}
        setVisible={setNewFolderMenuVisible}
        isEditable={false}
      />
    </>
    //   <ul
    //     style={{ maxHeight }}
    //     className={`overflow-hidden transition-max-height duration-500 ease-in-out select-none`}
    //     ref={listRef}
    //   >
    //     <li  className="bg-green hover:bg-green">
    // </li>
    // </ul >
  );
}

export default SidebarItemList;

// Containers
/*
object.name === "Component" ? (
              <li key={index}>
                <div className="flex text-base font-medium text-[#344054] bg-[#F2F4F7] rounded-md py-2 flex-col">
                  <div
                    onContextMenu={(e) => {
                      showContextMenu(e, object);
                    }}
                    className="px-4 w-full"
                  >
                    {object.name}
                  </div>
                  <ul className="pl-2">
                    {object?.childrens?.map((child: any, idx: any) => {
                      return (
                        <li key={idx}>
                          <div
                            onClick={(e) => {
                              clickedObjectDetails(e, child);
                            }}
                            onContextMenu={(e) => {
                              showContextMenu(e, child);
                            }}
                            className="flex items-center px-2 py-1 text-base font-medium text-[#344054] rounded-lg"
                          >
                            {child.icon === "sphere" ? (
                              <MyIcon name="sphere" />
                            ) : child.icon === "cube" ? (
                              <MyIcon name="cube" />
                            ) : child.icon === "cylinder" ? (
                              <MyIcon name="cylinder" />
                            ) : child.icon === "mesh" ? (
                              <MyIcon name="mesh" />
                            ) : null}
                            <input
                              type="text"
                              disabled={!child.editable}
                              className="w-full py-1 mx-1 px-1 bg-transparent focus:outline-black rounded"
                              value={child.name}
                              onChange={(e) => changeName(e, child)}
                              onKeyUp={(e) => {
                                if (e.keyCode === 13)
                                  setEditable(e, child, false);
                              }}
                              onBlur={(e) => {
                                setEditable(e, child, false);
                              }}
                            />
                            <button onClick={(e) => toggleVisibility(e, child)}>
                              {child.visible ? (
                                <MyIcon name="eye-open" />
                              ) : (
                                <MyIcon name="eye-close" />
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  // </ul>
                </div>
              </li>
            ) : 
*/

/*  const createComponent = (e: any, clickedObject: any) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      let idx = items.findIndex((object) => object.id === clickedObject.id);
      if (idx >= 0) {
        let newComponent = {
          id: Date.now().toString(),
          name: "Component",
          icon: null,
          editable: null,
          visible: null,
          material: clickedObject.material,
          childrens: [clickedObject],
        };
        let newObjects = items.filter(
          (object) => object.id !== clickedObject.id
        );
        setItems([...newObjects, newComponent]);
      } else {
        toast.error("Already in a component!");
      }
    } else {
      let canCreate = true;
      selectedItems.map((selectedObject) => {
        if (selectedObject.name === "Component") {
          canCreate = false;
        } else {
          let idx = items.findIndex(
            (object) => object.id === selectedObject.id
          );
          if (idx < 0) {
            canCreate = false;
          }
        }
      });
      if (canCreate) {
        // create component with selected objects
        let material = selectedItems[0].material;
        selectedItems.forEach((selectedObject) => {
          if (selectedObject.material !== material) {
            material = null;
          }
        });
        let newComponent = {
          id: Date.now().toString(),
          name: "Component",
          icon: null,
          editable: null,
          visible: null,
          material: material,
          childrens: selectedItems,
        };
        let newObjects = items.filter(
          (object) =>
            !selectedItems.some(
              (selectedObject) => selectedObject.id === object.id
            )
        );
        setItems([...newObjects, newComponent]);
      } else {
        toast.error("Selected any contianer or conainter's shape!");
      }
    }
  }; */
