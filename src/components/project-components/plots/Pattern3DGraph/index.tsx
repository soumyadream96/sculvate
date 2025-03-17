import React, { useEffect, useRef, useState } from "react";
import { selectUsername } from "state/reducers/authSlice";
import { useAppSelector } from "state/hooks";
import { Storage } from "aws-amplify";
import { selectProjectInfo } from "state/reducers/projectInfoSlice";

interface Pattern3DGraphProps {
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

const getPattern3D = async (
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
      `${username}/projects/${projectId}/v1/results/farfield/`,
      { pageSize: 1000 }
    );
    const list = result.results || [];
    let progressList = new Array(list.length).fill(0);

    // Filter the list to only include items where the key includes patternType
    const filteredList = list.filter(
      (item: { key: string }) =>
        item.key.includes(patternType) || item.key.includes("Model")
    );

    const files = await Promise.all(
      filteredList.map(async (item: { key: string }, index: number) => {
        const data = await Storage.get(item.key, {
          download: true,
          cacheControl: "no-cache",
          progressCallback: (progress) => {
            progressList[index] = (progress.loaded / progress.total) * 100;
            setProgress(
              progressList.reduce((a, b) => a + b, 0) / filteredList.length
            );
          },
        });
        const dataBody: any = data.Body;
        var blob = new Blob([dataBody], { type: "" });

        const fileName = item.key.split("/").pop();

        if (!fileName) {
          throw new Error("Filename is undefined");
        }

        var file = new File([blob], fileName, { type: "" });
        return file;
      })
    );
    return files;
  } catch (err) {
    console.error(err);
    return [];
  }
};

const Pattern3DGraph = (props: Pattern3DGraphProps) => {
  const { visible, projectId, version, numFields } = props;
  const username = useAppSelector(selectUsername);
  const [patternType, setPatternType] = useState("Gain");
  const [polarization, setPolarization] = useState("abs");
  const [linearScaling, setLinearScaling] = useState<boolean>(false);
  const [data, setData] = useState<any[]>([]);
  const [dataFetched, setDataFetched] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isSimulationComplete, setIsSimulationComplete] =
    useState<boolean>(true);
  const projectInfo = useAppSelector(selectProjectInfo).info;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // useEffect(() => {
  //   const checkProjectStatus = async () => {
  //     const completed = await isCompleted(projectInfo);
  //     if (isSimulationComplete && !completed) {
  //       setDataFetched(false);
  //     }

  //     setIsSimulationComplete(completed);
  //   };

  //   const poll = setInterval(checkProjectStatus, 3000);

  //   return () => clearInterval(poll);
  // }, [projectId, username, isSimulationComplete, projectInfo]);

  useEffect(() => {
    const fetchData = async () => {
      if (isSimulationComplete && !dataFetched) {
        const fetchedData = await getPattern3D(
          projectId,
          version,
          username,
          patternType,
          polarization,
          linearScaling,
          setProgress
        );
        if (fetchedData.length < numFields) {
          setDataFetched(false);
        } else {
          setData(fetchedData);
          setDataFetched(true);
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

  useEffect(() => {
    const sendIframeMessage = () => {
      if (data.length === 0) {
        setDataFetched(false);
      }
      if (visible && data && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage(data, "*");
      }
    };

    if (iframeRef.current) {
      iframeRef.current.addEventListener("load", sendIframeMessage);
    }

    if (dataFetched) {
      sendIframeMessage();
    }

    return () => {
      if (iframeRef.current) {
        iframeRef.current.removeEventListener("load", sendIframeMessage);
      }
    };
  }, [visible, data, dataFetched]);

  if (visible && dataFetched) {
    return (
      <div className="h-full flex flex-col">
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
        <iframe
          ref={iframeRef}
          id="vue-app"
          src="/dist_glance/index.htm"
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    );
  } else if (visible && !dataFetched) {
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
        <div className="flex flex-col items-center w-full h-full pt-2">
          Loading 3D pattern ({progress.toFixed(0)}%)...
        </div>
      </div>
    );
  }
};

export default Pattern3DGraph;
