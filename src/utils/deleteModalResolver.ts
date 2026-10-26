const DELETE_NAME_KEYS = [
  "businessTradeName",
  "insuranceName",
  "wholesalerName",
  "brand",
  "drugName",
  "medicineName",
  "softwareName",
  "description",
  "ndc",
  "rxno",
  "invoiceNumber",
  "name",
  "title",
] as const;

const getTextValue = (row: Record<string, unknown>, key: string) => {
  const value = row[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const hasValue = (row: Record<string, unknown>, key: string) => {
  const value = row[key];
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const resolveDeleteItemName = (row: Record<string, unknown>) => {
  const matchedKey = DELETE_NAME_KEYS.find((key) => getTextValue(row, key) !== null);
  if (!matchedKey) return "this item";
  return getTextValue(row, matchedKey) ?? "this item";
};

export const resolveDeleteTitle = (row: Record<string, unknown>) => {
  if (getTextValue(row, "businessTradeName")) return "Delete Pharmacy";
  if (getTextValue(row, "insuranceName")) return "Delete Insurance";
  if (getTextValue(row, "wholesalerName")) return "Delete Wholesaler";
  if (getTextValue(row, "softwareName")) return "Delete Pharmacy Software";

  if (
    hasValue(row, "quantityBilled") ||
    hasValue(row, "totalInsurancePaidAmount") ||
    hasValue(row, "primaryInsuranceBinNo")
  ) {
    return "Delete Billing";
  }

  if (
    hasValue(row, "quantityPurchased") ||
    getTextValue(row, "invoiceNumber") ||
    (hasValue(row, "wholesalerId") && hasValue(row, "pharmacyId") && getTextValue(row, "ndc"))
  ) {
    return "Delete Purchase";
  }

  if (
    hasValue(row, "strength") ||
    hasValue(row, "strengthUnit") ||
    hasValue(row, "dosageForm") ||
    hasValue(row, "unitOfMeasure") ||
    getTextValue(row, "brand") ||
    getTextValue(row, "drugName")
  ) {
    return "Delete Medicine";
  }

  return "Delete Item";
};
