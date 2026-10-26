import type { ListPageParam } from "../types/listPageParam";
import type { ImportType } from "../enums/ImportType";

export interface ImportErrorFieldErrorDto {
  fieldName: string;
  fieldValue: string;
  errorMessage: string;
}

export interface ImportErrorFileDto {
  id: string;
  importType: ImportType;
  pharmacyId: string;
  fileName: string;
  pharmacyName: string;
  errorCount: number;
  failedRowCount: number;
  totalImportedRows: number;
  uploadedBy: string;
  createdDate: string;
  isViewed: boolean;
  viewedDate: string | null;
}

export interface ImportErrorDetailDto {
  id: string;
  fileId: string;
  errorType: string;
  ndc: string | null;
  rxNoOrInvoice: string | null;
  fieldErrors: ImportErrorFieldErrorDto[];
}

export type ImportErrorListParams = ListPageParam & {
  importType: ImportType;
  searchText?: string;
};

export interface ImportErrorPagedResponse<T> {
  totalRecords: number;
  data: T[];
}

export interface ImportErrorUnreadCountDto {
  billingCount: number;
  purchaseCount: number;
}

export const IMPORT_ERROR_ACTION_LABELS = {
  delete: "Delete",
  view: "View",
  download: "Download",
} as const;

/** @deprecated Prefer ImportErrorFileDto — kept for existing slice/table naming. */
export type ImportErrorDto = ImportErrorFileDto;

const NDC_FIELD_NAMES = ["ndc", "ndcnumber"];
const RX_FIELD_NAMES = ["rxno", "rx no"];
const INVOICE_FIELD_NAMES = ["invoicenumber", "invoice number", "invoice no"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return asRecord(value);
}

function normalizeFieldError(
  raw: Record<string, unknown>
): ImportErrorFieldErrorDto {
  return {
    fieldName: String(raw.fieldName ?? raw.FieldName ?? ""),
    fieldValue: String(raw.fieldValue ?? raw.FieldValue ?? ""),
    errorMessage: String(raw.errorMessage ?? raw.ErrorMessage ?? ""),
  };
}

function parseFieldErrors(raw: Record<string, unknown>): ImportErrorFieldErrorDto[] {
  const rawMessage = raw.errorMessage ?? raw.ErrorMessage;
  const payload = parseJsonObject(rawMessage);
  const data = payload?.data ?? raw.data ?? raw.Data;

  if (Array.isArray(data)) {
    return data
      .map((item) => normalizeFieldError(asRecord(item)))
      .filter((item) => item.errorMessage.trim() !== "");
  }

  const legacy =
    raw.errorMessages ??
    raw.ErrorMessages ??
    payload?.errorMessages ??
    payload?.ErrorMessages;

  if (Array.isArray(legacy)) {
    return legacy
      .map((item) => {
        const record = asRecord(item);
        return {
          fieldName: String(record.errorType ?? record.ErrorType ?? ""),
          fieldValue: "",
          errorMessage: String(record.errorMessage ?? record.ErrorMessage ?? ""),
        };
      })
      .filter((item) => item.errorMessage.trim() !== "");
  }

  // Plain-text backend message (e.g. Column Mapping Error summary).
  if (typeof rawMessage === "string" && rawMessage.trim() && !payload) {
    return [{ fieldName: "", fieldValue: "", errorMessage: rawMessage.trim() }];
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return [{ fieldName: "", fieldValue: "", errorMessage: payload.message.trim() }];
  }

  return [];
}

function fieldValueByNames(
  errors: ImportErrorFieldErrorDto[],
  names: string[]
): string | null {
  const lookup = new Set(names.map((name) => name.toLowerCase()));
  const match = errors.find((error) =>
    lookup.has(error.fieldName.trim().toLowerCase())
  );
  const value = match?.fieldValue?.trim();
  return value || null;
}

function resolveSummaryField(
  rawValue: unknown,
  errors: ImportErrorFieldErrorDto[],
  names: string[]
): string | null {
  if (rawValue != null && String(rawValue).trim() !== "") {
    return String(rawValue);
  }
  return fieldValueByNames(errors, names);
}

function resolveErrorType(
  raw: Record<string, unknown>,
  fieldErrors: ImportErrorFieldErrorDto[]
): string {
  const payload = parseJsonObject(raw.errorMessage ?? raw.ErrorMessage);
  const fromApi = String(
    raw.errorType ??
      raw.ErrorType ??
      payload?.errorType ??
      payload?.ErrorType ??
      ""
  ).trim();

  if (fromApi) return fromApi;
  if (fieldErrors.length > 1) return "Multiple";
  if (fieldErrors.length === 1) {
    return fieldErrors[0].fieldName || "Validation Error";
  }
  return "Validation Error";
}

export function normalizeImportErrorFile(
  raw: Record<string, unknown>
): ImportErrorFileDto {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    importType: Number(raw.importType ?? raw.ImportType) as ImportType,
    pharmacyId: String(raw.pharmacyId ?? raw.PharmacyId ?? ""),
    fileName: String(raw.fileName ?? raw.FileName ?? ""),
    pharmacyName: String(raw.pharmacyName ?? raw.PharmacyName ?? ""),
    errorCount: Number(raw.errorCount ?? raw.ErrorCount ?? 0),
    failedRowCount: Number(raw.failedRowCount ?? raw.FailedRowCount ?? 0),
    totalImportedRows: Number(
      raw.totalImportedRows ?? raw.TotalImportedRows ?? 0
    ),
    uploadedBy: String(raw.uploadedBy ?? raw.UploadedBy ?? ""),
    createdDate: String(raw.createdDate ?? raw.CreatedDate ?? ""),
    isViewed: Boolean(raw.isViewed ?? raw.IsViewed),
    viewedDate: raw.viewedDate ?? raw.ViewedDate
      ? String(raw.viewedDate ?? raw.ViewedDate)
      : null,
  };
}

export function normalizeImportErrorFileList(
  items: unknown[]
): ImportErrorFileDto[] {
  return items.map((item) => normalizeImportErrorFile(asRecord(item)));
}

export function normalizeImportErrorDetail(
  raw: Record<string, unknown>
): ImportErrorDetailDto {
  const fieldErrors = parseFieldErrors(raw);
  const ndc = resolveSummaryField(raw.ndc ?? raw.Ndc, fieldErrors, NDC_FIELD_NAMES);
  const rxNoOrInvoice =
    resolveSummaryField(
      raw.rxNoOrInvoice ?? raw.RxNoOrInvoice,
      fieldErrors,
      RX_FIELD_NAMES
    ) ?? fieldValueByNames(fieldErrors, INVOICE_FIELD_NAMES);

  return {
    id: String(raw.id ?? raw.Id ?? ""),
    fileId: String(raw.fileId ?? raw.FileId ?? ""),
    errorType: resolveErrorType(raw, fieldErrors),
    ndc,
    rxNoOrInvoice,
    fieldErrors,
  };
}

export function normalizeImportErrorDetailList(
  items: unknown[]
): ImportErrorDetailDto[] {
  return items.map((item) => normalizeImportErrorDetail(asRecord(item)));
}

export function normalizeImportErrorDetailResult(
  payload: unknown
): ImportErrorDetailDto | null {
  const root = asRecord(payload);
  const data =
    root.data != null && !Array.isArray(root.data)
      ? asRecord(root.data)
      : root;
  if (!(data.id ?? data.Id)) return null;
  return normalizeImportErrorDetail(data);
}

/** Alias kept for existing ImportErrorSlice imports. */
export const normalizeImportErrorList = normalizeImportErrorFileList;
