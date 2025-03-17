import Plot from "react-plotly.js";
import { useEffect, useState } from "react";
import { useAppSelector } from "state/hooks";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
interface SParameterPhaseGraphProps {
  phaseData: any[];
}

const SParameterPhaseGraph = (props: SParameterPhaseGraphProps) => {
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const frequencyUnit = simulationProperties.frequencyUnit;
  const { phaseData } = props;

  return (
    <Plot
      data={phaseData}
      layout={{
        uirevision: "true",
        width:
          window.innerWidth > 1200
            ? 0.75 * window.innerWidth
            : 0.98 * window.innerWidth,
        height: 0.75 * window.innerHeight,
        autosize: true,
        xaxis: {
          title: "Frequency (" + frequencyUnit + ")",
        },
        yaxis: {
          title: "Phase",
          ticksuffix: "&deg;",
        },
        title: "S-Parameters (Phase)",
        modebar: {
          orientation: "v",
          color: "#B3B8DB",
          activecolor: "#6941C6",
        },
      }}
      // style={{
      //   display: "block",
      //   width: "99%",
      //   height: "100%",
      //   border: "red 1px solid",
      // }}
      // className="block w-full"
      config={{
        responsive: true,
        displaylogo: false,
        doubleClick: "reset",
        toImageButtonOptions: {
          filename: "S_Parameters_Phase",
          height: 720,
          width: 1080,
          scale: 4,
        },
      }}
      // useResizeHandler={true}
    />
  );
};

export default SParameterPhaseGraph;
