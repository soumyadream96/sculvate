import MyIcon from "assets/MyIcons";
import { STLExport } from "babylonjs-serializers";
import MainScene, { scene } from "components/project-components/MainScene";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { selectModels } from "state/reducers/modelSlice";
import { Storage } from "aws-amplify";
import ReactRangeSlider from "./ReactRangeSlider";
import * as BABYLON from "babylonjs";
import generateMeshService from "../../../../services/generateMesh.service";
import {
  selectSimulationProperties,
  updateSimulationProperties,
} from "state/reducers/simulationPropertiesSlice";
import Materials from "../../babylonjs/types/materials";
import {
  setMesh,
  setMeshXY,
  setMeshXZ,
  setMeshYZ,
} from "state/reducers/generatedMeshSlice";
import { setClassification } from "state/reducers/classifiedMeshSlice";
import React, { useState, useEffect, useRef } from "react";
import { selectGeneratedMesh } from "state/reducers/generatedMeshSlice";
import { selectUsername } from "state/reducers/authSlice";
import { selectParameters } from "state/reducers/parametersSlice";
import { v4 as uuid } from "uuid";
import classifyMeshService from "services/classifyMesh.service";
import { hideMeshes } from "components/project-components/tabbar/TabUtils";
import { selectProjectInfo } from "state/reducers/projectInfoSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { selectMaterials } from "state/reducers/userSlice";
import { calculate } from "utilities";

interface MeshPropertiesProps {
  projectId: string;
}

