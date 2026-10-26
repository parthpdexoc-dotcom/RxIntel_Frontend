import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getInsuranceApi,
  saveInsuranceApi,
  deleteInsuranceApi,
} from "../service/InsuranceService";
import { showSuccess, showError } from "../component/atoms/ToastHelper";
import type {
  InsuranceDto,
  InsuranceListParams,
  InsurancePagedResponse,
} from "../dto/insuranceDto";

interface InsuranceState {
  list: InsuranceDto[];
  loading: boolean;
  totalRecords: number;
}

const initialState: InsuranceState = {
  list: [],
  loading: false,
  totalRecords: 0,
};

export const fetchInsurance = createAsyncThunk<
  InsurancePagedResponse,
  InsuranceListParams | undefined,
  { rejectValue: unknown }
>("insurance/fetch", async (pageParam, { rejectWithValue }) => {
  try {
    const res = await getInsuranceApi(pageParam);
    return res.data as InsurancePagedResponse;
  } catch (err: unknown) {
    showError("Error fetching insurance data");
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

export const addInsurance = createAsyncThunk<
  InsuranceDto,
  InsuranceDto,
  { rejectValue: unknown }
>("insurance/add", async (data, { rejectWithValue }) => {
  try {
    const res = await saveInsuranceApi(data);
    showSuccess(res.data.message);
    return res.data.data as InsuranceDto;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data ?? "Error");
  }
});

export const deleteInsurance = createAsyncThunk<
  string,
  string,
  { rejectValue: unknown }
>("insurance/delete", async (id, { rejectWithValue }) => {
  try {
    const res = await deleteInsuranceApi(id);
    showSuccess(res.data.message);
    return id;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    showError(axiosErr.response?.data?.message || "Delete failed");
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

const insuranceSlice = createSlice({
  name: "insurance",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInsurance.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInsurance.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data ?? [];
        state.totalRecords =
          action.payload.totalRecords ?? state.list.length;
      })
      .addCase(fetchInsurance.rejected, (state) => {
        state.loading = false;
      })
      .addCase(addInsurance.fulfilled, (state, action) => {
        const index = state.list.findIndex(
          (item) => item.id === action.payload.id
        );
        if (index !== -1) {
          state.list[index] = action.payload;
        } else {
          state.list.push(action.payload);
        }
      })
      .addCase(deleteInsurance.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.id !== action.payload);
      });
  },
});

export default insuranceSlice.reducer;
