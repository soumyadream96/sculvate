import Plot from "react-plotly.js";
import { useEffect, useState } from "react";
import { useAppSelector } from "state/hooks";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";

interface SParameterMagnitudeGraphProps {
  magnitudeData: any[];
}

const SParameterMagnitudeGraph = (props: SParameterMagnitudeGraphProps) => {
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const frequencyUnit = simulationProperties.frequencyUnit;
  const { magnitudeData } = props;

  return (
    <Plot
      data={magnitudeData}
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
          title: "Magnitude (dB)",
        },
        title: "S-Parameters (Magnitude)",
        modebar: {
          orientation: "v",
          color: "#B3B8DB",
          activecolor: "#6941C6",
        },
      }}
      config={{
        responsive: true,
        displaylogo: false,
        doubleClick: "reset",
        toImageButtonOptions: {
          filename: "S_Parameters_Mag",
          height: 720,
          width: 1080,
          scale: 4,
        },
      }}
      // style={{
      //   display: "block",
      //   width: "99%",
      //   height: "100%",
      //   border: "red 1px solid",
      // }}
      // className="block w-full"
      // useResizeHandler={true}
    />
  );
};

export default SParameterMagnitudeGraph;
