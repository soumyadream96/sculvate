import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "..";
import Materials from "components/project-components/babylonjs/types/materials";

interface User {
  materials: Materials;
}

const initialState: User = {
  materials: {},
};

const userSlice = createSlice({
  name: "projectInfo",
  initialState,
  reducers: {
    setMaterials(state, action) {
      state.materials = action.payload;
    },
  },
});

export const selectMaterials = (state: RootState) => state.user.materials;
export const { setMaterials } = userSlice.actions;

export default userSlice.reducer;
