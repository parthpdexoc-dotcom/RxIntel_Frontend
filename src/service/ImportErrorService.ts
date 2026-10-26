import { del, get, put } from "../utils/CommonApi";
import api from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type { ImportErrorListParams } from "../dto/importErrorDto";
import type { ListPageParam } from "../types/listPageParam";
import type { ImportType } from "../enums/ImportType";

export const getImportErrorsApi = (params: ImportErrorListParams) => {
  const query = new URLSearchParams();
  const { importType, searchText, ...pageParams } = params;
  query.set("importType", String(importType));
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  return get(`/ImportError?${query.toString()}`);
};

export const getImportErrorDetailsApi = (
  fileId: string,
  params?: ListPageParam
) => {
  const query = new URLSearchParams();
  appendListPageQuery(query, params ?? { page: 1, pageSize: 500 });
  const qs = query.toString();
  return get(`/ImportError/${fileId}/details${qs ? `?${qs}` : ""}`);
};

export const getImportErrorDetailByIdApi = (detailId: string) =>
  get(`/ImportError/details/${detailId}`);

export const getImportErrorCountApi = (importType: ImportType) =>
  get(`/ImportError/count?importType=${importType}`);

export const getImportErrorUnreadCountsApi = () =>
  get("/ImportError/unread-counts");

export const markImportErrorsViewedApi = (importType: ImportType) =>
  put(`/ImportError/mark-viewed?importType=${importType}`);

export const deleteImportErrorApi = (id: string) =>
  del(`/ImportError/${id}`);

const parseFilenameFromDisposition = (
  disposition?: string
): string | null => {
  if (!disposition) return null;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1])
    return decodeURIComponent(utf8Match[1]);

  const normalMatch = disposition.match(/filename="?([^"]+)"?/i);
  return normalMatch?.[1] ?? null;
};

export const downloadImportErrorApi = async (
  fileId: string
): Promise<{ blob: Blob; filename: string }> => {
  const res = await api.get(`/ImportError/${fileId}/download`, {
    responseType: "blob",
  });

  const filename =
    parseFilenameFromDisposition(res.headers["content-disposition"]) ??
    "import-errors";

  return { blob: res.data as Blob, filename };
};

export const triggerImportErrorDownload = async (
  fileId: string,
  fallbackFileName?: string
) => {
  const { blob, filename } = await downloadImportErrorApi(fileId);
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename || fallbackFileName || "import-errors";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
};
