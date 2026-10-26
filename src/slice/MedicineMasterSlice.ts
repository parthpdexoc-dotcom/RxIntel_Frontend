import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getMedicineMasterApi,
  saveMedicineMasterApi,
  deleteMedicineMasterApi,
} from "../service/MedicineMasterService";
import {
  normalizeMedicineMaster,
  parseMedicineMasterList,
  type MedicineMasterDto,
} from "../dto/medicineMasterDto";
import { showSuccess, showError } from "../component/atoms/ToastHelper";

// 👉 FETCH
export const fetchMedicineMaster = createAsyncThunk(
  "medicinemaster/fetch",
  async (
    pageParam: { page?: number; pageSize?: number; searchText?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const res = await getMedicineMasterApi(pageParam);
      return res.data;
    } catch (err: any) {
      showError("Error fetching medicine master data");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

// 👉 ADD / UPDATE
export const addMedicineMaster = createAsyncThunk(
  "medicinemaster/add",
  async (data: MedicineMasterDto, { rejectWithValue }) => {
    try {
      const res = await saveMedicineMasterApi(data);
      showSuccess(res.data.message);
      return res.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

// 👉 DELETE
export const deleteMedicineMaster = createAsyncThunk(
  "medicinemaster/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await deleteMedicineMasterApi(id);
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
  list: [] as MedicineMasterDto[],
  loading: false,
  totalRecords: 0,
};

// 👉 SLICE
const medicineMasterSlice = createSlice({
  name: "medicinemaster",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      // FETCH
      .addCase(fetchMedicineMaster.pending, (state) => {
        state.loading = true;
        state.list = [];
      })
      .addCase(fetchMedicineMaster.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload as { data?: unknown; totalRecords?: number };
        state.list = parseMedicineMasterList(payload.data ?? action.payload);
        state.totalRecords = payload.totalRecords ?? state.list.length;
      })
      .addCase(fetchMedicineMaster.rejected, (state) => {
        state.loading = false;
      })

      // ADD / UPDATE
      .addCase(addMedicineMaster.fulfilled, (state, action) => {
        const saved =
          normalizeMedicineMaster(action.payload) ?? (action.payload as MedicineMasterDto);
        const index = state.list.findIndex((item) => item.id === saved.id);

        if (index !== -1) {
          state.list[index] = saved;
        } else {
          state.list.push(saved);
        }
      })

      // DELETE
      .addCase(deleteMedicineMaster.fulfilled, (state, action) => {
        state.list = state.list.filter(
          (item) => item.id !== action.payload
        );
      });
  },
});

export default medicineMasterSlice.reducer;
