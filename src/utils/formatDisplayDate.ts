import dayjs, { Dayjs } from "dayjs";

/** UI display format (tables, date pickers). */
export const DISPLAY_DATE_FORMAT = "MM/DD/YYYY";

/** UI display format with time (AM/PM). */
export const DISPLAY_DATETIME_FORMAT = "MM/DD/YYYY hh:mm A";

/** API wire format (save to backend). */
export const API_DATE_FORMAT = "YYYY-MM-DD";

export function parseApiDateOnly(value?: string | null): Dayjs | null {
  if (!value?.trim()) return null;

  const datePart = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!datePart) return null;

  const parsed = dayjs(datePart);
  return parsed.isValid() ? parsed.startOf("day") : null;
}

/** Parse API (YYYY-MM-DD), UI (MM/DD/YYYY), or general ISO date strings. */
export function parseDisplayDateOnly(value?: string | null): Dayjs | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();

  const apiParsed = parseApiDateOnly(trimmed);
  if (apiParsed?.isValid()) return apiParsed;

  const displayMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (displayMatch) {
    const [, month, day, year] = displayMatch;
    const parsed = dayjs(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
    if (parsed.isValid()) return parsed.startOf("day");
  }

  const generalParsed = dayjs(trimmed);
  return generalParsed.isValid() ? generalParsed.startOf("day") : null;
}

/** True when the user is still typing MM/DD/YYYY (not a complete date yet). */
export function isPartialDisplayDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || parseDisplayDateOnly(trimmed)) return false;

  return (
    /YYYY/i.test(trimmed) ||
    /^\d{1,2}\/\d{1,2}\/?\d{0,3}$/.test(trimmed) ||
    (/^\d{2}\/\d{2}\//.test(trimmed) && trimmed.length < 10)
  );
}

export function toApiDateOnly(date: Dayjs): string {
  return date.format(API_DATE_FORMAT);
}

/**
 * Formats a date value (string, Date, Dayjs) to MM/DD/YYYY using Dayjs.
 */
export function formatDisplayDate(
  value?: string | Date | Dayjs | null,
  empty = ""
): string {
  if (!value) return empty;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format(DISPLAY_DATE_FORMAT) : empty;
  }

  if (value instanceof Date) {
    const d = dayjs(value);
    return d.isValid() ? d.format(DISPLAY_DATE_FORMAT) : empty;
  }

  const str = String(value).trim();
  if (!str || str === "—" || str === "null" || str === "undefined") return empty;

  const parsed = parseDisplayDateOnly(str);
  return parsed?.isValid() ? parsed.format(DISPLAY_DATE_FORMAT) : empty;
}

/**
 * Formats a datetime value (string, Date, Dayjs) to MM/DD/YYYY hh:mm A using Dayjs.
 */
export function formatDisplayDateTime(
  value?: string | Date | Dayjs | null,
  empty = ""
): string {
  if (!value) return empty;

  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format(DISPLAY_DATETIME_FORMAT) : empty;
  }

  if (value instanceof Date) {
    const d = dayjs(value);
    return d.isValid() ? d.format(DISPLAY_DATETIME_FORMAT) : empty;
  }

  const str = String(value).trim();
  if (!str || str === "—" || str === "null" || str === "undefined") return empty;

  const d = dayjs(str);
  if (d.isValid()) {
    return d.format(DISPLAY_DATETIME_FORMAT);
  }

  // Fallback for strings formatted like "5/16/2025 18:21"
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (slashMatch) {
    const [, m, day, y, h, min] = slashMatch;
    const parsed = dayjs(`${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:00`);
    if (parsed.isValid()) {
      return parsed.format(DISPLAY_DATETIME_FORMAT);
    }
  }

  return empty;
}

/**
 * Replaces any ISO dates (YYYY-MM-DD) embedded in arbitrary text with MM/DD/YYYY using Dayjs.
 * e.g. "2025-05-16 (Must be on or after)" -> "05/16/2025 (Must be on or after)"
 */
export function formatDisplayDateInText(text?: string | null): string {
  if (!text) return "";
  // 1. Replace ISO dates (YYYY-MM-DD) with MM/DD/YYYY
  let result = text.replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})T?(\d{1,2}:\d{2}(?::\d{2})?)?\b/g, (_, y, m, d, time) => {
    const parsed = dayjs(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    const datePart = parsed.isValid() ? parsed.format(DISPLAY_DATE_FORMAT) : `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y}`;
    return time ? `${datePart} ${time}` : datePart;
  });
  // 2. Replace hyphenated US dates (MM-DD-YYYY) with slashes (MM/DD/YYYY)
  result = result.replace(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g, (_, m, d, y) => {
    return `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y}`;
  });
  return result;
}

/** Value for HTML `input type="date"` (YYYY-MM-DD). */
export function toDateInputValue(value?: string | null): string {
  const parsed = parseApiDateOnly(value);
  return parsed?.isValid() ? toApiDateOnly(parsed) : "";
}

/** @deprecated Use {@link formatDisplayDate} instead. */
export function formatDateDdMmYy(value: string | null | undefined): string {
  return formatDisplayDate(value);
}
