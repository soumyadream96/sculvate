import { createSlice, original } from "@reduxjs/toolkit";
import { RootState } from "..";
import { Storage } from "aws-amplify";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { useParams } from "react-router-dom";
import { useAppSelector } from "state/hooks";
import { selectUsername } from "state/reducers/authSlice";
import { replaceParameterToValue } from "utilities";
import { v4 as uuid } from "uuid";

const stringMath = require("string-math");
let initialHistories: any[] = [];

const initialState = {
  username: "",
  projectId: "",
  histories: initialHistories,
  saving: false,
};

export const addHistory = createAsyncThunk<
  void,
  { payloadData: any; currentUsername: string; projectId: string }
>(
  "histories/addHistory",
  async ({ payloadData, currentUsername, projectId }, { dispatch }) => {
    // Updating the state
    console.log(payloadData, currentUsername);

    // Finally, upload the updated array back to S3
    const data = await Storage.get(
      `${currentUsername}/projects/${projectId}/history.json`,
      {
        download: true,
        cacheControl: "no-cache",
      }
    );
    const dataBody = data.Body;
    if (dataBody) {
      const dataString = await dataBody.text();
      const jsonArray:any = JSON.parse(dataString).length != 0 ? JSON.parse(dataString) : {};
      
      let key = Object.keys(payloadData)[0];

      if (key.indexOf("parameter") != -1) {
        if (key.indexOf("edit") != -1) {
          jsonArray.parameters.map((history: any) => {
            if (history.id === payloadData[key].id) {
              Object.assign(history, payloadData[key]);
              return;
            }
          });
          jsonArray.historyList.map((history: any) => {
            let k = Object.keys(history)[0];
            if (k === "translate" || k === "rotate" || k === "scale") {
              if (history[k].factor.indexOf(payloadData[key].id) != -1) {
                let str = history[k].factor;
                str = str.toString().replace(/\s/g, "");
                jsonArray.parameters.map((param: any) => {
                  str = str.replaceAll(param.id.toString(), param.expression.toString());
                });

                let idLeng = history[k].idArray.length;
                let paramVal = stringMath(str);
                if (idLeng < paramVal) {
                  for (let i = 0; i < paramVal-idLeng; i ++)
                    history[k].idArray.push(uuid());
                } else if (idLeng > paramVal) {
                  for (let i = 0; i < idLeng-paramVal; i ++) 
                    history[k].idArray.splice(history[k].idArray.length - 1, 1);
                }
              }
            }
          });
        } else if (key.indexOf("delete") != -1) {
          let index = jsonArray.parameters.findIndex((history: any) => history.id == payloadData[key].id);
          
          jsonArray.historyList.map((history: any) => {
            let historyKey = Object.keys(history)[0];
            let keys2 = Object.keys(history[historyKey]);
            keys2.map((k2: any) => {
              if (k2 != "id" && k2 != "material" && k2 != "name" && typeof(history[historyKey][k2]) == "string") {
                history[historyKey][k2] = replaceParameterToValue(history[historyKey][k2], payloadData[key].id, stringMath(jsonArray.parameters[index].expression)).toString();
              }
            });
          });
          jsonArray.parameters.splice(index, 1);
        }
        else {
          if (jsonArray.parameters == undefined) {jsonArray.parameters = [];}
          jsonArray.parameters.push(payloadData[key]);
        }
      }
      else {
        if (key.indexOf("edit") != -1 || key.indexOf("change_name") != -1) {
          jsonArray.historyList.map((history: any) => {
            if (history[Object.keys(history)[0]].id === payloadData[key].id && Object.keys(history)[0].indexOf("create") != -1) {
              Object.assign(history[Object.keys(history)[0]], payloadData[key]);
              return;
            }
          });
        } else {
          if (jsonArray.historyList == undefined) {jsonArray.historyList = [];}
          jsonArray.historyList.push(payloadData);
        }
      }

      try {
        await Storage.put(
          `${currentUsername}/projects/${projectId}/history.json`,
          JSON.stringify(jsonArray),
          {
            cacheControl: "no-cache",
          }
        );

        await dispatch(historySlice.actions.pushHistory(payloadData));
      } catch (e) {
        console.log("Error saving to history", e);
      }
    }
  }
);

const historySlice = createSlice({
  name: "histories",
  initialState,
  reducers: {
    pushHistory(state, action) {
      state.histories.push(action.payload);
    },
    setHistoryUserName(state, action) {
      state.username = action.payload;
    },
    setHistorySaving(state, action) {
      state.saving = action.payload;
    },
  },
  // Handle async action
  extraReducers: (builder) => {
    builder
      .addCase(addHistory.pending, (state) => {
        state.saving = true;
      })
      .addCase(addHistory.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(addHistory.rejected, (state) => {
        state.saving = false;
        // handle any error if needed
      });
  },
});

export const selectHistories = (state: RootState) => state.histories.histories;

export const { setHistoryUserName, setHistorySaving } = historySlice.actions;

export default historySlice.reducer;
