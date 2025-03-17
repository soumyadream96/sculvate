import Plot from "react-plotly.js";

interface SmithChartProps {
  smithData: any;
}

const SmithChart = (props: SmithChartProps) => {
  const { smithData } = props;

  return (
    <Plot
      data={smithData}
      layout={{
        uirevision: "true",
        showlegend: true,
        width:
          window.innerWidth > 1200
            ? 0.75 * window.innerWidth
            : 0.98 * window.innerWidth,
        height: window.innerHeight * 0.75,
        autosize: true,
        title: "Smith Chart",
        modebar: {
          orientation: "v",
          color: "#B3B8DB",
          activecolor: "#6941C6",
        },
        margin: {
          t: 60,
          b: 30,
          r: 30,
          l: 150,
        },
      }}
      config={{
        responsive: true,
        displaylogo: false,
        toImageButtonOptions: {
          filename: "Smith_Chart",
          height: 720,
          width: 880,
          scale: 4,
        },
      }}
      className="plot-style"
      useResizeHandler={true}
    />
  );
};

export default SmithChart;
