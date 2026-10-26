import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  deleteImportErrorApi,
  getImportErrorCountApi,
  getImportErrorUnreadCountsApi,
  getImportErrorsApi,
  markImportErrorsViewedApi,
} from "../service/ImportErrorService";
import {
  normalizeImportErrorList,
  type ImportErrorFileDto,
  type ImportErrorListParams,
  type ImportErrorPagedResponse,
  type ImportErrorUnreadCountDto,
} from "../dto/importErrorDto";
import { ImportType } from "../enums/ImportType";
import { showError, showSuccess } from "../component/atoms/ToastHelper";

export const fetchImportErrorCount = createAsyncThunk(
  "importError/fetchCount",
  async (importType: ImportType, { rejectWithValue }) => {
    try {
      const res = await getImportErrorCountApi(importType);
      return { importType, count: Number(res.data) || 0 };
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

export const fetchImportErrorUnreadCounts = createAsyncThunk(
  "importError/fetchUnreadCounts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await getImportErrorUnreadCountsApi();
      const payload = res.data as ImportErrorUnreadCountDto;
      return {
        billingCount: Number(payload?.billingCount) || 0,
        purchaseCount: Number(payload?.purchaseCount) || 0,
      };
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

export const markImportErrorsViewed = createAsyncThunk(
  "importError/markViewed",
  async (importType: ImportType, { rejectWithValue }) => {
    try {
      await markImportErrorsViewedApi(importType);
      return importType;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

export const fetchImportErrors = createAsyncThunk(
  "importError/fetch",
  async (params: ImportErrorListParams, { rejectWithValue }) => {
    try {
      const res = await getImportErrorsApi(params);
      const payload = res.data as ImportErrorPagedResponse<ImportErrorFileDto>;
      return {
        importType: params.importType,
        list: normalizeImportErrorList(payload.data ?? []),
        totalRecords: payload.totalRecords ?? 0,
      };
    } catch (err: unknown) {
      showError("Error fetching import errors");
      const axiosErr = err as { response?: { data?: unknown } };
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

export const deleteImportError = createAsyncThunk(
  "importError/delete",
  async (
    args: { id: string; importType: ImportType },
    { rejectWithValue }
  ) => {
    try {
      const res = await deleteImportErrorApi(args.id);
      showSuccess(res.data?.message ?? "Import error deleted successfully.");
      return args;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      showError(axiosErr.response?.data?.message ?? "Delete failed");
      return rejectWithValue(axiosErr.response?.data ?? "Error");
    }
  }
);

interface ImportErrorState {
  billingCount: number;
  purchaseCount: number;
  list: ImportErrorFileDto[];
  totalRecords: number;
  loading: boolean;
  activeImportType: ImportType | null;
}

const initialState: ImportErrorState = {
  billingCount: 0,
  purchaseCount: 0,
  list: [],
  totalRecords: 0,
  loading: false,
  activeImportType: null,
};

const importErrorSlice = createSlice({
  name: "importError",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchImportErrorCount.fulfilled, (state, action) => {
        if (action.payload.importType === ImportType.Billing) {
          state.billingCount = action.payload.count;
        } else {
          state.purchaseCount = action.payload.count;
        }
      })
      .addCase(fetchImportErrorUnreadCounts.fulfilled, (state, action) => {
        state.billingCount = action.payload.billingCount;
        state.purchaseCount = action.payload.purchaseCount;
      })
      .addCase(markImportErrorsViewed.fulfilled, (state, action) => {
        if (action.payload === ImportType.Billing) {
          state.billingCount = 0;
        } else {
          state.purchaseCount = 0;
        }
      })
      .addCase(fetchImportErrors.pending, (state, action) => {
        state.loading = true;
        state.activeImportType = action.meta.arg.importType;
      })
      .addCase(fetchImportErrors.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.list;
        state.totalRecords = action.payload.totalRecords;
        state.activeImportType = action.payload.importType;
      })
      .addCase(fetchImportErrors.rejected, (state) => {
        state.loading = false;
      })
      .addCase(deleteImportError.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item.id !== action.payload.id);
        if (action.payload.importType === ImportType.Billing) {
          state.billingCount = Math.max(0, state.billingCount - 1);
        } else {
          state.purchaseCount = Math.max(0, state.purchaseCount - 1);
        }
        state.totalRecords = Math.max(0, state.totalRecords - 1);
      });
  },
});

export default importErrorSlice.reducer;
