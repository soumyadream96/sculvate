import { useEffect, useState } from "react";
import Plot from "react-plotly.js";

interface VoltageGraphProps {
  voltageData: any[];
}

const VoltageGraph = (props: VoltageGraphProps) => {
  const { voltageData } = props;

  return (
    <Plot
      data={voltageData}
      layout={{
        uirevision: "true",
        width:
          window.innerWidth > 1200
            ? 0.75 * window.innerWidth
            : 0.98 * window.innerWidth,
        height: 0.75 * window.innerHeight,
        autosize: true,
        xaxis: {
          title: "Time (ns)",
        },
        yaxis: {
          title: "Voltage (&mu;V)",
        },
        title: "Time-Domain Voltages",
        modebar: {
          orientation: "v",
          color: "#B3B8DB",
          activecolor: "#6941C6",
        },
        margin: { r: 115 },
      }}
      config={{
        responsive: true,
        displaylogo: false,
        doubleClick: "reset",
        toImageButtonOptions: {
          filename: "Time_Domain_Voltages",
          height: 720,
          width: 1080,
          scale: 4,
        },
      }}
    />
  );
};

export default VoltageGraph;
