/**
 * Medicine Master — single DTO for list, form, create, and update.
 * Empty values use `null` (not empty string). API uses camelCase.
 */
import type { ListPageParam } from "../types/listPageParam";
import type { UnitStrength } from "../enums/Strength";
import { UnitStrengthDescription } from "../enums/Strength";
import type { MedicineForm } from "../enums/MedicineForm";
import { MedicineFormDescription } from "../enums/MedicineForm";

/** Medicine record (GET list / upsert response / form state). `id: null` = new record. */
export interface MedicineMasterDto {
  id: string | null;
  ndc: string | null;
  brand: string | null;
  strength: string | null;
  strengthUnit: UnitStrength | null;
  packageSize: string | null;
  dosageForm: MedicineForm[];
  productNDC: string | null;
  suffix: string | null;
  generic: string | null;
  route: string | null;
  labeler: string | null;
  /** Dropdown / mapping helpers from API */
  isSelected?: boolean;
  isMapped?: boolean;
  selected?: boolean;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export type MedicineMasterListParams = ListPageParam & {
  searchText?: string;
};

export interface MedicineMasterPagedResponse {
  totalRecords: number;
  data: MedicineMasterDto[];
}

/** NDC group child mappings (POST /NDCGroup/save-mappings). */
export interface NdcGroupMappingsDto {
  parentMedicineId: string;
  childMedicineIds: string[];
}

export const EMPTY_MEDICINE_MASTER: MedicineMasterDto = {
  id: null,
  ndc: null,
  brand: null,
  strength: null,
  strengthUnit: null,
  packageSize: null,
  dosageForm: [],
  productNDC: null,
  suffix: null,
  generic: null,
  route: null,
  labeler: null,
};

export function toFormInput(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

/** Pick first non-null value (handles API field renames). */
function pick<T>(...values: (T | null | undefined)[]): T | null {
  for (const value of values) {
    if (value != null && value !== "") return value;
  }
  return null;
}

/** Build label → enum lookup once per enum type. */
function labelMap<T extends number>(descriptions: Record<number, string>): Map<string, T> {
  return new Map(
    Object.entries(descriptions).map(([key, label]) => [
      label.toUpperCase(),
      Number(key) as T,
    ])
  );
}

const STRENGTH_LABELS = labelMap<UnitStrength>(UnitStrengthDescription);
const FORM_LABELS = labelMap<MedicineForm>(MedicineFormDescription);

/** FDA/UCUM normalize: [iU]/mL -> iU/mL; collapse semicolon spacing. */
function normalizeStrengthUnitLabel(value: string): string {
  return value
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * API → UI: backend sends comma-separated labels (e.g. "mg/mL, TABLET").
 * UI multi-select needs enum number arrays.
 * StrengthUnit often uses semicolon-separated FDA combos as a single label
 * (e.g. "mg/1; mg/1") — those are matched as one enum description.
 */
function parseEnumLabels<T extends number>(
  value: unknown,
  descriptions: Record<number, string>,
  labels: Map<string, T>,
  options: { normalizeStrengthUnit?: boolean } = {}
): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      parseEnumLabels(entry, descriptions, labels, options)
    );
  }
  if (typeof value === "number") {
    return descriptions[value] != null ? [value as T] : [];
  }
  if (typeof value !== "string" || !value.trim()) return [];

  const raw = options.normalizeStrengthUnit
    ? normalizeStrengthUnitLabel(value)
    : value.trim();
  if (!raw) return [];

  // Prefer exact full-string match (covers semicolon FDA combos).
  const exact = labels.get(raw.toUpperCase());
  if (exact != null) return [exact];

  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const normalized = options.normalizeStrengthUnit
        ? normalizeStrengthUnitLabel(part)
        : part;
      const num = Number(normalized);
      if (!Number.isNaN(num) && descriptions[num] != null) return num as T;
      return labels.get(normalized.toUpperCase());
    })
    .filter((entry): entry is T => entry != null);
}

