export function formatBillingFieldLabelForUi(raw: string | undefined | null): string {
  if (raw == null) return "";
  const t = String(raw).trim();
  if (!t) return "";

  const upper = t.toUpperCase().replace(/\s+/g, "");
  if (upper === "NDC") return "NDC";
  if (upper === "RXNO") return "RXNO";

  return t
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}
