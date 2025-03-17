import { Storage } from "aws-amplify";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
import { v4 as uuid } from "uuid";
import Modal from "../../Modal";
import { selectUsername } from "state/reducers/authSlice";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import defaultMaterials from "materials.json";
import Plot from "react-plotly.js";
import MyIcon from "assets/MyIcons";

interface NewProjectModalProps {
  visible: boolean;
  setVisible: (value: boolean) => void;
}

const NewProjectModal = (props: NewProjectModalProps) => {
  const { visible, setVisible } = props;

  const [name, setName] = useState<string>("New project");
  const [frequencyUnit, setFrequencyUnit] = useState("MHz");
  const [dimensionsUnit, setDimensionsUnit] = useState("mm");
  const [excitation, setExcitation] = useState<string>("sequential");
  const [f_min, setFMin] = useState<number>();
  const [f_max, setFMax] = useState<number>();
  const [pml_n] = useState<number>(8);
  const [end_criteria, setEndCriteria] = useState<number>(-40);
  const [xMin, setXMin] = useState("PML");
  const [xMax, setXMax] = useState("PML");
  const [yMin, setYMin] = useState("PML");
  const [yMax, setYMax] = useState("PML");
  const [zMin, setZMin] = useState("PML");
  const [zMax, setZMax] = useState("PML");
  const [padding, setPadding] = useState("lambda_4");
  const [farfield, setFarfield] = useState<Array<number | string>>([]);
  const [e_field, setEField] = useState<Array<number | string>>([]);
  const [h_field, setHField] = useState<Array<number | string>>([]);
  const [roth_field, setRotHField] = useState<Array<number | string>>([]);
  const simulationProperties = useAppSelector(selectSimulationProperties);
  const [projectId, setProjectId] = useState("");
  const [projectDataSaved, setProjectDataSaved] = useState(false);
  const [propertiesDataSaved, setPropertiesDataSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const currentUsername = useAppSelector(selectUsername);
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (projectId !== "" && projectDataSaved && propertiesDataSaved) {
      goToProjectPage(projectId);
    }
  }, [projectId, projectDataSaved, propertiesDataSaved]);

  useEffect(() => {
    if (projectId !== "" && projectDataSaved) {
      const propertiesData = {
        ...simulationProperties,
        name,
        frequencyUnit,
        dimensionsUnit,
        f_min,
        f_max,
        excitation,
        pml_n,
        end_criteria,
        xMin,
        xMax,
        yMin,
        yMax,
        zMin,
        zMax,
        padding,
        farfield,
        e_field,
        h_field,
        roth_field,
      };

      propertiesDataMutation.mutate(propertiesData);
    }
  }, [projectId, projectDataSaved]);

  // const keyDownFunc = (event: any) => {
  // }
  // document.addEventListener("keydown", keyDownFunc);

  document.onkeydown = (event) => {
    if (visible) {
      if (event.key === "Escape") {
        setVisible(false);
      } else if (event.key === "Enter") {
        console.log("new project");
        document.getElementById("element-ok-btn")?.click();
      }
    }
  };
  const frequencyMapping: { [unit: string]: number } = {
    Hz: 1,
    kHz: 1e3,
    MHz: 1e6,
    GHz: 1e9,
    THz: 1e12,
  };

  const frequencyMultiplier = frequencyMapping[frequencyUnit];
  const timesteps = Array(1000)
    .fill(0)
    .map((_, i) =>
      f_min !== undefined && f_max !== undefined && f_max > f_min
        ? (6e9 * i) / (frequencyMultiplier * 999 * (f_max - f_min))
        : 10 * (i / 999)
    );

  const excitationSignal = (tValues: number[]): number[] => {
    if (f_min === undefined || f_max === undefined || f_max <= f_min) {
      return [];
    }

    let f0: number;
    let fc: number;

    if (f_min === 0) {
      f0 = 0;
      fc = frequencyMultiplier * f_max;
    } else {
      f0 = (frequencyMultiplier * (f_min + f_max)) / 2;
      fc = frequencyMultiplier * f_max - f0;
    }

    let resultArray = tValues.map((t: number) => {
      let result =
        Math.cos(2.0 * Math.PI * f0 * (t * 1e-9 - 9.0 / (2.0 * Math.PI * fc))) *
        Math.exp(-1 * Math.pow((2.0 * Math.PI * fc * t * 1e-9) / 3.0 - 3, 2));
      return result;
    });

    if (f_min === 0) {
      resultArray = resultArray.slice(0, -500);
    }

    return resultArray;
  };

  const goToProjectPage = (projectId: string) => {
    setIsLoading(false);
    navigate(`/project/${projectId}`, { replace: true });
  };

  const saveProjectInfo = async (infoData: any) => {
    try {
      const uid = uuid();
      await Storage.put(
        `${currentUsername}/projects/${uid}/info.json`,
        infoData,
        {
          cacheControl: "no-cache",
        }
      );

      // Initialize history.json
      await Storage.put(
        `${currentUsername}/projects/${uid}/history.json`,
        "[]",
        {
          cacheControl: "no-cache",
        }
      );
      setProjectId(uid);
    } catch (e) {
      console.log(e);
    }
  };

  const savePropertiesData = async (propertiesData: any) => {
    await Storage.put(
      `${currentUsername}/projects/${projectId}/v1/properties.json`,
      propertiesData,
      {
        cacheControl: "no-cache",
      }
    );
    await Storage.put(
      `${currentUsername}/projects/${projectId}/v1/results/results.json`,
      {},
      {
        cacheControl: "no-cache",
      }
    );

    const materials = await Storage.list(`${currentUsername}/materials.json`, {
      pageSize: 1000,
    });
    if (materials.results.length === 0) {
      await Storage.put(`${currentUsername}/materials.json`, defaultMaterials, {
        cacheControl: "no-cache",
      });
    }
  };

  const projectInfoMutation = useMutation({
    mutationFn: (infoData: any) => saveProjectInfo(infoData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectData"] });
      setProjectDataSaved(true);
    },
  });

  const propertiesDataMutation = useMutation({
    mutationFn: (propertiesData: any) => savePropertiesData(propertiesData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["simulationPropertiesData"] });
      setPropertiesDataSaved(true);
    },
  });

  const handleSubmit = async (evt: any) => {
    setIsLoading(true);
    const infoData = {
      project_name: name,
      frequency_range: `${f_min} - ${f_max} ${frequencyUnit}`,
      type: "3D simulation",
      status: "Idle",
      percentage: 0,
      latestVersion: "v1",
      createdAt: new Date(),
    };
    projectInfoMutation.mutate(infoData);
  };

  const handleExcitationChange = (e: any) => {
    setExcitation(e.target.value);
  };

  return (
    <Modal
      visible={visible}
      title={""}
      buttons={
        <>
          <button
            type="button"
            id="element-ok-btn"
            className={`relative w-full sm:w-20 h-9 flex items-center justify-center shadow-sm sm:ml-2 my-auto font-medium text-sm rounded-md focus:outline-none text-white ${
              !isLoading &&
              name &&
              f_min !== undefined &&
              f_min >= 0 &&
              f_max &&
              f_max > 0 &&
              f_max > f_min &&
              end_criteria &&
              end_criteria >= -80 &&
              end_criteria <= -10 &&
              farfield.every(
                (value) =>
                  typeof value === "number" &&
                  value > 0 &&
                  value >= f_min &&
                  value <= f_max
              ) &&
              e_field.every(
                (value) =>
                  typeof value === "number" &&
                  value > 0 &&
                  value >= f_min &&
                  value <= f_max
              ) &&
              h_field.every(
                (value) =>
                  typeof value === "number" &&
                  value > 0 &&
                  value >= f_min &&
                  value <= f_max
              ) &&
              roth_field.every(
                (value) =>
                  typeof value === "number" &&
                  value > 0 &&
                  value >= f_min &&
                  value <= f_max
              )
                ? "bg-primary-600 hover:bg-primary-700 active:bg-primary-800 hover:transition duration-150 shadow-lg hover:shadow-primary-600/50"
                : "bg-primary-300"
            }`}
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !name ||
              f_min === undefined ||
              f_min < 0 ||
              !f_max ||
              f_max <= 0 ||
              f_max <= f_min ||
              !end_criteria ||
              end_criteria < -80 ||
              end_criteria > -10 ||
              farfield.some(
                (value) =>
                  value === "" ||
                  (typeof value === "number" &&
                    (value <= 0 || value < f_min || value > f_max))
              ) ||
              e_field.some(
                (value) =>
                  value === "" ||
                  (typeof value === "number" &&
                    (value <= 0 || value < f_min || value > f_max))
              ) ||
              h_field.some(
                (value) =>
                  value === "" ||
                  (typeof value === "number" &&
                    (value <= 0 || value < f_min || value > f_max))
              ) ||
              roth_field.some(
                (value) =>
                  value === "" ||
                  (typeof value === "number" &&
                    (value <= 0 || value < f_min || value > f_max))
              )
            }
          >
            {isLoading ? (
              <svg
                aria-hidden="true"
                className="w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-white"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
            ) : (
              "Create"
            )}
          </button>
          <button
            type="button"
            className="relative h-9 items-center sm:ml-2 my-auto mt-3 inline-flex w-full sm:w-20 justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 active:bg-gray-100 sm:mt-0"
            onClick={() => setVisible(false)}
          >
            Cancel
          </button>
        </>
      }
    >
      <form>
        <div className="grid grid-cols-1 gap-y-4 mx-2">
          {/* Simulation properites*/}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:ml-2 col-span-1">
              <h3 className="font-medium underline text-start">Simulation properties</h3>
              <label className="block text-sm leading-6 text-gray-900 text-start">
                Project name
              </label>
              <div className="mt-1">
                <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-gray-300 disable-drag">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={name}
                    autoComplete="off"
                    className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-2 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                    onChange={(evt) => setName(evt.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="sm:w-20 sm:ml-52">
              <h3 className="font-medium underline text-start">Units</h3>
              <label
                htmlFor="frequencyUnit"
                className="block text-sm leading-6 text-gray-900 text-start"
              >
                Frequency
              </label>
              <div className="mt-1">
                <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
                  <select
                    name="frequencyUnit"
                    id="frequencyUnit"
                    value={frequencyUnit}
                    onChange={(evt) => setFrequencyUnit(evt.target.value)}
                    className="block flex-1 border-0 bg-transparent py-2 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                  >
                    <option value="THz">THz</option>
                    <option value="GHz">GHz</option>
                    <option value="MHz">MHz</option>
                    <option value="kHz">kHz</option>
                    <option value="Hz">Hz</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="sm:w-20 sm:ml-24">
              <h3 className="font-medium">&nbsp;</h3>
              <label
                htmlFor="dimensionsUnit"
                className="block text-sm leading-6 text-gray-900 text-start"
              >
                Dimensions
              </label>

              <div className="mt-1">
                <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
                  <select
                    name="dimensionsUnit"
                    id="dimensionsUnit"
                    value={dimensionsUnit}
                    onChange={(evt) => setDimensionsUnit(evt.target.value)}
                    className="block flex-1 border-0 bg-transparent py-2 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                  >
                    <option value="m">m</option>
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                    <option value="um">μm</option>
                    <option value="nm">nm</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <hr />

          {/* Frequency Range Data*/}
          <div className="ml-2 grid grid-cols-1 sm:grid-cols-3 gap-x-1">
            <h3 className="font-medium underline text-start">
              Frequency range ({frequencyUnit})
            </h3>
            <h3 className="font-medium"></h3>
            <h3 className="font-medium underline hidden sm:!block">
              Excitation type
            </h3>
            <div className="col-span-1">
              <div className="mt-2">
                <div className="flex disable-drag">
                  <label
                    htmlFor="fMin"
                    className="block text-sm leading-6 text-gray-900"
                  >
                    Start
                  </label>
                  <label
                    htmlFor="fMin"
                    className="block text-sm leading-6 text-gray-900 pl-2 ml-24"
                  >
                    Stop
                  </label>
                </div>
              </div>
              <div className="mt-2 w-28">
                <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-gray-300 disable-drag">
                  <input
                    type="number"
                    name="fMin"
                    id="fMin"
                    value={f_min}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    min="0"
                    onChange={(evt) => setFMin(evt.target.valueAsNumber)}
                    autoComplete="off"
                    className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-2 w-28 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                  />
                  <span className="block flex-1 border-0 bg-transparent py-1.5 px-2 w-28 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6">
                    &ndash;
                  </span>
                  <input
                    type="number"
                    name="fMax"
                    id="fMax"
                    value={f_max}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    min="0"
                    onChange={(evt) => setFMax(evt.target.valueAsNumber)}
                    autoComplete="off"
                    className="z-40 flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-gray-300 disable-drag flex-1 border-0 bg-transparent px-1.5 pl-2 w-28 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            </div>
            <div className="col-span-1 mr-24">
              <div className="mt-2 w-28">
                <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-gray-300 disable-drag"></div>
              </div>
            </div>

            <div className="col-span-1 ml-1 mt-2">
              <h3 className="font-medium underline sm:hidden text-start">
                Excitation type
              </h3>
              <div className="accent-primary-600 mt-1 grid grid-cols-1 place-items-start sm:place-self-auto">
                <label>
                  <input
                    type="radio"
                    name="excitation"
                    value="sequential"
                    checked={excitation === "sequential"}
                    onChange={handleExcitationChange}
                    style={{
                      backgroundColor:
                        excitation === "sequential" ? "#6D28D9" : "",
                      borderColor: "#6D28D9",
                    }}
                    className="mr-2 mb-4"
                  />
                  Sequential
                </label>
                <label>
                  <input
                    type="radio"
                    name="excitation"
                    value="simultaneous"
                    checked={excitation === "simultaneous"}
                    onChange={handleExcitationChange}
                    style={{
                      backgroundColor:
                        excitation === "simultaneous" ? "#6D28D9" : "",
                      borderColor: "#6D28D9",
                    }}
                    className="mr-2"
                  />
                  Simultaneous
                </label>
              </div>
            </div>
          </div>

          {/* Graph Excitation signal */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 min-h-[250px] sm:min-h-[150px]">
            <div className="col-span-2 mr-4">
              <label className="ml-2 font-medium underline flex sm:block mb-2 sm:mb-0">
                Excitation signal
              </label>

              <Plot
                data={[
                  {
                    x: timesteps,
                    y: excitationSignal(timesteps),
                    type: "scatter",
                    mode: "lines",
                    marker: { color: "red" },
                    hovertemplate:
                      "<b>Amplitude:</b> %{y:.4f}<br><b>Time:</b> %{x:.3f} ns<extra></extra>",
                  },
                ]}
                layout={{
                  margin: { t: 15, r: 10, l: 52, b: 38 },
                  autosize: true,
                  xaxis: {
                    title: "Time (ns)",
                  },
                  yaxis: {
                    title: "Amplitude",
                    type: "linear",
                  },
                }}
                config={{
                  responsive: true,
                  displaylogo: false,
                  doubleClick: "reset",
                  modeBarButtonsToRemove: [
                    "toImage",
                    "pan2d",
                    "zoomIn2d",
                    "zoomOut2d",
                    "resetScale2d",
                  ],
                }}
                className="plot-style"
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="col-span-1 ml-1 mt-auto sm:mt-0">
              <label htmlFor="endCriteria" className="font-medium underline flex sm:block">
                End criteria
              </label>
              <label
                htmlFor="fMin"
                className="block text-sm leading-6 text-gray-900 text-start"
              >
                Energy (dB)
              </label>
              <div className="sm:w-20 flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-gray-300 disable-drag mt-2 mx-auto sm:mx-0">
                <input
                  type="number"
                  name="endCriteria"
                  id="endCriteria"
                  autoComplete="off"
                  className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-2 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                  value={end_criteria}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  min="-80"
                  max="-10"
                  onChange={(evt) => setEndCriteria(evt.target.valueAsNumber)}
                />
              </div>
            </div>
          </div>

          <hr />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-48 items-start">
            {/* Boundaries */}
            <div className="ml-2 grid grid-cols-1 sm:grid-cols-2 col-span-2 gap-x-2 gap-y-2">
              <h3 className="font-medium underline col-span-full text-start">
                Boundaries
              </h3>

              <div className="z-50 col-span-1">
                <label
                  htmlFor="xMin"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  Xmin
                </label>
                <div className="mt-1 sm:w-36">
                  <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
                    <select
                      name="xMin"
                      id="xMin"
                      value={xMin}
                      onChange={(evt) => setXMin(evt.target.value)}
                      className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                    >
                      <option value="PEC">Electric (PEC)</option>
                      <option value="PMC">Magnetic (PMC)</option>
                      <option value="PML">Open (PML)</option>
                      <option value="MUR">Open (Mur)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="col-span-1 sm:pl-14">
                <label
                  htmlFor="xMax"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  Xmax
                </label>
                <div className="mt-1 sm:w-36">
                  <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
                    <select
                      name="xMax"
                      id="xMax"
                      value={xMax}
                      onChange={(evt) => setXMax(evt.target.value)}
                      className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                    >
                      <option value="PEC">Electric (PEC)</option>
                      <option value="PMC">Magnetic (PMC)</option>
                      <option value="PML">Open (PML)</option>
                      <option value="MUR">Open (Mur)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="z-50 col-span-1">
                <label
                  htmlFor="yMin"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  Ymin
                </label>
                <div className="mt-1 sm:w-36">
                  <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
                    <select
                      name="yMin"
                      id="yMin"
                      value={yMin}
                      onChange={(evt) => setYMin(evt.target.value)}
                      className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                    >
                      <option value="PEC">Electric (PEC)</option>
                      <option value="PMC">Magnetic (PMC)</option>
                      <option value="PML">Open (PML)</option>
                      <option value="MUR">Open (Mur)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="col-span-1 sm:pl-14">
                <label
                  htmlFor="yMax"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  Ymax
                </label>
                <div className="mt-1 sm:w-36">
                  <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
                    <select
                      name="yMax"
                      id="yMax"
                      value={yMax}
                      onChange={(evt) => setYMax(evt.target.value)}
                      className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                    >
                      <option value="PEC">Electric (PEC)</option>
                      <option value="PMC">Magnetic (PMC)</option>
                      <option value="PML">Open (PML)</option>
                      <option value="MUR">Open (Mur)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="z-50 col-span-1">
                <label
                  htmlFor="zMin"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  Zmin
                </label>
                <div className="mt-1 sm:w-36">
                  <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
                    <select
                      name="zMin"
                      id="zMin"
                      value={zMin}
                      onChange={(evt) => setZMin(evt.target.value)}
                      className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                    >
                      <option value="PEC">Electric (PEC)</option>
                      <option value="PMC">Magnetic (PMC)</option>
                      <option value="PML">Open (PML)</option>
                      <option value="MUR">Open (Mur)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="col-span-1 sm:pl-14">
                <label
                  htmlFor="zMax"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  Zmax
                </label>
                <div className="mt-1 sm:w-36">
                  <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
                    <select
                      name="zMax"
                      id="zMax"
                      value={zMax}
                      onChange={(evt) => setZMax(evt.target.value)}
                      className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                    >
                      <option value="PEC">Electric (PEC)</option>
                      <option value="PMC">Magnetic (PMC)</option>
                      <option value="PML">Open (PML)</option>
                      <option value="MUR">Open (Mur)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-1 sm:w-48">
                <label
                  htmlFor="zMax"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  Padding (open boundaries)
                </label>
                <div className="mt-1 sm:w-36">
                  <div className="flex rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset pr-1 ring-gray-300 disable-drag">
                    <select
                      name="padding"
                      id="padding"
                      value={
                        ![xMin, xMax, yMin, yMax, zMin, zMax].some((v) =>
                          ["PML", "MUR"].includes(v)
                        )
                          ? "no_padding"
                          : padding
                      }
                      disabled={
                        ![xMin, xMax, yMin, yMax, zMin, zMax].some((v) =>
                          ["PML", "MUR"].includes(v)
                        )
                      }
                      onChange={(evt) => setPadding(evt.target.value)}
                      className="block flex-1 border-0 bg-transparent py-1.5 px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                    >
                      <option value="no_padding">No padding</option>
                      <option value="lambda_1">λ</option>
                      <option value="lambda_2">λ/2</option>
                      <option value="lambda_4">λ/4</option>
                      <option value="lambda_8">λ/8</option>
                      <option value="lambda_16">λ/16</option>
                      <option value="lambda_32">λ/32</option>
                      <option value="lambda_64">λ/64</option>
                      <option value="lambda_128">λ/128</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {/* Feild  */}
            <div className="grid grid-cols-1 gap-x-2 gap-y-2 w-64 mr-0 pr-0 mt-8 sm:mt-0 ml-2 sm:ml-0">
              <h3 className="font-medium col-span-full underline text-start">
                Field monitors ({frequencyUnit})
              </h3>

              <div className="">
                <label
                  htmlFor="farField"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  Farfield
                </label>
                {farfield.map((value, index) => (
                  <div className="mt-1" key={index}>
                    <div className="w-36 pb-0.5 flex items-center rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-gray-300 disable-drag">
                      <input
                        type="number"
                        name={`farField_${index}`}
                        id={`farField_${index}`}
                        value={value}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        min="0"
                        onChange={(evt) => {
                          const newValues = [...farfield];
                          newValues[index] = evt.target.valueAsNumber;
                          setFarfield(newValues);
                        }}
                        autoComplete="off"
                        className="ml-1 mt-0.5 w-36 block border-0 bg-transparent px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newValues = [...farfield];
                          newValues.splice(index, 1);
                          setFarfield(newValues);
                        }}
                        className="ml-2 py-1 text-white rounded-md focus:outline-none"
                      >
                        <svg
                          width="18"
                          height="20"
                          viewBox="0 0 18 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12.3333 5V4.33333C12.3333 3.39991 12.3333 2.9332 12.1517 2.57668C11.9919 2.26308 11.7369 2.00811 11.4233 1.84832C11.0668 1.66667 10.6001 1.66667 9.66667 1.66667H8.33333C7.39991 1.66667 6.9332 1.66667 6.57668 1.84832C6.26308 2.00811 6.00811 2.26308 5.84832 2.57668C5.66667 2.9332 5.66667 3.39991 5.66667 4.33333V5M7.33333 9.58333V13.75M10.6667 9.58333V13.75M1.5 5H16.5M14.8333 5V14.3333C14.8333 15.7335 14.8333 16.4335 14.5608 16.9683C14.3212 17.4387 13.9387 17.8212 13.4683 18.0609C12.9335 18.3333 12.2335 18.3333 10.8333 18.3333H7.16667C5.76654 18.3333 5.06647 18.3333 4.53169 18.0609C4.06129 17.8212 3.67883 17.4387 3.43915 16.9683C3.16667 16.4335 3.16667 15.7335 3.16667 14.3333V5"
                            stroke="#D92D20"
                            strokeWidth="1.66667"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFarfield([...farfield, ""])}
                  className="text-gray-700 active:text-gray-900 hover:underline flex items-center px-2 py-2 text-sm font-normal rounded-lg"
                >
                  <MyIcon name="add-item" />
                  <span className="flex-1 ml-2 text-base font-semibold whitespace-nowrap">
                    Add frequency
                  </span>
                </button>
              </div>
              <div className="">
                <label
                  htmlFor="eField"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  E-Field
                </label>
                {e_field.map((value, index) => (
                  <div className="mt-1" key={index}>
                    <div className="w-36 pb-0.5 flex items-center rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-gray-300 disable-drag">
                      <input
                        type="number"
                        name={`eField_${index}`}
                        id={`eField_${index}`}
                        value={value}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        min="0"
                        onChange={(evt) => {
                          const newValues = [...e_field];
                          newValues[index] = evt.target.valueAsNumber;
                          setEField(newValues);
                        }}
                        autoComplete="off"
                        className="ml-1 mt-0.5 w-36 block border-0 bg-transparent px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newValues = [...e_field];
                          newValues.splice(index, 1);
                          setEField(newValues);
                        }}
                        className="ml-2 py-1 text-white rounded-md focus:outline-none"
                      >
                        <svg
                          width="18"
                          height="20"
                          viewBox="0 0 18 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12.3333 5V4.33333C12.3333 3.39991 12.3333 2.9332 12.1517 2.57668C11.9919 2.26308 11.7369 2.00811 11.4233 1.84832C11.0668 1.66667 10.6001 1.66667 9.66667 1.66667H8.33333C7.39991 1.66667 6.9332 1.66667 6.57668 1.84832C6.26308 2.00811 6.00811 2.26308 5.84832 2.57668C5.66667 2.9332 5.66667 3.39991 5.66667 4.33333V5M7.33333 9.58333V13.75M10.6667 9.58333V13.75M1.5 5H16.5M14.8333 5V14.3333C14.8333 15.7335 14.8333 16.4335 14.5608 16.9683C14.3212 17.4387 13.9387 17.8212 13.4683 18.0609C12.9335 18.3333 12.2335 18.3333 10.8333 18.3333H7.16667C5.76654 18.3333 5.06647 18.3333 4.53169 18.0609C4.06129 17.8212 3.67883 17.4387 3.43915 16.9683C3.16667 16.4335 3.16667 15.7335 3.16667 14.3333V5"
                            stroke="#D92D20"
                            strokeWidth="1.66667"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setEField([...e_field, ""])}
                  className="text-gray-700 active:text-gray-900 hover:underline flex items-center px-2 py-2 text-sm font-normal rounded-lg"
                >
                  <MyIcon name="add-item" />
                  <span className="flex-1 ml-2 text-base font-semibold whitespace-nowrap">
                    Add frequency
                  </span>
                </button>
              </div>
              <div className="">
                <label
                  htmlFor="hField"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  H-Field
                </label>
                {h_field.map((value, index) => (
                  <div className="mt-1" key={index}>
                    <div className="w-36 pb-0.5 flex items-center rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-gray-300 disable-drag">
                      <input
                        type="number"
                        name={`hField_${index}`}
                        id={`hField_${index}`}
                        value={value}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        min="0"
                        onChange={(evt) => {
                          const newValues = [...h_field];
                          newValues[index] = evt.target.valueAsNumber;
                          setHField(newValues);
                        }}
                        autoComplete="off"
                        className="ml-1 mt-0.5 w-36 block border-0 bg-transparent px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newValues = [...h_field];
                          newValues.splice(index, 1);
                          setHField(newValues);
                        }}
                        className="ml-2 py-1 text-white rounded-md focus:outline-none"
                      >
                        <svg
                          width="18"
                          height="20"
                          viewBox="0 0 18 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12.3333 5V4.33333C12.3333 3.39991 12.3333 2.9332 12.1517 2.57668C11.9919 2.26308 11.7369 2.00811 11.4233 1.84832C11.0668 1.66667 10.6001 1.66667 9.66667 1.66667H8.33333C7.39991 1.66667 6.9332 1.66667 6.57668 1.84832C6.26308 2.00811 6.00811 2.26308 5.84832 2.57668C5.66667 2.9332 5.66667 3.39991 5.66667 4.33333V5M7.33333 9.58333V13.75M10.6667 9.58333V13.75M1.5 5H16.5M14.8333 5V14.3333C14.8333 15.7335 14.8333 16.4335 14.5608 16.9683C14.3212 17.4387 13.9387 17.8212 13.4683 18.0609C12.9335 18.3333 12.2335 18.3333 10.8333 18.3333H7.16667C5.76654 18.3333 5.06647 18.3333 4.53169 18.0609C4.06129 17.8212 3.67883 17.4387 3.43915 16.9683C3.16667 16.4335 3.16667 15.7335 3.16667 14.3333V5"
                            stroke="#D92D20"
                            strokeWidth="1.66667"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setHField([...h_field, ""])}
                  className="text-gray-700 active:text-gray-900 hover:underline flex items-center px-2 py-2 text-sm font-normal rounded-lg"
                >
                  <MyIcon name="add-item" />
                  <span className="flex-1 ml-2 text-base font-semibold whitespace-nowrap">
                    Add frequency
                  </span>
                </button>
              </div>
              <div className="">
                <label
                  htmlFor="rothField"
                  className="block text-sm font-medium leading-6 text-gray-900 text-start"
                >
                  Surface current
                </label>
                {roth_field.map((value, index) => (
                  <div className="mt-1" key={index}>
                    <div className="w-36 pb-0.5 flex items-center rounded-md shadow-sm sm:max-w-lg ring-1 ring-inset ring-gray-300 disable-drag">
                      <input
                        type="number"
                        name={`rothField_${index}`}
                        id={`rothField_${index}`}
                        value={value}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        min="0"
                        onChange={(evt) => {
                          const newValues = [...roth_field];
                          newValues[index] = evt.target.valueAsNumber;
                          setRotHField(newValues);
                        }}
                        autoComplete="off"
                        className="ml-1 mt-0.5 w-36 block border-0 bg-transparent px-1.5 pl-1 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newValues = [...roth_field];
                          newValues.splice(index, 1);
                          setRotHField(newValues);
                        }}
                        className="ml-2 py-1 text-white rounded-md focus:outline-none"
                      >
                        <svg
                          width="18"
                          height="20"
                          viewBox="0 0 18 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12.3333 5V4.33333C12.3333 3.39991 12.3333 2.9332 12.1517 2.57668C11.9919 2.26308 11.7369 2.00811 11.4233 1.84832C11.0668 1.66667 10.6001 1.66667 9.66667 1.66667H8.33333C7.39991 1.66667 6.9332 1.66667 6.57668 1.84832C6.26308 2.00811 6.00811 2.26308 5.84832 2.57668C5.66667 2.9332 5.66667 3.39991 5.66667 4.33333V5M7.33333 9.58333V13.75M10.6667 9.58333V13.75M1.5 5H16.5M14.8333 5V14.3333C14.8333 15.7335 14.8333 16.4335 14.5608 16.9683C14.3212 17.4387 13.9387 17.8212 13.4683 18.0609C12.9335 18.3333 12.2335 18.3333 10.8333 18.3333H7.16667C5.76654 18.3333 5.06647 18.3333 4.53169 18.0609C4.06129 17.8212 3.67883 17.4387 3.43915 16.9683C3.16667 16.4335 3.16667 15.7335 3.16667 14.3333V5"
                            stroke="#D92D20"
                            strokeWidth="1.66667"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRotHField([...roth_field, ""])}
                  className="text-gray-700 active:text-gray-900 hover:underline flex items-center px-2 py-2 text-sm font-normal rounded-lg"
                >
                  <MyIcon name="add-item" />
                  <span className="flex-1 ml-2 text-base font-semibold whitespace-nowrap">
                    Add frequency
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default NewProjectModal;