/** UI → API: join selected enum labels back to comma-separated string. */
function enumLabelsToCsv<T extends number>(
  values: T[],
  descriptions: Record<number, string>
): string | null {
  if (!values.length) return null;
  return values.map((value) => descriptions[value] ?? String(value)).join(",");
}

/** API → UI: parse a single enum label (uses first value when comma-separated). */
function parseEnumLabel<T extends number>(
  value: unknown,
  descriptions: Record<number, string>,
  labels: Map<string, T>,
  options: { normalizeStrengthUnit?: boolean } = {}
): T | null {
  const parsed = parseEnumLabels(value, descriptions, labels, options);
  return parsed.length > 0 ? parsed[0] : null;
}

/** UI → API: single enum label string. */
function enumLabelToString<T extends number>(
  value: T | null,
  descriptions: Record<number, string>
): string | null {
  if (value == null) return null;
  return descriptions[value] ?? String(value);
}

/** Normalize one API row into form/table shape. */
export function normalizeMedicineMaster(item: unknown): MedicineMasterDto | null {
  if (!item || typeof item !== "object") return null;

  const m = item as Record<string, unknown>;

  return {
    id: pick(m.id as string | null) ?? null,
    ndc: pick(m.ndc as string | null) ?? null,
    brand: pick(m.brand, m.drugName, m.DrugName, m.Brand) as string | null,
    strength: pick(m.strength, m.Strength) != null ? String(pick(m.strength, m.Strength)) : null,
    strengthUnit: parseEnumLabel(
      pick(m.strengthUnit, m.StrengthUnit, m.StrehgthUnit),
      UnitStrengthDescription,
      STRENGTH_LABELS,
      { normalizeStrengthUnit: true }
    ),
    packageSize: pick(m.packageSize as string | null) ?? null,
    dosageForm: parseEnumLabels(
      pick(m.dosageForm, m.form, m.Form, m.DosageForm),
      MedicineFormDescription,
      FORM_LABELS
    ),
    productNDC: pick(m.productNDC, m.ProductNdc) as string | null,
    suffix: pick(m.suffix as string | null) ?? null,
    generic: pick(m.generic as string | null) ?? null,
    route: pick(m.route as string | null) ?? null,
    labeler: pick(m.labeler as string | null) ?? null,
    isSelected: m.isSelected as boolean | undefined,
    isMapped: m.isMapped as boolean | undefined,
    selected: m.selected as boolean | undefined,
    createdDate: pick(m.createdDate as string | null),
    modifiedDate: pick(m.modifiedDate as string | null),
  };
}

export function parseMedicineMasterList(data: unknown): MedicineMasterDto[] {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];

  return rows
    .map((item) => normalizeMedicineMaster(item))
    .filter((item): item is MedicineMasterDto => item !== null);
}

export function parseMedicineMasterPagedResponse(data: unknown): MedicineMasterPagedResponse {
  const payload =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const list = parseMedicineMasterList(payload.data ?? data);
  const totalRecords = Number(
    payload.totalRecords ?? payload.TotalRecords ?? list.length
  );
  return { data: list, totalRecords: Number.isFinite(totalRecords) ? totalRecords : list.length };
}

/** API payload — enum fields are comma-separated labels. */
export function toUpsertPayload(dto: MedicineMasterDto) {
  const {
    createdDate: _createdDate,
    modifiedDate: _modifiedDate,
    isSelected: _isSelected,
    isMapped: _isMapped,
    selected: _selected,
    id,
    strengthUnit,
    dosageForm,
    ...fields
  } = dto;

  const payload = {
    ...fields,
    strengthUnit: enumLabelToString(strengthUnit, UnitStrengthDescription),
    dosageForm: enumLabelsToCsv(dosageForm, MedicineFormDescription),
  };

  return id === null ? payload : { id, ...payload };
}
