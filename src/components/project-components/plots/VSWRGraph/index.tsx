import Plot from "react-plotly.js";
import { useState } from "react";
import { useAppSelector } from "state/hooks";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";

interface VSWRGraphProps {
  data: any;
  visible: boolean;
}

const VSWRGraph = (props: VSWRGraphProps) => {
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const frequencyUnit = simulationProperties.frequencyUnit;
  const { data, visible } = props;

  if (visible) {
    return (
      <Plot
        data={data}
        layout={{
          uirevision: "true",
          width:
            window.innerWidth > 1200
              ? 0.75 * window.innerWidth
              : 0.98 * window.innerWidth,
          height: window.innerHeight * 0.75,
          autosize: true,
          xaxis: {
            title: "Frequency (" + frequencyUnit + ")",
          },
          yaxis: {
            title: "VSWR",
            // autorange: false,
            // range: [0, max],
            // type: "linear",
          },
          title: "Voltage Standing Wave Ratio",
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
            filename: "VSWR",
            height: 720,
            width: 1080,
            scale: 4,
          },
        }}
        className="plot-style"
        useResizeHandler={true}
      />
    );
  } else {
    return null;
  }
};

export default VSWRGraph;
