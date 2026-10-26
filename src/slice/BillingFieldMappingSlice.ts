import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import {
  bulkUpsertBillingFieldMappingApi,
  getBillingFieldMappingByPharmacySoftwareApi,
  getBillingFieldMappingListApi,
  uploadBillingFieldMappingCsvPreviewApi,
  type BillingFieldMappingListParams,
} from "../service/BillingFieldMappingService";

import type { BillingFieldMappingUpsertPayload } from "../dto/billingFieldMappingDto";

import {
  billingDraftsFromCsvPreview,
  billingMappingRowsFromApiPayload,
  billingRowsFromCsvPreview,
  billingSourceColumnsFromApiPayload,
  csvColumnsFromCsvPreview,
  normalizeFieldName,
} from "./mappingThunkUtils";

function destinationFieldFromRow(row: any): string {
  if (typeof row?.destinationFieldName === "string")
    return row.destinationFieldName.trim();

  if (typeof row?.DestinationFieldName === "string")
    return row.DestinationFieldName.trim();

  return "";
}

function savedRowsFromBulkUpsertPayload(payload: any): any[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.Data)) return payload.Data;
  return [];
}

type BillingFieldMappingPageParam = {
  page: number;
  pageSize: number;
};

export type { BillingFieldMappingDto } from "../dto/billingFieldMappingDto";

export const fetchBillingFieldMappingByPharmacySoftware = createAsyncThunk(
  "billingFieldMapping/fetchByPharmacySoftware",
  async (pharmacySoftwareId: string, { rejectWithValue }) => {
    if (!pharmacySoftwareId) {
      return rejectWithValue("Missing pharmacySoftwareId");
    }

    try {
      const res = await getBillingFieldMappingByPharmacySoftwareApi(
        pharmacySoftwareId
      );

      return {
        rows: billingMappingRowsFromApiPayload(res.data),
        sourceColumns: billingSourceColumnsFromApiPayload(res.data),
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const fetchBillingFieldMappingList = createAsyncThunk(
  "billingFieldMapping/fetchList",
  async (
    params: BillingFieldMappingListParams | undefined,
    { rejectWithValue }
  ) => {
    try {
      const res = await getBillingFieldMappingListApi(params);
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
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const bulkUpsertBillingFieldMapping = createAsyncThunk(
  "billingFieldMapping/bulkUpsert",
  async (
    mappings: BillingFieldMappingUpsertPayload[],
    { rejectWithValue }
  ) => {
    try {
      const res = await bulkUpsertBillingFieldMappingApi(mappings);

      return {
        api: res.data,
        submitted: mappings,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const uploadBillingFieldMappingCsvPreview = createAsyncThunk(
  "billingFieldMapping/uploadCsvPreview",
  async (
    args: { file: File; pharmacySoftwareId: string },
    { rejectWithValue }
  ) => {
    if (!args.file) {
      return rejectWithValue("Missing file");
    }

    if (!args.pharmacySoftwareId) {
      return rejectWithValue("Missing pharmacySoftwareId");
    }

    try {
      const res = await uploadBillingFieldMappingCsvPreviewApi(
        args.file,
        args.pharmacySoftwareId
      );

      const payload = res?.data || {};

      const csvColumns = csvColumnsFromCsvPreview(payload);
      const prefilled = billingDraftsFromCsvPreview(payload);
      const rows = billingRowsFromCsvPreview(payload);

      return {
        api: payload,
        csvColumns,
        prefilled,
        rows,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

const initialState = {
  list: [] as any[],
  totalRecords: 0,
  listLoading: false,
  pageParam: {
    page: 1,
    pageSize: 10,
  } as BillingFieldMappingPageParam,
};

const billingFieldMappingSlice = createSlice({
  name: "billingFieldMapping",
  initialState,
  reducers: {
    setBillingFieldMappingPageParam: (
      state,
      action: PayloadAction<Partial<BillingFieldMappingPageParam>>
    ) => {
      state.pageParam = {
        ...state.pageParam,
        ...action.payload,
      };
    },

    resetBillingFieldMappingList: (state) => {
      state.list = [];
      state.totalRecords = 0;
      state.listLoading = false;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchBillingFieldMappingList.pending, (state) => {
        state.listLoading = true;
      })

      .addCase(fetchBillingFieldMappingList.fulfilled, (state, action) => {
        state.listLoading = false;
        state.list = action.payload.data;
        state.totalRecords = action.payload.totalRecords;
      })

      .addCase(fetchBillingFieldMappingList.rejected, (state) => {
        state.listLoading = false;
      })

      .addCase(
        bulkUpsertBillingFieldMapping.fulfilled,
        (state, action) => {
          const saved = savedRowsFromBulkUpsertPayload(action.payload);

          if (saved.length === 0) return;

          const savedByDestination = new Map<string, any>();

          for (const row of saved) {
            const dest = destinationFieldFromRow(row);

            if (dest) {
              savedByDestination.set(
                normalizeFieldName(dest),
                row
              );
            }
          }

          state.list = state.list.map((row) => {
            const dest = destinationFieldFromRow(row);

            if (!dest) return row;

            const updated = savedByDestination.get(
              normalizeFieldName(dest)
            );

            return updated ? { ...row, ...updated } : row;
          });
        }
      );
  },
});

export const {
  setBillingFieldMappingPageParam,
  resetBillingFieldMappingList,
} = billingFieldMappingSlice.actions;

export default billingFieldMappingSlice.reducer;