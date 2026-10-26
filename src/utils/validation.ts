// --- DEA ---

const DEA_PATTERN = /^[A-Za-z]{2}\d{7}$/;
export const MAX_DEA_LENGTH = 9;

/** First 2 characters letters, next 7 digits only. */
export function sanitizeDeaInput(value: string): string {
  const letters: string[] = [];
  const digits: string[] = [];

  for (const char of value) {
    if (letters.length < 2) {
      if (/[A-Za-z]/.test(char)) letters.push(char.toUpperCase());
      continue;
    }
    if (digits.length < 7 && /\d/.test(char)) digits.push(char);
  }

  return letters.join("") + digits.join("");
}

function getFirstLetter(value: string): string | null {
  for (const character of value.trim()) {
    if (/[A-Za-z]/.test(character)) {
      return character.toUpperCase();
    }
  }
  return null;
}

export function hasValidDeaFormat(dea: string): boolean {
  return DEA_PATTERN.test(dea.trim());
}

export function hasValidDeaSecondLetter(
  dea: string,
  businessTradeName: string
): boolean {
  if (!hasValidDeaFormat(dea) || !businessTradeName.trim()) return false;

  const expectedLetter = getFirstLetter(businessTradeName);
  if (!expectedLetter) return false;

  return dea.trim()[1].toUpperCase() === expectedLetter;
}

export function hasValidDeaChecksum(dea: string): boolean {
  if (!hasValidDeaFormat(dea)) return false;

  const digits = dea.trim().slice(2);
  const d1 = Number(digits[0]);
  const d2 = Number(digits[1]);
  const d3 = Number(digits[2]);
  const d4 = Number(digits[3]);
  const d5 = Number(digits[4]);
  const d6 = Number(digits[5]);
  const d7 = Number(digits[6]);

  const sumOdd = d1 + d3 + d5;
  const sumEven = (d2 + d4 + d6) * 2;
  const checkDigit = (sumOdd + sumEven) % 10;

  return checkDigit === d7;
}

/** Returns error message or null if valid */
export function getDeaValidationMessage(
  dea: string,
  businessTradeName: string
): string | null {
  if (!dea.trim()) {
    return "Please enter DEA number";
  }
  if (!hasValidDeaFormat(dea)) {
    return "DEA must be 2 letters followed by 7 digits";
  }
  if (!hasValidDeaSecondLetter(dea, businessTradeName)) {
    return "DEA second letter must match first letter of Business Trade Name";
  }
  if (!hasValidDeaChecksum(dea)) {
    return "DEA check digit is invalid";
  }
  return null;
}

// --- Password ---

export const PASSWORD_REQUIREMENTS_HINT =
  "Minimum 8 characters — letters, numbers, and one symbol";

export function hasMinPasswordLength(password: string): boolean {
  return password.length >= 8;
}

export function hasPasswordLetterAndNumber(password: string): boolean {
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function hasPasswordSymbol(password: string): boolean {
  return /[^A-Za-z0-9]/.test(password);
}

export function isValidPassword(password: string): boolean {
  return (
    hasMinPasswordLength(password) &&
    hasPasswordLetterAndNumber(password) &&
    hasPasswordSymbol(password)
  );
}

/** Returns error message or null if valid */
export function getPasswordValidationMessage(password: string): string | null {
  if (!password.trim()) {
    return "Please enter password";
  }
  if (!hasMinPasswordLength(password)) {
    return "Password must be at least 8 characters";
  }
  if (!hasPasswordLetterAndNumber(password)) {
    return "Password must contain letters and numbers";
  }
  if (!hasPasswordSymbol(password)) {
    return "Password must contain at least one symbol";
  }
  return null;
}

// --- Pharmacy license documents ---

const PHARMACY_DOCUMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export const PHARMACY_DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png";

export const PHARMACY_DOCUMENT_FORMAT_ERROR =
  "Invalid file format. Allowed: PDF, JPG, JPEG, PNG";

export function isValidPharmacyDocumentFile(file: File): boolean {
  const name = file.name.trim().toLowerCase();
  return PHARMACY_DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function getPharmacyDocumentValidationMessage(file: File): string | null {
  if (!isValidPharmacyDocumentFile(file)) {
    return PHARMACY_DOCUMENT_FORMAT_ERROR;
  }
  return null;
}
