/** Matches backend Billing validation patterns. */

import type { BillingDto } from "../dto/billingDto";
import { toFormInput } from "../dto/billingDto";
import {
  getDigitsOnlyTypingValidationMessage,
  sanitizeBinInput,
} from "./pharmacyValidation";
import {
  getNdcTypingValidationMessage,
  getNdcValidationMessage,
  getPackageSizeTypingValidationMessage,
  getPackageSizeValidationMessage,
  sanitizeDecimalQuantityInput,
  sanitizeNdcInput,
} from "./purchaseValidation";

const RX_NO_PATTERN = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;
const DRUG_THERAPY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s\-'./]*$/;
const DRUG_NAME_PATTERN = /^[a-zA-Z0-9\s./()%'#,&:+-]+$/;
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const INTEGER_PATTERN = /^\d+$/;

const RX_NO_ERROR =
  "RX No must start and end with a letter or number and may contain hyphens in between";
const DRUG_THERAPY_ERROR =
  "Drug Therapy contains invalid characters. Only letters, numbers, spaces, and - ' . / are allowed";
const DRUG_NAME_ERROR =
  "Drug Name contains invalid characters. Only letters, numbers, spaces, and . / ( ) % ' # , & : + - are allowed";
export const QUANTITY_BILLED_NUMBER_ERROR = "quantity billed only contain number";
const DECIMAL_NUMBER_ERROR = "only contain number";

export const BILLING_VALIDATED_FIELDS = [
  "rxno",
  "ndc",
  "drugName",
  "packageSize",
  "quantityBilled",
  "drugTherapy",
  "days",
  "primaryInsurancePaidAmount",
  "primaryInsuranceBinNo",
  "secondaryInsuranceId",
  "secondaryInsurancePaidAmount",
  "secondaryInsuranceBinNo",
] as const;

export type BillingValidatedField = (typeof BILLING_VALIDATED_FIELDS)[number];

export const BILLING_TYPING_FIELDS = new Set<BillingValidatedField>(
  BILLING_VALIDATED_FIELDS
);

export { sanitizeBinInput, sanitizeDecimalQuantityInput, sanitizeNdcInput };

export function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D/g, "");
}

function decimalMessage(
  value: string,
  required: boolean,
  label: string,
  numberError = DECIMAL_NUMBER_ERROR
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? `${label} is required` : null;
  if (!DECIMAL_PATTERN.test(trimmed)) return `${label} ${numberError}`;
  return null;
}

function decimalTypingMessage(
  value: string,
  label: string,
  numberError = DECIMAL_NUMBER_ERROR
): string | null {
  if (!value) return null;
  if (/[^\d.]/.test(value) || (value.match(/\./g) ?? []).length > 1) {
    return `${label} ${numberError}`;
  }
  return null;
}

function binMessage(value: string, label: string, required = false): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? `${label} is required` : null;
  if (trimmed.length > 50) return `${label} cannot exceed 50 characters`;
  if (!/^\d{6}$/.test(trimmed)) return `${label} must be exactly 6 digits`;
  return null;
}

function binTypingMessage(value: string, label: string): string | null {
  if (!value) return null;
  if (value.length > 50) return `${label} cannot exceed 50 characters`;
  return getDigitsOnlyTypingValidationMessage(value, label);
}

export function getBillingFieldValidationMessage(
  field: BillingValidatedField,
  form: BillingDto
): string | null {
  switch (field) {
    case "rxno":
      return getRxNoValidationMessage(toFormInput(form.rxno));
    case "ndc":
      return getNdcValidationMessage(toFormInput(form.ndc), true);
    case "drugName":
      return getDrugNameValidationMessage(toFormInput(form.drugName), true);
    case "packageSize":
      return getPackageSizeValidationMessage(toFormInput(form.packageSize));
    case "quantityBilled":
      return getQuantityBilledValidationMessage(
        toFormInput(form.quantityBilled),
        true
      );
    case "drugTherapy":
      return getDrugTherapyValidationMessage(toFormInput(form.drugTherapy));
    case "days":
      return getDaysValidationMessage(toFormInput(form.days));
    case "primaryInsurancePaidAmount":
      return decimalMessage(
        toFormInput(form.primaryInsurancePaidAmount),
        true,
        "Primary Insurance Paid Amount"
      );
    case "primaryInsuranceBinNo":
      return binMessage(
        toFormInput(form.primaryInsuranceBinNo),
        "Primary Insurance BIN",
        true
      );
    case "secondaryInsuranceId": {
      const paidText = toFormInput(form.secondaryInsurancePaidAmount).trim();
      const requiresInsurance =
        paidText !== "" && Number.parseFloat(paidText) > 0;
      if (requiresInsurance && !toFormInput(form.secondaryInsuranceId)) {
        return "Secondary Insurance is required when Secondary Insurance Paid Amount is greater than zero";
      }
      return null;
    }
    case "secondaryInsurancePaidAmount":
      return decimalMessage(
        toFormInput(form.secondaryInsurancePaidAmount),
        false,
        "Secondary Insurance Paid Amount"
      );
    case "secondaryInsuranceBinNo":
      return binMessage(
        toFormInput(form.secondaryInsuranceBinNo),
        "Secondary Insurance BIN"
      );
    default:
      return null;
  }
}

