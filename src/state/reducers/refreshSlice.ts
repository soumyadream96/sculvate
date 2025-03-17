import { createSlice } from "@reduxjs/toolkit";
// import { createSlice, original } from "@reduxjs/toolkit";
import { RootState } from "..";

const initialState = {
    refresh: 0
}
const refreshSlice = createSlice({
    name: "refesh",
    initialState,
    reducers: {
        setRefresh(state, action) {
            state.refresh = action.payload.refresh + 1;
        }
    }
});

export const selectRefresh = (state: RootState) => state.refresh.refresh;

export const {
    setRefresh
} = refreshSlice.actions;
export default refreshSlice.reducer;