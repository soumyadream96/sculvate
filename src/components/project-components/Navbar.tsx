import React, { useState, useEffect, useRef } from "react";
import MyIcon from "assets/MyIcons";
import { scene } from "./MainScene";
import { Auth, Storage } from "aws-amplify";
import api from "services/api";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { Status, selectModels } from "state/reducers/modelSlice";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
import Materials from "../../components/project-components/babylonjs/types/materials";
import {
  selectGeneratedMesh,
  setMesh,
  setMeshXY,
  setMeshXZ,
  setMeshYZ,
} from "state/reducers/generatedMeshSlice";
import { selectUsername } from "state/reducers/authSlice";
import { selectParameters } from "state/reducers/parametersSlice";
import { v4 as uuid } from "uuid";
import {
  selectClassifiedMesh,
  setClassification,
} from "state/reducers/classifiedMeshSlice";
import { STLExport } from "babylonjs-serializers";
import generateMeshService from "services/generateMesh.service";
import * as BABYLONJS from "babylonjs";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Tooltip } from "react-tooltip";
import { useSelector } from "react-redux";
import { selectProjectInfo } from "state/reducers/projectInfoSlice";
import { selectMaterials } from "state/reducers/userSlice";
import classifyMeshService from "services/classifyMesh.service";
import ParameterSweep from "./ParameterSweep";
import { calculate } from "utilities";
import { hideMeshes, showMeshes } from "./tabbar/TabUtils";
import { DocSearch } from "@docsearch/react";
import "@docsearch/css";
import { DocSearchHit } from "@docsearch/react/dist/esm/types";

interface NavbarProps {
  scene: BABYLON.Scene;
  projectName: string;
  projectId: string;
  version: string;
  setOpenMobileMenu: (isOpen: boolean) => void;
}

