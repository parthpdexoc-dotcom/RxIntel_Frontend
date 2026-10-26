/** Merge stored CSV headers with mapped row sources and non-empty draft values. */
export function mergeCsvColumnOptions(
  storedHeaders: string[],
  listRows: unknown[],
  csvFieldFromRow: (row: unknown) => string,
  drafts: Record<string, string>
): string[] {
  const headers = new Set(storedHeaders);
  if (Array.isArray(listRows)) {
    for (const row of listRows) {
      const csv = csvFieldFromRow(row);
      if (csv.trim()) headers.add(csv.trim());
    }
  }
  for (const v of Object.values(drafts)) {
    if (typeof v === "string" && v.trim()) headers.add(v.trim());
  }
  return Array.from(headers);
}

/** Dropdown options from server only — not session-local upload cache. */
export function buildCsvColumnsFromServerData(
  sourceColumns: string[],
  dbHeaders: string[],
  rows: unknown[],
  csvFieldFromRow: (row: unknown) => string,
  drafts: Record<string, string>
): string[] {
  const storedBase = Array.from(new Set([...sourceColumns, ...dbHeaders]));
  return mergeCsvColumnOptions(storedBase, rows, csvFieldFromRow, drafts);
}

/** Prefer explicit draft (including cleared ""); do not fall back to server row when draft key exists. */
export function sourceValueForDestination(
  destination: string,
  sourceDrafts: Record<string, string>,
  csvFromRow: string
): string {
  if (Object.prototype.hasOwnProperty.call(sourceDrafts, destination)) {
    return sourceDrafts[destination];
  }
  return csvFromRow;
}
