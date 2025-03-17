import React, { useEffect, useRef, useState } from "react";
import { selectUsername } from "state/reducers/authSlice";
import { useAppSelector } from "state/hooks";
import { Storage } from "aws-amplify";
import { selectProjectInfo } from "state/reducers/projectInfoSlice";

interface RotHFieldGraphProps {
  visible: boolean;
  projectId: any;
  version: string;
  numFields: number;
}

const isCompleted = async (projectInfo: any): Promise<boolean> => {
  const validStatus = ["Completed"];

  return validStatus.some((status) => projectInfo.status.includes(status));
};

const getRotHField = async (
  projectId: string,
  version: string,
  username: any,
  setProgress: any
) => {
  try {
    const result: { [key: string]: any } = await Storage.list(
      `${username}/projects/${projectId}/v1/results/roth_field/`,
      { pageSize: 1000 }
    );
    const list = result.results || [];
    let progressList = new Array(list.length).fill(0);
    const files = await Promise.all(
      list.map(async (item: { key: string }, index: number) => {
        const data = await Storage.get(item.key, {
          download: true,
          cacheControl: "no-cache",
          progressCallback: (progress) => {
            progressList[index] = (progress.loaded / progress.total) * 100;
            setProgress(progressList.reduce((a, b) => a + b, 0) / list.length);
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
    return [];
  }
};

const RotHFieldGraph = (props: RotHFieldGraphProps) => {
  const { visible, projectId, version, numFields } = props;
  const username = useAppSelector(selectUsername);
  const [data, setData] = useState<any[]>([]);
  const [isDataFetching, setIsDataFetching] = useState<boolean>(false);
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
      if (isSimulationComplete && !dataFetched && !isDataFetching) {
        setIsDataFetching(true);
        const fetchedData = await getRotHField(
          projectId,
          version,
          username,
          setProgress
        );
        if (fetchedData.length < numFields) {
          setDataFetched(false);
        } else {
          setData(fetchedData);
          setDataFetched(true);
        }
        setIsDataFetching(false);
      }
    };

    const validStatus = ["Completed"];

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
    numFields,
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
      <iframe
        ref={iframeRef}
        id="vue-app"
        src="/dist_glance/index.htm"
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    );
  } else if (visible && !dataFetched) {
    return (
      <div className="flex flex-col items-center w-full h-full">
        Loading surface current ({progress.toFixed(0)}%)...
      </div>
    );
  }
};

export default RotHFieldGraph;
