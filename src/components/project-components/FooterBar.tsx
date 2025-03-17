import { useAppSelector } from "state/hooks";
import { selectGeneratedMesh } from "state/reducers/generatedMeshSlice";
import { selectClassifiedMesh } from "state/reducers/classifiedMeshSlice";
import "./FooterBar.css";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectProjectInfo } from "state/reducers/projectInfoSlice";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";

export default function FooterBar() {
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const projectInfo = useSelector(selectProjectInfo).info;
  const generatedMesh = useAppSelector(selectGeneratedMesh);
  const classifiedMesh = useAppSelector(selectClassifiedMesh);

  const formatNumberWithCommas = (number: number) => {
    return number.toLocaleString();
  };

  function estimateTimestep(generatedMesh: {
    x: number[];
    y: number[];
    z: number[];
  }) {
    const dimensionsUnit = simulationProperties.dimensionsUnit;
    const dimensionsMapping: { [unit: string]: number } = {
      m: 1,
      cm: 1e-2,
      mm: 1e-3,
      um: 1e-6,
      nm: 1e-9,
    };
    const dimensionsMultiplier = dimensionsMapping[dimensionsUnit];

    const c = 299792458; // m/s

    let deltaX =
      dimensionsMultiplier *
      Math.min(...adjacentDifferences(generatedMesh.x.map((x) => x)));
    let deltaY =
      dimensionsMultiplier *
      Math.min(...adjacentDifferences(generatedMesh.y.map((y) => y)));
    let deltaZ =
      dimensionsMultiplier *
      Math.min(...adjacentDifferences(generatedMesh.z.map((z) => z)));

    let deltaT =
      1 / (c * Math.sqrt(1 / deltaX ** 2 + 1 / deltaY ** 2 + 1 / deltaZ ** 2));

    let timestep = `${Number(deltaT.toExponential().split("e")[0]).toFixed(
      2
    )}e${deltaT.toExponential().split("e")[1]} sec`;
    return timestep;
  }

  function adjacentDifferences(arr: number[]) {
    let differences = [];
    for (let i = 1; i < arr.length; i++) {
      differences.push(Math.abs(arr[i] - arr[i - 1]));
    }
    return differences;
  }

  useEffect(() => {
    if (projectInfo?.status.includes("discretization")) {
      if (classifiedMesh?.classification.includes("require")) {
        toast.error(
          <div
            dangerouslySetInnerHTML={{ __html: classifiedMesh.classification }}
          />,
          {
            toastId: "error",
            autoClose: 10000,
          }
        );
      } else if (classifiedMesh?.classification.includes("Converged")) {
        toast.success(
          <div
            dangerouslySetInnerHTML={{ __html: classifiedMesh.classification }}
          />,
          {
            toastId: "success",
          }
        );
      } else {
        toast.dismiss();
      }
    }
  }, [classifiedMesh]);

  return (
    <div className="footer-bar MuiBox-root css-38zrbw flex justify-between items-center px-4 mt-1.5 pb-1 cursor-auto">
      <div>
        {generatedMesh ? (
          <p className="font-medium">
            Mesh size:{" "}
            <span className="font-normal">
              {formatNumberWithCommas(generatedMesh?.x.length)} ×{" "}
              {formatNumberWithCommas(generatedMesh?.y.length)} ×{" "}
              {formatNumberWithCommas(generatedMesh?.z.length)} ={" "}
              {formatNumberWithCommas(
                generatedMesh?.x.length *
                  generatedMesh?.y.length *
                  generatedMesh?.z.length
              )}
              {" cells"}
            </span>
          </p>
        ) : (
          <p className="font-medium">
            Mesh size: <span className="font-normal">-</span>
          </p>
        )}
      </div>
      <div className="mx-2 border-r border-gray-300 cursor-default">&nbsp;</div>
      <div>
        <p className="font-medium">
          Estimated timestep:{" "}
          <span className="font-normal">
            {generatedMesh ? estimateTimestep(generatedMesh) : "-"}
          </span>
        </p>
      </div>
      <div className="mx-2 border-r border-gray-300 cursor-default">&nbsp;</div>
      <div>
        {classifiedMesh?.classification.includes("require") ? (
          <p className="font-medium">
            AI quality classification:{" "}
            <span className="font-normal text-error-700">
              Mesh refinement recommended
            </span>
          </p>
        ) : classifiedMesh?.classification.includes("Converged") ? (
          <p className="font-medium">
            AI quality classification:{" "}
            <span className="font-normal text-success-700">
              {classifiedMesh.classification}
            </span>
          </p>
        ) : classifiedMesh?.classification &&
          classifiedMesh?.classification !== "-" ? (
          <p className="font-medium">
            AI quality classification:{" "}
            <span
              className="font-normal text-warning-600"
              dangerouslySetInnerHTML={{
                __html: classifiedMesh.classification,
              }}
            />
          </p>
        ) : (
          <p className="font-medium">
            AI quality classification:{" "}
            <span className="font-normal text-black">-</span>
          </p>
        )}
      </div>
    </div>
  );
}
