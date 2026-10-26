import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getNdcGroupApi,
  saveNdcGroupApi,
  deleteNdcGroupApi,
} from "../service/NDCGroupService";
import { showSuccess, showError } from "../component/atoms/ToastHelper";

// 👉 FETCH
export const fetchNdcGroup = createAsyncThunk(
  "ndcGroup/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await getNdcGroupApi();
      return res.data; 
    } catch (err: any) {
      showError("Error fetching NDC group data");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

// 👉 ADD / UPDATE
export const addNdcGroup = createAsyncThunk(
  "ndcGroup/add",
  async (data: any, { rejectWithValue }) => {
    try {
      const res = await saveNdcGroupApi(data); 
      showSuccess(res.data.message);
      return res.data.data;
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to save NDC group");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

// 👉 DELETE
export const deleteNdcGroup = createAsyncThunk(
  "ndcGroup/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await deleteNdcGroupApi(id);
      showSuccess(res.data.message);
      return id;
    } catch (err: any) {
      showError(err.response?.data?.message || "Delete failed");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

// 👉 INITIAL STATE
const initialState = {
  list: [] as any[],
  loading: false,
};

// 👉 SLICE
const ndcGroupSlice = createSlice({
  name: "ndcGroup",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      // FETCH
      .addCase(fetchNdcGroup.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNdcGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data || action.payload; 
      })
      .addCase(fetchNdcGroup.rejected, (state) => {
        state.loading = false;
      })

      // ADD / UPDATE 
      .addCase(addNdcGroup.fulfilled, (state, action) => {
        const index = state.list.findIndex(
          (item) => item.id === action.payload.id
        );

        if (index !== -1) {
          state.list[index] = action.payload;
        } else {
          state.list.push(action.payload);
        }
      })

      // DELETE
      .addCase(deleteNdcGroup.fulfilled, (state, action) => {
        state.list = state.list.filter(
          (item) => item.id !== action.payload
        );
      });
  },
});

export default ndcGroupSlice.reducer;