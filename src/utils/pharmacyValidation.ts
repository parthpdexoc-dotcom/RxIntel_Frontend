/** Matches backend PharmacyValidationHelper patterns. */

import dayjs from "dayjs";
import { parseDisplayDateOnly } from "./formatDisplayDate";
import type { StateLicenseContext } from "./stateBoardLicenseRules";
import {
  getStateBoardLicenseFormatMessage,
  isValidStateBoardLicenseValue,
  sanitizeStateBoardLicenseValue,
} from "./stateBoardLicenseRules";

export type { StateLicenseContext };

export const ADDRESS_PATTERN = /^[A-Za-z0-9\s,./#-]+$/;
export const BUSINESS_NAME_PATTERN = /^[A-Za-z0-9\s.&'()-]+$/;
export const CITY_PATTERN = /^[A-Za-z\s'-]+$/;
export const PERSON_NAME_PATTERN = /^[A-Za-z\s'-]+$/;
export const CONTACT_TITLE_PATTERN = /^[A-Za-z0-9\s'-]+$/;
export const SOFTWARE_SYSTEM_PATTERN = /^[A-Za-z0-9\s./-]+$/;

export const TEN_DIGITS_PATTERN = /^\d{10}$/;
export const BIN_PATTERN = /^\d{6}$/;
export const MAX_PHONE_DIGITS = 10;
export const MAX_BIN_DIGITS = 6;
export const MAX_GLN_DIGITS = 13;
export const MAX_ZIP_DIGITS = 5;
export const STATE_BOARD_LICENSE_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9-]{5,20}$/;
export const MAX_STATE_BOARD_LICENSE_LENGTH = 20;

/** Strip non-digits and cap at maxDigits for numeric inputs. */
export function sanitizeNumericInput(value: string, maxDigits: number): string {
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

/** Strip non-digits and cap at 10 characters for phone inputs. */
export function sanitizePhoneInput(value: string): string {
  return sanitizeNumericInput(value, MAX_PHONE_DIGITS);
}

/** Strip non-digits and cap at 6 characters for BIN inputs. */
export function sanitizeBinInput(value: string): string {
  return sanitizeNumericInput(value, MAX_BIN_DIGITS);
}

/** Strip non-digits and cap at 13 characters for GLN inputs. */
export function sanitizeGlnInput(value: string): string {
  return sanitizeNumericInput(value, MAX_GLN_DIGITS);
}

/** Strip non-digits and cap at 5 characters for zip inputs. */
export function sanitizeZipInput(value: string): string {
  return sanitizeNumericInput(value, MAX_ZIP_DIGITS);
}

/** Sanitize license input based on selected state (code or name). */
export function sanitizeStateBoardLicenseInput(
  value: string,
  stateContext?: StateLicenseContext | null
): string {
  return sanitizeStateBoardLicenseValue(value, stateContext);
}

/** Returns error message or null if valid. */
export function getStateBoardLicenseValidationMessage(
  value: string,
  required = false,
  stateContext?: StateLicenseContext | null
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "State Board License Number is required" : null;
  }
  if (!isValidStateBoardLicenseValue(trimmed, stateContext)) {
    return getStateBoardLicenseFormatMessage(stateContext);
  }
  return null;
}

const ZIP_PATTERN = /^\d{5}$/;
const GLN_PATTERN = /^\d{13}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Allowed while typing in email — full format is checked on blur. */
const EMAIL_CHAR_PATTERN = /^[A-Za-z0-9@._+-]*$/;

/** Returns error when email contains invalid characters (not incomplete format). */
export function getEmailTypingValidationMessage(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  if (!EMAIL_CHAR_PATTERN.test(trimmed)) {
    return "Please enter a valid email address";
  }
  return null;
}

/** Returns error when value contains non-digit characters. */
export function getDigitsOnlyTypingValidationMessage(
  value: string,
  label: string
): string | null {
  if (!value) return null;
  if (/\D/.test(value)) {
    return `${label} must contain only digits`;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getEmailValidationMessage(
  email: string,
  required = false
): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return required ? "Email is required" : null;
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return "Please enter a valid email address";
  }
  return null;
}

/** Returns error message or null if valid. */
export function getZipValidationMessage(zip: string): string | null {
  if (!ZIP_PATTERN.test(zip.trim())) {
    return "Zip Code must be exactly 5 digits";
  }
  return null;
}

/** Returns error message or null if valid (empty value is allowed). */
export function getGlnValidationMessage(gln: string): string | null {
  const trimmed = gln.trim();
  if (!trimmed) return null;
  if (!GLN_PATTERN.test(trimmed)) {
    return "Global Location Number must be exactly 13 digits";
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getBinNumberValidationMessage(
  binNumber: string,
  required = false
): string | null {
  const trimmed = binNumber.trim();
  if (!trimmed) {
    return required ? "BIN Number is required" : null;
  }
  if (!BIN_PATTERN.test(trimmed)) {
    return "BIN Number must be exactly 6 digits";
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getPhoneFormatValidationMessage(
  phone: string,
  label: string,
  required = false
): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return required ? `${label} must be exactly 10 digits` : null;
  }
  if (!TEN_DIGITS_PATTERN.test(trimmed)) {
    return `${label} must be exactly 10 digits`;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getAddressValidationMessage(
  value: string,
  required = false,
  label = "Address"
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `${label} is required` : null;
  }
  if (!ADDRESS_PATTERN.test(trimmed)) {
    return `${label} contains invalid characters. Only letters, numbers, spaces, and , . / # - are allowed`;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getBusinessNameValidationMessage(
  value: string,
  required = false,
  label = "Business name"
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `${label} is required` : null;
  }
  if (!BUSINESS_NAME_PATTERN.test(trimmed)) {
    return `${label} contains invalid characters. Only letters, numbers, spaces, and . & ' ( ) - are allowed`;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getCityValidationMessage(
  value: string,
  required = false
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "City is required" : null;
  }
  if (!CITY_PATTERN.test(trimmed)) {
    return "City contains invalid characters. Only letters, spaces, and ' - are allowed";
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getPersonNameValidationMessage(
  value: string,
  required = false,
  label = "Name"
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `${label} is required` : null;
  }
  if (!PERSON_NAME_PATTERN.test(trimmed)) {
    return `${label} contains invalid characters. Only letters, spaces, and ' - are allowed`;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getContactTitleValidationMessage(
  value: string,
  required = false,
  label = "Contact Title"
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `${label} is required` : null;
  }
  if (!CONTACT_TITLE_PATTERN.test(trimmed)) {
    return `${label} contains invalid characters. Only letters, numbers, spaces, and ' - are allowed`;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getSoftwareSystemValidationMessage(
  value: string,
  required = false,
  label = "Software System"
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `${label} is required` : null;
  }
  if (!SOFTWARE_SYSTEM_PATTERN.test(trimmed)) {
    return `${label} contains invalid characters. Only letters, numbers, spaces, and . / - are allowed`;
  }
  return null;
}

/** Returns error message or null if valid (empty allowed when required is false). */
export function getExpirationDateValidationMessage(
  value: string | null | undefined,
  label: string,
  required = false
): string | null {
  if (!value?.trim()) {
    return required ? `${label} is required` : null;
  }

  const parsed = parseDisplayDateOnly(value);
  if (!parsed?.isValid()) {
    return `Please enter a valid ${label.toLowerCase()}`;
  }
  if (parsed.isBefore(dayjs().startOf("day"))) {
    return `${label} cannot be in the past`;
  }
  return null;
}

/** Bill/invoice dates: not in the future, not more than 10 years in the past. */
export function getTransactionDateValidationMessage(
  value: string | null | undefined,
  label: string,
  required = false
): string | null {
  if (!value?.trim()) {
    return required ? `${label} is required` : null;
  }

  const parsed = parseDisplayDateOnly(value);
  if (!parsed?.isValid()) {
    return `Please enter a valid ${label.toLowerCase()}`;
  }

  const today = dayjs().startOf("day");
  const tenYearsAgo = today.subtract(10, "year");
  if (parsed.isAfter(today) || parsed.isBefore(tenYearsAgo)) {
    return `${label} cannot be in the future or more than 10 years in the past`;
  }
  return null;
}

/** Join validation messages for bottom-left modal display (supports newlines). */
export function joinValidationMessages(
  ...messages: Array<string | null | undefined>
): string | null {
  const errors = messages.filter((message): message is string => Boolean(message));
  return errors.length > 0 ? errors.join("\n") : null;
}
