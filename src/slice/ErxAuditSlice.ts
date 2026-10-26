import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getErxAuditBatchesApi,
  getErxAuditBatchRecordsApi,
  getErxAuditRecordDiscrepanciesApi,
  updateErxAuditRecordApi,
  updateErxAuditDiscrepancyStatusApi,
  getErxDiscrepancySummaryApi,
  bulkUpdateErxDiscrepancyStatusApi,
  getErxAuditRulesApi,
  createErxAuditRuleApi,
  updateErxAuditRuleApi,
  deleteErxAuditRuleApi,
  getErxInsuranceCompaniesApi,
  uploadErxAuditBatchApi,
  deleteErxAuditBatchApi,
  getAllErxAuditRecordsApi,
  seedSampleErxDataApi,
  exportErxAuditRecordsApi,
  getErxSigMappingsApi,
  createErxSigMappingApi,
  updateErxSigMappingApi,
  deleteErxSigMappingApi,
  toggleErxSigMappingActiveApi,
  testSigComparisonApi,
  getErxAuditFilterOptionsApi,
  ErxAuditListParams,
} from "../service/ErxAuditService";
import { getInsuranceApi } from "../service/InsuranceService";
import type {
  ErxAuditBatchDto,
  ErxAuditRecordDto,
  ErxColumnMatchRuleDto,
  InsuranceCompanyDto,
  ErxDiscrepancyColumnSummaryDto,
  BulkUpdateDiscrepancyStatusDto,
  BulkUpdateDiscrepancyResponseDto,
  ErxSigMappingDto,
  CreateErxSigMappingDto,
  UpdateErxSigMappingDto,
  TestSigComparisonRequestDto,
  TestSigComparisonResponseDto,
  ErxAuditFilterOptionsDto,
} from "../dto/erxAuditDto";
import { showSuccess, showError } from "../component/atoms/ToastHelper";
import { showApiError } from "./mappingThunkUtils";
import ERX_AUDIT_LABELS from "../features/erxaudit/erxAuditLabels";