const MeshProperties = ({ projectId }: MeshPropertiesProps) => {
  const username = useAppSelector(selectUsername);
  const models = useAppSelector(selectModels);
  const modelsToDraw = Object.values(models);
  const generatedMesh = useAppSelector(selectGeneratedMesh);
  const arrayModel = modelsToDraw.flat() as any[];
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUsername);
  const [isGenerateLoading, setIsGenerateLoading] = useState(false);
  const [isClassifyLoading, setIsClassifyLoading] = useState(false);
  const [meshDefined, setMeshDefined] = useState(false);
  const previousGeometry = useRef({});
  const projectInfo = useAppSelector(selectProjectInfo);
  const materials = useAppSelector(selectMaterials);
  const parameters = useAppSelector(selectParameters);
  const isSimRunning =
    projectInfo.info.percentage !== 0 && projectInfo.info.percentage !== 100;

  useEffect(() => {
    const meshExist = generatedMesh !== undefined;
    setMeshDefined(meshExist);
  }, [arrayModel]);

  const handleExport = (e: any) => {
    if (scene) {
      setIsGenerateLoading(true);
      dispatch(setMesh(undefined));
      dispatch(
        setClassification({
          classification: "-",
        })
      );
      if (arrayModel.length > 0) {
        const geometry: any = {};
        const ports: any = {};
        const elements: any = {};

        arrayModel.forEach((model) => {
          if (model.category === "Objects") {
            const mesh = scene.getMeshById(model.id);
            if (mesh !== null) {
              let meshString = STLExport.CreateSTL(
                [mesh as BABYLON.Mesh],
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

        let uploadGeometry = false;

        const geometryKeys = Object.keys(geometry);
        const previousGeometryKeys = Object.keys(previousGeometry.current);

        if (geometryKeys.length !== previousGeometryKeys.length) {
          uploadGeometry = true;
        } else {
          geometryKeys.sort();
          previousGeometryKeys.sort();

          for (let i = 0; i < geometryKeys.length; i++) {
            if (geometryKeys[i] !== previousGeometryKeys[i]) {
              uploadGeometry = true;
              break;
            }
          }
        }

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

            setIsGenerateLoading(false);
          })
          .catch((err: any) => {
            setIsGenerateLoading(false);
            console.log(err);
          });
        previousGeometry.current = geometry;
      } else {
        setIsGenerateLoading(false);
        toast.error("No meshes to export.", {
          toastId: "error",
        });
      }
    }
  };

  const startClassification = async () => {
    setIsClassifyLoading(true);
    dispatch(
      setClassification({ classification: "<i>Processing model...</i>" })
    );
    let geometry: any = {};
    let ports: any = {};
    let elements: any = {};
    arrayModel.forEach((model) => {
      if (model.category === "Objects") {
        const mesh = scene.getMeshById(model.id);
        if (mesh !== null) {
          let meshString = STLExport.CreateSTL(
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
      simulation: {
        ...simulationProperties,
        ports: ports,
        elements: elements,
      },
      mesh: generatedMesh,
    };
    await Storage.put(`${currentUser}/projects/${projectId}/case.json`, data, {
      contentType: "application/json",
    });

    await classifyMeshService
      .classifyMesh({ projectId })
      .then((response: any) => {
        const classification = response.data;
        dispatch(setClassification(classification));
      })
      .catch((err: any) => {
        console.log(err);
      });
    setIsClassifyLoading(false);
  };

  const saveProperties = (key: string, values: number[]) => {
    let propertiesObj: { [key: string]: any } = { ...simulationProperties };
    propertiesObj[key] = values[0];

    Storage.put(
      `${currentUser}/projects/${projectId}/v1/properties.json`,
      propertiesObj
    );
  };

  return (
    <>
      <ul className="my-2 space-y-1 bg-[#F9FAFB] rounded-md p-2">
        <li className="bg-[#EAECF0] rounded-lg">
          <a className="flex items-center px-2 py-0.5 text-sm font-normal text-[#101828] rounded-lg">
            <MyIcon name="mesh-properties" />
            <span className="ml-3 font-bold text-base">
              Mesh&nbsp;properties
            </span>
          </a>
        </li>
        <li>
          <div className="bg-[#F9FAFB] rounded-md p-2 overflow-hidden">
            <div className="px-2">
              <div className="pl-1 text-base text-gray-700 font-semibold underline underline-offset-4 mb-1">
                Cells per wavelength (CPW)
              </div>

              <div className="space-y-4">
                <div className="px-5">
                  <h5 className="text-base text-gray-700 font-medium">
                    Near structure:
                  </h5>
                  <ReactRangeSlider
                    rtl={false}
                    minValue={5}
                    maxValue={100}
                    defualtValue={[simulationProperties.cpw_near]}
                    updateValue={(value: any) => {
                      dispatch(
                        updateSimulationProperties({
                          ...simulationProperties,
                          cpw_near: parseFloat(value),
                        })
                      );
                    }}
                    onFinish={(values) => {
                      saveProperties("cpw_near", values);
                    }}
                  />
                </div>

                <div className="px-5">
                  <h5 className="text-base text-gray-700 font-medium">
                    Far from structure:
                  </h5>
                  <ReactRangeSlider
                    rtl={false}
                    minValue={5}
                    maxValue={100}
                    defualtValue={[simulationProperties.cpw_far]}
                    updateValue={(value: any) => {
                      dispatch(
                        updateSimulationProperties({
                          ...simulationProperties,
                          cpw_far: parseFloat(value),
                        })
                      );
                    }}
                    onFinish={(values) => {
                      saveProperties("cpw_far", values);
                    }}
                  />
                </div>

                <div>
                  <div className="pl-1 text-base text-gray-700 font-semibold underline underline-offset-4 pt-2 mb-1">
                    Smallest cell size
                  </div>
                  <div className="px-5">
                    <h5 className="text-base text-gray-700 font-medium">
                      Upper limit:
                    </h5>
                    <ReactRangeSlider
                      rtl={false}
                      minValue={100}
                      maxValue={90000}
                      defualtValue={[simulationProperties.cpw_min]}
                      updateValue={(value: any) => {
                        dispatch(
                          updateSimulationProperties({
                            ...simulationProperties,
                            cpw_min: parseFloat(value),
                          })
                        );
                      }}
                      onFinish={(values) => {
                        saveProperties("cpw_min", values);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              className={`flex items-center justify-center w-full h-10 rounded-lg enabled:shadow-sm mt-7 ${
                arrayModel.some((dict) =>
                  Object.values(dict).includes("Objects")
                ) &&
                !isGenerateLoading &&
                !isClassifyLoading &&
                !isSimRunning
                  ? "bg-blueLight-600 hover:bg-blueLight-700 active:bg-blueLight-800"
                  : "bg-blue-300"
              }`}
              onClick={handleExport}
              disabled={
                !arrayModel.some((dict) =>
                  Object.values(dict).includes("Objects")
                ) ||
                isGenerateLoading ||
                isClassifyLoading ||
                isSimRunning
              }
            >
              {isGenerateLoading ? (
                <svg
                  aria-hidden="true"
                  className="w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-white inline"
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
              ) : (
                <>
                  <span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                    >
                      <path
                        d="M8.21748 1.725V3.58M13.7825 1.725V3.58M8.21748 18.42V20.275M13.7825 18.42V20.275M18.42 8.2175H20.275M18.42 12.855H20.275M1.72498 8.2175H3.57998M1.72498 12.855H3.57998M8.03198 18.42H13.968C15.5263 18.42 16.3055 18.42 16.9007 18.1167C17.4243 17.85 17.8499 17.4243 18.1167 16.9007C18.42 16.3055 18.42 15.5263 18.42 13.968V8.032C18.42 6.47365 18.42 5.69448 18.1167 5.09927C17.8499 4.57571 17.4243 4.15004 16.9007 3.88327C16.3055 3.58 15.5263 3.58 13.968 3.58H8.03198C6.47363 3.58 5.69446 3.58 5.09925 3.88327C4.57569 4.15004 4.15002 4.57571 3.88325 5.09927C3.57998 5.69448 3.57998 6.47365 3.57998 8.032V13.968C3.57998 15.5263 3.57998 16.3055 3.88325 16.9007C4.15002 17.4243 4.57569 17.85 5.09925 18.1167C5.69446 18.42 6.47363 18.42 8.03198 18.42ZM9.70148 13.7825H12.2985C12.8179 13.7825 13.0776 13.7825 13.2761 13.6814C13.4506 13.5925 13.5925 13.4506 13.6814 13.2761C13.7825 13.0777 13.7825 12.8179 13.7825 12.2985V9.7015C13.7825 9.18205 13.7825 8.92233 13.6814 8.72392C13.5925 8.5494 13.4506 8.40751 13.2761 8.31859C13.0776 8.2175 12.8179 8.2175 12.2985 8.2175H9.70148C9.18203 8.2175 8.9223 8.2175 8.7239 8.31859C8.54938 8.40751 8.40749 8.5494 8.31857 8.72392C8.21748 8.92233 8.21748 9.18205 8.21748 9.7015V12.2985C8.21748 12.8179 8.21748 13.0777 8.31857 13.2761C8.40749 13.4506 8.54938 13.5925 8.7239 13.6814C8.9223 13.7825 9.18203 13.7825 9.70148 13.7825Z"
                        stroke="white"
                        strokeWidth="1.67"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="ml-2 text-white text-sm font-semibold">
                    Generate Mesh
                  </span>
                </>
              )}
            </button>
          </div>
        </li>
      </ul>
      <div className="px-2">
        <div className="px-2 my-4">
          <button
            className={`flex items-center justify-center w-full h-10 rounded-lg enabled:shadow-sm ${
              arrayModel.some((dict) =>
                Object.values(dict).includes("Objects")
              ) &&
              meshDefined &&
              !isClassifyLoading &&
              !isSimRunning
                ? "bg-pink-600 hover:bg-pink-700 active:bg-pink-800"
                : "bg-pink-300"
            }`}
            onClick={startClassification}
            disabled={
              !arrayModel.some((dict) =>
                Object.values(dict).includes("Objects")
              ) ||
              !meshDefined ||
              isClassifyLoading ||
              isSimRunning
            }
          >
            {isClassifyLoading ? (
              <svg
                aria-hidden="true"
                className="w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-white inline"
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
            ) : (
              <>
                <span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="21"
                    height="22"
                    viewBox="0 0 21 22"
                    fill="none"
                  >
                    <path
                      d="M3.54373 20.275V15.6375M3.54373 6.3625V1.725M1.22498 4.04375H5.86248M1.22498 17.9562H5.86248M11.4275 2.6525L9.81903 6.83447C9.55746 7.51454 9.42668 7.85457 9.2233 8.1406C9.04305 8.39409 8.82157 8.61557 8.56807 8.79582C8.28205 8.9992 7.94202 9.12998 7.26194 9.39155L3.07998 11L7.26195 12.6084C7.94202 12.87 8.28205 13.0008 8.56807 13.2042C8.82157 13.3844 9.04305 13.6059 9.2233 13.8594C9.42668 14.1454 9.55746 14.4855 9.81903 15.1655L11.4275 19.3475L13.0359 15.1655C13.2975 14.4855 13.4283 14.1454 13.6317 13.8594C13.8119 13.6059 14.0334 13.3844 14.2869 13.2042C14.5729 13.0008 14.9129 12.87 15.593 12.6084L19.775 11L15.593 9.39155C14.9129 9.12998 14.5729 8.9992 14.2869 8.79582C14.0334 8.61557 13.8119 8.39409 13.6317 8.1406C13.4283 7.85457 13.2975 7.51454 13.0359 6.83447L11.4275 2.6525Z"
                      stroke="white"
                      strokeWidth="1.67"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="ml-2 text-white text-sm font-semibold">
                  AI Quality Classification
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default MeshProperties;
