import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPurchaseApi,
  bulkUpsertPurchaseApi,
  savePurchaseApi,
  deletePurchaseApi,
} from "../service/PurchaseService";
import type { PurchaseDto } from "../dto/purchaseDto";
import { showSuccess, showError } from "../component/atoms/ToastHelper";
import { showApiError } from "./mappingThunkUtils";
import { fetchImportErrorCount, fetchImportErrors } from "./ImportErrorSlice";
import { ImportType } from "../enums/ImportType";

export type FetchPurchaseParams = {
  page?: number;
  pageSize?: number;
  searchText?: string;
  importErrorFileId?: string;
};

export const fetchPurchase = createAsyncThunk(
  "purchase/fetch",
  async (pageParam: FetchPurchaseParams | undefined, { rejectWithValue }) => {
    try {
      const res = await getPurchaseApi(pageParam);
      return res.data;
    } catch (err: any) {
      showError("Error fetching purchase data");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const bulkUpsertPurchase = createAsyncThunk(
  "purchase/bulkUpsert",
  async (
    args: { file: File | null; pharmacyId: string; wholesalerId: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await bulkUpsertPurchaseApi(
        args.file,
        args.pharmacyId,
        args.wholesalerId
      );
      const message =
        typeof res.data?.message === "string" ? res.data.message : "";
      const hasSkippedValidationErrors =
        /skipped.*validation error/i.test(message);

      dispatch(fetchImportErrorCount(ImportType.Purchase));
      dispatch(
        fetchImportErrors({
          importType: ImportType.Purchase,
          page: 1,
          pageSize: 50,
        })
      );

      // Partial success (HTTP 200) can still persist import errors — refresh badge.
      if (hasSkippedValidationErrors) {
        showError(message || "Purchase CSV uploaded with validation errors");
      } else {
        showSuccess(message || "Purchase CSV uploaded successfully");
      }
      return res.data.data;
    } catch (err: unknown) {
      dispatch(fetchImportErrorCount(ImportType.Purchase));
      dispatch(
        fetchImportErrors({
          importType: ImportType.Purchase,
          page: 1,
          pageSize: 50,
        })
      );
      showApiError(err, "Purchase CSV upload failed");
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

export const upsertPurchase = createAsyncThunk(
  "purchase/upsert",
  async (data: PurchaseDto, { rejectWithValue, dispatch }) => {
    try {
      const res = await savePurchaseApi(data);
      showSuccess(res.data.message);
      dispatch(fetchImportErrorCount(ImportType.Purchase));
      dispatch(
        fetchImportErrors({
          importType: ImportType.Purchase,
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

export const deletePurchase = createAsyncThunk(
  "purchase/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await deletePurchaseApi(id);
      showSuccess(res.data.message);
      return id;
    } catch (err: any) {
      showError(err.response?.data?.message || "Delete failed");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

const initialState = {
  list: [] as PurchaseDto[],
  loading: false,
  totalRecords: 0,
};

const purchaseSlice = createSlice({
  name: "purchase",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchase.pending, (state) => {
        state.loading = true;
        state.list = [];
      })
      .addCase(fetchPurchase.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data || action.payload;
        state.totalRecords = action.payload.totalRecords ?? state.list.length;
      })
      .addCase(fetchPurchase.rejected, (state) => {
        state.loading = false;
      })
      .addCase(bulkUpsertPurchase.fulfilled, () => {})
      .addCase(upsertPurchase.fulfilled, () => {})
      .addCase(deletePurchase.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.id !== action.payload);
      });
  },
});

export default purchaseSlice.reducer;
