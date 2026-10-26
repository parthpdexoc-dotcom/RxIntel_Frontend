/** Matches backend Medicine Master validation patterns. */

import type { MedicineMasterDto } from "../dto/medicineMasterDto";
import { toFormInput } from "../dto/medicineMasterDto";
import { buildRequiredFieldMessage } from "./formFieldLabels";
import {
  getNdcTypingValidationMessage,
  getNdcValidationMessage,
  getPackageSizeTypingValidationMessage,
  getPackageSizeValidationMessage,
  sanitizeDecimalQuantityInput,
  sanitizeNdcInput,
} from "./purchaseValidation";

const BRAND_PATTERN = /^[a-zA-Z0-9\s./()%',&+-]+$/;
const GENERIC_PATTERN = /^[a-zA-Z0-9\s.,()/%'+-]+$/;
const ROUTE_PATTERN = /^[a-zA-Z\s();]+$/;
const LABELER_PATTERN = /^[a-zA-Z0-9\s.,&()'/_:-]+$/;
const SUFFIX_PATTERN = /^[a-zA-Z0-9\s.,()/%-]+$/;
const STRENGTH_PART_PATTERN = /^([0-9]+(\.[0-9]+)?|\.[0-9]+)$/;

const BRAND_ERROR =
  "Brand contains invalid characters. Only letters, numbers, spaces, and . / ( ) % ' , & + - are allowed.";
const GENERIC_ERROR =
  "Generic contains invalid characters. Only letters, numbers, spaces, and . , ( ) / % ' + - are allowed.";
const ROUTE_ERROR =
  "Route contains invalid characters. Only letters, spaces, and ( ) ; are allowed.";
const LABELER_ERROR =
  "Labeler contains invalid characters. Only letters, numbers, spaces, and . , - & ( ) ' _ / : are allowed.";
const SUFFIX_ERROR =
  "Suffix contains invalid characters. Only letters, numbers, spaces, and . , ( ) / % - are allowed.";
const STRENGTH_ERROR =
  "Strength must be a numeric value or semicolon-separated numeric values";

const ROUTE_MAX_LENGTH = 100;
const LABELER_MAX_LENGTH = 250;
const SUFFIX_MAX_LENGTH = 500;

export const MEDICINE_MASTER_VALIDATED_FIELDS = [
  "brand",
  "ndc",
  "packageSize",
  "strength",
  "generic",
  "route",
  "labeler",
  "suffix",
] as const;

export type MedicineMasterValidatedField =
  (typeof MEDICINE_MASTER_VALIDATED_FIELDS)[number];

export const MEDICINE_MASTER_TYPING_FIELDS =
  new Set<MedicineMasterValidatedField>(MEDICINE_MASTER_VALIDATED_FIELDS);

export { sanitizeDecimalQuantityInput, sanitizeNdcInput };

function hasValidStrengthValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  const parts = trimmed
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 && parts.every((part) => STRENGTH_PART_PATTERN.test(part));
}

export function getBrandValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!BRAND_PATTERN.test(trimmed)) return BRAND_ERROR;
  return null;
}

export function getBrandTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (!BRAND_PATTERN.test(value)) return BRAND_ERROR;
  return null;
}

export function getGenericValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!GENERIC_PATTERN.test(trimmed)) return GENERIC_ERROR;
  return null;
}

export function getGenericTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (!GENERIC_PATTERN.test(value)) return GENERIC_ERROR;
  return null;
}

export function getRouteValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > ROUTE_MAX_LENGTH) {
    return `Route cannot exceed ${ROUTE_MAX_LENGTH} characters`;
  }
  if (!ROUTE_PATTERN.test(trimmed)) return ROUTE_ERROR;
  return null;
}

export function getRouteTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (!ROUTE_PATTERN.test(value)) return ROUTE_ERROR;
  return null;
}

export function getLabelerValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > LABELER_MAX_LENGTH) {
    return `Labeler cannot exceed ${LABELER_MAX_LENGTH} characters`;
  }
  if (!LABELER_PATTERN.test(trimmed)) return LABELER_ERROR;
  return null;
}

export function getLabelerTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (!LABELER_PATTERN.test(value)) return LABELER_ERROR;
  return null;
}

export function getSuffixValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > SUFFIX_MAX_LENGTH) {
    return `Suffix cannot exceed ${SUFFIX_MAX_LENGTH} characters`;
  }
  if (!SUFFIX_PATTERN.test(trimmed)) return SUFFIX_ERROR;
  return null;
}

export function getSuffixTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (!SUFFIX_PATTERN.test(value)) return SUFFIX_ERROR;
  return null;
}

export function getStrengthValidationMessage(
  value: string,
  required = false
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? buildRequiredFieldMessage("strength") : null;
  }
  if (!hasValidStrengthValue(trimmed)) return STRENGTH_ERROR;
  return null;
}

export function getStrengthTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (/[^0-9.; ]/.test(value)) return STRENGTH_ERROR;
  return null;
}

export function getMedicineMasterFieldValidationMessage(
  field: MedicineMasterValidatedField,
  form: MedicineMasterDto
): string | null {
  switch (field) {
    case "brand":
      return getBrandValidationMessage(toFormInput(form.brand));
    case "ndc":
      return getNdcValidationMessage(toFormInput(form.ndc), true);
    case "packageSize":
      return getPackageSizeValidationMessage(
        toFormInput(form.packageSize),
        true
      );
    case "strength":
      return getStrengthValidationMessage(toFormInput(form.strength), true);
    case "generic":
      return getGenericValidationMessage(toFormInput(form.generic));
    case "route":
      return getRouteValidationMessage(toFormInput(form.route));
    case "labeler":
      return getLabelerValidationMessage(toFormInput(form.labeler));
    case "suffix":
      return getSuffixValidationMessage(toFormInput(form.suffix));
    default:
      return null;
  }
}

export function getMedicineMasterTypingValidationMessage(
  field: MedicineMasterValidatedField,
  form: MedicineMasterDto,
  rawValue?: string
): string | null {
  const value = (key: keyof MedicineMasterDto) =>
    rawValue ??
    toFormInput(form[key] as string | number | null | undefined);

  switch (field) {
    case "brand":
      return getBrandTypingValidationMessage(value("brand"));
    case "ndc":
      return getNdcTypingValidationMessage(value("ndc"));
    case "packageSize":
      return getPackageSizeTypingValidationMessage(value("packageSize"));
    case "strength":
      return getStrengthTypingValidationMessage(value("strength"));
    case "generic":
      return getGenericTypingValidationMessage(value("generic"));
    case "route":
      return getRouteTypingValidationMessage(value("route"));
    case "labeler":
      return getLabelerTypingValidationMessage(value("labeler"));
    case "suffix":
      return getSuffixTypingValidationMessage(value("suffix"));
    default:
      return null;
  }
}

export function collectMedicineMasterFieldErrors(
  form: MedicineMasterDto
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const field of MEDICINE_MASTER_VALIDATED_FIELDS) {
    const message = getMedicineMasterFieldValidationMessage(field, form);
    if (message) {
      fieldErrors[field] = message;
    }
  }

  if (form.strengthUnit == null) {
    fieldErrors.strengthUnit = buildRequiredFieldMessage("strengthUnit");
  }
  if (!form.dosageForm?.length) {
    fieldErrors.dosageForm = buildRequiredFieldMessage("dosageForm");
  }

  return fieldErrors;
}