export const fetchErxBatches = createAsyncThunk(
  "erxAudit/fetchBatches",
  async (params: ErxAuditListParams | undefined, { rejectWithValue }) => {
    try {
      const res = await getErxAuditBatchesApi(params);
      return res.data;
    } catch (err: any) {
      showError("Error fetching ERx audit batches");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const deleteErxBatch = createAsyncThunk(
  "erxAudit/deleteBatch",
  async (batchId: string, { rejectWithValue }) => {
    try {
      const res = await deleteErxAuditBatchApi(batchId);
      showSuccess(res.data?.message || "Audit batch deleted successfully");
      return batchId;
    } catch (err: any) {
      showApiError(err, "Failed to delete audit batch");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);


export const uploadErxBatch = createAsyncThunk(
  "erxAudit/uploadBatch",
  async (
    payload: File | { file: File; pharmacyId?: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const file = payload instanceof File ? payload : payload.file;
      const pharmacyId = payload instanceof File ? undefined : payload.pharmacyId;
      const res = await uploadErxAuditBatchApi(file, pharmacyId);
      const data = res.data?.data;
      const message =
        data?.message ||
        (res.data?.message && res.data.message !== "Success" ? res.data.message : null) ||
        ERX_AUDIT_LABELS.MESSAGES.UPLOAD_SUCCESS;

      showSuccess(message);

      dispatch(fetchErxBatches(undefined));
      return data;
    } catch (err: any) {
      showApiError(err, "Failed to upload ERx Audit file");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const fetchErxBatchRecords = createAsyncThunk(
  "erxAudit/fetchBatchRecords",
  async (
    { batchId, params }: { batchId: string; params?: ErxAuditListParams },
    { rejectWithValue }
  ) => {
    try {
      const res = await getErxAuditBatchRecordsApi(batchId, params);
      return res.data;
    } catch (err: any) {
      showError("Error fetching batch records");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const fetchErxAllRecords = createAsyncThunk(
  "erxAudit/fetchAllRecords",
  async (
    { batchId, params }: { batchId?: string; params?: ErxAuditListParams },
    { rejectWithValue }
  ) => {
    try {
      const res = await getAllErxAuditRecordsApi(batchId, params);
      return res.data;
    } catch (err: any) {
      showError("Error fetching uploaded records");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const seedSampleErxData = createAsyncThunk(
  "erxAudit/seedSampleData",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const res = await seedSampleErxDataApi();
      const data = res.data?.data;
      const message =
        data?.message ||
        (res.data?.message && res.data.message !== "Success" ? res.data.message : null) ||
        ERX_AUDIT_LABELS.MESSAGES.SEED_SUCCESS;

      showSuccess(message);
      dispatch(fetchErxBatches(undefined));
      dispatch(fetchErxAllRecords({}));
      return res.data;
    } catch (err: any) {
      showApiError(err, "Failed to load sample data");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const fetchErxRecordDiscrepancies = createAsyncThunk(
  "erxAudit/fetchRecordDiscrepancies",
  async (recordId: number, { rejectWithValue }) => {
    try {
      const res = await getErxAuditRecordDiscrepanciesApi(recordId);
      return res.data;
    } catch (err: any) {
      showError("Error fetching discrepancy details");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const updateDiscrepancyStatus = createAsyncThunk(
  "erxAudit/updateDiscrepancyStatus",
  async (
    {
      discrepancyId,
      status,
      reviewedBy,
      erxValue,
      mmValue,
    }: {
      discrepancyId: number;
      status: string;
      reviewedBy?: string;
      erxValue?: string;
      mmValue?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateErxAuditDiscrepancyStatusApi(
        discrepancyId,
        status,
        reviewedBy,
        erxValue,
        mmValue
      );
      showSuccess(res.data?.message || `Discrepancy marked as ${status}`);
      return res.data?.data;
    } catch (err: any) {
      showApiError(err, "Failed to update discrepancy status");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const fetchErxDiscrepancySummary = createAsyncThunk(
  "erxAudit/fetchDiscrepancySummary",
  async (
    payload: string | { batchId?: string; pharmacyId?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const batchId = typeof payload === "string" ? payload : payload?.batchId;
      const pharmacyId = typeof payload === "string" ? undefined : payload?.pharmacyId;
      const res = await getErxDiscrepancySummaryApi(batchId, pharmacyId);
      return res.data as ErxDiscrepancyColumnSummaryDto[];
    } catch (err: any) {
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const updateErxAuditRecord = createAsyncThunk(
  "erxAudit/updateRecord",
  async (
    payload: { recordId: number; data: Partial<ErxAuditRecordDto> },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateErxAuditRecordApi(payload.recordId, payload.data);
      showSuccess(res.data?.message || "Record updated successfully");
      return res.data?.data as ErxAuditRecordDto;
    } catch (err: any) {
      showApiError(err, "Failed to update prescription record");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const bulkUpdateDiscrepancyStatus = createAsyncThunk(
  "erxAudit/bulkUpdateDiscrepancyStatus",
  async (payload: BulkUpdateDiscrepancyStatusDto, { rejectWithValue }) => {
    try {
      const res = await bulkUpdateErxDiscrepancyStatusApi(payload);
      showSuccess(res.data?.message || "Discrepancies updated successfully");
      return { payload, response: res.data?.data as BulkUpdateDiscrepancyResponseDto };
    } catch (err: any) {
      showApiError(err, "Failed to update discrepancies");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export type FetchErxRulesParams = {
  page?: number;
  pageSize?: number;
  searchText?: string;
  insuranceCompanyId?: number;
};

export const fetchErxRules = createAsyncThunk(
  "erxAudit/fetchRules",
  async (params: FetchErxRulesParams | number | undefined, { rejectWithValue }) => {
    try {
      const normalized: FetchErxRulesParams =
        typeof params === "number"
          ? { insuranceCompanyId: params, page: 1, pageSize: 10 }
          : {
              page: params?.page ?? 1,
              pageSize: params?.pageSize ?? 10,
              searchText: params?.searchText,
              insuranceCompanyId: params?.insuranceCompanyId,
            };
      const res = await getErxAuditRulesApi(normalized);
      return res.data;
    } catch (err: any) {
      showError("Error fetching match rules");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const saveErxRule = createAsyncThunk(
  "erxAudit/saveRule",
  async (rule: ErxColumnMatchRuleDto, { rejectWithValue }) => {
    try {
      const res = rule.ruleId > 0
        ? await updateErxAuditRuleApi(rule.ruleId, rule)
        : await createErxAuditRuleApi(rule);

      showSuccess(res.data?.message || "Rule saved successfully");
      return res.data?.data;
    } catch (err: any) {
      showApiError(err, "Failed to save match rule");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const deleteErxRule = createAsyncThunk(
  "erxAudit/deleteRule",
  async (ruleId: number, { rejectWithValue }) => {
    try {
      const res = await deleteErxAuditRuleApi(ruleId);
      showSuccess(res.data?.message || "Rule deleted successfully");
      return ruleId;
    } catch (err: any) {
      showApiError(err, "Failed to delete rule");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export interface FetchInsuranceCompaniesParams {
  page?: number;
  pageSize?: number;
  searchText?: string;
  append?: boolean;
}

export const fetchInsuranceCompanies = createAsyncThunk(
  "erxAudit/fetchInsuranceCompanies",
  async (
    params: FetchInsuranceCompaniesParams | undefined,
    { rejectWithValue }
  ) => {
    try {
      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? 10;
      const searchText = params?.searchText?.trim() || undefined;
      const append = params?.append ?? (page > 1);

      // Use https://localhost:7144/api/Insurance?page=...&pageSize=...
      const res = await getInsuranceApi({ page, pageSize, searchText });
      const raw = res.data;
      const items: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : [];

      const totalRecords =
        typeof raw?.totalRecords === "number"
          ? raw.totalRecords
          : typeof (raw as any)?.count === "number"
          ? (raw as any).count
          : items.length;

      const mapped: InsuranceCompanyDto[] = items.map((item: any, idx: number) => ({
        insuranceCompanyId: item.insuranceCompanyId ?? (idx + 1 + (page - 1) * pageSize),
        name: item.insuranceName || item.name || "",
        isActive: item.isActive !== false,
        binNumber: item.binNumber || null,
        insuranceId: item.id || null,
      }));

      return {
        data: mapped,
        page,
        pageSize,
        totalRecords,
        append,
        hasMore: page * pageSize < totalRecords,
      };
    } catch (err: any) {
      showError("Error fetching insurance companies");
      return rejectWithValue(err.response?.data || "Failed to load insurance companies");
    }
  }
);

export const exportErxAuditRecords = createAsyncThunk(
  "erxAudit/exportRecords",
  async (
    params: {
      batchId?: string;
      pharmacyId?: string;
      discrepanciesOnly?: boolean;
      format?: "xlsx" | "csv";
      paymentMethod?: string;
      insCode?: string;
      binNo?: string;
      minTotalPaid?: number;
      maxTotalPaid?: number;
      isHighValue?: boolean;
      nonElectronicOnly?: boolean;
      rxOrigin?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    },
    { rejectWithValue }
  ) => {
    try {
      const { batchId, discrepanciesOnly, format, ...filters } = params;
      const { blob, filename } = await exportErxAuditRecordsApi(
        batchId,
        discrepanciesOnly,
        format ?? "xlsx",
        filters
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess("Export downloaded successfully");
    } catch (err: any) {
      showError("Error exporting ERx audit records");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export type FetchSigMappingsParams = {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  category?: string;
};

export const fetchSigMappings = createAsyncThunk(
  "erxAudit/fetchSigMappings",
  async (
    payload: FetchSigMappingsParams | undefined = {},
    { rejectWithValue }
  ) => {
    try {
      const res = await getErxSigMappingsApi({
        page: payload?.page ?? 1,
        pageSize: payload?.pageSize ?? 10,
        searchTerm: payload?.searchTerm,
        category: payload?.category,
      });
      return res.data;
    } catch (err: any) {
      showError("Error fetching SIG mappings");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const createSigMapping = createAsyncThunk(
  "erxAudit/createSigMapping",
  async (data: CreateErxSigMappingDto, { rejectWithValue }) => {
    try {
      const res = await createErxSigMappingApi(data);
      showSuccess(res.data?.message || "SIG mapping created successfully");
      return res.data?.data;
    } catch (err: any) {
      showApiError(err, "Failed to create SIG mapping");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const updateSigMapping = createAsyncThunk(
  "erxAudit/updateSigMapping",
  async (
    { id, data }: { id: number; data: UpdateErxSigMappingDto },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateErxSigMappingApi(id, data);
      showSuccess(res.data?.message || "SIG mapping updated successfully");
      return res.data?.data;
    } catch (err: any) {
      showApiError(err, "Failed to update SIG mapping");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const deleteSigMapping = createAsyncThunk(
  "erxAudit/deleteSigMapping",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await deleteErxSigMappingApi(id);
      showSuccess(res.data?.message || "SIG mapping deleted successfully");
      return id;
    } catch (err: any) {
      showApiError(err, "Failed to delete SIG mapping");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const toggleSigMappingActive = createAsyncThunk(
  "erxAudit/toggleSigMappingActive",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await toggleErxSigMappingActiveApi(id);
      showSuccess(res.data?.message || "SIG mapping status updated");
      return id;
    } catch (err: any) {
      showApiError(err, "Failed to toggle SIG mapping status");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const testSigComparison = createAsyncThunk(
  "erxAudit/testSigComparison",
  async (data: TestSigComparisonRequestDto, { rejectWithValue }) => {
    try {
      const res = await testSigComparisonApi(data);
      return res.data;
    } catch (err: any) {
      showApiError(err, "Failed to test SIG comparison");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

export const fetchErxFilterOptions = createAsyncThunk(
  "erxAudit/fetchFilterOptions",
  async (
    payload: string | { batchId?: string; pharmacyId?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const batchId = typeof payload === "string" ? payload : payload?.batchId;
      const pharmacyId = typeof payload === "string" ? undefined : payload?.pharmacyId;
      const res = await getErxAuditFilterOptionsApi(batchId, pharmacyId);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

interface ErxAuditState {
  batches: ErxAuditBatchDto[];
  totalBatches: number;
  loadingBatches: boolean;
  uploading: boolean;

  records: ErxAuditRecordDto[];
  totalRecords: number;
  loadingRecords: boolean;
  exporting: boolean;
  exportingFormat: "xlsx" | "csv" | null;

  selectedRecord: ErxAuditRecordDto | null;
  loadingSelectedRecord: boolean;

  rules: ErxColumnMatchRuleDto[];
  loadingRules: boolean;

  insuranceCompanies: InsuranceCompanyDto[];
  loadingInsuranceCompanies: boolean;
  insuranceCompanyPage: number;
  insuranceCompanyTotal: number;
  insuranceCompanyHasMore: boolean;

  discrepancySummaries: ErxDiscrepancyColumnSummaryDto[];
  loadingDiscrepancySummary: boolean;
  bulkUpdatingDiscrepancies: boolean;

  sigMappings: ErxSigMappingDto[];
  totalSigMappings: number;
  loadingSigMappings: boolean;
  testingSig: boolean;
  sigTestResult: TestSigComparisonResponseDto | null;

  totalRules: number;

  filterOptions: ErxAuditFilterOptionsDto | null;
  loadingFilterOptions: boolean;
}

const initialState: ErxAuditState = {
  batches: [],
  totalBatches: 0,
  loadingBatches: false,
  uploading: false,

  records: [],
  totalRecords: 0,
  loadingRecords: false,
  exporting: false,
  exportingFormat: null,

  selectedRecord: null,
  loadingSelectedRecord: false,

  rules: [],
  loadingRules: false,
  totalRules: 0,

  insuranceCompanies: [],
  loadingInsuranceCompanies: false,
  insuranceCompanyPage: 1,
  insuranceCompanyTotal: 0,
  insuranceCompanyHasMore: true,

  discrepancySummaries: [],
  loadingDiscrepancySummary: false,
  bulkUpdatingDiscrepancies: false,

  sigMappings: [],
  totalSigMappings: 0,
  loadingSigMappings: false,
  testingSig: false,
  sigTestResult: null,

  filterOptions: null,
  loadingFilterOptions: false,
};

const erxAuditSlice = createSlice({
  name: "erxAudit",
  initialState,
  reducers: {
    clearSelectedRecord: (state) => {
      state.selectedRecord = null;
    },
    clearSigTestResult: (state) => {
      state.sigTestResult = null;
    },
  },
  extraReducers: (builder) => {
    // Batches
    builder.addCase(fetchErxBatches.pending, (state) => {
      state.loadingBatches = true;
    });
    builder.addCase(fetchErxBatches.fulfilled, (state, action) => {
      state.loadingBatches = false;
      state.batches = action.payload?.data ?? action.payload ?? [];
      state.totalBatches = action.payload?.totalRecords ?? state.batches.length;
    });
    builder.addCase(fetchErxBatches.rejected, (state) => {
      state.loadingBatches = false;
    });

    // Delete Batch
    builder.addCase(deleteErxBatch.fulfilled, (state, action) => {
      state.batches = state.batches.filter((b) => b.batchId !== action.payload);
      state.totalBatches = Math.max(0, state.totalBatches - 1);
    });

    // Upload
    builder.addCase(uploadErxBatch.pending, (state) => {
      state.uploading = true;
    });
    builder.addCase(uploadErxBatch.fulfilled, (state) => {
      state.uploading = false;
    });
    builder.addCase(uploadErxBatch.rejected, (state) => {
      state.uploading = false;
    });

    // Batch Records
    builder.addCase(fetchErxBatchRecords.pending, (state) => {
      state.loadingRecords = true;
    });
    builder.addCase(fetchErxBatchRecords.fulfilled, (state, action) => {
      state.loadingRecords = false;
      state.records = action.payload?.data ?? action.payload ?? [];
      state.totalRecords = action.payload?.totalRecords ?? state.records.length;
    });
    builder.addCase(fetchErxBatchRecords.rejected, (state) => {
      state.loadingRecords = false;
    });

    // All Records
    builder.addCase(fetchErxAllRecords.pending, (state) => {
      state.loadingRecords = true;
    });
    builder.addCase(fetchErxAllRecords.fulfilled, (state, action) => {
      state.loadingRecords = false;
      state.records = action.payload?.data ?? action.payload ?? [];
      state.totalRecords = action.payload?.totalRecords ?? state.records.length;
    });
    builder.addCase(fetchErxAllRecords.rejected, (state) => {
      state.loadingRecords = false;
    });

    // Selected record detail
    builder.addCase(fetchErxRecordDiscrepancies.pending, (state) => {
      state.loadingSelectedRecord = true;
    });
    builder.addCase(fetchErxRecordDiscrepancies.fulfilled, (state, action) => {
      state.loadingSelectedRecord = false;
      state.selectedRecord = action.payload;
      if (action.payload) {
        const idx = state.records.findIndex((r) => r.recordId === action.payload.recordId);
        if (idx !== -1) {
          state.records[idx] = action.payload;
        }
      }
    });
    builder.addCase(fetchErxRecordDiscrepancies.rejected, (state) => {
      state.loadingSelectedRecord = false;
    });

    // Update discrepancy status
    builder.addCase(updateDiscrepancyStatus.fulfilled, (state, action) => {
      const updated = action.payload;
      if (!updated) return;

      // 1. Update selected record in state if present
      if (state.selectedRecord) {
        if (state.selectedRecord.recordId === updated.recordId) {
          const updatedDiscs = (state.selectedRecord.discrepancies || []).map((d) =>
            d.discrepancyId === updated.discrepancyId ? { ...d, ...updated } : d
          );
          const openCount = updatedDiscs.filter((d) => d.status === "Open" || !d.status).length;
          state.selectedRecord = {
            ...state.selectedRecord,
            discrepancies: updatedDiscs,
            discrepancyCount: openCount,
            hasDiscrepancy: openCount > 0,
          };
        }
      }

      // 2. Update records list in state
      let affectedBatchId = updated.batchId;
      if (state.records) {
        state.records = state.records.map((rec) => {
          if (rec.recordId === updated.recordId) {
            if (!affectedBatchId) affectedBatchId = rec.batchId;
            const updatedDiscs = (rec.discrepancies || []).map((d) =>
              d.discrepancyId === updated.discrepancyId ? { ...d, ...updated } : d
            );
            const openCount = updatedDiscs.filter((d) => d.status === "Open" || !d.status).length;
            return {
              ...rec,
              discrepancies: updatedDiscs,
              discrepancyCount: openCount,
              hasDiscrepancy: openCount > 0,
            };
          }
          return rec;
        });
      }

      // 3. Update the particular uploaded Sheet / Batch in state.batches
      if (state.batches) {
        state.batches = state.batches.map((batch) => {
          if (affectedBatchId && batch.batchId === affectedBatchId) {
            const newCount =
              updated.remainingBatchDiscrepancies !== undefined
                ? updated.remainingBatchDiscrepancies
                : Math.max(0, (batch.totalDiscrepancies || 0) - 1);
            return {
              ...batch,
              totalDiscrepancies: newCount,
            };
          }
          return batch;
        });
      }
    });

    // Discrepancy Summary
    builder.addCase(fetchErxDiscrepancySummary.pending, (state) => {
      state.loadingDiscrepancySummary = true;
    });
    builder.addCase(fetchErxDiscrepancySummary.fulfilled, (state, action) => {
      state.loadingDiscrepancySummary = false;
      state.discrepancySummaries = (action.payload ?? []).filter(
        (s) =>
          !s.fieldGroupName.toLowerCase().includes("testing") &&
          !s.fieldGroupName.toLowerCase().includes("comparision")
      );
    });
    builder.addCase(fetchErxDiscrepancySummary.rejected, (state) => {
      state.loadingDiscrepancySummary = false;
    });

    // Bulk Update Discrepancy Status
    builder.addCase(bulkUpdateDiscrepancyStatus.pending, (state) => {
      state.bulkUpdatingDiscrepancies = true;
    });
    builder.addCase(bulkUpdateDiscrepancyStatus.rejected, (state) => {
      state.bulkUpdatingDiscrepancies = false;
    });
    builder.addCase(bulkUpdateDiscrepancyStatus.fulfilled, (state, action) => {
      state.bulkUpdatingDiscrepancies = false;
      if (!action.payload) return;
      const { payload, response } = action.payload;
      const newStatus = payload.status || "Ignored";
      const affectedRecordIds = new Set(
        response?.affectedRecordIds?.map(Number) ||
        payload.recordIds?.map(Number) ||
        []
      );
      const targetDiscrepancyIds = new Set((payload.discrepancyIds || []).map(Number));

      // 1. Update records
      if (state.records) {
        state.records = state.records.map((rec) => {
          if (affectedRecordIds.size === 0 || affectedRecordIds.has(Number(rec.recordId))) {
            const updatedDiscs = (rec.discrepancies || []).map((d) => {
              const matchesColumn = payload.discrepancyColumn
                ? (d.fieldGroupName?.toLowerCase() === payload.discrepancyColumn.toLowerCase() ||
                   d.mmColumnName?.toLowerCase() === payload.discrepancyColumn.toLowerCase() ||
                   d.erxColumnName?.toLowerCase() === payload.discrepancyColumn.toLowerCase())
                : true;
              const matchesRule = payload.ruleId ? d.ruleId === payload.ruleId : true;
              const matchesDiscId = targetDiscrepancyIds.size > 0 ? targetDiscrepancyIds.has(Number(d.discrepancyId)) : true;

              if (matchesColumn && matchesRule && matchesDiscId) {
                return { ...d, status: newStatus };
              }
              return d;
            });
            const openCount = updatedDiscs.filter((d) => d.status === "Open" || !d.status).length;
            return {
              ...rec,
              discrepancies: updatedDiscs,
              discrepancyCount: openCount,
              hasDiscrepancy: openCount > 0,
            };
          }
          return rec;
        });
      }

      // 2. Update selected record if open
      if (state.selectedRecord) {
        if (affectedRecordIds.size === 0 || affectedRecordIds.has(Number(state.selectedRecord.recordId))) {
          const updatedDiscs = (state.selectedRecord.discrepancies || []).map((d) => {
            const matchesColumn = payload.discrepancyColumn
              ? (d.fieldGroupName?.toLowerCase() === payload.discrepancyColumn.toLowerCase() ||
                 d.mmColumnName?.toLowerCase() === payload.discrepancyColumn.toLowerCase() ||
                 d.erxColumnName?.toLowerCase() === payload.discrepancyColumn.toLowerCase())
              : true;
            const matchesRule = payload.ruleId ? d.ruleId === payload.ruleId : true;
            const matchesDiscId = targetDiscrepancyIds.size > 0 ? targetDiscrepancyIds.has(Number(d.discrepancyId)) : true;

            if (matchesColumn && matchesRule && matchesDiscId) {
              return { ...d, status: newStatus };
            }
            return d;
          });
          const openCount = updatedDiscs.filter((d) => d.status === "Open" || !d.status).length;
          state.selectedRecord = {
            ...state.selectedRecord,
            discrepancies: updatedDiscs,
            discrepancyCount: openCount,
            hasDiscrepancy: openCount > 0,
          };
        }
      }

      // 3. Update batches count
      if (state.batches && payload.batchId) {
        state.batches = state.batches.map((b) => {
          if (b.batchId === payload.batchId && response?.remainingBatchDiscrepancies !== undefined) {
            return { ...b, totalDiscrepancies: response.remainingBatchDiscrepancies };
          }
          return b;
        });
      }
    });

    // Rules
    builder.addCase(fetchErxRules.pending, (state) => {
      state.loadingRules = true;
    });
    builder.addCase(fetchErxRules.fulfilled, (state, action) => {
      state.loadingRules = false;
      const payload = action.payload as any;
      const data = payload?.data ?? payload?.Data ?? payload;
      state.rules = Array.isArray(data) ? data : [];
      state.totalRules =
        payload?.totalRecords ??
        payload?.TotalRecords ??
        state.rules.length;
    });
    builder.addCase(fetchErxRules.rejected, (state) => {
      state.loadingRules = false;
    });

    // Save Rule
    builder.addCase(saveErxRule.fulfilled, (state, action) => {
      const saved = action.payload;
      if (saved) {
        const index = state.rules.findIndex((r) => r.ruleId === saved.ruleId);
        if (index >= 0) {
          state.rules[index] = saved;
        } else {
          state.rules.push(saved);
          state.totalRules += 1;
        }
      }
    });

    // Delete Rule
    builder.addCase(deleteErxRule.fulfilled, (state, action) => {
      state.rules = state.rules.filter((r) => r.ruleId !== action.payload);
      state.totalRules = Math.max(0, state.totalRules - 1);
    });

    // Insurance Companies
    builder.addCase(fetchInsuranceCompanies.pending, (state) => {
      state.loadingInsuranceCompanies = true;
    });
    builder.addCase(fetchInsuranceCompanies.rejected, (state) => {
      state.loadingInsuranceCompanies = false;
    });
    builder.addCase(fetchInsuranceCompanies.fulfilled, (state, action) => {
      state.loadingInsuranceCompanies = false;
      if (!action.payload) return;
      const { data, append, page, totalRecords, hasMore } = action.payload;
      if (append) {
        const existingNames = new Set(
          state.insuranceCompanies.map((c) => (c.name || "").toLowerCase().trim())
        );
        const newUnique = data.filter(
          (c) => !existingNames.has((c.name || "").toLowerCase().trim())
        );
        state.insuranceCompanies = [...state.insuranceCompanies, ...newUnique];
      } else {
        state.insuranceCompanies = data;
      }
      state.insuranceCompanyPage = page;
      state.insuranceCompanyTotal = totalRecords;
      state.insuranceCompanyHasMore = hasMore;
    });


    // Update Record
    builder.addCase(updateErxAuditRecord.fulfilled, (state, action) => {
      const updated = action.payload;
      if (!updated) return;
      if (state.selectedRecord && state.selectedRecord.recordId === updated.recordId) {
        state.selectedRecord = updated;
      }
      const idx = state.records.findIndex((r) => r.recordId === updated.recordId);
      if (idx !== -1) {
        state.records[idx] = updated;
      }
    });

    // Export Records
    builder.addCase(exportErxAuditRecords.pending, (state, action) => {
      state.exporting = true;
      state.exportingFormat = action.meta.arg?.format ?? "xlsx";
    });
    builder.addCase(exportErxAuditRecords.fulfilled, (state) => {
      state.exporting = false;
      state.exportingFormat = null;
    });
    builder.addCase(exportErxAuditRecords.rejected, (state) => {
      state.exporting = false;
      state.exportingFormat = null;
    });

    // SIG Mappings
    builder.addCase(fetchSigMappings.pending, (state) => {
      state.loadingSigMappings = true;
    });
    builder.addCase(fetchSigMappings.fulfilled, (state, action) => {
      state.loadingSigMappings = false;
      const payload = action.payload as any;
      const data = payload?.data ?? payload?.Data ?? payload;
      state.sigMappings = Array.isArray(data) ? data : [];
      state.totalSigMappings =
        payload?.totalRecords ??
        payload?.TotalRecords ??
        state.sigMappings.length;
    });
    builder.addCase(fetchSigMappings.rejected, (state) => {
      state.loadingSigMappings = false;
    });

    // Test SIG Comparison
    builder.addCase(testSigComparison.pending, (state) => {
      state.testingSig = true;
      state.sigTestResult = null;
    });
    builder.addCase(testSigComparison.fulfilled, (state, action) => {
      state.testingSig = false;
      state.sigTestResult = action.payload ?? null;
    });
    builder.addCase(testSigComparison.rejected, (state) => {
      state.testingSig = false;
    });

    // Filter Options
    builder.addCase(fetchErxFilterOptions.pending, (state) => {
      state.loadingFilterOptions = true;
    });
    builder.addCase(fetchErxFilterOptions.fulfilled, (state, action) => {
      state.loadingFilterOptions = false;
      const data = action.payload as ErxAuditFilterOptionsDto | null;
      if (data) {
        const ins = data.insCodes || data.insuranceCodes || [];
        const bins = data.binNos || data.binNumbers || [];
        const insCount = data.insurancePriorityCount ?? data.insuranceRecordCount ?? 0;
        const hvCount = data.highValueClaimCount ?? data.highValueRecordCount ?? 0;
        const nonElecCount = data.nonElectronicCount ?? data.nonElectronicRecordCount ?? 0;
        state.filterOptions = {
          ...data,
          insCodes: ins,
          insuranceCodes: ins,
          binNos: bins,
          binNumbers: bins,
          rxOrigins: data.rxOrigins || [],
          paymentMethods: data.paymentMethods || [],
          totalRecords: data.totalRecords ?? 0,
          insurancePriorityCount: insCount,
          insuranceRecordCount: insCount,
          highValueClaimCount: hvCount,
          highValueRecordCount: hvCount,
          nonElectronicCount: nonElecCount,
          nonElectronicRecordCount: nonElecCount,
        };
      } else {
        state.filterOptions = null;
      }
    });
    builder.addCase(fetchErxFilterOptions.rejected, (state) => {
      state.loadingFilterOptions = false;
    });
  },
});

export const { clearSelectedRecord, clearSigTestResult } = erxAuditSlice.actions;
export default erxAuditSlice.reducer;
