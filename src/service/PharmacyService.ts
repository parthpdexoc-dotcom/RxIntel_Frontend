import api, { get, post, del } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type { PharmacyDto, PharmacyListParams } from "../dto/pharmacyDto";
import { toUpsertPayload } from "../dto/pharmacyDto";

export const getPharmacyApi = (params?: PharmacyListParams) => {
  const query = new URLSearchParams();
  const { searchText, isActive, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  if (typeof isActive === "boolean") {
    query.set("isActive", String(isActive));
  }
  const qs = query.toString();
  return get(qs ? `/Pharmacy?${qs}` : "/Pharmacy");
};

export const getPharmacyByIdApi = (id: string) => get(`/Pharmacy/${id}`);

export const savePharmacyApi = (
  data: PharmacyDto,
  files?: { deaLicenseFile?: File | null; stateBoardLicenseFile?: File | null }
) => {
  const formData = new FormData();
  const payload = toUpsertPayload(data);
  for (const [key, value] of Object.entries(payload)) {
    if (value != null && value !== "") {
      formData.append(key, String(value));
    }
  }
  if (files?.deaLicenseFile) {
    formData.append("deaDocument", files.deaLicenseFile);
  }
  if (files?.stateBoardLicenseFile) {
    formData.append("stateBoardLicenseDocument", files.stateBoardLicenseFile);
  }
  return post("/Pharmacy/upsert", formData);
};

export const deletePharmacyApi = (id: string) => del(`/Pharmacy/${id}`);

export type PharmacyDocumentType = "dea" | "state-board";

function parseFilenameFromDisposition(
  disposition: string | undefined
): string | null {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].replace(/"/g, ""));
  } catch {
    return match[1].replace(/"/g, "");
  }
}

function getPharmacyDocumentPath(
  pharmacyId: string,
  documentType: PharmacyDocumentType,
  action: "view" | "download"
): string {
  const segment =
    documentType === "dea" ? "dea-document" : "state-board-license";
  // Cache-bust so View/Download always fetch the latest uploaded file.
  return `/Pharmacy/${encodeURIComponent(pharmacyId)}/${segment}/${action}?t=${Date.now()}`;
}

export async function fetchPharmacyDocument(
  pharmacyId: string,
  documentType: PharmacyDocumentType,
  action: "view" | "download",
  fallbackFileName?: string | null
): Promise<{ blob: Blob; filename: string }> {
  const response = await api.get(
    getPharmacyDocumentPath(pharmacyId, documentType, action),
    {
      responseType: "blob",
    }
  );

  const filename =
    parseFilenameFromDisposition(response.headers["content-disposition"]) ??
    fallbackFileName?.trim() ??
    (documentType === "dea" ? "dea-document.pdf" : "state-board-license.pdf");

  return { blob: response.data as Blob, filename };
}

export async function viewPharmacyDocument(
  pharmacyId: string,
  documentType: PharmacyDocumentType,
  fallbackFileName?: string | null
): Promise<void> {
  const { blob } = await fetchPharmacyDocument(
    pharmacyId,
    documentType,
    "view",
    fallbackFileName
  );
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export async function downloadPharmacyDocument(
  pharmacyId: string,
  documentType: PharmacyDocumentType,
  fallbackFileName?: string | null
): Promise<void> {
  const { blob, filename } = await fetchPharmacyDocument(
    pharmacyId,
    documentType,
    "download",
    fallbackFileName
  );
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
