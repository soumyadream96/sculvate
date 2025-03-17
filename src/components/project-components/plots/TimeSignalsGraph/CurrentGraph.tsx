import { useEffect, useState } from "react";
import Plot from "react-plotly.js";

interface CurrentGraphProps {
  currentData: any[];
}

const CurrentGraph = (props: CurrentGraphProps) => {
  const { currentData } = props;

  return (
    <Plot
      data={currentData}
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
          title: "Current (&mu;A)",
        },
        title: "Time-Domain Currents",
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
          filename: "Time_Domain_Currents",
          height: 720,
          width: 1080,
          scale: 4,
        },
      }}
    />
  );
};

export default CurrentGraph;
