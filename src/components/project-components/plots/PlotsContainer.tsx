import React, { useEffect, useRef, useState } from "react";

import { useAppSelector, useAppDispatch } from "state/hooks";
import {
  selectGraph,
  updateSelectedGraph,
  setSParametersEnabled,
  setVSWREnabled,
  setImpedanceEnabled,
  setTimeSignalsEnabled,
  setEnergyEnabled,
  setPattern3DEnabled,
  setEFieldEnabled,
  setHFieldEnabled,
  setRotHFieldEnabled,
} from "state/reducers/selectedGraphSlice";
import { Storage } from "aws-amplify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { selectUsername } from "state/reducers/authSlice";
import SParameterGraph from "./SParameterGraph";
import VSWRGraph from "./VSWRGraph";
import ImpedanceGraph from "./ImpedenceGraph";
import TimeSignalsGraph from "./TimeSignalsGraph";
import EnergyGraph from "./EnergyGraph";
import EFieldGraph from "./EFieldGraph";
import HFieldGraph from "./HFieldGraph";
import RotHFieldGraph from "./RotHFieldGraph";
import Pattern3DGraph from "./Pattern3DGraph";
import Pattern2DGraph from "./Pattern2DGraph";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
import { useSelector } from "react-redux";
import { selectProjectInfo } from "state/reducers/projectInfoSlice";

const getResults = async (
  projectId: string,
  version: string,
  username: any
) => {
  try {
    const result: { [key: string]: any } = await Storage.list(
      `${username}/projects/${projectId}/${version}/results/results.json`,
      { pageSize: 1000 }
    );
    if (result.results.length === 0) {
      return {};
    }

    const data = await Storage.get(
      `${username}/projects/${projectId}/${version}/results/results.json`,
      {
        download: true,
        cacheControl: "no-cache",
      }
    );

    if (data.Body) {
      const dataBody: any = data.Body;
      const dataString = await dataBody.text();
      const json = JSON.parse(dataString);
      return json;
    }
  } catch (err: any) {
    if (err.message.includes("The specified key does not exist.")) {
      return {};
    } else {
      throw err;
    }
  }
};

const getImpedance = async (projectId: string, username: any, port: string) => {
  try {
    const data = await Storage.get(
      `${username}/projects/${projectId}/case.json`,
      {
        download: true,
        cacheControl: "no-cache",
      }
    );
    if (data.Body) {
      const dataBody: any = data.Body;
      const dataString = await dataBody.text();
      const jsonData = JSON.parse(dataString);

      let simulationData = jsonData["simulation"];
      if (!simulationData) {
        // If "simulation" is not in the root, query the first key of the JSON
        const firstKey = Object.keys(jsonData)[0];
        simulationData = jsonData[firstKey]["simulation"];
      }

      let impedance;
      try {
        impedance = simulationData["ports"][port]["impedance"];
      } catch (err: any) {
        impedance = 50;
      }
      return impedance;
    }
  } catch (err: any) {
    throw err;
  }
};

interface PlotsContainerProps {
  projectId: string;
  version: string;
}

