import api, { get, post, put, del } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
  ListPageParam,
} from "../types/listPageParam";
import type {
  ErxColumnMatchRuleDto,
  BulkUpdateDiscrepancyStatusDto,
  ErxAuditRecordDto,
  ErxAuditFilterOptionsDto,
  MuseDiscrepancySuggestionRequestDto,
} from "../dto/erxAuditDto";

export type ErxAuditListParams = ListPageParam & {
  searchText?: string;
  pharmacyId?: string;
  discrepanciesOnly?: boolean;
  discrepancyColumn?: string;
  ruleId?: number;
  paymentMethod?: string;
  insCode?: string;
  binNo?: string;
  minTotalPaid?: number;
  maxTotalPaid?: number;
  isHighValue?: boolean;
  rxOrigin?: string;
  nonElectronicOnly?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export const uploadErxAuditBatchApi = (file: File, pharmacyId?: string) => {
  const formData = new FormData();
  formData.append("file", file);
  if (pharmacyId) {
    formData.append("pharmacyId", pharmacyId);
  }
  const url = pharmacyId ? `/erx-audit/batches?pharmacyId=${encodeURIComponent(pharmacyId)}` : "/erx-audit/batches";
  return post(url, formData);
};

export const getErxAuditBatchesApi = (params?: ErxAuditListParams) => {
  const query = new URLSearchParams();
  const { searchText, pharmacyId, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  if (pharmacyId) {
    query.set("pharmacyId", pharmacyId);
  }
  const qs = query.toString();
  return get(qs ? `/erx-audit/batches?${qs}` : "/erx-audit/batches");
};

export const getErxAuditBatchByIdApi = (batchId: string) =>
  get(`/erx-audit/batches/${batchId}`);

const appendAuditFilterParams = (query: URLSearchParams, params?: ErxAuditListParams) => {
  if (!params) return;
  const {
    searchText,
    pharmacyId,
    discrepanciesOnly,
    discrepancyColumn,
    ruleId,
    paymentMethod,
    insCode,
    binNo,
    minTotalPaid,
    maxTotalPaid,
    isHighValue,
    rxOrigin,
    nonElectronicOnly,
    ...pageParams
  } = params;

  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);

  if (typeof discrepanciesOnly === "boolean") {
    query.set("discrepanciesOnly", String(discrepanciesOnly));
  }
  if (discrepancyColumn) {
    query.set("discrepancyColumn", discrepancyColumn);
  }
  if (ruleId) {
    query.set("ruleId", String(ruleId));
  }
  if (paymentMethod) {
    query.set("paymentMethod", paymentMethod);
  }
  if (insCode) {
    query.set("insCode", insCode);
  }
  if (binNo) {
    query.set("binNo", binNo);
  }
  if (minTotalPaid != null) {
    query.set("minTotalPaid", String(minTotalPaid));
  }
  if (maxTotalPaid != null) {
    query.set("maxTotalPaid", String(maxTotalPaid));
  }
  if (typeof isHighValue === "boolean") {
    query.set("isHighValue", String(isHighValue));
  }
  if (rxOrigin) {
    query.set("rxOrigin", rxOrigin);
  }
  if (typeof nonElectronicOnly === "boolean") {
    query.set("nonElectronicOnly", String(nonElectronicOnly));
  }
  if (params.sortBy) {
    query.set("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    query.set("sortOrder", params.sortOrder);
  }
  if (pharmacyId) {
    query.set("pharmacyId", pharmacyId);
  }
};

export const getErxAuditBatchRecordsApi = (
  batchId: string,
  params?: ErxAuditListParams
) => {
  const query = new URLSearchParams();
  appendAuditFilterParams(query, params);
  const qs = query.toString();
  return get(
    qs
      ? `/erx-audit/batches/${batchId}/records?${qs}`
      : `/erx-audit/batches/${batchId}/records`
  );
};

export const getAllErxAuditRecordsApi = (
  batchId?: string,
  params?: ErxAuditListParams
) => {
  const query = new URLSearchParams();
  appendAuditFilterParams(query, params);
  if (batchId) {
    query.set("batchId", batchId);
  }
  const qs = query.toString();
  return get(qs ? `/erx-audit/records?${qs}` : "/erx-audit/records");
};

export const getErxAuditFilterOptionsApi = (batchId?: string, pharmacyId?: string) => {
  const query = new URLSearchParams();
  if (batchId) query.set("batchId", batchId);
  if (pharmacyId) query.set("pharmacyId", pharmacyId);
  const qs = query.toString();
  return get(qs ? `/erx-audit/filter-options?${qs}` : "/erx-audit/filter-options");
};

export const getErxDiscrepancySummaryApi = (batchId?: string, pharmacyId?: string) => {
  const query = new URLSearchParams();
  if (batchId) query.set("batchId", batchId);
  if (pharmacyId) query.set("pharmacyId", pharmacyId);
  const qs = query.toString();
  return get(qs ? `/erx-audit/discrepancies/summary?${qs}` : "/erx-audit/discrepancies/summary");
};

export const bulkUpdateErxDiscrepancyStatusApi = (
  payload: BulkUpdateDiscrepancyStatusDto
) => post("/erx-audit/discrepancies/bulk-status", payload);

export const seedSampleErxDataApi = () => post("/erx-audit/seed-sample-data", {});

export const getErxAuditRecordDiscrepanciesApi = (recordId: number) =>
  get(`/erx-audit/records/${recordId}/discrepancies`);

const sanitizeAuditDate = (val: any): string | null => {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s || s === "—" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (m) {
    const dt = new Date(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}${m[4] || "T00:00:00"}`);
    return !isNaN(dt.getTime()) ? dt.toISOString() : null;
  }
  return null;
};

const sanitizeRecordPayload = (data: Partial<ErxAuditRecordDto>): Partial<ErxAuditRecordDto> => {
  if (!data || typeof data !== "object") return data;
  const cleaned: any = { ...data };
  const dateKeys = [
    "mmOrderDate",
    "erxOrderDate",
    "erxEffectiveDate",
    "mmDateFilled",
    "pickupDate",
    "erxReceivedDateTime",
    "mmPatientDob",
    "erxPatientDob",
    "telephoneNotesDate",
    "erxNotesDate",
  ];

  for (const k of dateKeys) {
    if (k in cleaned) {
      cleaned[k] = sanitizeAuditDate(cleaned[k]);
    }
  }

  if ("mmTimeFilled" in cleaned) {
    const tf = cleaned.mmTimeFilled;
    if (tf == null || tf === "" || tf === "—") {
      cleaned.mmTimeFilled = null;
    }
  }

  delete cleaned.discrepancies;
  delete cleaned.discrepancyCount;
  delete cleaned.createdAt;
  delete cleaned.batch;
  delete cleaned.pharmacy;

  return cleaned;
};

export const updateErxAuditRecordApi = (recordId: number, data: Partial<ErxAuditRecordDto>) =>
  put(`/erx-audit/records/${recordId}`, sanitizeRecordPayload(data));

export const updateErxAuditDiscrepancyStatusApi = (
  discrepancyId: number,
  status: string,
  reviewedBy?: string,
  erxValue?: string,
  mmValue?: string
) =>
  put(`/erx-audit/discrepancies/${discrepancyId}/status`, {
    status,
    reviewedBy,
    erxValue,
    mmValue,
  });

export const getErxAuditRulesApi = (params?: {
  page?: number;
  pageSize?: number;
  searchText?: string;
  insuranceCompanyId?: number;
}) => {
  const query = new URLSearchParams();
  query.set("page", String(params?.page ?? 1));
  query.set("pageSize", String(params?.pageSize ?? 10));
  if (params?.searchText?.trim()) {
    query.set("searchText", params.searchText.trim());
  }
  if (params?.insuranceCompanyId != null) {
    query.set("insuranceCompanyId", String(params.insuranceCompanyId));
  }
  return get(`/erx-audit/rules?${query.toString()}`);
};

export const createErxAuditRuleApi = (rule: ErxColumnMatchRuleDto) =>
  post("/erx-audit/rules", rule);

export const updateErxAuditRuleApi = (id: number, rule: ErxColumnMatchRuleDto) =>
  put(`/erx-audit/rules/${id}`, rule);

export const deleteErxAuditRuleApi = (id: number) =>
  del(`/erx-audit/rules/${id}`);

export const getErxInsuranceCompaniesApi = (params?: { page?: number; pageSize?: number }) => {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  return get(`/Insurance?page=${page}&pageSize=${pageSize}`);
};

export const deleteErxAuditBatchApi = (batchId: string) =>
  del(`/erx-audit/batches/${batchId}`);

export const parseFilenameFromDisposition = (contentDisposition?: string): string | null => {
  if (!contentDisposition) return null;
  const match = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i.exec(contentDisposition);
  return match && match[1] ? decodeURIComponent(match[1].trim()) : null;
};

export const exportErxAuditRecordsApi = async (
  batchId?: string,
  discrepanciesOnly?: boolean,
  format: "xlsx" | "csv" = "xlsx",
  filters?: Partial<ErxAuditListParams>
): Promise<{ blob: Blob; filename: string }> => {
  const query = new URLSearchParams();
  if (batchId) query.set("batchId", batchId);
  if (typeof discrepanciesOnly === "boolean") query.set("discrepanciesOnly", String(discrepanciesOnly));
  query.set("format", format);

  if (filters) {
    appendAuditFilterParams(query, filters);
  }

  const res = await api.get(`/erx-audit/export?${query.toString()}`, {
    responseType: "blob",
  });

  const ext = format === "csv" ? "csv" : "xlsx";
  const defaultName = `ERx_Audit_Records_${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}.${ext}`;
  const filename = parseFilenameFromDisposition(res.headers["content-disposition"]) ?? defaultName;

  return { blob: res.data as Blob, filename };
};

export const getDiscrepancySuggestionApi = (data: MuseDiscrepancySuggestionRequestDto) =>
  post("/ai/memory/suggestion", data);


// ==========================================
// SIG & ABBREVIATIONS MAPPING APIS (Forwarded from ErxSigMappingService)
// ==========================================
export * from "./ErxSigMappingService";
export {
  getSigMappingsApi as getErxSigMappingsApi,
  getSigMappingByIdApi as getErxSigMappingByIdApi,
  createSigMappingApi as createErxSigMappingApi,
  updateSigMappingApi as updateErxSigMappingApi,
  deleteSigMappingApi as deleteErxSigMappingApi,
  toggleSigMappingActiveApi as toggleErxSigMappingActiveApi,
} from "./ErxSigMappingService";