function Navbar({
  scene,
  projectName,
  projectId,
  version,
  setOpenMobileMenu,
}: NavbarProps) {
  const username = useAppSelector(selectUsername);
  const models = useAppSelector(selectModels);
  const modelsToDraw = Object.values(models);
  const arrayModel = modelsToDraw.flat() as any[];
  const projectInfo = useSelector(selectProjectInfo).info;
  const [previousModels, setPreviousModels] = useState(arrayModel);
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const generatedMesh = useAppSelector(selectGeneratedMesh);
  const currentUser = useAppSelector(selectUsername);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [portsDefined, setPortsDefined] = useState(false);
  const [meshDefined, setMeshDefined] = useState(false);
  const [requestSimulation, setRequestSimulation] = useState(false);
  const [requestStop, setRequestStop] = useState(false);
  const [parameterSweepVisible, setParameterSweepVisible] = useState(false);
  const [screenshotBase64, setScreenshotBase64] = useState("");
  const parameters = useAppSelector(selectParameters);
  const dispatch = useAppDispatch();
  const materials = useAppSelector(selectMaterials);
  const saving = useAppSelector((state) => state.histories.saving);
  const classifiedMesh = useAppSelector(selectClassifiedMesh);
  const [classificationStatus, setClassificationStatus] = useState("-");

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Check if the click was on the dropdown button
      if (
        dropdownButtonRef.current &&
        dropdownButtonRef.current.contains(e.target as Node)
      ) {
        return;
      }

      // If the click was outside the dropdown, hide the dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  // useEffect(() => {
  //   if (!generatedMesh) {
  //     dispatch(setClassification(undefined));
  //   }
  // }, [generatedMesh]);

  useEffect(() => {
    let tmpModels = [...models];
    let tmpPrevModels = [...previousModels];
    tmpModels = tmpModels.map((model) => ({
      ...model,
      status: Status.Completed,
      selected: false,
    }));
    tmpPrevModels = tmpPrevModels.map((model) => ({
      ...model,
      status: Status.Completed,
      selected: false,
    }));
    const isEverythingSame = tmpModels.every(
      (x, idx) =>
        idx < tmpPrevModels.length &&
        JSON.stringify(x) === JSON.stringify(tmpPrevModels[idx])
    );

    if (models.length !== previousModels.length || !isEverythingSame) {
      dispatch(setMesh(undefined));
      setPreviousModels(models);
      for (let i = 0; i < 100; i++) {
        scene.meshes.forEach(function (mesh) {
          if (
            mesh.name === "_meshLines" ||
            mesh.name === "_meshLinesSecondary"
          ) {
            if (mesh.parent) {
              mesh.parent = null;
            }
            mesh.dispose();
          }
        });
      }
    }
  }, [arrayModel]);

  useEffect(() => {
    const portsExist = arrayModel.some(
      (model) => model.category === "Ports" && model.object.amplitude > 0
    );
    setPortsDefined(portsExist);
  }, [arrayModel]);

  // useEffect(() => {
  //   const meshExist = generatedMesh !== undefined;
  //   setMeshDefined(meshExist);
  // }, [arrayModel]);

  const [isGenerateLoading, setIsGenerateLoading] = useState(false);
  const previousGeometry = useRef({});

  // useEffect(() => {
  //   if (requestSimulation) {
  //     setIsLoading(true);
  //     if (!generatedMesh) {
  //       handleExport();
  //     }
  //     if (classificationStatus.includes("Converged")) {
  //       startSimulation();
  //     } else {
  //       startClassification();
  //     }
  //   }
  // }, [generatedMesh, requestSimulation, classificationStatus]);

  const startClassification = async (simulationMesh: any) => {
    dispatch(
      setClassification({ classification: "<i>Processing model...</i>" })
    );
    setClassificationStatus("<i>Processing model...</i>");
    let geometry: any = {};
    let ports: any = {};
    let elements: any = {};
    arrayModel.forEach((model) => {
      if (model.category === "Objects") {
        const mesh = scene.getMeshById(model.id);
        if (mesh !== null) {
          let meshString = BABYLON.STLExport.CreateSTL(
            [mesh as BABYLON.Mesh],
            false,
            mesh.id
          );

          const lines = meshString.split("\n");
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("\t\t\tvertex")) {
              const components = line.split(" ");
              const y = components[2];
              const z = components[3];
              components[2] = z;
              components[3] = y;
              lines[i] = components.join(" ");
            }
          }

          meshString = lines.join("\n");
          if (materials) {
            geometry[model.name + "_" + uuid()] = {
              shape: window.btoa(meshString),
              material: {
                epsilon: materials[model.material]?.epsilon,
                kappa: materials[model.material]?.kappa,
                mu: materials[model.material]?.mu,
              },
            };
          }
        }
      } else if (model.category === "Ports") {
        ports[model.name.split(" ")[1]] = {
          start: [
            parseFloat(calculate(model.object.x.min, parameters).toString()),
            parseFloat(calculate(model.object.y.min, parameters).toString()),
            parseFloat(calculate(model.object.z.min, parameters).toString()),
          ],
          stop: [
            parseFloat(calculate(model.object.x.max, parameters).toString()),
            parseFloat(calculate(model.object.y.max, parameters).toString()),
            parseFloat(calculate(model.object.z.max, parameters).toString()),
          ],
          impedance: parseFloat(
            calculate(model.object.impedance, parameters).toString()
          ),
          amplitude: parseFloat(
            calculate(model.object.amplitude, parameters).toString()
          ),
          phase_shift: parseFloat(
            calculate(model.object.phase_shift, parameters).toString()
          ),
          f_ref: parseFloat(
            calculate(model.object.f_ref, parameters).toString()
          ),
        };
      } else if (model.category === "Lumped Elements") {
        elements[model.name.split(" ")[1]] = {
          start: [
            parseFloat(calculate(model.object.x.min, parameters).toString()),
            parseFloat(calculate(model.object.y.min, parameters).toString()),
            parseFloat(calculate(model.object.z.min, parameters).toString()),
          ],
          stop: [
            parseFloat(calculate(model.object.x.max, parameters).toString()),
            parseFloat(calculate(model.object.y.max, parameters).toString()),
            parseFloat(calculate(model.object.z.max, parameters).toString()),
          ],
          element_type: model.object.element_type,
          resistance: parseFloat(
            calculate(model.object.resistance, parameters).toString()
          ),
          inductance: parseFloat(
            calculate(model.object.inductance, parameters).toString()
          ),
          capacitance: parseFloat(
            calculate(model.object.capacitance, parameters).toString()
          ),
        };
      }
    });

    const data = {
      geometry: geometry,
      mesh: simulationMesh,
      simulation: {
        ...simulationProperties,
        ports: ports,
        elements: elements,
      },
    };

    await Storage.put(`${currentUser}/projects/${projectId}/case.json`, data, {
      contentType: "application/json",
    });

    setIsGenerateLoading(true);
    await classifyMeshService
      .classifyMesh({ projectId, sim_check: 1 })
      .then((response: any) => {
        const classification = response.data;
        dispatch(setClassification(classification));
        setClassificationStatus(classification.classification);
        if (!classification.classification.includes("Converged")) {
          toast.error(
            <div
              dangerouslySetInnerHTML={{
                __html: classification.classification,
              }}
            />,
            {
              toastId: "error",
              autoClose: 10000,
            }
          );
        } else {
          startSimulation(simulationMesh);
        }
      })
      .catch((err: any) => {
        console.log(err);
      });
    setIsGenerateLoading(false);
  };

  const handleExport = () => {
    if (scene) {
      setIsGenerateLoading(true);
      dispatch(setMesh(undefined));
      dispatch(
        setClassification({
          classification: "-",
        })
      );
      setClassificationStatus("-");
      if (arrayModel.length > 0) {
        const geometry: any = {};
        const ports: any = {};
        const elements: any = {};

        arrayModel.forEach((model) => {
          if (model.category === "Objects") {
            const mesh = scene.getMeshById(model.id);
            if (mesh !== null) {
              let meshString = STLExport.CreateSTL(
                [mesh as unknown as BABYLONJS.Mesh],
                false,
                mesh.id
              );

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

              if (materials) {
                geometry[model.id] = {
                  shape: window.btoa(meshString),
                  material: {
                    epsilon: materials[model.material]?.epsilon,
                    kappa: materials[model.material]?.kappa,
                    mu: materials[model.material]?.mu,
                  },
                };
              } else {
                geometry[model.id] = {
                  shape: window.btoa(meshString),
                  material: {
                    epsilon: undefined,
                    kappa: undefined,
                    mu: undefined,
                  },
                };
              }

              for (let i = 0; i < 100; i++) {
                scene.meshes.forEach(function (mesh) {
                  if (
                    mesh.name === "_meshLines" ||
                    mesh.name === "_meshLinesSecondary"
                  ) {
                    if (mesh.parent) {
                      mesh.parent = null;
                    }
                    mesh.dispose();
                  }
                });
              }
            }
          } else if (model.category === "Ports") {
            ports[model.name.split(" ")[1]] = {
              start: [
                parseFloat(
                  calculate(model.object.x.min, parameters).toString()
                ),
                parseFloat(
                  calculate(model.object.y.min, parameters).toString()
                ),
                parseFloat(
                  calculate(model.object.z.min, parameters).toString()
                ),
              ],
              stop: [
                parseFloat(
                  calculate(model.object.x.max, parameters).toString()
                ),
                parseFloat(
                  calculate(model.object.y.max, parameters).toString()
                ),
                parseFloat(
                  calculate(model.object.z.max, parameters).toString()
                ),
              ],
            };
          } else if (model.category === "Lumped Elements") {
            elements[model.name.split(" ")[1]] = {
              start: [
                parseFloat(
                  calculate(model.object.x.min, parameters).toString()
                ),
                parseFloat(
                  calculate(model.object.y.min, parameters).toString()
                ),
                parseFloat(
                  calculate(model.object.z.min, parameters).toString()
                ),
              ],
              stop: [
                parseFloat(
                  calculate(model.object.x.max, parameters).toString()
                ),
                parseFloat(
                  calculate(model.object.y.max, parameters).toString()
                ),
                parseFloat(
                  calculate(model.object.z.max, parameters).toString()
                ),
              ],
            };
          }
        });

        const meshSimulation = {
          mesh: {
            cpw_near: simulationProperties.cpw_near,
            cpw_far: simulationProperties.cpw_far,
            cpw_min: simulationProperties.cpw_min,
          },
          simulation: {
            frequencyUnit: simulationProperties.frequencyUnit,
            dimensionsUnit: simulationProperties.dimensionsUnit,
            f_min: simulationProperties.f_min,
            f_max: simulationProperties.f_max,
            pml_n: simulationProperties.pml_n,
            xMin: simulationProperties.xMin,
            xMax: simulationProperties.xMax,
            yMin: simulationProperties.yMin,
            yMax: simulationProperties.yMax,
            zMin: simulationProperties.zMin,
            zMax: simulationProperties.zMax,
            padding: simulationProperties.padding,
            ports: ports,
            elements: elements,
          },
        };

        let uploadGeometry = true;

        // const geometryKeys = Object.keys(geometry);
        // const previousGeometryKeys = Object.keys(previousGeometry.current);

        // if (geometryKeys.length !== previousGeometryKeys.length) {
        //   uploadGeometry = true;
        // } else {
        //   geometryKeys.sort();
        //   previousGeometryKeys.sort();

        //   for (let i = 0; i < geometryKeys.length; i++) {
        //     if (geometryKeys[i] !== previousGeometryKeys[i]) {
        //       uploadGeometry = true;
        //       break;
        //     }
        //   }
        // }

        generateMeshService
          .generateMesh(
            currentUser,
            projectId,
            geometry,
            meshSimulation,
            uploadGeometry
          )
          .then((response: any) => {
            const responseData = response.data;
            const x = responseData.mesh.x;
            const y = responseData.mesh.y;
            const z = responseData.mesh.z;
            dispatch(setMeshXY(z));
            dispatch(setMeshYZ(x));
            dispatch(setMeshXZ(y));
            dispatch(setMesh(responseData.mesh));

            const boundaries = {
              xMin: simulationProperties.xMin,
              xMax: simulationProperties.xMax,
              yMin: simulationProperties.yMin,
              yMax: simulationProperties.yMax,
              zMin: simulationProperties.zMin,
              zMax: simulationProperties.zMax,
            };

            let pml_n = simulationProperties.pml_n;
            const pml_opacity = 0;

            let lines;
            let pml_n_min;
            let pml_n_max;

            pml_n_min = boundaries.xMin === "PML" ? pml_n : 0;
            pml_n_max = boundaries.xMax === "PML" ? pml_n : 0;
            const xClean = x.slice(pml_n_min, x.length - pml_n_max);

            pml_n_min = boundaries.yMin === "PML" ? pml_n : 0;
            pml_n_max = boundaries.yMax === "PML" ? pml_n : 0;
            const yClean = y.slice(pml_n_min, y.length - pml_n_max);

            pml_n_min = boundaries.zMin === "PML" ? pml_n : 0;
            pml_n_max = boundaries.zMax === "PML" ? pml_n : 0;
            const zClean = z.slice(pml_n_min, z.length - pml_n_max);

            pml_n = 0;

            // Primary mesh lines

            // X (YZ plane)
            pml_n_min = boundaries.xMin === "PML" ? pml_n : 0;
            pml_n_max = boundaries.xMax === "PML" ? pml_n : 0;

            pml_n_min = 0;
            pml_n_max = 0;

            for (let i = 0; i < xClean.length; i++) {
              const isPML =
                (boundaries.xMin === "PML" && i < pml_n_min) ||
                (boundaries.xMax === "PML" && i >= xClean.length - pml_n_max);
              const colors = [
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
              ];

              const point1 = new BABYLON.Vector3(
                xClean[i],
                yClean[pml_n_min],
                zClean[pml_n_min]
              );
              const point2_max = new BABYLON.Vector3(
                xClean[i],
                yClean[pml_n_max],
                zClean[zClean.length - 1 - pml_n_max]
              );
              const point2_min = new BABYLON.Vector3(
                xClean[i],
                yClean[yClean.length - 1 - pml_n_max],
                zClean[pml_n_max]
              );

              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLines",
                { points: [point1, point2_max], colors: colors },
                scene
              );
              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLines",
                { points: [point1, point2_min], colors: colors },
                scene
              );
            }

            // Y (XZ plane)
            pml_n_min = boundaries.yMin === "PML" ? pml_n : 0;
            pml_n_max = boundaries.yMax === "PML" ? pml_n : 0;

            for (let i = 0; i < yClean.length; i++) {
              const isPML =
                (boundaries.yMin === "PML" && i < pml_n_min) ||
                (boundaries.yMax === "PML" && i >= yClean.length - pml_n_max);
              const colors = [
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
              ];

              const point1 = new BABYLON.Vector3(
                xClean[pml_n_min],
                yClean[i],
                zClean[pml_n_min]
              );
              const point2_max = new BABYLON.Vector3(
                xClean[pml_n_max],
                yClean[i],
                zClean[zClean.length - 1 - pml_n_max]
              );
              const point2_min = new BABYLON.Vector3(
                xClean[xClean.length - 1 - pml_n_max],
                yClean[i],
                zClean[pml_n_max]
              );

              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLines",
                { points: [point1, point2_max], colors: colors },
                scene
              );
              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLines",
                { points: [point1, point2_min], colors: colors },
                scene
              );
            }

            // Z (XY plane)
            pml_n_min = boundaries.zMin === "PML" ? pml_n : 0;
            pml_n_max = boundaries.zMax === "PML" ? pml_n : 0;

            for (let i = 0; i < zClean.length; i++) {
              const isPML =
                (boundaries.zMin === "PML" && i < pml_n_min) ||
                (boundaries.zMax === "PML" && i >= zClean.length - pml_n_max);
              const colors = [
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
              ];

              const point1 = new BABYLON.Vector3(
                xClean[pml_n_min],
                yClean[pml_n_min],
                zClean[i]
              );
              const point2_max = new BABYLON.Vector3(
                xClean[pml_n_max],
                yClean[yClean.length - 1 - pml_n_max],
                zClean[i]
              );
              const point2_min = new BABYLON.Vector3(
                xClean[xClean.length - 1 - pml_n_max],
                yClean[pml_n_max],
                zClean[i]
              );

              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLines",
                { points: [point1, point2_max], colors: colors },
                scene
              );
              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLines",
                { points: [point1, point2_min], colors: colors },
                scene
              );
            }

            // Secondary mesh lines

            // X (YZ plane)
            pml_n_min = boundaries.xMin === "PML" ? pml_n : 0;
            pml_n_max = boundaries.xMax === "PML" ? pml_n : 0;

            for (let i = 0; i < xClean.length; i++) {
              const isPML =
                (boundaries.xMin === "PML" && i < pml_n_min) ||
                (boundaries.xMax === "PML" && i >= xClean.length - pml_n_max);
              const colors = [
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
              ];

              const point2 = new BABYLON.Vector3(
                xClean[i],
                yClean[yClean.length - 1 - pml_n_max],
                zClean[zClean.length - 1 - pml_n_max]
              );
              const point1_max = new BABYLON.Vector3(
                xClean[i],
                yClean[yClean.length - 1 - pml_n_max],
                zClean[pml_n_min]
              );
              const point1_min = new BABYLON.Vector3(
                xClean[i],
                yClean[pml_n_min],
                zClean[zClean.length - 1 - pml_n_max]
              );

              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLinesSecondary",
                { points: [point1_max, point2], colors: colors },
                scene
              );
              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLinesSecondary",
                { points: [point1_min, point2], colors: colors },
                scene
              );
            }

            // Y (XZ plane)
            pml_n_min = boundaries.yMin === "PML" ? pml_n : 0;
            pml_n_max = boundaries.yMax === "PML" ? pml_n : 0;

            for (let i = 0; i < yClean.length; i++) {
              const isPML =
                (boundaries.yMin === "PML" && i < pml_n_min) ||
                (boundaries.yMax === "PML" && i >= yClean.length - pml_n_max);
              const colors = [
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
              ];

              const point2 = new BABYLON.Vector3(
                xClean[xClean.length - 1 - pml_n_max],
                yClean[i],
                zClean[zClean.length - 1 - pml_n_max]
              );
              const point1_max = new BABYLON.Vector3(
                xClean[xClean.length - 1 - pml_n_max],
                yClean[i],
                zClean[pml_n_min]
              );
              const point1_min = new BABYLON.Vector3(
                xClean[pml_n_min],
                yClean[i],
                zClean[zClean.length - 1 - pml_n_max]
              );

              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLinesSecondary",
                { points: [point1_max, point2], colors: colors },
                scene
              );
              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLinesSecondary",
                { points: [point1_min, point2], colors: colors },
                scene
              );
            }

            // Z (XY plane)
            pml_n_min = boundaries.zMin === "PML" ? pml_n : 0;
            pml_n_max = boundaries.zMax === "PML" ? pml_n : 0;

            for (let i = 0; i < zClean.length; i++) {
              const isPML =
                (boundaries.zMin === "PML" && i < pml_n_min) ||
                (boundaries.zMax === "PML" && i >= zClean.length - pml_n_max);
              const colors = [
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
                new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
              ];

              const point2 = new BABYLON.Vector3(
                xClean[xClean.length - 1 - pml_n_max],
                yClean[yClean.length - 1 - pml_n_max],
                zClean[i]
              );
              const point1_max = new BABYLON.Vector3(
                xClean[xClean.length - 1 - pml_n_max],
                yClean[pml_n_min],
                zClean[i]
              );
              const point1_min = new BABYLON.Vector3(
                xClean[pml_n_min],
                yClean[yClean.length - 1 - pml_n_max],
                zClean[i]
              );

              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLinesSecondary",
                { points: [point1_max, point2], colors: colors },
                scene
              );
              lines = BABYLON.MeshBuilder.CreateLines(
                "_meshLinesSecondary",
                { points: [point1_min, point2], colors: colors },
                scene
              );
            }

            // Hide secondary mesh lines
            scene.meshes.forEach((mesh: any) => {
              if (mesh.name === "_meshLinesSecondary") {
                mesh.visibility = 0;
              }
            });

            // Hide primary mesh lines
            scene.meshes.forEach((mesh: any) => {
              if (mesh.name === "_meshLines") {
                mesh.visibility = 0;
              }
            });

            // Start classification
            startClassification(responseData.mesh);
          })
          .catch((err: any) => {
            setIsGenerateLoading(false);
            console.log(err);
          });
        previousGeometry.current = geometry;
      } else {
        setIsGenerateLoading(false);
        toast.error("No objects found.", {
          toastId: "error",
        });
      }
    }
  };

  const checkSimulationRunning = () => {
    const statusData = projectInfo;

    if (
      statusData.status?.includes("Checking discretization") ||
      ((statusData.status?.includes("Pre-processing discretization") ||
        classificationStatus.includes("Processing model")) &&
        requestSimulation)
    ) {
      setIsLoading(true);
      return;
    }
    if (
      (statusData.status?.includes("Idle") && !requestSimulation) ||
      classificationStatus.includes("refinement")
    ) {
      setIsLoading(false);
      return;
    }

    const validStatus = [
      "Configuring simulation",
      "Initializing compute",
      "Starting simulation",
      "Running | Energy",
      "Post-processing results",
      "Preparing",
      "Processing",
    ];
    if (
      validStatus.some((status) => statusData.status?.includes(status)) &&
      !requestStop
    ) {
      setIsSimulationRunning(true);
      setIsLoading(false);
    } else if (!isLoading && !requestStop) {
      setIsSimulationRunning(false);
    }
  };

  useEffect(() => {
    const checkStatusInterval = setInterval(async () => {
      checkSimulationRunning();
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(checkStatusInterval);
  }, [projectInfo, isLoading, requestSimulation, classificationStatus]);

  // const saveBabylonToS3 = async () => {
  //   if (scene) {
  //     const sceneData = BABYLON.SceneSerializer.Serialize(scene);
  //     await Storage.put(
  //       `${currentUser}/projects/${projectId}/${version}/model.json`,
  //       sceneData,
  //       {
  //         contentType: "application/json",
  //       }
  //     );
  //   }
  // };

  const stopSimulation = async () => {
    setIsLoading(true);
    setIsSimulationRunning(true);
    setRequestStop(true);
    const response = await api.post("/run_simulation", {
      projectId,
      stop_simulation: 1,
    });
    setRequestStop(false);
    setIsSimulationRunning(false);
    setIsLoading(false);
  };

  const startSimulation = async (simulationMesh: any) => {
    // setIsLoading(true);

    let geometry: any = {};
    let ports: any = {};
    let elements: any = {};
    arrayModel.forEach((model) => {
      if (model.category === "Objects") {
        const mesh = scene.getMeshById(model.id);
        if (mesh !== null) {
          let meshString = BABYLON.STLExport.CreateSTL(
            [mesh as BABYLON.Mesh],
            false,
            mesh.id
          );

          const lines = meshString.split("\n");
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("\t\t\tvertex")) {
              const components = line.split(" ");
              const y = components[2];
              const z = components[3];
              components[2] = z;
              components[3] = y;
              lines[i] = components.join(" ");
            }
          }

          meshString = lines.join("\n");
          if (materials) {
            geometry[model.name + "_" + uuid()] = {
              shape: window.btoa(meshString),
              material: {
                epsilon: materials[model.material]?.epsilon,
                kappa: materials[model.material]?.kappa,
                mu: materials[model.material]?.mu,
              },
            };
          }
        }
      } else if (model.category === "Ports") {
        ports[model.name.split(" ")[1]] = {
          start: [
            parseFloat(calculate(model.object.x.min, parameters).toString()),
            parseFloat(calculate(model.object.y.min, parameters).toString()),
            parseFloat(calculate(model.object.z.min, parameters).toString()),
          ],
          stop: [
            parseFloat(calculate(model.object.x.max, parameters).toString()),
            parseFloat(calculate(model.object.y.max, parameters).toString()),
            parseFloat(calculate(model.object.z.max, parameters).toString()),
          ],
          impedance: parseFloat(
            calculate(model.object.impedance, parameters).toString()
          ),
          amplitude: parseFloat(
            calculate(model.object.amplitude, parameters).toString()
          ),
          phase_shift: parseFloat(
            calculate(model.object.phase_shift, parameters).toString()
          ),
          f_ref: parseFloat(
            calculate(model.object.f_ref, parameters).toString()
          ),
        };
      } else if (model.category === "Lumped Elements") {
        elements[model.name.split(" ")[1]] = {
          start: [
            parseFloat(calculate(model.object.x.min, parameters).toString()),
            parseFloat(calculate(model.object.y.min, parameters).toString()),
            parseFloat(calculate(model.object.z.min, parameters).toString()),
          ],
          stop: [
            parseFloat(calculate(model.object.x.max, parameters).toString()),
            parseFloat(calculate(model.object.y.max, parameters).toString()),
            parseFloat(calculate(model.object.z.max, parameters).toString()),
          ],
          element_type: model.object.element_type,
          resistance: parseFloat(
            calculate(model.object.resistance, parameters).toString()
          ),
          inductance: parseFloat(
            calculate(model.object.inductance, parameters).toString()
          ),
          capacitance: parseFloat(
            calculate(model.object.capacitance, parameters).toString()
          ),
        };
      }
    });

    // Take screenshot
    const engine = scene.getEngine();

    let ground = scene.getMeshByName("_ground");
    let meshLines = scene.getMeshByName("_meshLines");
    let meshLinesSecondary = scene.getMeshByName("_meshLinesSecondary");
    let distance = scene.getMeshByName("Distance ");
    let textPlane = scene.getMeshByName("TextPlane");

    let groundVisibility = ground?.visibility;
    let meshLinesVisibility = meshLines?.visibility;
    let meshLinesSecondaryVisibility = meshLinesSecondary?.visibility;
    let distanceVisibility = distance?.visibility;
    let textPlaneVisibility = textPlane?.visibility;

    hideMeshes("_ground", scene);
    hideMeshes("_meshLines", scene);
    hideMeshes("_meshLinesSecondary", scene);
    hideMeshes("Distance ", scene);
    hideMeshes("TextPlane", scene);

    let boundingBox = new BABYLON.BoundingBox(
      BABYLON.Vector3.Zero(),
      BABYLON.Vector3.Zero()
    );
    let maxDim = 0;
    if (scene.meshes.length > 0) {
      let minBounding =
        scene.meshes[0].getBoundingInfo().boundingBox.minimumWorld;
      let maxBounding =
        scene.meshes[0].getBoundingInfo().boundingBox.maximumWorld;
      scene.meshes.slice(1).forEach((mesh) => {
        const minBound = mesh.getBoundingInfo().boundingBox.minimumWorld;
        const maxBound = mesh.getBoundingInfo().boundingBox.maximumWorld;
        minBounding.minimizeInPlace(minBound);
        maxBounding.maximizeInPlace(maxBound);
      });
      boundingBox = new BABYLON.BoundingBox(minBounding, maxBounding);
      const xDim = boundingBox.maximumWorld.x - boundingBox.minimumWorld.x;
      const yDim = boundingBox.maximumWorld.y - boundingBox.minimumWorld.y;
      const zDim = boundingBox.maximumWorld.z - boundingBox.minimumWorld.z;
      maxDim = Math.max(xDim, yDim, zDim);
    }
    const camera = scene?.activeCamera as BABYLON.ArcRotateCamera;
    const screenshotCamera = camera.clone(
      "screenshotCamera"
    ) as BABYLON.ArcRotateCamera;
    screenshotCamera.target = new BABYLON.Vector3(
      (boundingBox.minimumWorld.x + boundingBox.maximumWorld.x) / 2,
      (boundingBox.minimumWorld.y + boundingBox.maximumWorld.y) / 2,
      (boundingBox.minimumWorld.z + boundingBox.maximumWorld.z) / 2
    );
    screenshotCamera.radius = maxDim * 0.6;
    screenshotCamera.alpha = Math.PI / 3.5;
    screenshotCamera.beta = Math.PI / 2.7;
    for (let i = 0; i < 100; i++) {
      scene.meshes.forEach(function (mesh) {
        if (mesh.name === "_meshLines" || mesh.name === "_meshLinesSecondary") {
          if (mesh.parent) {
            mesh.parent = null;
          }
          mesh.dispose();
        }
      });
    }

    BABYLON.Tools.CreateScreenshotUsingRenderTarget(
      engine,
      screenshotCamera,
      2000,
      async function (dataURI) {
        // Restore visibilities
        const x = simulationMesh.x;
        const y = simulationMesh.y;
        const z = simulationMesh.z;

        const boundaries = {
          xMin: simulationProperties.xMin,
          xMax: simulationProperties.xMax,
          yMin: simulationProperties.yMin,
          yMax: simulationProperties.yMax,
          zMin: simulationProperties.zMin,
          zMax: simulationProperties.zMax,
        };

        let pml_n = simulationProperties.pml_n;
        const pml_opacity = 0;

        let lines;
        let pml_n_min;
        let pml_n_max;

        pml_n_min = boundaries.xMin === "PML" ? pml_n : 0;
        pml_n_max = boundaries.xMax === "PML" ? pml_n : 0;
        const xClean = x.slice(pml_n_min, x.length - pml_n_max);

        pml_n_min = boundaries.yMin === "PML" ? pml_n : 0;
        pml_n_max = boundaries.yMax === "PML" ? pml_n : 0;
        const yClean = y.slice(pml_n_min, y.length - pml_n_max);

        pml_n_min = boundaries.zMin === "PML" ? pml_n : 0;
        pml_n_max = boundaries.zMax === "PML" ? pml_n : 0;
        const zClean = z.slice(pml_n_min, z.length - pml_n_max);

        pml_n = 0;

        // Primary mesh lines

        // X (YZ plane)
        pml_n_min = boundaries.xMin === "PML" ? pml_n : 0;
        pml_n_max = boundaries.xMax === "PML" ? pml_n : 0;

        pml_n_min = 0;
        pml_n_max = 0;

        for (let i = 0; i < xClean.length; i++) {
          const isPML =
            (boundaries.xMin === "PML" && i < pml_n_min) ||
            (boundaries.xMax === "PML" && i >= xClean.length - pml_n_max);
          const colors = [
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          ];

          const point1 = new BABYLON.Vector3(
            xClean[i],
            yClean[pml_n_min],
            zClean[pml_n_min]
          );
          const point2_max = new BABYLON.Vector3(
            xClean[i],
            yClean[pml_n_max],
            zClean[zClean.length - 1 - pml_n_max]
          );
          const point2_min = new BABYLON.Vector3(
            xClean[i],
            yClean[yClean.length - 1 - pml_n_max],
            zClean[pml_n_max]
          );

          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLines",
            { points: [point1, point2_max], colors: colors },
            scene
          );
          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLines",
            { points: [point1, point2_min], colors: colors },
            scene
          );
        }

        // Y (XZ plane)
        pml_n_min = boundaries.yMin === "PML" ? pml_n : 0;
        pml_n_max = boundaries.yMax === "PML" ? pml_n : 0;

        for (let i = 0; i < yClean.length; i++) {
          const isPML =
            (boundaries.yMin === "PML" && i < pml_n_min) ||
            (boundaries.yMax === "PML" && i >= yClean.length - pml_n_max);
          const colors = [
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          ];

          const point1 = new BABYLON.Vector3(
            xClean[pml_n_min],
            yClean[i],
            zClean[pml_n_min]
          );
          const point2_max = new BABYLON.Vector3(
            xClean[pml_n_max],
            yClean[i],
            zClean[zClean.length - 1 - pml_n_max]
          );
          const point2_min = new BABYLON.Vector3(
            xClean[xClean.length - 1 - pml_n_max],
            yClean[i],
            zClean[pml_n_max]
          );

          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLines",
            { points: [point1, point2_max], colors: colors },
            scene
          );
          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLines",
            { points: [point1, point2_min], colors: colors },
            scene
          );
        }

        // Z (XY plane)
        pml_n_min = boundaries.zMin === "PML" ? pml_n : 0;
        pml_n_max = boundaries.zMax === "PML" ? pml_n : 0;

        for (let i = 0; i < zClean.length; i++) {
          const isPML =
            (boundaries.zMin === "PML" && i < pml_n_min) ||
            (boundaries.zMax === "PML" && i >= zClean.length - pml_n_max);
          const colors = [
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          ];

          const point1 = new BABYLON.Vector3(
            xClean[pml_n_min],
            yClean[pml_n_min],
            zClean[i]
          );
          const point2_max = new BABYLON.Vector3(
            xClean[pml_n_max],
            yClean[yClean.length - 1 - pml_n_max],
            zClean[i]
          );
          const point2_min = new BABYLON.Vector3(
            xClean[xClean.length - 1 - pml_n_max],
            yClean[pml_n_max],
            zClean[i]
          );

          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLines",
            { points: [point1, point2_max], colors: colors },
            scene
          );
          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLines",
            { points: [point1, point2_min], colors: colors },
            scene
          );
        }

        // Secondary mesh lines

        // X (YZ plane)
        pml_n_min = boundaries.xMin === "PML" ? pml_n : 0;
        pml_n_max = boundaries.xMax === "PML" ? pml_n : 0;

        for (let i = 0; i < xClean.length; i++) {
          const isPML =
            (boundaries.xMin === "PML" && i < pml_n_min) ||
            (boundaries.xMax === "PML" && i >= xClean.length - pml_n_max);
          const colors = [
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          ];

          const point2 = new BABYLON.Vector3(
            xClean[i],
            yClean[yClean.length - 1 - pml_n_max],
            zClean[zClean.length - 1 - pml_n_max]
          );
          const point1_max = new BABYLON.Vector3(
            xClean[i],
            yClean[yClean.length - 1 - pml_n_max],
            zClean[pml_n_min]
          );
          const point1_min = new BABYLON.Vector3(
            xClean[i],
            yClean[pml_n_min],
            zClean[zClean.length - 1 - pml_n_max]
          );

          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLinesSecondary",
            { points: [point1_max, point2], colors: colors },
            scene
          );
          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLinesSecondary",
            { points: [point1_min, point2], colors: colors },
            scene
          );
        }

        // Y (XZ plane)
        pml_n_min = boundaries.yMin === "PML" ? pml_n : 0;
        pml_n_max = boundaries.yMax === "PML" ? pml_n : 0;

        for (let i = 0; i < yClean.length; i++) {
          const isPML =
            (boundaries.yMin === "PML" && i < pml_n_min) ||
            (boundaries.yMax === "PML" && i >= yClean.length - pml_n_max);
          const colors = [
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          ];

          const point2 = new BABYLON.Vector3(
            xClean[xClean.length - 1 - pml_n_max],
            yClean[i],
            zClean[zClean.length - 1 - pml_n_max]
          );
          const point1_max = new BABYLON.Vector3(
            xClean[xClean.length - 1 - pml_n_max],
            yClean[i],
            zClean[pml_n_min]
          );
          const point1_min = new BABYLON.Vector3(
            xClean[pml_n_min],
            yClean[i],
            zClean[zClean.length - 1 - pml_n_max]
          );

          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLinesSecondary",
            { points: [point1_max, point2], colors: colors },
            scene
          );
          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLinesSecondary",
            { points: [point1_min, point2], colors: colors },
            scene
          );
        }

        // Z (XY plane)
        pml_n_min = boundaries.zMin === "PML" ? pml_n : 0;
        pml_n_max = boundaries.zMax === "PML" ? pml_n : 0;

        for (let i = 0; i < zClean.length; i++) {
          const isPML =
            (boundaries.zMin === "PML" && i < pml_n_min) ||
            (boundaries.zMax === "PML" && i >= zClean.length - pml_n_max);
          const colors = [
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
            new BABYLON.Color4(1, 0, 0, isPML ? pml_opacity : 1),
          ];

          const point2 = new BABYLON.Vector3(
            xClean[xClean.length - 1 - pml_n_max],
            yClean[yClean.length - 1 - pml_n_max],
            zClean[i]
          );
          const point1_max = new BABYLON.Vector3(
            xClean[xClean.length - 1 - pml_n_max],
            yClean[pml_n_min],
            zClean[i]
          );
          const point1_min = new BABYLON.Vector3(
            xClean[pml_n_min],
            yClean[yClean.length - 1 - pml_n_max],
            zClean[i]
          );

          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLinesSecondary",
            { points: [point1_max, point2], colors: colors },
            scene
          );
          lines = BABYLON.MeshBuilder.CreateLines(
            "_meshLinesSecondary",
            { points: [point1_min, point2], colors: colors },
            scene
          );
        }

        // Hide secondary mesh lines
        scene.meshes.forEach((mesh: any) => {
          if (mesh.name === "_meshLinesSecondary") {
            mesh.visibility = 0;
          }
        });

        // Hide primary mesh lines
        scene.meshes.forEach((mesh: any) => {
          if (mesh.name === "_meshLines") {
            mesh.visibility = 0;
          }
        });

        if (ground && groundVisibility !== undefined && groundVisibility === 1)
          showMeshes("_ground", scene);
        if (
          meshLines &&
          meshLinesVisibility !== undefined &&
          meshLinesVisibility === 1
        )
          showMeshes("_meshLines", scene);
        if (
          meshLinesSecondary &&
          meshLinesSecondaryVisibility !== undefined &&
          meshLinesSecondaryVisibility === 1
        )
          showMeshes("_meshLinesSecondary", scene);
        if (
          distance &&
          distanceVisibility !== undefined &&
          distanceVisibility === 1
        )
          showMeshes("Distance ", scene);
        if (
          textPlane &&
          textPlaneVisibility !== undefined &&
          textPlaneVisibility === 1
        )
          showMeshes("TextPlane", scene);

        const data = {
          geometry: geometry,
          mesh: simulationMesh,
          simulation: {
            ...simulationProperties,
            ports: ports,
            elements: elements,
          },
          screenshot: dataURI,
        };

        await Storage.put(
          `${currentUser}/projects/${projectId}/case.json`,
          data,
          {
            contentType: "application/json",
          }
        );
        const response = await api.post("/run_simulation", { projectId });
      }
    );

    // const forceSetterInterval = setInterval(() => {
    //   setIsSimulationRunning(true);
    // }, 25);

    // setTimeout(() => {
    //   clearInterval(forceSetterInterval);

    // }, 5000);
    // setIsLoading(false);
    setRequestSimulation(false);
  };

  return (
    <nav className="font-inter bg-white py-3">
      <div className="flex justify-between px-2">
        <div
          className="min-[1200px]:hidden flex items-center justify-center cursor-pointer"
          onClick={() => setOpenMobileMenu(true)}
        >
          <MyIcon name="menu" />
        </div>

        {/* Return to "My Projects Screen" Or " My Dashbord" */}
        <div className="hidden lg:!flex align-middle">
          <span className="ml-4 my-auto flex items-center justify-center w-6 h-6 rounded focus:outline-none">
            <MyIcon name="back-home" />
          </span>
          <span className="my-auto text-gray-300 flex mx-4 items-center justify-center w-2 h-2 rounded focus:outline-none">
            <MyIcon name="right-arrow" color="#D0D5DD" />
          </span>
          <button
            className="my-auto px-0 py-1 text-gray-600 active:text-gray-900 hover:underline font-medium bg-white text-sm flex items-center justify-center rounded focus:outline-none"
            onClick={() => window.open("/projects")}
          >
            Projects
          </button>
          <span className="my-auto text-gray-300 flex mx-4 items-center justify-center w-2 h-2 rounded focus:outline-none">
            <MyIcon name="right-arrow" color="#D0D5DD" />
          </span>
          <span className="my-auto px-2 py-1 flex font-semibold text-[#344054] text-sm items-center bg-[#F9FAFB] justify-center rounded focus:outline-none">
            {projectName ? projectName : "-"}
          </span>
          <div className="flex items-center justify-center">
            <button className="my-auto text-gray-300 flex ml-12 mr-3 items-center justify-center w-2 h-2">
              <span
                data-tooltip-id="undo-tooltip"
                data-tooltip-content="Undo"
                data-tooltip-place="bottom"
              >
                <MyIcon name="undo" color="#475467" />
              </span>
              <Tooltip id="undo-tooltip" />
            </button>
            <button className="my-auto text-gray-300 flex mx-2 items-center justify-center w-2 h-2">
              <span
                data-tooltip-id="redo-tooltip"
                data-tooltip-content="Redo"
                data-tooltip-place="bottom"
              >
                <MyIcon name="redo" color="#475467" />
              </span>
              <Tooltip id="redo-tooltip" />
            </button>
          </div>
        </div>
        <div className="flex align-middle">
          <span className="text-gray-600 font-medium text-sm flex items-center justify-center rounded focus:outline-none">
            {saving ? (
              <>
                <svg
                  aria-hidden="true"
                  className="w-4 h-4 animate-spin dark:text-gray-600 fill-white"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                <div className="mx-2">Saving...</div>
              </>
            ) : (
              <>
                <MyIcon name="shield-tick" />
                <div className="mx-2">Saved securely</div>
              </>
            )}
          </span>
        </div>
        {/* Help - Start Simulation */}
        <div>
          <div className="flex gap-2">
            {/* Algolia Search */}
            <DocSearchInput />
            {/* <div className="hidden shadow-sm md:!flex align-middle border-2 border-[#D0D5DD] rounded-md text-gray-700">
              <div className="ml-2 mr-1 my-auto">
                <MyIcon name="search" />
              </div> */}
            {/* <input
                type="text"
                className="my-auto mr-1 px-2 py-1 text-sm flex items-center justify-center focus:outline-none placeholder-[#667085]"
                placeholder="HI"
              /> */}
            {/* </div> */}
            <div className="flex mx-2">
              <button
                className={`relative shadow-sm my-auto py-2 font-medium text-sm flex items-center justify-center align-middle focus:outline-none text-white ${
                  !arrayModel.some((dict) =>
                    Object.values(dict).includes("Objects")
                  ) ||
                  isLoading ||
                  isGenerateLoading ||
                  (!isSimulationRunning && !portsDefined)
                    ? "bg-primary-300 rounded-md w-48"
                    : isSimulationRunning
                    ? "bg-error-600 hover:bg-error-700 active:bg-error-800 hover:transition duration-150 shadow-lg hover:shadow-error-600/50 rounded-md w-48"
                    : "bg-primary-600 hover:bg-primary-700 active:bg-primary-900 hover:transition duration-150 shadow-lg hover:shadow-primary-600/50 rounded-l-md w-40"
                }`}
                onClick={(e) => {
                  if (isSimulationRunning) {
                    stopSimulation();
                  } else {
                    setIsLoading(true);
                    setRequestSimulation(true);

                    if (!generatedMesh) {
                      handleExport();
                    } else if (!classificationStatus.includes("Converged")) {
                      startClassification(generatedMesh);
                    } else {
                      startSimulation(generatedMesh);
                    }

                    // if (!meshDefined) {
                    //   handleExport(e);
                    // } else {
                    //   setRequestSimulation(true);
                    // }
                  }
                }}
                disabled={
                  !arrayModel.some((dict) =>
                    Object.values(dict).includes("Objects")
                  ) ||
                  isLoading ||
                  isGenerateLoading ||
                  (!portsDefined && !isSimulationRunning)
                }
              >
                <div
                  className={`absolute inset-0 flex items-center justify-center ${
                    isLoading || isGenerateLoading ? "flex" : "hidden"
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-white inline-block"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                </div>
                <div
                  className={`absolute inset-0 flex items-center justify-center ${
                    isLoading || isGenerateLoading ? "hidden" : "flex"
                  }`}
                >
                  <MyIcon
                    name={
                      isSimulationRunning
                        ? "stop-simulation"
                        : "start-simulation"
                    }
                  />
                  <span>
                    {isSimulationRunning
                      ? "Stop Simulation"
                      : "Start Simulation"}
                  </span>
                </div>
                <div className="flex items-center justify-center opacity-0">
                  <MyIcon
                    name={
                      isSimulationRunning
                        ? "stop-simulation"
                        : "start-simulation"
                    }
                  />
                  <span>
                    {isSimulationRunning
                      ? "Stop Simulation"
                      : "Start Simulation"}
                  </span>
                </div>
              </button>
              {arrayModel.some((dict) =>
                Object.values(dict).includes("Objects")
              ) &&
                !isSimulationRunning &&
                !isLoading &&
                !isGenerateLoading &&
                portsDefined && (
                  <div className="font-medium relative">
                    <button
                      ref={dropdownButtonRef}
                      onClick={() => setShowDropdown((prev) => !prev)}
                      disabled={!portsDefined}
                      className="h-9 px-3 rounded-r-md bg-primary-600 hover:bg-primary-700 active:bg-primary-900 disabled:bg-primary-300 hover:transition duration-150 enabled:shadow-sm enabled:hover:shadow-primary-600/50 text-gray-200 border-l border-white"
                    >
                      <span
                        className={`${
                          showDropdown ? "transform rotate-180" : ""
                        } transition-transform duration-300 inline-block`}
                      >
                        ⏷
                      </span>
                    </button>
                    {showDropdown && (
                      <div
                        ref={dropdownRef}
                        className={`origin-top-right ring-1 ring-black ring-opacity-5 absolute right-0 z-10 mt-2 w-max bg-white text-primary-600 drop-shadow-lg rounded-md overflow-hidden ${
                          showDropdown ? "dropdown-visible" : "dropdown-hidden"
                        }`}
                      >
                        <button
                          onClick={() => {
                            setParameterSweepVisible(true);
                            setShowDropdown(false);
                          }}
                          className="hover:bg-primary-200 active:bg-primary-300 block w-full px-4 py-2 text-left"
                        >
                          <div className="flex items-center">
                            <MyIcon name="parameter-sweep" />
                            <span>Parameter Sweep</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            // handleOptimization();
                            setShowDropdown(false);
                          }}
                          className="hover:bg-primary-200 active:bg-primary-300 block w-full px-4 py-2 text-left"
                        >
                          <div className="flex items-center">
                            <MyIcon name="optimization" />
                            <span>Optimization</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            // handleMeshConvergence();
                            setShowDropdown(false);
                          }}
                          className="hover:bg-primary-200 active:bg-primary-300 block w-full px-4 py-2 text-left"
                        >
                          <div className="flex items-center">
                            <MyIcon name="convergence" />
                            <span>Mesh Convergence</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
        <ParameterSweep
          visible={parameterSweepVisible}
          setVisible={setParameterSweepVisible}
        />
      </div>
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        pauseOnHover
        theme="colored"
      />
    </nav>
  );
}

export default Navbar;

function DocSearchInput() {
  return (
    <DocSearch
      appId="HW5OKS5WS9"
      indexName="docs"
      apiKey="b49a6fb4625ff5666787d0b2e17e1b67"
      placeholder="Search documentation..."
      navigator={{
        navigate({ itemUrl }: { itemUrl: string }) {
          window.open(itemUrl, "_blank");
        },
      }}
      hitComponent={({
        hit,
        children,
      }: {
        hit: any;
        children: React.ReactNode;
      }) => (
        <a
          href={hit.url}
          target="_blank"
          className="hover:bg-primary-200 active:bg-primary-300 block w-full px-4 py-2 text-left"
        >
          {children}
        </a>
      )}
    />
  );
}
