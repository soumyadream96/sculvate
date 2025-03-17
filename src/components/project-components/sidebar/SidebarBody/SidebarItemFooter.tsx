import React, { useState } from "react";
import MyIcon from "assets/MyIcons";
import LumpedPortMenu from "../../babylonjs/ActionsBar/Create/LumpedPortMenu";
import LumpedElementMenu from "../../babylonjs/ActionsBar/Create/LumpedElementMenu";
import DistanceMenu from "../../babylonjs/ActionsBar/Create/DistanceMenu";

interface SidebarItemFooterProps {
  itemType: string;
  objCounter: number;
}

const SidebarItemFooter = ({
  itemType,
  objCounter,
}: SidebarItemFooterProps) => {
  const [lumpedPortMenuVisible, setLumpedPortMenuVisible] = useState(false);
  const [lumpedElementMenuVisible, setLumpedElementMenuVisible] =
    useState(false);
  const [distanceMenuVisible, setDistanceMenuVisible] = useState(false);

  const showLumpedPortMenu = (e: any) => {
    setLumpedPortMenuVisible(true);
  };

  const showLumpedElementMenu = (e: any) => {
    setLumpedElementMenuVisible(true);
  };

  const showDistanceMenu = (e: any) => {
    setDistanceMenuVisible(true);
  };

  const showAddButton = () => {
    switch (itemType) {
      case "Ports":
        return (
          <div>
            <div>
              <button
                className="flex items-center px-2 py-1 text-sm font-normal rounded-lg text-gray-700 active:text-gray-900 hover:underline"
                onClick={showLumpedPortMenu}
              >
                <MyIcon name="add-item" />
                <span className="flex-1 ml-3.5 text-base font-semibold whitespace-nowrap">
                  Add port...
                </span>
              </button>
            </div>
            <LumpedPortMenu
              portLength={objCounter}
              visible={lumpedPortMenuVisible}
              // addLumpedPort={addPort}
              setVisible={(value: boolean) => setLumpedPortMenuVisible(value)}
            />
          </div>
        );

      case "Lumped Elements":
        return (
          <div>
            <div>
              <button
                className="flex items-center px-2 py-1 text-sm font-normal rounded-lg text-gray-700 active:text-gray-900 hover:underline"
                onClick={showLumpedElementMenu}
              >
                <MyIcon name="add-item" />
                <span className="flex-1 ml-3.5 text-base font-semibold whitespace-nowrap">
                  Add lumped element...
                </span>
              </button>
            </div>
            <LumpedElementMenu
              elementLength={objCounter}
              visible={lumpedElementMenuVisible}
              // addLumpedElement={addElement}
              setVisible={(value: boolean) =>
                setLumpedElementMenuVisible(value)
              }
            />
          </div>
        );

      case "Distances":
        return (
          <div>
            <div>
              <button
                className="flex items-center px-2 py-1 text-sm font-normal rounded-lg text-gray-700 active:text-gray-900 hover:underline"
                onClick={showDistanceMenu}
              >
                <MyIcon name="add-item" />
                <span className="flex-1 ml-3.5 text-base font-semibold whitespace-nowrap">
                  Measure distance...
                </span>
              </button>
            </div>
            <DistanceMenu
              distanceLength={objCounter}
              visible={distanceMenuVisible}
              // addDistance={addDistance}
              setVisible={(value: boolean) => setDistanceMenuVisible(value)}
            />
          </div>
        );

      case "Objects":
        return null;
    }
  };
  return <div>{showAddButton()}</div>;
};

export default SidebarItemFooter;
