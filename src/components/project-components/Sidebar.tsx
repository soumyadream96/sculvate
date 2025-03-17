import React, { useState, useRef, useEffect, useContext } from "react";
import SidebarHeader from "./sidebar/SidebarHeader";
import SidebarItemList from "./sidebar/SidebarBody/SidebarItemList";
import SidebarFooter from "./sidebar/SidebarFooter";
import { useAppDispatch, useAppSelector } from "state/hooks";
import {
  selectSavedModels,
  modelAdded,
  selectModels,
} from "state/reducers/modelSlice";
import { addHistory } from "state/reducers/historySlice";
import { Item } from "models/Item";
import SidebarBody from "./sidebar/SidebarBody";
import { useParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import MeshProperties from "./sidebar/SidebarBody/MeshProperties";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
import { selectUsername } from "state/reducers/authSlice";
import ContextMenu from "./babylonjs/ObjectComponent/ContextMenu";
import { ActiveContextMenuContext } from "contexts";

export interface SidebarProps {
  scene: BABYLON.Scene;
  items: Item[];
  selectedItems: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

function Sidebar({
  scene,
  items,
  setItems,
  selectedItems,
  setSelectedItems,
}: SidebarProps) {
  const { projectId } = useParams();
  const [pastePos, setPastePos] = useState({ x: 0, y: 0 });
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [childContextMenuEnabled, setChildContextMenuEnabled] = useState(false);
  const { setActiveContextMenu, contextMenuLocation } = useContext(
    ActiveContextMenuContext
  ) as any;

  var cubePastedCnt = useRef(1);
  var spherePastedCnt = useRef(1);
  var cylinderPastedCnt = useRef(1);

  const dispatch = useAppDispatch();
  const savedModels = useAppSelector(selectSavedModels);
  const models = useAppSelector(selectModels);
  const username = useAppSelector(selectUsername);

  const simulationProperties = useAppSelector(selectSimulationProperties);

  const getElementNumber = () => {
    let elementLength = 0;
    for (let i = 0; i < models.length; i++)
      if (models[i].type == "element") elementLength++;
    for (let i = 0; i < models.length; i++) {
      let f = false;
      for (let j = 0; j < models.length; j++) {
        if (models[j].type == "element") {
          if (models[j]?.number == (i + 1).toString()) {
            f = true;
            break;
          }
        }
      }
      if (f == false) return i + 1;
    }
    return elementLength + 1;
  };

  const getPortNumber = () => {
    let portLength = 0;
    for (let i = 0; i < models.length; i++)
      if (models[i].type == "port") portLength++;
    for (let i = 0; i < models.length; i++) {
      let f = false;
      for (let j = 0; j < models.length; j++) {
        if (models[j].type == "port") {
          if (models[j]?.number == (i + 1).toString()) {
            f = true;
            break;
          }
        }
      }
      if (f == false) return i + 1;
    }
    return portLength + 1;
  };

  const getDistanceNumber = () => {
    let distanceLength = 0;
    for (let i = 0; i < models.length; i++)
      if (models[i].type == "distance") distanceLength++;
    for (let i = 0; i < models.length; i++) {
      let f = false;
      for (let j = 0; j < models.length; j++) {
        if (models[j].type == "distance") {
          if (models[j]?.number == (i + 1).toString()) {
            f = true;
            break;
          }
        }
      }
      if (f == false) return i + 1;
    }
    return distanceLength + 1;
  };

  useEffect(() => {
    cubePastedCnt.current = 1;
    spherePastedCnt.current = 1;
    cylinderPastedCnt.current = 1;
  }, [savedModels]);

  useEffect(() => {
    setShowMenu(false);
  }, []);

  const showContextMenu = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    if (savedModels.length > 0) {
      setActiveContextMenu(savedModels[0].category, 1);
      setMenuPosition({ x: e.pageX, y: e.pageY });
      setPastePos({ x: e.pageX, y: e.pageY });
      setShowMenu(true);
    }
  };

  const hideContextMenu = () => {
    setShowMenu(false);
    setActiveContextMenu("", 0);
  };

  const pasteSavedModel = async () => {
    hideContextMenu();
    let objs: any = [];
    savedModels.map(async (savedModel: any, index) => {
      let savedModelObj: any = savedModel.object;
      if (savedModel.type == "element") {
        objs.push({
          ...savedModel,
          number: getElementNumber() + index,
          name:
            "Element " +
            (getElementNumber() + index) +
            " (" +
            savedModelObj.resistance +
            " Ω, " +
            savedModelObj.inductance +
            " H, " +
            savedModelObj.capacitance +
            " F)",
          id: uuid(),
          selected: false,
          status: "Added",
        });
      } else if (savedModel.type == "port") {
        objs.push({
          ...savedModel,
          number: getPortNumber() + index,
          name:
            "Port " +
            (getPortNumber() + index) +
            " (" +
            savedModelObj.impedance +
            " Ω)",
          id: uuid(),
          selected: false,
          status: "Added",
        });
      } else if (savedModel.type == "distance") {
        objs.push({
          ...savedModel,
          number: getDistanceNumber() + index,
          name:
            "Distance " +
            (getDistanceNumber() + index) +
            " (" +
            Number(
              Math.sqrt(
                Math.pow(savedModelObj.x.max - savedModelObj.x.min, 2) +
                  Math.pow(savedModelObj.y.max - savedModelObj.y.min, 2) +
                  Math.pow(savedModelObj.z.max - savedModelObj.z.min, 2)
              ).toFixed(3)
            ).toString() +
            " " +
            simulationProperties.dimensionsUnit.replace("um", "μm") +
            ")",
          id: uuid(),
          selected: false,
          status: "Added",
        });
      } else {
        let cnt = 1;
        if (savedModel.type === "cube") {
          cnt = cubePastedCnt.current;
          cubePastedCnt.current++;
        } else if (savedModel.type === "sphere") {
          cnt = spherePastedCnt.current;
          spherePastedCnt.current++;
        } else if (savedModel.type === "cylinder") {
          cnt = cylinderPastedCnt.current;
          cylinderPastedCnt.current++;
        }
        objs.push({
          ...savedModel,
          name: savedModel.name + "_" + cnt,
          id: uuid(),
          selected: false,
          status: "Added",
        });
      }
    });
    objs.map(async (obj: any) => {
      if (obj.parentId != 0 && obj.category === "Objects") {
        savedModels.map((model: any, j: number) => {
          if (obj.parentId === model?.id && model.category === "Objects")
            obj.parentId = objs[j]?.id;
        })
      }
      dispatch(modelAdded(obj));
      await dispatch(
        addHistory({
          payloadData: {
            paste: {
              ...obj,
            },
          },
          currentUsername: username,
          projectId: projectId || "",
        })
      );
    })
  };

  return (
    <aside className="font-inter h-full touch-auto w-full" aria-label="Sidebar">
      <div
        className="flex flex-col justify-between h-screen py-4 px-3 bg-white z-50"
        onContextMenu={showContextMenu}
        onClick={hideContextMenu}
      >
        <div>
          <SidebarHeader />
          <SidebarBody
            setChildContextMenuEnabled={(value: boolean) =>
              setChildContextMenuEnabled(value)
            }
            scene={scene}
            items={items}
            selectedItems={selectedItems}
            setItems={setItems}
            setSelectedItems={setSelectedItems}
            pasteSavedModel={pasteSavedModel}
          />
        </div>
        <div>
          <SidebarFooter projectId={projectId ?? ""} />
        </div>
        <ContextMenu
          visible={
            showMenu &&
            !childContextMenuEnabled &&
            savedModels.length > 0 &&
            contextMenuLocation === 1 &&
            models.filter(
              (model) =>
                model.selected && model.category === savedModels[0].category
            ).length >= 0
          }
          menuPosition={menuPosition}
          models={models}
          isMultiSelect={models.filter((model) => model.selected).length > 1}
          clickedObject={{}}
          pasteSavedModel={pasteSavedModel}
          materialMenuVisible={false}
          setMaterialMenuVisible={() => {}}
          mainScene={scene}
        />
      </div>
    </aside>
  );
}

export default Sidebar;
