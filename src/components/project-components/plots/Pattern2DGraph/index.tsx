import React, { useEffect, useRef, useState } from "react";
import { selectUsername } from "state/reducers/authSlice";
import { useAppSelector } from "state/hooks";
import { Storage } from "aws-amplify";
import Plot from "react-plotly.js";
import { selectProjectInfo } from "state/reducers/projectInfoSlice";

interface Pattern2DGraphProps {
  visible: boolean;
  projectId: any;
  version: string;
  numFields: number;
}

const isCompleted = async (projectInfo: any): Promise<boolean> => {
  const validStatus = [
    "Processing E-Field",
    "Processing H-Field",
    "Processing current",
    "Completed",
    "Terminated",
  ];

  return validStatus.some((status) => projectInfo.status.includes(status));
};

const getPattern2D = async (
  projectId: string,
  version: string,
  username: any,
  patternType: string,
  polarization: string,
  linearScaling: boolean,
  setProgress: any
) => {
  try {
    if (patternType.includes("Gain") || patternType.includes("Directivity")) {
      if (linearScaling) {
        patternType = patternType + "_" + polarization + "_linear";
      } else {
        patternType = patternType + "_" + polarization + "_dBi";
      }
    } else {
      if (linearScaling) {
        patternType = patternType + "_linear";
      } else {
        patternType = patternType + "_dB";
      }
    }
    patternType = "Farfield " + patternType;

    const result: { [key: string]: any } = await Storage.list(
      `${username}/projects/${projectId}/v1/results/cuts_2d/`,
      { pageSize: 1000 }
    );
    const list = result.results || [];

    const filteredList = list.filter((item: { key: string }) =>
      item.key.includes(patternType)
    );

    const jsons = await filteredList.reduce(
      async (accPromise: Promise<any>, item: { key: string }) => {
        const acc = await accPromise;
        const data = await Storage.get(item.key, {
          download: true,
          cacheControl: "no-cache",
        });

        if (data.Body) {
          const dataBody: any = data.Body;
          const dataString = await dataBody.text();
          const json = JSON.parse(dataString);

          // Extract the file name
          const fileName = item.key.split("/").pop()?.slice(0, -5); // -5 to remove '.json'

          // Use the file name as the key in the accumulator
          acc[fileName!] = json;
        }
        return acc;
      },
      Promise.resolve({})
    );

    return jsons;
  } catch (err) {
    console.error(err);
    return {};
  }
};

