import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "..";

let initialState = {
  properties: {
    name: "New project",
    frequencyUnit: "MHz",
    dimensionsUnit: "mm",
    f_min: 0,
    f_max: 0,
    excitation: "sequential",
    pml_n: 8,
    end_criteria: -40,
    xMin: "PML",
    xMax: "PML",
    yMin: "PML",
    yMax: "PML",
    zMin: "PML",
    zMax: "PML",
    padding: "lambda_4",
    farfield: [],
    e_field: [],
    h_field: [],
    roth_field: [],
    cpw_min: 500,
    cpw_far: 20,
    cpw_near: 40,
  },
};

const simulationPropertiesSlice = createSlice({
  name: "simulationProperties",
  initialState: initialState,
  reducers: {
    updateSimulationProperties(state, action) {
      state.properties = {
        ...state.properties,
        ...Object.assign(action.payload),
      };
    },
  },
});

export const selectSimulationProperties = (state: RootState) =>
  state.simulationProperties.properties;

export const { updateSimulationProperties } = simulationPropertiesSlice.actions;

export default simulationPropertiesSlice.reducer;
