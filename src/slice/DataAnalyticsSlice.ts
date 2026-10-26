import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  exportDataAnalyticsApi,
  getDataAnalyticsApi,
} from "../service/DataAnalyticsService";
import type {
  DataAnalyticsQueryParam,
  DataAnalyticsRowDto,
  InsuranceFamilyDto,
} from "../dto/dataAnalyticsDto";
import { showError } from "../component/atoms/ToastHelper";
import { DEFAULT_LIST_PAGE_PARAM } from "../types/listPageParam";

export const fetchDataAnalytics = createAsyncThunk(
  "dataAnalytics/fetch",
  async (params: DataAnalyticsQueryParam, { rejectWithValue }) => {
    try {
      const res = await getDataAnalyticsApi(params);
      return res.data;
    } catch (err: unknown) {
      showError("Error fetching report data");
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

export const exportDataAnalytics = createAsyncThunk(
  "dataAnalytics/export",
  async (params: DataAnalyticsQueryParam, { rejectWithValue }) => {
    try {
      const { blob, filename } = await exportDataAnalyticsApi(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      showError("Error exporting report data");
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

interface DataAnalyticsState {
  list: DataAnalyticsRowDto[];
  totalRecords: number;
  page: number;
  pageSize: number;
  primaryInsuranceColumnNames: string[];
  insuranceFamilies: InsuranceFamilyDto[];
  wholesalerColumnNames: string[];
  filterNdcOptions: string[];
  filterProductNameOptions: string[];
  filterPackageSizeOptions: string[];
  loading: boolean;
}

const initialState: DataAnalyticsState = {
  list: [],
  totalRecords: 0,
  page: DEFAULT_LIST_PAGE_PARAM.page,
  pageSize: DEFAULT_LIST_PAGE_PARAM.pageSize,
  primaryInsuranceColumnNames: [],
  insuranceFamilies: [],
  wholesalerColumnNames: [],
  filterNdcOptions: [],
  filterProductNameOptions: [],
  filterPackageSizeOptions: [],
  loading: false,
};

const dataAnalyticsSlice = createSlice({
  name: "dataAnalytics",
  initialState,
  reducers: {
    clearDataAnalytics: (state) => {
      state.list = [];
      state.totalRecords = 0;
      state.primaryInsuranceColumnNames = [];
      state.insuranceFamilies = [];
      state.wholesalerColumnNames = [];
      state.filterNdcOptions = [];
      state.filterProductNameOptions = [];
      state.filterPackageSizeOptions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDataAnalytics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDataAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data ?? [];
        state.totalRecords = action.payload.totalRecords ?? 0;
        state.page = action.payload.page ?? 1;
        state.pageSize = action.payload.pageSize ?? DEFAULT_LIST_PAGE_PARAM.pageSize;
        state.primaryInsuranceColumnNames =
          action.payload.primaryInsuranceColumnNames ?? [];
        state.insuranceFamilies = action.payload.insuranceFamilies ?? [];
        state.wholesalerColumnNames = action.payload.wholesalerColumnNames ?? [];
        state.filterNdcOptions = action.payload.filterNdcOptions ?? [];
        state.filterProductNameOptions =
          action.payload.filterProductNameOptions ?? [];
        state.filterPackageSizeOptions =
          action.payload.filterPackageSizeOptions ?? [];
      })
      .addCase(fetchDataAnalytics.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { clearDataAnalytics } = dataAnalyticsSlice.actions;
export default dataAnalyticsSlice.reducer;
