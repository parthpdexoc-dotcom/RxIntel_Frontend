import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPharmacySoftwareApi,
  savePharmacySoftwareApi,
  deletePharmacySoftwareApi,
} from "../service/PharmacySoftwareService";
import { showSuccess, showError } from "../component/atoms/ToastHelper";
import type {
  PharmacySoftwareDto,
  PharmacySoftwareListParams,
  PharmacySoftwarePagedResponse,
} from "../dto/pharmacySoftwareDto";

interface PharmacySoftwareState {
  list: PharmacySoftwareDto[];
  loading: boolean;
  totalRecords: number;
}

const initialState: PharmacySoftwareState = {
  list: [],
  loading: false,
  totalRecords: 0,
};

export const fetchPharmacySoftware = createAsyncThunk<
  PharmacySoftwarePagedResponse,
  PharmacySoftwareListParams | undefined,
  { rejectValue: unknown }
>("pharmacySoftware/fetch", async (pageParam, { rejectWithValue }) => {
  try {
    const res = await getPharmacySoftwareApi(pageParam);
    return res.data as PharmacySoftwarePagedResponse;
  } catch (err: unknown) {
    showError("Error fetching pharmacy software data");
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

export const addPharmacySoftware = createAsyncThunk<
  PharmacySoftwareDto,
  PharmacySoftwareDto,
  { rejectValue: unknown }
>("pharmacySoftware/add", async (data, { rejectWithValue }) => {
  try {
    const res = await savePharmacySoftwareApi(data);
    showSuccess(res.data.message);
    return res.data.data as PharmacySoftwareDto;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data ?? "Error");
  }
});

export const deletePharmacySoftware = createAsyncThunk<
  string,
  string,
  { rejectValue: unknown }
>("pharmacySoftware/delete", async (id, { rejectWithValue }) => {
  try {
    const res = await deletePharmacySoftwareApi(id);
    showSuccess(res.data.message);
    return id;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    showError(axiosErr.response?.data?.message || "Delete failed");
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

const pharmacySoftwareSlice = createSlice({
  name: "pharmacySoftware",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPharmacySoftware.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPharmacySoftware.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data ?? [];
        state.totalRecords = action.payload.totalRecords ?? state.list.length;
      })
      .addCase(fetchPharmacySoftware.rejected, (state) => {
        state.loading = false;
      })
      .addCase(addPharmacySoftware.fulfilled, (state, action) => {
        const index = state.list.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        } else {
          state.list.push(action.payload);
        }
      })
      .addCase(deletePharmacySoftware.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.id !== action.payload);
      });
  },
});

export default pharmacySoftwareSlice.reducer;
