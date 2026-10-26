import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getWholesalerApi,
  saveWholesalerApi,
  deleteWholesalerApi,
} from "../service/WholesalerService";
import type { WholesalerDto } from "../dto/wholesalerDto";
import { showSuccess, showError } from "../component/atoms/ToastHelper";

// 👉 FETCH
export const fetchWholesaler = createAsyncThunk(
  "wholesaler/fetch",
  async (
    pageParam: { page?: number; pageSize?: number; searchText?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const res = await getWholesalerApi(pageParam);
      return res.data; 
    } catch (err: any) {
      showError("Error fetching wholesaler data");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

// 👉 ADD / UPDATE
export const addWholesaler = createAsyncThunk(
  "wholesaler/add",
  async (data: WholesalerDto, { rejectWithValue }) => {
    try {
      const res = await saveWholesalerApi(data);      
      showSuccess(res.data.message);     
      return res.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

// 👉 DELETE
export const deleteWholesaler = createAsyncThunk(
  "wholesaler/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await deleteWholesalerApi(id);      
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
  list: [] as WholesalerDto[],
  loading: false,
  totalRecords: 0,
};

// 👉 SLICE
const wholesalerSlice = createSlice({
  name: "wholesaler",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      // FETCH
      .addCase(fetchWholesaler.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWholesaler.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        const data = payload?.data ?? payload?.Data;
        state.list = Array.isArray(data)
          ? data
          : Array.isArray(payload)
            ? payload
            : [];
        state.totalRecords = payload?.totalRecords ?? payload?.TotalRecords ?? state.list.length;
      })
      .addCase(fetchWholesaler.rejected, (state) => {
        state.loading = false;
      })

      // ADD / UPDATE 
      .addCase(addWholesaler.fulfilled, (state, action) => {
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
      .addCase(deleteWholesaler.fulfilled, (state, action) => {
        state.list = state.list.filter(
          (item) => item.id !== action.payload
        );
      });
  },
});

export default wholesalerSlice.reducer;