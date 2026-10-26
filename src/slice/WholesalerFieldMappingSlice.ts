import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  bulkUpsertWholesalerFieldMappingApi,
  getWholesalerFieldMappingByWholesalerApi,
  getWholesalerFieldMappingListApi,
  uploadWholesalerFieldMappingCsvPreviewApi,
  type WholesalerFieldMappingListParams,
} from "../service/WholesalerFieldMappingService";
import type { WholesalerFieldMappingUpsertPayload } from "../dto/wholesalerFieldMappingDto";
import { showError, showSuccess } from "../component/atoms/ToastHelper";
import {
  billingSourceColumnsFromApiPayload,
  csvColumnsFromCsvPreview,
  extractApiMessage,
  normalizeFieldName,
  showApiError,
  wholesalerDraftsFromCsvPreview,
  wholesalerMappingRowsFromApiPayload,
  wholesalerRowsFromCsvPreview,
} from "./mappingThunkUtils";

function destinationColumnFromRow(row: any): string {
  if (typeof row?.destinationColumnName === "string") return row.destinationColumnName.trim();
  if (typeof row?.DestinationColumnName === "string") return row.DestinationColumnName.trim();
  if (typeof row?.canonicalFieldName === "string") return row.canonicalFieldName.trim();
  if (typeof row?.CanonicalFieldName === "string") return row.CanonicalFieldName.trim();
  return "";
}

function savedRowsFromBulkUpsertPayload(payload: any): any[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.Data)) return payload.Data;
  return [];
}

type WholesalerFieldMappingPageParam = { page: number; pageSize: number };

export type { WholesalerFieldMappingDto } from "../dto/wholesalerFieldMappingDto";

export const fetchWholesalerFieldMappingByWholesaler = createAsyncThunk(
  "wholesalerFieldMapping/fetchByWholesaler",
  async (wholesalerId: string, { rejectWithValue }) => {
    if (!wholesalerId) {
      showError("Please open this page from a Wholesaler row.");
      return rejectWithValue("Missing wholesalerId");
    }
    try {
      const res = await getWholesalerFieldMappingByWholesalerApi(wholesalerId);
      return {
        rows: wholesalerMappingRowsFromApiPayload(res.data),
        sourceColumns: billingSourceColumnsFromApiPayload(res.data),
      };
    } catch (err: any) {
      showError("Error fetching wholesaler field mapping");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const fetchWholesalerFieldMappingList = createAsyncThunk(
  "wholesalerFieldMapping/fetchList",
  async (params: WholesalerFieldMappingListParams | undefined, { rejectWithValue }) => {
    try {
      const res = await getWholesalerFieldMappingListApi(params);
      const payload = res.data;
      const total =
        payload?.totalRecords ??
        payload?.TotalRecords ??
        (Array.isArray(payload?.data) ? payload.data.length : 0);
      return {
        data: payload?.data ?? payload?.Data ?? [],
        totalRecords: total,
      };
    } catch (err: any) {
      showError("Error fetching wholesaler field mapping list");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const bulkUpsertWholesalerFieldMapping = createAsyncThunk(
  "wholesalerFieldMapping/bulkUpsert",
  async (mappings: WholesalerFieldMappingUpsertPayload[], { rejectWithValue }) => {
    if (!Array.isArray(mappings) || mappings.length === 0) {
      showError("No mapping rows to save.");
      return rejectWithValue("No mappings to save");
    }
    try {
      const res = await bulkUpsertWholesalerFieldMappingApi(mappings);
      showSuccess(res.data.message);
      return { api: res.data, submitted: mappings };
    } catch (err: any) {
      showApiError(err);
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const uploadWholesalerFieldMappingCsvPreview = createAsyncThunk(
  "wholesalerFieldMapping/uploadCsvPreview",
  async (args: { file: File; wholesalerId: string }, { rejectWithValue }) => {
    if (!args.file) {
      showError("Please select a CSV file.");
      return rejectWithValue("Missing file");
    }
    if (!args.wholesalerId) {
      showError("Please open this page from a Wholesaler row.");
      return rejectWithValue("Missing wholesalerId");
    }
    try {
      const res = await uploadWholesalerFieldMappingCsvPreviewApi(
        args.file,
        args.wholesalerId
      );
      const payload = res?.data || {};
      const csvColumns = csvColumnsFromCsvPreview(payload);
      const prefilled = wholesalerDraftsFromCsvPreview(payload);
      const apiMessage = (payload as any)?.message;
      if (apiMessage && typeof apiMessage === "string" && apiMessage.trim()) {
        showSuccess(apiMessage);
      }
      const rows = wholesalerRowsFromCsvPreview(payload);
      return { csvColumns, prefilled, rows };
    } catch (err: any) {
      const msg = extractApiMessage(err);
      if (msg) showError(msg);
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

const initialState = {
  list: [] as any[],
  totalRecords: 0,
  listLoading: false,
  pageParam: { page: 1, pageSize: 10 } as WholesalerFieldMappingPageParam,
};

const wholesalerFieldMappingSlice = createSlice({
  name: "wholesalerFieldMapping",
  initialState,
  reducers: {
    setWholesalerFieldMappingPageParam: (
      state,
      action: PayloadAction<Partial<WholesalerFieldMappingPageParam>>
    ) => {
      state.pageParam = { ...state.pageParam, ...action.payload };
    },
    resetWholesalerFieldMappingList: (state) => {
      state.list = [];
      state.totalRecords = 0;
      state.listLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWholesalerFieldMappingList.pending, (state) => {
        state.listLoading = true;
      })
      .addCase(fetchWholesalerFieldMappingList.fulfilled, (state, action) => {
        state.listLoading = false;
        state.list = action.payload.data;
        state.totalRecords = action.payload.totalRecords;
      })
      .addCase(fetchWholesalerFieldMappingList.rejected, (state) => {
        state.listLoading = false;
      })
      .addCase(bulkUpsertWholesalerFieldMapping.fulfilled, (state, action) => {
        const saved = savedRowsFromBulkUpsertPayload(action.payload);
        if (saved.length === 0) return;

        const savedByDestination = new Map<string, any>();
        for (const row of saved) {
          const destination = destinationColumnFromRow(row);
          if (destination) savedByDestination.set(normalizeFieldName(destination), row);
        }

        state.list = state.list.map((row) => {
          const destination = destinationColumnFromRow(row);
          if (!destination) return row;
          const updated = savedByDestination.get(normalizeFieldName(destination));
          return updated ? { ...row, ...updated } : row;
        });
      });
  },
});

export const { setWholesalerFieldMappingPageParam, resetWholesalerFieldMappingList } =
  wholesalerFieldMappingSlice.actions;
export default wholesalerFieldMappingSlice.reducer;