const Pattern2DGraph = (props: Pattern2DGraphProps) => {
  const { visible, projectId, version, numFields } = props;
  const username = useAppSelector(selectUsername);
  const [patternType, setPatternType] = useState("Gain");
  const [polarization, setPolarization] = useState("abs");
  const [linearScaling, setLinearScaling] = useState<boolean>(false);
  const [data, setData] = useState<any[]>([]);
  const [dataFetched, setDataFetched] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // New loading state
  const [progress, setProgress] = useState<number>(0);
  const [isSimulationComplete, setIsSimulationComplete] =
    useState<boolean>(true);
  const [plotLayout, setPlotLayout] = useState<any>({});
  const projectInfo = useAppSelector(selectProjectInfo).info;

  useEffect(() => {
    if (data.length === 0) {
      setDataFetched(false);
    }
    // Update layout configuration when data changes
    if (data.length > 0) {
      const updatedLayouts = data.map((plotDataGroup) => ({
        uirevision: "true",
        autosize: true,
        title: plotDataGroup[0]?.cutType, // Set title from the first element of each plotDataGroup
        polar: {
          radialaxis: {
            autorange: true, // Ensure the axis ranges update with the data
          },
          angularaxis: {
            rotation: 90,
            direction: "counterclockwise",
          },
        },
        showlegend: true,
      }));

      setPlotLayout(updatedLayouts);
    }
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      if (isSimulationComplete && !dataFetched) {
        setIsLoading(true);
        const fetchedData = await getPattern2D(
          projectId,
          version,
          username,
          patternType,
          polarization,
          linearScaling,
          setProgress
        );

        if (Object.keys(fetchedData).length < numFields) {
          setDataFetched(false);
        } else {
          const plotlyData: any[][] = [];

          for (let cutType in fetchedData) {
            const plotTraces = [];
            const cuts = fetchedData[cutType];
            let angleSymbol = cutType.includes("Phi") ? "<i>φ</i>" : "<i>θ</i>";
            let unit;
            if (cutType.includes("dBi")) {
              unit = "dBi";
            } else if (cutType.includes("linear")) {
              unit = "";
            } else {
              unit = "dB";
            }

            for (let angle in cuts) {
              plotTraces.push({
                type: "scatterpolar",
                mode: "lines",
                name: `${cutType
                  .split(" ")[3]
                  .replace("Phi", "<i>θ</i>")
                  .replace("Theta", "<i>φ</i>")}=${angle}°`,
                cutType: `${cutType
                  .replace("_" + polarization, "")
                  .replace("_linear", "")
                  .replace("_dBi", "")
                  .replace("_dB", "")
                  .replace("Farfield ", "")
                  .replace("RealizedGain", "Realized Gain")
                  .replace("Axial_ratio", "Axial Ratio")}`,
                r: cuts[angle],
                theta: Array.from({ length: 720 }, (_, i) => i * 0.5),
                hovertemplate: `${angleSymbol}<i>:</i> %{theta}<br>${cutType
                  .split(" ")[1]
                  .replace("Axial_ratio", "AxialRatio")
                  .split("_")[0]
                  .replace("RealizedGain", "Realized Gain")
                  .replace(
                    "AxialRatio",
                    "Axial Ratio"
                  )}: %{r:.3f} ${unit}<extra></extra>`,
              });
            }
            plotlyData.push(plotTraces);
          }

          setData(plotlyData);
          setDataFetched(true);
          setIsLoading(false);
        }
      }
    };

    const validStatus = [
      "Processing E-Field",
      "Processing H-Field",
      "Processing current",
      "Completed",
      "Terminated",
    ];

    if (!validStatus.some((status) => projectInfo.status.includes(status))) {
      setData([]);
    }

    fetchData();
  }, [
    isSimulationComplete,
    projectId,
    version,
    username,
    dataFetched,
    projectInfo.status,
  ]);

  if (visible) {
    return (
      <div>
        <div className="footer-bar MuiBox-root css-38zrbw flex justify-between items-center px-8 pb-2 accent-primary-600">
          <div />
          <div />
          <div />
          <div>
            <span className="font-medium mr-4">Pattern type:</span>
            <label>
              <input
                type="radio"
                name="Gain"
                value="Gain"
                checked={patternType === "Gain"}
                onChange={() => {
                  setPatternType("Gain");
                  setDataFetched(false);
                }}
                style={{
                  backgroundColor: patternType === "Gain" ? "#6D28D9" : "",
                  borderColor: "#6D28D9",
                }}
                className="mr-2"
              />
              Gain
            </label>
          </div>
          <label>
            <input
              type="radio"
              name="RealizedGain"
              value="RealizedGain"
              checked={patternType === "RealizedGain"}
              onChange={() => {
                setPatternType("RealizedGain");
                setDataFetched(false);
              }}
              style={{
                backgroundColor:
                  patternType === "RealizedGain" ? "#6D28D9" : "",
                borderColor: "#6D28D9",
              }}
              className="mr-2"
            />
            Realized Gain
          </label>
          <div>
            <label>
              <input
                type="radio"
                name="Directivity"
                value="Directivity"
                checked={patternType === "Directivity"}
                onChange={() => {
                  setPatternType("Directivity");
                  setDataFetched(false);
                }}
                style={{
                  backgroundColor:
                    patternType === "Directivity" ? "#6D28D9" : "",
                  borderColor: "#6D28D9",
                }}
                className="mr-2"
              />
              Directivity
            </label>
          </div>
          <label>
            <input
              type="radio"
              name="Axial_ratio"
              value="Axial_ratio"
              checked={patternType === "Axial_ratio"}
              onChange={() => {
                setPatternType("Axial_ratio");
                setDataFetched(false);
              }}
              style={{
                backgroundColor: patternType === "Axial_ratio" ? "#6D28D9" : "",
                borderColor: "#6D28D9",
              }}
              className="mr-2"
            />
            Axial Ratio
          </label>
          <div />
          <div className="mx-2 border-r border-gray-300 cursor-default">
            &nbsp;
          </div>
          <div />
          <span className="font-medium">Polarization:</span>
          <div className="rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
            <select
              name="polarization"
              id="polarization"
              value={
                patternType === "Axial_ratio" ? "placeholder" : polarization
              }
              disabled={patternType === "Axial_ratio"}
              onChange={(e) => {
                setPolarization(e.target.value);
                setDataFetched(false);
              }}
              className="block flex-1 border-0 bg-transparent py-2 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
            >
              {patternType === "Axial_ratio" && (
                <option value="placeholder" hidden>
                  N/A
                </option>
              )}
              <option value="abs">Abs (total)</option>
              <option value="theta">Theta</option>
              <option value="phi">Phi</option>
              <option value="lhcp">LHCP</option>
              <option value="rhcp">RHCP</option>
            </select>
          </div>
          <div />
          <div className="mx-2 border-r border-gray-300 cursor-default">
            &nbsp;
          </div>
          <div />
          <label>
            <span className="font-medium">Linear scaling:</span>
            <input
              type="checkbox"
              name="linearScalingCheckbox"
              onChange={() => {
                setLinearScaling(!linearScaling);
                setDataFetched(false);
              }}
              id="linearScalingCheckbox"
              autoComplete="off"
              className="ml-2.5"
              checked={linearScaling}
            />
          </label>
          <div />
          <div />
        </div>
        {isLoading && <div className="text-center">Processing data...</div>}
        {!isLoading && (
          <div
            className="plotWrapper"
            style={{ display: "flex", flexWrap: "wrap" }}
          >
            {data.map((plotDataGroup, index) => (
              <Plot
                key={index}
                data={plotDataGroup}
                layout={plotLayout[index]}
                config={{
                  displaylogo: false,
                  doubleClick: "reset",
                  toImageButtonOptions: {
                    filename: "Pattern_2D",
                    height: 720,
                    width: 800,
                    scale: 4,
                  },
                }}
                className="plot-style"
                style={{ flex: "0 0 48%" }}
                useResizeHandler={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    return null;
  }
};

export default Pattern2DGraph;