const PlotsContainer = (props: PlotsContainerProps) => {
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const frequencyUnit = simulationProperties.frequencyUnit;
  const { selectedGraph } = useAppSelector(selectGraph);
  const username = useAppSelector(selectUsername);
  const projectInfo = useSelector(selectProjectInfo).info;
  const results = useRef<any>(undefined);
  const { projectId, version } = props;
  const currentUser = useAppSelector(selectUsername);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [sParameterMagnitudeGraphData, setSParameterMagnitudeGraphData] =
    useState<any>([]);
  const [sParameterPhaseGraphData, setSParameterPhaseGraphData] = useState<any>(
    []
  );
  const [smithGraphData, setSmithGraphData] = useState<any>([]);
  const [vswrGraphData, setvswrGraphData] = useState<any>([]);
  const [impedanceGraphData, setImpedanceGraphData] = useState<any>([]);
  const [voltageGraphData, setVoltageGraphData] = useState<any>([]);
  const [currentGraphData, setCurrentGraphData] = useState<any>([]);
  const [energyGraphData, setEnergyGraphData] = useState<any>([]);

  const [impedanceValues, setImpedanceValues] = useState<any>({});

  const [numPorts, setNumPorts] = useState(1);

  const [farfieldProcessed, setFarfieldProcessed] = useState(false);
  const [eFieldProcessed, setEFieldProcessed] = useState(false);
  const [hFieldProcessed, setHFieldProcessed] = useState(false);
  const [rothFieldProcessed, setRotHFieldProcessed] = useState(false);
  const [simulationFinished, setSimulationFinished] = useState(false);

  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkStatusInterval = setInterval(async () => {
      const validStatus = [
        "Checking discretization",
        "Configuring simulation",
        "Initializing compute",
        "Starting simulation",
      ];
      const statusData = projectInfo;
      if (validStatus.some((status) => statusData.status.includes(status))) {
        dispatch(updateSelectedGraph("s-parameters"));
      }

      if (
        selectedGraph === "2d-pattern" ||
        selectedGraph === "3d-pattern" ||
        selectedGraph === "e-field" ||
        selectedGraph === "h-field" ||
        selectedGraph === "roth-field"
      ) {
        setAutoRefresh(false);
      }

      if (statusData.status?.includes("Starting")) {
        setAutoRefresh(true);
      } else if (
        statusData.status?.includes("Processing farfield") &&
        !farfieldProcessed
      ) {
        setFarfieldProcessed(true);
        setAutoRefresh(true);
      } else if (
        statusData.status?.includes("Processing E-Field") &&
        !eFieldProcessed
      ) {
        setEFieldProcessed(true);
        setAutoRefresh(true);
      } else if (
        statusData.status?.includes("Processing H-Field") &&
        !hFieldProcessed
      ) {
        setHFieldProcessed(true);
        setAutoRefresh(true);
      } else if (
        statusData.status?.includes("Processing current") &&
        !rothFieldProcessed
      ) {
        setRotHFieldProcessed(true);
        setAutoRefresh(true);
      } else if (
        (statusData.status?.includes("Completed") ||
          statusData.status?.includes("Terminated")) &&
        !simulationFinished
      ) {
        setSimulationFinished(true);
        setAutoRefresh(true);
      }
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(checkStatusInterval);
  }, [projectInfo, selectedGraph]);

  const setResults = (data: any) => {
    if (data !== results.current) {
      results.current = data;

      if ("S-Parameters" in results.current) {
        const sparameterKeys = Object.keys(
          results.current["S-Parameters"]
        ).filter((key) => key.startsWith("S"));

        setSParameterMagnitudeGraphData(
          sparameterKeys.map((key) => ({
            x: results.current["S-Parameters"][
              "Frequency (" + frequencyUnit + ")"
            ],
            y: results.current["S-Parameters"][key]["Magnitude (dB)"],
            type: "scatter",
            name: key,
          }))
        );
        setSParameterPhaseGraphData(
          sparameterKeys.map((key) => ({
            x: results.current["S-Parameters"][
              "Frequency (" + frequencyUnit + ")"
            ],
            y: results.current["S-Parameters"][key]["Phase (deg)"],
            type: "scatter",
            name: key,
          }))
        );
        dispatch(setSParametersEnabled(true));
      } else {
        setSParameterMagnitudeGraphData([]);
        setSParameterPhaseGraphData([]);
        dispatch(setSParametersEnabled(false));
      }

      if ("VSWR" in results.current) {
        const vswrKeys = Object.keys(results.current["VSWR"]).filter(
          (key) => !key.startsWith("Frequency")
        );
        setNumPorts(vswrKeys.length);

        setvswrGraphData(
          vswrKeys.map((key) => ({
            x: results.current["VSWR"]["Frequency (" + frequencyUnit + ")"],
            y: results.current["VSWR"][key],
            type: "scatter",
            name: "Port " + key,
          }))
        );
        dispatch(setVSWREnabled(true));
      } else {
        setNumPorts(1);
        setvswrGraphData([]);
        dispatch(setVSWREnabled(false));
      }

      if ("Impedance" in results.current) {
        const impedanceKeys = Object.keys(results.current["Impedance"]).filter(
          (key) => key.startsWith("Z")
        );

        const data_re = impedanceKeys.map((key) => ({
          x: results.current["Impedance"]["Frequency (" + frequencyUnit + ")"],
          y: results.current["Impedance"][key]["Resistance (Ohm)"],
          type: "scatter",
          name: key + " (Re)",
        }));

        const data_im = impedanceKeys.map((key) => ({
          x: results.current["Impedance"]["Frequency (" + frequencyUnit + ")"],
          y: results.current["Impedance"][key]["Reactance (Ohm)"],
          type: "scatter",
          name: key + " (Im)",
        }));

        setImpedanceGraphData(data_re.concat(data_im));
        dispatch(setImpedanceEnabled(true));
      } else {
        setImpedanceGraphData([]);
        dispatch(setImpedanceEnabled(false));
      }

      if ("Time signals" in results.current) {
        const voltageKeys = Object.keys(
          results.current["Time signals"]["Voltage (uV)"]
        );
        setVoltageGraphData(
          voltageKeys.map((key) => ({
            x: results.current["Time signals"]["Time (ns)"] || [],
            y: results.current["Time signals"]["Voltage (uV)"][key] || [],
            type: "scatter",
            name: key,
          }))
        );
        setCurrentGraphData(
          voltageKeys.map((key) => ({
            x: results.current["Time signals"]["Time (ns)"] || [],
            y: results.current["Time signals"]["Current (uA)"][key] || [],
            type: "scatter",
            name: key,
          }))
        );
        dispatch(setTimeSignalsEnabled(true));
      } else {
        setVoltageGraphData([]);
        setCurrentGraphData([]);
        dispatch(setTimeSignalsEnabled(false));
      }

      if ("Energy" in results.current) {
        const energyKeys = Object.keys(results.current["Energy"]).filter(
          (key) => !key.startsWith("Time (ns)")
        );

        setEnergyGraphData(
          energyKeys.map((key) => ({
            x: results.current["Energy"]["Time (ns)"],
            y: results.current["Energy"][key],
            type: "scatter",
            name: "Port " + key,
          }))
        );
        dispatch(setEnergyEnabled(true));
      } else {
        setEnergyGraphData([]);
        dispatch(setEnergyEnabled(false));
      }
    }
  };

  const Pattern3DExists = async (
    projectId: string,
    version: string,
    username: any
  ) => {
    let btnPattern3D = false;

    const validStatus = [
      "Processing E-Field",
      "Processing H-Field",
      "Processing current",
      "Completed",
      "Terminated",
    ];

    if (validStatus.some((status) => projectInfo.status.includes(status))) {
      btnPattern3D = true;
    }

    try {
      const result: { [key: string]: any } = await Storage.list(
        `${username}/projects/${projectId}/${version}/results/farfield/`,
        { pageSize: 1000 }
      );
      dispatch(
        setPattern3DEnabled(
          btnPattern3D &&
            result.results.length >=
              32 * simulationProperties.farfield.length * numPorts + 1
        )
      );
    } catch (err) {
      console.log(err);
    }
  };

  const EFieldExists = async (
    projectId: string,
    version: string,
    username: any
  ) => {
    let btnEField = false;

    const validStatus = [
      "Processing H-Field",
      "Processing current",
      "Completed",
      "Terminated",
    ];

    if (validStatus.some((status) => projectInfo.status.includes(status))) {
      btnEField = true;
    }

    try {
      const result: { [key: string]: any } = await Storage.list(
        `${username}/projects/${projectId}/${version}/results/e_field/`,
        { pageSize: 1000 }
      );
      dispatch(
        setEFieldEnabled(
          btnEField &&
            result.results.length >=
              Math.max(simulationProperties.e_field.length * numPorts, 1)
        )
      );
    } catch (err) {
      console.log(err);
    }
  };

  const HFieldExists = async (
    projectId: string,
    version: string,
    username: any
  ) => {
    let btnHField = false;

    const validStatus = ["Processing current", "Completed", "Terminated"];

    if (validStatus.some((status) => projectInfo.status.includes(status))) {
      btnHField = true;
    }

    try {
      const result: { [key: string]: any } = await Storage.list(
        `${username}/projects/${projectId}/${version}/results/h_field/`,
        { pageSize: 1000 }
      );
      dispatch(
        setHFieldEnabled(
          btnHField &&
            result.results.length >=
              Math.max(simulationProperties.h_field.length * numPorts, 1)
        )
      );
    } catch (err) {
      console.log(err);
    }
  };

  const RotHFieldExists = async (
    projectId: string,
    version: string,
    username: any
  ) => {
    let btnRotHField = false;

    const validStatus = ["Completed"];

    if (validStatus.some((status) => projectInfo.status.includes(status))) {
      btnRotHField = true;
    }

    try {
      const result: { [key: string]: any } = await Storage.list(
        `${username}/projects/${projectId}/${version}/results/roth_field/`,
        { pageSize: 1000 }
      );
      dispatch(
        setRotHFieldEnabled(
          btnRotHField &&
            result.results.length >=
              Math.max(simulationProperties.roth_field.length * numPorts, 1)
        )
      );
    } catch (err) {
      console.log(err);
    }
  };

  useQuery({
    queryKey: ["plotData", projectId, version, currentUser],
    queryFn: async () => {
      let data: any = {};
      let impedance: any = {};
      if (
        projectId &&
        projectId !== null &&
        projectId !== "" &&
        version !== null &&
        version !== ""
      ) {
        data = await getResults(projectId, "v1", currentUser);

        if ("S-Parameters" in data) {
          const sParameterKeys = Object.keys(data["S-Parameters"]).filter(
            (key) => key.startsWith("S")
          );

          await Pattern3DExists(projectId, "v1", currentUser);
          await EFieldExists(projectId, "v1", currentUser);
          await HFieldExists(projectId, "v1", currentUser);
          await RotHFieldExists(projectId, "v1", currentUser);

          impedance = await Promise.all(
            sParameterKeys.map(async (key) => {
              const port = key.match(/S(\d+),/)![1];
              const value = await getImpedance(projectId, currentUser, port);
              return { port, value };
            })
          ).then((result) => {
            return result.reduce((acc: Record<string, number>, curr) => {
              acc[curr.port] = curr.value;
              return acc;
            }, {} as Record<string, number>);
          });
        }
      } else {
        data = {};
        impedance = {};
      }

      return { data, impedance };
    },
    onSuccess: ({ data, impedance }) => {
      setImpedanceValues(impedance);
      setResults(data);

      if ("S-Parameters" in data) {
        const sParameterKeys = Object.keys(data["S-Parameters"]).filter((key) =>
          key.startsWith("S")
        );

        const sParameterKeysSmith = sParameterKeys.filter((key) => {
          let parts = key.split(",");
          let o = parts[0].substring(1);
          let i = parts[1].split(" ")[0]; // Split at the first space instead of "+"
          i = i.split("+")[0]; // Continue to split by "+" if present
          return o === i || parts[1].includes("+");
        });

        const getSmithGraphData = () => {
          return sParameterKeysSmith.map((key) => {
            const impedanceValue = impedance[key.match(/S(\d+),/)![1]];

            const sParameterMagnitudeLinear = data["S-Parameters"][key][
              "Magnitude (dB)"
            ].map((val: number) => Math.pow(10, val / 20));
            const sParameterPhaseRad = data["S-Parameters"][key][
              "Phase (deg)"
            ].map((val: number) => val * (Math.PI / 180));

            const sParameterReal = sParameterMagnitudeLinear.map(
              (val: number, index: number) =>
                val * Math.cos(sParameterPhaseRad[index])
            );
            const sParameterImag = sParameterMagnitudeLinear.map(
              (val: number, index: number) =>
                val * Math.sin(sParameterPhaseRad[index])
            );

            const zReal = sParameterReal.map(
              (val: number, index: number) =>
                (1 - Math.pow(val, 2) - Math.pow(sParameterImag[index], 2)) /
                (Math.pow(1 - val, 2) + Math.pow(sParameterImag[index], 2))
            );
            const zImag = sParameterImag.map(
              (val: number, index: number) =>
                (2 * val) /
                (Math.pow(1 - sParameterReal[index], 2) + Math.pow(val, 2))
            );

            return {
              real: zReal,
              imag: zImag,
              type: "scattersmith",
              name: key + " (" + impedanceValue + " Ω)",
              hovertemplate:
                `<b>Frequency: %{text} ` +
                frequencyUnit +
                `</b><br>` +
                `Re: %{real:.3f} (%{customdata[0]:.3f} Ω)<br>` +
                `Im: %{imag:.3f} (%{customdata[1]:.3f} Ω)`,
              text: data["S-Parameters"]["Frequency (" + frequencyUnit + ")"],
              customdata: zReal.map(function (num: number, idx: number) {
                return [num * impedanceValue, zImag[idx] * impedanceValue];
              }),
            };
          });
        };
        setSmithGraphData(getSmithGraphData());
      } else {
        setSmithGraphData([{ type: "scattersmith" }]);
      }
    },
    onError: (err) => {
      console.log(err);
    },
    refetchOnWindowFocus: false,
    refetchInterval: 1000, //autoRefresh ? 1000 : false,
  });

  return (
    <>
      {/* {selectedGraph !== "2d-pattern" &&
        selectedGraph !== "3d-pattern" &&
        selectedGraph !== "e-field" &&
        selectedGraph !== "h-field" &&
        selectedGraph !== "roth-field" && (
          <div className="flex items-center">
            <label htmlFor="autoupdate" className="mx-2 ml-4">
              Auto-update results
            </label>
            <div
              className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in cursor-pointer"
              onClick={() => {
                setAutoRefresh(!autoRefresh);
              }}
            >
              <input
                type="checkbox"
                name="autoupdate"
                id="autoupdate"
                className={`z-10 absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer focus:outline-none ${
                  autoRefresh ? "right-0" : "right-6"
                } transition duration-200 ease-in`}
              />
              <span
                className={`block h-6 w-12 bg-gray-300 rounded-full transition duration-200 ${
                  autoRefresh ? "bg-primary-500" : ""
                }`}
              ></span>
            </div>
          </div>
        )} */}

      <div className="flex flex-col w-full h-full">
        <SParameterGraph
          magnitudeData={sParameterMagnitudeGraphData}
          phaseData={sParameterPhaseGraphData}
          smithData={smithGraphData}
          visible={selectedGraph === "s-parameters"}
        />
        <VSWRGraph data={vswrGraphData} visible={selectedGraph === "vswr"} />
        <ImpedanceGraph
          impedanceData={impedanceGraphData}
          visible={selectedGraph === "impedance"}
        />
        <TimeSignalsGraph
          voltageData={voltageGraphData}
          currentData={currentGraphData}
          visible={selectedGraph === "time-signals"}
        />
        <EnergyGraph
          data={energyGraphData}
          visible={selectedGraph === "energy"}
        />
        <EFieldGraph
          projectId={projectId}
          version={version}
          visible={selectedGraph === "e-field"}
          numFields={Math.max(
            simulationProperties.e_field.length * numPorts,
            1
          )}
        />
        <HFieldGraph
          projectId={projectId}
          version={version}
          visible={selectedGraph === "h-field"}
          numFields={Math.max(
            simulationProperties.h_field.length * numPorts,
            1
          )}
        />
        <RotHFieldGraph
          projectId={projectId}
          version={version}
          visible={selectedGraph === "roth-field"}
          numFields={Math.max(
            simulationProperties.roth_field.length * numPorts,
            1
          )}
        />
        <Pattern3DGraph
          projectId={projectId}
          version={version}
          visible={selectedGraph === "3d-pattern"}
          numFields={simulationProperties.farfield.length * numPorts + 1}
        />
        <Pattern2DGraph
          projectId={projectId}
          version={version}
          visible={selectedGraph === "2d-pattern"}
          numFields={Math.max(
            2 * simulationProperties.farfield.length * numPorts,
            1
          )}
        />
      </div>
    </>
  );
};

export default PlotsContainer;
