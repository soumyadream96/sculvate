import Plot from "react-plotly.js";
import { useState } from "react";
import { useAppSelector } from "state/hooks";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";

interface ImpedanceGraphProps {
  data: any;
}

const ImpedanceChart = (props: ImpedanceGraphProps) => {
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const frequencyUnit = simulationProperties.frequencyUnit;
  const { data } = props;

  let combinedYs: number[] = [];
  for (let i = 0; i < data.length; i++) {
    combinedYs = combinedYs.concat(data[i].y);
  }

  const min = Math.max(Math.min(...combinedYs) * 1.2, -10000);
  const max = Math.min(Math.max(...combinedYs) * 1.2, 10000);

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
          title: "Impedance (\u03A9)",
          autorange: false,
          range: [min, max],
          type: "linear",
        },
        title: "Complex Z-Parameters",
        modebar: {
          orientation: "v",
          color: "#B3B8DB",
          activecolor: "#6941C6",
        },
        margin: { r: 150 },
      }}
      config={{
        responsive: true,
        displaylogo: false,
        doubleClick: "reset",
        toImageButtonOptions: {
          filename: "Impedance",
          height: 720,
          width: 1080,
          scale: 4,
        },
      }}
      className="plot-style"
      useResizeHandler={true}
    />
  );
};

export default ImpedanceChart;
