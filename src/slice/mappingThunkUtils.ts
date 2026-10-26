import { showError } from "../component/atoms/ToastHelper";

export function normalizeFieldName(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

type ApiValidationError = {
  errorMessage?: string;
  fieldName?: string;
};

type ApiErrorBody = {
  message?: string;
  Message?: string;
  errors?: ApiValidationError[];
  Errors?: ApiValidationError[];
};

function apiFieldNameToFormKey(fieldName: string) {
  return fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
}

export function fieldErrorsFromApiBody(data: unknown): Record<string, string> {
  const body = data as ApiErrorBody;
  const errors = body?.errors ?? body?.Errors ?? [];
  if (!Array.isArray(errors)) return {};

  const map: Record<string, string> = {};
  for (const item of errors) {
    const fieldName =
      item?.fieldName ?? (item as { FieldName?: string }).FieldName;
    const errorMessage =
      item?.errorMessage ??
      (item as { ErrorMessage?: string }).ErrorMessage;
    if (!fieldName || !errorMessage) continue;
    map[apiFieldNameToFormKey(fieldName)] = errorMessage.trim();
  }
  return map;
}

function apiValidationMessages(body: ApiErrorBody): string[] {
  const errors = body?.errors ?? body?.Errors ?? [];
  return errors
    .map((e) => e?.errorMessage ?? (e as { ErrorMessage?: string })?.ErrorMessage)
    .filter((msg): msg is string => Boolean(msg));
}

export function messageFromApiBody(data: unknown): string | undefined {
  const body = data as ApiErrorBody;
  const fromErrors = apiValidationMessages(body);
  if (fromErrors.length > 0) return fromErrors.join("\n");
  const message = body?.message ?? body?.Message;
  if (typeof message === "string" && message) return message;
  if (typeof data === "string" && data) return data;
  return undefined;
}

export function extractApiMessage(err: any) {
  const data = err?.response?.data;
  if (data !== undefined) return messageFromApiBody(data);
  return undefined;
}

export function showApiError(err: any, fallback?: string) {
  const msg = extractApiMessage(err) ?? fallback;
  if (msg) showError(msg);
}

export function wholesalerMappingRowsFromApiPayload(data: unknown): any[] {
  return billingMappingRowsFromApiPayload(data);
}

export function wholesalerMappingSourceFromRow(row: any): string {
  const raw = row?.sourceColumnName ?? row?.SourceColumnName;
  if (raw == null) return "";
  if (typeof raw !== "string") return "";
  return raw.trim();
}

export function wholesalerDraftsFromMappingRows(rows: any[]): Record<string, string> {
  const drafts: Record<string, string> = {};
  for (const row of rows) {
    const destination =
      typeof row?.destinationColumnName === "string"
        ? row.destinationColumnName.trim()
        : typeof row?.DestinationColumnName === "string"
          ? row.DestinationColumnName.trim()
          : typeof row?.canonicalFieldName === "string"
            ? row.canonicalFieldName.trim()
            : typeof row?.CanonicalFieldName === "string"
              ? row.CanonicalFieldName.trim()
              : "";
    if (destination) drafts[destination] = wholesalerMappingSourceFromRow(row);
  }
  return drafts;
}

/** Wholesaler CSV preview: Rows = destination (purchase) → source (csv). */
export function wholesalerDraftsFromCsvPreview(payload: any): Record<string, string> {
  return wholesalerDraftsFromMappingRows(wholesalerMappingRowsFromApiPayload(payload));
}

export function wholesalerRowsFromCsvPreview(payload: any): any[] {
  return wholesalerMappingRowsFromApiPayload(payload);
}

export function billingMappingRowsFromApiPayload(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.Data)) return obj.Data;
    const rows = obj.rows ?? obj.Rows;
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

export function mappingSourceFromRow(row: any): string {
  const raw = row?.sourceFieldName ?? row?.SourceFieldName;
  if (raw == null) return "";
  if (typeof raw !== "string") return "";
  return raw.trim();
}

export function billingDraftsFromMappingRows(rows: any[]): Record<string, string> {
  const drafts: Record<string, string> = {};
  for (const row of rows) {
    const billing =
      typeof row?.destinationFieldName === "string"
        ? row.destinationFieldName.trim()
        : typeof row?.DestinationFieldName === "string"
          ? row.DestinationFieldName.trim()
          : "";
    if (billing) drafts[billing] = mappingSourceFromRow(row);
  }
  return drafts;
}

/** Billing CSV preview: Rows = BillingFieldMappingDto[] (destination=billing, source=csv). */
export function billingDraftsFromCsvPreview(payload: any): Record<string, string> {
  return billingDraftsFromMappingRows(billingMappingRowsFromApiPayload(payload));
}

export function billingRowsFromCsvPreview(payload: any): any[] {
  return billingMappingRowsFromApiPayload(payload);
}

function parseStringArrayValue(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (x): x is string => typeof x === "string" && Boolean(x.trim())
        );
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

/** CSV/source column names on getById entity payloads (PharmacySoftware, Wholesaler, etc.). */
export function sourceColumnsFromEntityById(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const payload = (obj.data ?? obj.Data ?? obj) as Record<string, unknown>;
  if (!payload || typeof payload !== "object") return [];

  const raw =
    payload.billingSourceColumns ??
    payload.BillingSourceColumns ??
    payload.sourceColumns ??
    payload.SourceColumns ??
    payload.billingCsvColumns ??
    payload.BillingCsvColumns ??
    payload.csvColumns ??
    payload.CsvColumns;

  return parseStringArrayValue(raw);
}

/** Source CSV columns on billing field mapping API payloads (list / by-pharmacy-software). */
export function billingSourceColumnsFromApiPayload(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const raw =
    obj.sourceColumns ??
    obj.SourceColumns ??
    obj.billingSourceColumns ??
    obj.BillingSourceColumns ??
    obj.csvColumns ??
    obj.CsvColumns;
  return parseStringArrayValue(raw);
}

export function csvColumnsFromCsvPreview(payload: any): string[] {
  const cols =
    payload?.sourceColumns ??
    payload?.SourceColumns ??
    payload?.csvColumns ??
    payload?.CsvColumns ??
    payload?.destinationColumns ??
    payload?.DestinationColumns;
  if (!Array.isArray(cols)) return [];
  return cols.filter((c): c is string => typeof c === "string" && Boolean(c.trim()));
}

export function resolveDestinationColumns(payload: any, headersFromFile: string[]) {
  const csvColumnsFromPayload: string[] = Array.isArray(payload?.csvColumns)
    ? payload.csvColumns
    : Array.isArray(payload?.destinationColumns)
      ? payload.destinationColumns
      : [];

  return Array.from(
    new Set(
      (headersFromFile.length > 0 ? headersFromFile : csvColumnsFromPayload).filter(
        (col): col is string => typeof col === "string" && Boolean(col.trim())
      )
    )
  );
}

export function buildPrefilledMap(
  sourceColumns: string[],
  destinationColumns: string[]
) {
  const prefilled: Record<string, string> = {};
  sourceColumns.forEach((sourceName) => {
    const matchedDestination = destinationColumns.find(
      (destination) => normalizeFieldName(destination) === normalizeFieldName(sourceName)
    );
    if (matchedDestination) prefilled[sourceName] = matchedDestination;
  });
  return prefilled;
}