export function getBillingTypingValidationMessage(
  field: BillingValidatedField,
  form: BillingDto,
  rawValue?: string
): string | null {
  const value = (key: keyof BillingDto) =>
    rawValue ?? toFormInput(form[key] as string | number | null | undefined);

  switch (field) {
    case "rxno":
      return getRxNoTypingValidationMessage(value("rxno"));
    case "ndc":
      return getNdcTypingValidationMessage(value("ndc"));
    case "drugName":
      return getDrugNameTypingValidationMessage(value("drugName"));
    case "packageSize":
      return getPackageSizeTypingValidationMessage(value("packageSize"));
    case "quantityBilled":
      return getQuantityBilledTypingValidationMessage(value("quantityBilled"));
    case "drugTherapy":
      return getDrugTherapyTypingValidationMessage(value("drugTherapy"));
    case "days":
      return getDaysTypingValidationMessage(value("days"));
    case "primaryInsurancePaidAmount":
      return decimalTypingMessage(
        value("primaryInsurancePaidAmount"),
        "Primary Insurance Paid Amount"
      );
    case "primaryInsuranceBinNo":
      return binTypingMessage(value("primaryInsuranceBinNo"), "Primary Insurance BIN");
    case "secondaryInsuranceId": {
      const paidText = toFormInput(form.secondaryInsurancePaidAmount).trim();
      const requiresInsurance =
        paidText !== "" && Number.parseFloat(paidText) > 0;
      if (requiresInsurance && !toFormInput(form.secondaryInsuranceId)) {
        return "Secondary Insurance is required when Secondary Insurance Paid Amount is greater than zero";
      }
      return null;
    }
    case "secondaryInsurancePaidAmount":
      return decimalTypingMessage(
        value("secondaryInsurancePaidAmount"),
        "Secondary Insurance Paid Amount"
      );
    case "secondaryInsuranceBinNo":
      return binTypingMessage(
        value("secondaryInsuranceBinNo"),
        "Secondary Insurance BIN"
      );
    default:
      return null;
  }
}

export function collectBillingFieldErrors(form: BillingDto): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const field of BILLING_VALIDATED_FIELDS) {
    const message = getBillingFieldValidationMessage(field, form);
    if (message) fieldErrors[field] = message;
  }
  return fieldErrors;
}

function getRxNoValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!RX_NO_PATTERN.test(trimmed)) return RX_NO_ERROR;
  return null;
}

function getRxNoTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (!/^[A-Za-z0-9-]*$/.test(value)) return RX_NO_ERROR;
  return null;
}

function getDrugNameValidationMessage(value: string, required = false): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Drug Name is required" : null;
  if (!DRUG_NAME_PATTERN.test(trimmed)) return DRUG_NAME_ERROR;
  return null;
}

function getDrugNameTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (!DRUG_NAME_PATTERN.test(value)) return DRUG_NAME_ERROR;
  return null;
}

function getDrugTherapyValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!DRUG_THERAPY_PATTERN.test(trimmed)) return DRUG_THERAPY_ERROR;
  return null;
}

function getDrugTherapyTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (!DRUG_THERAPY_PATTERN.test(value)) return DRUG_THERAPY_ERROR;
  return null;
}

function getQuantityBilledValidationMessage(
  value: string,
  required = false
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Quantity Billed is required" : null;
  if (!DECIMAL_PATTERN.test(trimmed)) return QUANTITY_BILLED_NUMBER_ERROR;
  return null;
}

function getQuantityBilledTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (/[^\d.]/.test(value) || (value.match(/\./g) ?? []).length > 1) {
    return QUANTITY_BILLED_NUMBER_ERROR;
  }
  return null;
}

function getDaysValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!INTEGER_PATTERN.test(trimmed)) return "days only contain number";
  return null;
}

function getDaysTypingValidationMessage(value: string): string | null {
  return getDigitsOnlyTypingValidationMessage(value, "Days");
}
