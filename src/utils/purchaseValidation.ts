/** Matches backend Purchase validation patterns. */

const NDC_DIGITS_PATTERN = /^\d{10,11}$/;
const PACKAGE_SIZE_PATTERN = /^\d+(\.\d+)?$/;
const INVOICE_NUMBER_PATTERN = /^[A-Za-z0-9\-/]+$/;
const QUANTITY_PURCHASED_PATTERN = /^\d+(\.\d+)?$/;

const NDC_FORMAT_ERROR =
  "NDC must be 10-11 digits (hyphens optional, e.g. 0002821501 or 0002-8215-01)";
const PACKAGE_SIZE_FORMAT_ERROR = "Package Size must be a valid format";
const INVOICE_NUMBER_FORMAT_ERROR =
  "Invoice Number must contain only letters, numbers, hyphens, and slashes";
export const QUANTITY_PURCHASED_NUMBER_ERROR =
  "quantity purchased only contain number";

/** Matches backend: plain or hyphenated NDC is valid when digits-only form is 10-11 long. */
export function hasValidNdcFormat(ndc: string): boolean {
  const digits = ndc.trim().replace(/-/g, "");
  return NDC_DIGITS_PATTERN.test(digits);
}

/** Strip to digits and hyphens for NDC inputs. */
export function sanitizeNdcInput(value: string): string {
  return value.replace(/[^0-9-]/g, "");
}

/** Strip to digits and at most one decimal point. */
export function sanitizeDecimalQuantityInput(value: string): string {
  let result = "";
  let hasDot = false;

  for (const char of value) {
    if (/\d/.test(char)) {
      result += char;
      continue;
    }
    if (char === "." && !hasDot) {
      result += char;
      hasDot = true;
    }
  }

  return result;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getNdcValidationMessage(
  value: string,
  required = false
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "NDC is required" : null;
  }
  if (!hasValidNdcFormat(trimmed)) {
    return NDC_FORMAT_ERROR;
  }
  return null;
}

/** Returns error when NDC contains invalid characters while typing. */
export function getNdcTypingValidationMessage(value: string): string | null {
  if (!value) return null;
  if (/[^0-9-]/.test(value)) {
    return NDC_FORMAT_ERROR;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getPackageSizeValidationMessage(
  value: string,
  required = false
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "Package Size is required" : null;
  }
  if (!PACKAGE_SIZE_PATTERN.test(trimmed)) {
    return PACKAGE_SIZE_FORMAT_ERROR;
  }
  return null;
}

/** Returns error when package size contains invalid characters while typing. */
export function getPackageSizeTypingValidationMessage(
  value: string
): string | null {
  if (!value) return null;
  if (/[^\d.]/.test(value) || (value.match(/\./g) ?? []).length > 1) {
    return PACKAGE_SIZE_FORMAT_ERROR;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getInvoiceNumberValidationMessage(
  value: string,
  required = false
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "Invoice Number is required" : null;
  }
  if (!INVOICE_NUMBER_PATTERN.test(trimmed)) {
    return INVOICE_NUMBER_FORMAT_ERROR;
  }
  return null;
}

/** Returns error when invoice number contains invalid characters while typing. */
export function getInvoiceNumberTypingValidationMessage(
  value: string
): string | null {
  if (!value) return null;
  if (!INVOICE_NUMBER_PATTERN.test(value)) {
    return INVOICE_NUMBER_FORMAT_ERROR;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getQuantityPurchasedValidationMessage(
  value: string,
  required = false
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "Quantity Purchased is required" : null;
  }
  if (!QUANTITY_PURCHASED_PATTERN.test(trimmed)) {
    return QUANTITY_PURCHASED_NUMBER_ERROR;
  }
  return null;
}

/** Returns error when quantity contains non-numeric characters while typing. */
export function getQuantityPurchasedTypingValidationMessage(
  value: string
): string | null {
  if (!value) return null;
  if (/[^\d.]/.test(value) || (value.match(/\./g) ?? []).length > 1) {
    return QUANTITY_PURCHASED_NUMBER_ERROR;
  }
  return null;
}
