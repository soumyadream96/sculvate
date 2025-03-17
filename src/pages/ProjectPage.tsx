import React, {  useEffect, useState } from "react";
import MyIcon from "assets/MyIcons";

import Sidebar from "../components/project-components/Sidebar";
import Navbar from "../components/project-components/Navbar";
import TabBar from "../components/project-components/TabBar";
import MainScene from "../components/project-components/MainScene";

import PlotsContainer from "../components/project-components/plots/PlotsContainer";

import { selectTab } from "state/reducers/selectedTabSlice";
import { useSelector } from "react-redux";

import "assets/ProjectPage.css";

import { Item } from "../models/Item";
import { useParams } from "react-router-dom";
import { Storage } from "aws-amplify";
import { useAppDispatch, useAppSelector } from "state/hooks";
import {
  selectSimulationProperties,
  updateSimulationProperties,
} from "state/reducers/simulationPropertiesSlice";
import { selectUsername } from "state/reducers/authSlice";
import { useQuery } from "@tanstack/react-query";
import {
  setProjectInfo,
  selectProjectInfo,
} from "state/reducers/projectInfoSlice";
import { ActiveContextMenuContext } from "../contexts";

function Project() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [scene, setScene] = useState<BABYLON.Scene>();
  const [isResultTabSelected, setIsResultTabSelected] = useState(false);
  const [version, setVersion] = useState("v1");
  const [projectName, setProjectName] = useState("");
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const [activeContextMenu, setActiveContextMenu] = useState<string>("");
  const [contextMenuLocation, setContextMenuLocation] = useState<0 | 1 | 2>(0);

  const dispatch = useAppDispatch();
  const projectInfo = useSelector(selectProjectInfo);

  const { selectedTab } = useSelector(selectTab);
  const currentUsername = useAppSelector(selectUsername);

  const { projectId } = useParams();

  useEffect(() => {
    if (simulationProperties) {
      setProjectName(simulationProperties.name);
    }
  }, [simulationProperties]);

  useEffect(() => {
    if (projectName === "") {
      document.title = `SCULVATE • The #1 cloud-based RF simulation platform`;
    } else if (projectName !== undefined) {
      document.title = `${projectName} | SCULVATE`;
    } else {
      document.title = `Project | SCULVATE`;
    }
  }, [projectName]);

  useEffect(() => {
    selectedTab === 2
      ? setIsResultTabSelected(true)
      : setIsResultTabSelected(false);
  }, [selectedTab]);

  const updateProjectInfo = async (previousInfo?: any) => {
    try {
      const infoData = await Storage.get(
        `${currentUsername}/projects/${projectId}/info.json`,
        {
          download: true,
          cacheControl: "no-cache",
        }
      );
      if (infoData.Body) {
        const dataBody = infoData.Body;
        const dataString = await dataBody.text();
        const json = JSON.parse(dataString);
        if (
          JSON.stringify(json) !==
          JSON.stringify(previousInfo || projectInfo.info)
        ) {
          dispatch(setProjectInfo(json));
          return json;
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  React.useEffect(() => {
    if (projectId && projectId !== null && projectId !== "") {
      let previousInfo = projectInfo.info;
      const projectDataInterval = setInterval(async () => {
        const newProjectInfo = await updateProjectInfo(previousInfo);
        if (newProjectInfo) {
          previousInfo = newProjectInfo;
        }
      }, 2500);
      return () => clearInterval(projectDataInterval);
    }
  }, [projectId, currentUsername]);

  const getProjectInfo = async () => {
    return projectInfo;
  };

  const getSimulationProperties = async (
    projectId?: string,
    version?: string,
    currentUsername?: string
  ) => {
    if (
      projectId &&
      projectId !== null &&
      projectId !== "" &&
      version &&
      version !== null &&
      version !== "" &&
      currentUsername &&
      currentUsername !== null &&
      currentUsername !== ""
    ) {
      const propertiesData = await Storage.get(
        `${currentUsername}/projects/${projectId}/${version}/properties.json`,
        { download: true, cacheControl: "no-cache" }
      );
      if (propertiesData.Body) {
        const dataBody: any = propertiesData.Body;
        const dataString = await dataBody.text();
        const json = JSON.parse(dataString);
        return json;
      }
    }
  };

  useQuery({
    queryKey: ["projectData", projectId, currentUsername],
    queryFn: async () => {
      let data: any = {};
      if (
        projectId &&
        projectId !== null &&
        projectId !== "" &&
        currentUsername &&
        currentUsername !== null &&
        currentUsername !== ""
      ) {
        data = await getProjectInfo();
      }
      return data;
    },
    onSuccess: (data) => {
      setProjectName(data.project_name);
      setVersion(data.latestVersion);
    },
    onError: (err) => {
      console.log(err);
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useQuery({
    queryKey: ["simulationPropertiesData", projectId, currentUsername, version],
    queryFn: async () => {
      let data: any = {};
      if (
        projectId &&
        projectId !== null &&
        projectId !== "" &&
        version &&
        version !== null &&
        version !== "" &&
        currentUsername &&
        currentUsername !== null &&
        currentUsername !== ""
      ) {
        data = await getSimulationProperties(
          projectId,
          version,
          currentUsername
        );
      }
      return data;
    },
    onSuccess: (data) => {
      dispatch(
        updateSimulationProperties({
          ...simulationProperties,
          ...data,
        })
      );
    },
    onError: (err) => {
      console.log(err);
    },
    retry: 1,
    refetchOnWindowFocus: true,
  });

  function getScene(mainScene: BABYLON.Scene) {
    setScene(mainScene);
  }

  return (
    <div className="flex w-fill h-screen">
      <ActiveContextMenuContext.Provider
        value={{
          activeContextMenu,
          contextMenuLocation,
          setActiveContextMenu: (activeContextMenu, contextMenuLocation) => {
            setActiveContextMenu(activeContextMenu);
            setContextMenuLocation(contextMenuLocation);
          },
        }}
      >
        {scene && (
          <div
            className={
              openMobileMenu
                ? "bg-gray-25 fixed min-[1200px]:relative translate-x-0 min-[1200px]:translate-x-0 md:w-[21rem] z-40 transition-all duration-300"
                : "bg-gray-25 fixed min-[1200px]:relative -translate-x-full min-[1200px]:translate-x-0 md:w-[21rem] z-40 transition-all duration-300"
            }
          >
            <div
              id="sidebar-container"
              // className={
              //   openMobileMenu
              //     ? "fixed min-[1586px]:relative translate-x-0 min-[1586px]:translate-x-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden shadow-xl bg-white flex flex-wrap items-center justify-between md:w-[30rem] z-10 transition-all"
              //     : "fixed min-[1586px]:relative -translate-x-full min-[1586px]:translate-x-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden shadow-xl bg-white flex flex-wrap items-center justify-between md:w-[30rem] z-10 transition-all"
              // }
              className="overflow-y-scroll hide-scrollbar md:flex-row md:flex-nowrap shadow-xl bg-white flex flex-wrap items-center justify-between md:w-[21rem] relative z-30 rounded-br-2xl border-0 border-r-2 border-[#EAECF0]"
            >
              <Sidebar
                scene={scene}
                items={items}
                selectedItems={selectedItems}
                setItems={setItems}
                setSelectedItems={setSelectedItems}
              />
            </div>
            <div
              style={{ display: openMobileMenu ? "flex" : "none" }}
              className="z-40 absolute top-0 -right-[30px] bg-white border-r-white border-2 border-[#EAECF0] w-8 h-8 -scale-100 flex min-[1586px]:hidden items-center justify-center rounded-tl-md rounded-bl-md"
              onClick={() => setOpenMobileMenu(false)}
            >
              <MyIcon name="right-arrow" color="#667085" />
            </div>

            <div
              style={{ display: openMobileMenu ? "block" : "none" }}
              className="absolute inset-0 w-[800vw] h-screen bg-black opacity-40"
              onClick={() => setOpenMobileMenu(false)}
            ></div>
          </div>
        )}

        <div
          className="flex flex-col parent overflow-x-auto h-full w-full"
          id="project-page"
        >
          {/* <div className=""> */}
          {scene && (
            <Navbar
              scene={scene}
              projectName={projectName}
              projectId={projectId ?? ""}
              version={version}
              setOpenMobileMenu={setOpenMobileMenu}
            />
          )}
          {/* </div> */}

          {scene && (
            <div className="tab-bar">
              <TabBar
                objects={items}
                selectedObjects={selectedItems}
                setObjects={setItems}
                setSelectedObjects={setSelectedItems}
              />
            </div>
          )}

          <div
            className={isResultTabSelected ? "hidden" : "h-full max-h-full"}
            id="canvas-container"
          >
            <MainScene
              objects={items}
              setObjects={setItems}
              getScene={getScene}
            />
          </div>
          {projectId && (
            <div
              style={{ height: "100%" }}
              className={!isResultTabSelected ? "hidden" : ""}
            >
              <PlotsContainer projectId={projectId} version={version} />
            </div>
          )}
        </div>
      </ActiveContextMenuContext.Provider>
    </div>
  );
}

export default Project;
