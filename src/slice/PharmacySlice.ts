import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPharmacyApi,
  getPharmacyByIdApi,
  savePharmacyApi,
  deletePharmacyApi,
} from "../service/PharmacyService";
import { showSuccess, showError } from "../component/atoms/ToastHelper";
import type {
  PharmacyDto,
  PharmacyListParams,
  PharmacyPagedResponse,
} from "../dto/pharmacyDto";

interface PharmacyState {
  list: PharmacyDto[];
  loading: boolean;
  totalRecords: number;
}

const initialState: PharmacyState = {
  list: [],
  loading: false,
  totalRecords: 0,
};

export const fetchPharmacy = createAsyncThunk<
  PharmacyPagedResponse,
  PharmacyListParams | undefined,
  { rejectValue: unknown }
>("pharmacy/fetch", async (pageParam, { rejectWithValue }) => {
  try {
    const res = await getPharmacyApi(pageParam);
    return res.data as PharmacyPagedResponse;
  } catch (err: unknown) {
    showError("Error fetching pharmacy data");
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

export const fetchPharmacyById = createAsyncThunk<
  PharmacyDto,
  string,
  { rejectValue: unknown }
>("pharmacy/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await getPharmacyByIdApi(id);
    return res.data as PharmacyDto;
  } catch (err: unknown) {
    showError("Error fetching pharmacy data");
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

export const addPharmacy = createAsyncThunk<
  PharmacyDto,
  {
    data: PharmacyDto;
    files?: {
      deaLicenseFile?: File | null;
      stateBoardLicenseFile?: File | null;
    };
  },
  { rejectValue: unknown }
>("pharmacy/add", async ({ data, files }, { rejectWithValue }) => {
  try {
    const res = await savePharmacyApi(data, files);
    showSuccess(res.data.message);
    return res.data.data as PharmacyDto;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data ?? "Error");
  }
});

export const deletePharmacy = createAsyncThunk<
  string,
  string,
  { rejectValue: unknown }
>("pharmacy/delete", async (id, { rejectWithValue }) => {
  try {
    const res = await deletePharmacyApi(id);
    showSuccess(res.data.message);
    return id;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    showError(axiosErr.response?.data?.message || "Delete failed");
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

const pharmacySlice = createSlice({
  name: "pharmacy",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPharmacy.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPharmacy.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data ?? [];
        state.totalRecords =
          action.payload.totalRecords ?? state.list.length;
      })
      .addCase(fetchPharmacy.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchPharmacyById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPharmacyById.fulfilled, (state, action) => {
        state.loading = false;
        state.list = [action.payload];
        state.totalRecords = 1;
      })
      .addCase(fetchPharmacyById.rejected, (state) => {
        state.loading = false;
      })
      .addCase(addPharmacy.fulfilled, (state, action) => {
        const index = state.list.findIndex(
          (item) => item.id === action.payload.id
        );

        if (index !== -1) {
          state.list[index] = action.payload;
        } else {
          state.list.push(action.payload);
        }
      })
      .addCase(deletePharmacy.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.id !== action.payload);
      });
  },
});

export default pharmacySlice.reducer;
