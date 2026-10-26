import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  deletePharmacyWholesalerApi,
  getPharmacyWholesalerApi,
  savePharmacyWholesalerApi,
} from "../service/PharmacyWholesalerService";
import { showError, showSuccess } from "../component/atoms/ToastHelper";
import type {
  PharmacyWholesalerDto,
  PharmacyWholesalerListParams,
  PharmacyWholesalerPagedResponse,
} from "../dto/pharmacyWholesalerDto";
import { parsePharmacyWholesalerPagedResponse } from "../dto/pharmacyWholesalerDto";

interface PharmacyWholesalerState {
  list: PharmacyWholesalerDto[];
  loading: boolean;
  totalRecords: number;
}

const initialState: PharmacyWholesalerState = {
  list: [],
  loading: false,
  totalRecords: 0,
};

export const fetchPharmacyWholesaler = createAsyncThunk<
  PharmacyWholesalerPagedResponse,
  PharmacyWholesalerListParams | undefined,
  { rejectValue: unknown }
>("pharmacyWholesaler/fetch", async (pageParam, { rejectWithValue }) => {
  try {
    const res = await getPharmacyWholesalerApi(pageParam);
    return parsePharmacyWholesalerPagedResponse(res.data);
  } catch (err: unknown) {
    showError("Error fetching pharmacy wholesaler data");
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

export const addPharmacyWholesalerLinks = createAsyncThunk<
  boolean,
  { pharmacyId: string; wholesalerIds: string[] },
  { rejectValue: unknown }
>("pharmacyWholesaler/addMany", async ({ pharmacyId, wholesalerIds }, { rejectWithValue }) => {
  try {
    const responses = await Promise.all(
      wholesalerIds.map((wholesalerId) =>
        savePharmacyWholesalerApi({ pharmacyId, wholesalerId })
      )
    );

    const backendMessage =
      responses[responses.length - 1]?.data?.message ||
      responses[0]?.data?.message;
    if (backendMessage) showSuccess(backendMessage);

    return true;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    showError(axiosErr.response?.data?.message || "Failed to add wholesaler(s)");
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

export const deletePharmacyWholesaler = createAsyncThunk<
  string,
  string,
  { rejectValue: unknown }
>("pharmacyWholesaler/delete", async (id, { rejectWithValue }) => {
  try {
    const res = await deletePharmacyWholesalerApi(id);
    showSuccess(res.data?.message || "Removed successfully.");
    return id;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    showError(axiosErr.response?.data?.message || "Delete failed");
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

const pharmacyWholesalerSlice = createSlice({
  name: "pharmacyWholesaler",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPharmacyWholesaler.pending, (state) => {
        state.loading = true;
        state.list = [];
      })
      .addCase(fetchPharmacyWholesaler.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.totalRecords = action.payload.totalRecords;
      })
      .addCase(fetchPharmacyWholesaler.rejected, (state) => {
        state.loading = false;
      })
      .addCase(deletePharmacyWholesaler.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.id !== action.payload);
        state.totalRecords = Math.max(0, state.totalRecords - 1);
      });
  },
});

export default pharmacyWholesalerSlice.reducer;
