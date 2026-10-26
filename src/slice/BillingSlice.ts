import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getBillingApi,
  bulkUpsertBillingApi,
  saveBillingApi,
  deleteBillingApi,
} from "../service/BillingService";
import type { BillingDto } from "../dto/billingDto";
import { showSuccess, showError } from "../component/atoms/ToastHelper";
import { showApiError } from "./mappingThunkUtils";
import { fetchImportErrorCount, fetchImportErrors } from "./ImportErrorSlice";
import { ImportType } from "../enums/ImportType";

export type FetchBillingParams = {
  page?: number;
  pageSize?: number;
  searchText?: string;
  importErrorFileId?: string;
};

export const fetchBilling = createAsyncThunk(
  "billing/fetch",
  async (pageParam: FetchBillingParams | undefined, { rejectWithValue }) => {
    try {
      const res = await getBillingApi(pageParam);
      return res.data;
    } catch (err: any) {
      showError("Error fetching billing data");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const bulkUpsertBilling = createAsyncThunk(
  "billing/bulkUpsert",
  async (
    args: {
      file: File | null;
      pharmacyId: string;
      pharmacySoftwareId?: string | null;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await bulkUpsertBillingApi(
        args.file,
        args.pharmacyId,
        args.pharmacySoftwareId
      );
      const message =
        typeof res.data?.message === "string" ? res.data.message : "";
      const hasSkippedValidationErrors =
        /skipped.*validation error/i.test(message);

      dispatch(fetchImportErrorCount(ImportType.Billing));
      dispatch(
        fetchImportErrors({
          importType: ImportType.Billing,
          page: 1,
          pageSize: 50,
        })
      );

      // Partial success (HTTP 200) can still persist import errors — refresh badge.
      if (hasSkippedValidationErrors) {
        showError(message || "Billing CSV uploaded with validation errors");
      } else {
        showSuccess(message || "Billing CSV uploaded successfully");
      }
      return res.data.data;
    } catch (err: unknown) {
      dispatch(fetchImportErrorCount(ImportType.Billing));
      dispatch(
        fetchImportErrors({
          importType: ImportType.Billing,
          page: 1,
          pageSize: 50,
        })
      );
      showApiError(err, "Billing CSV upload failed");
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

export const upsertBilling = createAsyncThunk(
  "billing/upsert",
  async (data: BillingDto, { rejectWithValue, dispatch }) => {
    try {
      const res = await saveBillingApi(data);
      showSuccess(res.data.message);
      dispatch(fetchImportErrorCount(ImportType.Billing));
      dispatch(
        fetchImportErrors({
          importType: ImportType.Billing,
          page: 1,
          pageSize: 50,
        })
      );
      return res.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

export const deleteBilling = createAsyncThunk(
  "billing/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await deleteBillingApi(id);
      showSuccess(res.data.message);
      return id;
    } catch (err: any) {
      showError(err.response?.data?.message || "Delete failed");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

const initialState = {
  list: [] as BillingDto[],
  loading: false,
  totalRecords: 0,
};

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBilling.pending, (state) => {
        state.loading = true;
        state.list = [];
      })
      .addCase(fetchBilling.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data || action.payload;
        state.totalRecords = action.payload.totalRecords ?? state.list.length;
      })
      .addCase(fetchBilling.rejected, (state) => {
        state.loading = false;
      })
      .addCase(bulkUpsertBilling.fulfilled, () => {})
      .addCase(upsertBilling.fulfilled, () => {})
      .addCase(deleteBilling.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.id !== action.payload);
      });
  },
});

export default billingSlice.reducer;
