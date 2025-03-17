import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "..";

const initialState = {
  selectedGraph: "s-parameters",
  isSParametersEnabled: true,
  isVSWREnabled: true,
  isImpedanceEnabled: true,
  isTimeSignalsEnabled: true,
  isEnergyEnabled: true,
  isPattern3DEnabled: false,
  isEFieldEnabled: false,
  isHFieldEnabled: false,
  isRotHFieldEnabled: false,
};

const selectedGraphSlice = createSlice({
  name: "selectedGraph",
  initialState,
  reducers: {
    updateSelectedGraph(state, action) {
      const selectedGraphName = action.payload;
      state.selectedGraph = selectedGraphName;
    },
    setSParametersEnabled(state, action) {
      state.isSParametersEnabled = action.payload;
    },
    setVSWREnabled(state, action) {
      state.isVSWREnabled = action.payload;
    },
    setImpedanceEnabled(state, action) {
      state.isImpedanceEnabled = action.payload;
    },
    setTimeSignalsEnabled(state, action) {
      state.isTimeSignalsEnabled = action.payload;
    },
    setEnergyEnabled(state, action) {
      state.isEnergyEnabled = action.payload;
    },
    setPattern3DEnabled(state, action) {
      state.isPattern3DEnabled = action.payload;
    },
    setEFieldEnabled(state, action) {
      state.isEFieldEnabled = action.payload;
    },
    setHFieldEnabled(state, action) {
      state.isHFieldEnabled = action.payload;
    },
    setRotHFieldEnabled(state, action) {
      state.isRotHFieldEnabled = action.payload;
    },
  },
});

export const selectGraph = (state: RootState) => state.selectedGraph;
export const selectIsSParametersEnabled = (state: RootState) =>
  state.selectedGraph.isSParametersEnabled;
export const selectIsVSWREnabled = (state: RootState) =>
  state.selectedGraph.isVSWREnabled;
export const selectIsImpedanceEnabled = (state: RootState) =>
  state.selectedGraph.isImpedanceEnabled;
export const selectIsTimeSignalsEnabled = (state: RootState) =>
  state.selectedGraph.isTimeSignalsEnabled;
export const selectIsEnergyEnabled = (state: RootState) =>
  state.selectedGraph.isEnergyEnabled;
export const selectIsPattern3DEnabled = (state: RootState) =>
  state.selectedGraph.isPattern3DEnabled;
export const selectIsEFieldEnabled = (state: RootState) =>
  state.selectedGraph.isEFieldEnabled;
export const selectIsHFieldEnabled = (state: RootState) =>
  state.selectedGraph.isHFieldEnabled;
export const selectIsRotHFieldEnabled = (state: RootState) =>
  state.selectedGraph.isRotHFieldEnabled;

export const {
  updateSelectedGraph,
  setSParametersEnabled,
  setVSWREnabled,
  setImpedanceEnabled,
  setTimeSignalsEnabled,
  setEnergyEnabled,
  setPattern3DEnabled,
  setEFieldEnabled,
  setHFieldEnabled,
  setRotHFieldEnabled,
} = selectedGraphSlice.actions;

export default selectedGraphSlice.reducer;
