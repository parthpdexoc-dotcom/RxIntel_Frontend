import React, { useState } from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Tooltip from "@mui/material/Tooltip";
import DeleteConfirmModal from "./DeleteConfirmModal";
import CommonModal from "../atoms/CommonModal";
import Pagination from "./Pagination";
import ScrollAreaWithLoading from "./ScrollAreaWithLoading";
import { TableActionButton, DeleteTrashIcon } from "./Table";
import "./Table.css";
import {
  getImportErrorDetailByIdApi,
  getImportErrorDetailsApi,
  triggerImportErrorDownload,
} from "../../service/ImportErrorService";
import {
  normalizeImportErrorDetailList,
  normalizeImportErrorDetailResult,
  IMPORT_ERROR_ACTION_LABELS,
  type ImportErrorDetailDto,
  type ImportErrorFileDto,
  ImportErrorFieldErrorDto,
} from "../../dto/importErrorDto";
import { ImportType } from "../../enums/ImportType";
import dayjs from "dayjs";
import { DISPLAY_DATE_FORMAT, formatDisplayDate } from "../../utils/formatDisplayDate";
import { showError } from "../atoms/ToastHelper";
import "./ExpandableImportErrorTable.css";

function ErrorStatusIcon() {
  return (
    <svg
      className="import-error-status-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 8v5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="0.75" fill="currentColor" />
    </svg>
  );
}

type DetailPageState = {
  page: number;
  pageSize: number;
  totalRecords: number;
};

type ImportErrorDetailsPage = {
  data: ImportErrorDetailDto[];
  totalRecords: number;
};

type ExpandableImportErrorTableProps = {
  data: ImportErrorFileDto[];
  importType: ImportType;
  onDelete: (id: string) => Promise<void>;
  /** Hidden for pharmacy users — data is still scoped to their pharmacy on the backend. */
  showPharmacyName?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  detailsResolver?: (
    fileId: string,
    page: number,
    pageSize: number
  ) => Promise<ImportErrorDetailsPage>;
  getDetailById?: (detailId: string) => Promise<ImportErrorDetailDto | null>;
};

function formatCreatedDate(value?: string | null): string {
  if (!value) return "";
  const datePart = formatDisplayDate(value);
  if (datePart) return datePart;

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(DISPLAY_DATE_FORMAT) : value;
}

function getReferenceLabel(importType: ImportType): string {
  return importType === ImportType.Purchase ? "Invoice Number" : "RX No";
}

const ADMIN_NOTIFIED_MESSAGE =
  "Administrator has been informed about the issue you have noticed, we will get back to you shortly.";

type ImportErrorTypeTheme = {
  variant: "validation" | "configuration" | "field-mapping" | "column-mapping";
  Icon: typeof ReportProblemOutlinedIcon;
};

function getImportErrorTypeTheme(errorType: string): ImportErrorTypeTheme {
  const normalized = errorType.trim().toLowerCase();

  if (normalized.includes("configuration")) {
    return { variant: "configuration", Icon: SettingsOutlinedIcon };
  }

  if (normalized.includes("column mapping") || normalized.includes("columnmapping")) {
    return { variant: "column-mapping", Icon: ViewColumnOutlinedIcon };
  }

  if (normalized.includes("field mapping") || normalized.includes("mapping")) {
    return { variant: "field-mapping", Icon: LinkOutlinedIcon };
  }

  return { variant: "validation", Icon: ReportProblemOutlinedIcon };
}

function getErrorCountSubtitle(count: number): string {
  const label = count === 1 ? "validation error was" : "validation errors were";
  return `${count} ${label} found for this record.`;
}

function shouldShowAdminNotifiedMessage(
  detail: ImportErrorDetailDto,
  variant: ImportErrorTypeTheme["variant"]
): boolean {
  if (variant === "field-mapping") return true;

  return detail.fieldErrors.some((fieldError) =>
    fieldError.errorMessage.toLowerCase().includes("no field mappings found")
  );
}

function getDisplayedFieldErrors(
  detail: ImportErrorDetailDto,
  variant: ImportErrorTypeTheme["variant"]
): ImportErrorFieldErrorDto[] {
  if (!shouldShowAdminNotifiedMessage(detail, variant)) {
    return detail.fieldErrors;
  }

  return [
    ...detail.fieldErrors,
    {
      fieldName: "",
      fieldValue: "",
      errorMessage: ADMIN_NOTIFIED_MESSAGE,
    },
  ];
}

function renderFieldErrorMessages(
  fieldErrors: ImportErrorFieldErrorDto[],
  detailId: string,
  loading: boolean
) {
  if (loading) {
    return <p className="import-error-detail-loading">Loading...</p>;
  }

  if (fieldErrors.length === 0) {
    return (
      <p className="import-error-detail-loading">No validation errors found</p>
    );
  }

  return (
    <ul className="import-error-detail-messages">
      {fieldErrors.map((fieldError, index) => (
        <li key={`${detailId}-${index}`}>
          {fieldError.fieldName ? (
            <>
              <span className="import-error-detail-field-name">
                {fieldError.fieldName}:
              </span>{" "}
              <span className="import-error-detail-field-message">
                {fieldError.errorMessage || "–"}
              </span>
            </>
          ) : (
            <span className="import-error-detail-field-message">
              {fieldError.errorMessage || "–"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ExpandableImportErrorTable({
  data,
  importType,
  onDelete,
  showPharmacyName = true,
  loading = false,
  loadingMessage = "Loading...",
  detailsResolver,
  getDetailById,
}: ExpandableImportErrorTableProps) {
  const referenceLabel = getReferenceLabel(importType);
  const columnCount = showPharmacyName ? 5 : 4;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailsByFileId, setDetailsByFileId] = useState<
    Record<string, ImportErrorDetailDto[]>
  >({});
  const [pageByFileId, setPageByFileId] = useState<
    Record<string, DetailPageState>
  >({});
  const [loadingFileIds, setLoadingFileIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ImportErrorFileDto | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewDetail, setViewDetail] = useState<ImportErrorDetailDto | null>(
    null
  );
  const [viewLoading, setViewLoading] = useState(false);
  const [downloadingFileIds, setDownloadingFileIds] = useState<Set<string>>(
    new Set()
  );

  const loadDetails = async (
    fileId: string,
    page = 1,
    pageSize = 10
  ) => {
    setLoadingFileIds((prev) => new Set(prev).add(fileId));
    try {
      if (detailsResolver) {
        const resolved = await detailsResolver(fileId, page, pageSize);
        setDetailsByFileId((prev) => ({ ...prev, [fileId]: resolved.data }));
        setPageByFileId((prev) => ({
          ...prev,
          [fileId]: {
            page,
            pageSize,
            totalRecords: resolved.totalRecords,
          },
        }));
        return;
      }

      const res = await getImportErrorDetailsApi(fileId, { page, pageSize });
      const list = normalizeImportErrorDetailList(res.data?.data ?? []);
      setDetailsByFileId((prev) => ({ ...prev, [fileId]: list }));
      setPageByFileId((prev) => ({
        ...prev,
        [fileId]: {
          page,
          pageSize,
          totalRecords: Number(res.data?.totalRecords ?? list.length),
        },
      }));
    } catch {
      showError("Error fetching error details");
      setDetailsByFileId((prev) => ({ ...prev, [fileId]: [] }));
      setPageByFileId((prev) => ({
        ...prev,
        [fileId]: { page: 1, pageSize: 10, totalRecords: 0 },
      }));
    } finally {
      setLoadingFileIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const toggleRow = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        void loadDetails(id);
      }
      return next;
    });
  };

  const handleView = async (detail: ImportErrorDetailDto) => {
    setViewLoading(true);
    setViewDetail(detail);
    try {
      if (getDetailById) {
        const full = await getDetailById(detail.id);
        if (full) {
          setViewDetail(full);
          return;
        }
      }
      const res = await getImportErrorDetailByIdApi(detail.id);
      const full = normalizeImportErrorDetailResult(res.data);
      if (full) setViewDetail(full);
    } catch {
      showError("Error fetching error detail");
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async (row: ImportErrorFileDto) => {
    if (!row.id || downloadingFileIds.has(row.id)) return;

    setDownloadingFileIds((prev) => new Set(prev).add(row.id));
    try {
      await triggerImportErrorDownload(row.id, row.fileName);
    } catch {
      showError("Error downloading import errors");
    } finally {
      setDownloadingFileIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      setIsDeleting(true);
      await onDelete(deleteTarget.id);
      setDetailsByFileId((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      setPageByFileId((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const errorTypeLabel = viewDetail?.errorType || "Validation Error";
  const errorDetailTheme = viewDetail
    ? getImportErrorTypeTheme(errorTypeLabel)
    : null;
  const displayedFieldErrors =
    viewDetail && errorDetailTheme
      ? getDisplayedFieldErrors(
          viewDetail,
          errorDetailTheme.variant
        )
      : [];
  const errorCount = displayedFieldErrors.length;
  const HeaderIcon = errorDetailTheme?.Icon ?? ReportProblemOutlinedIcon;

  return (
    <>
      <ScrollAreaWithLoading
        loading={loading}
        message={loadingMessage}
        className="import-error-table-shell"
        viewportClassName="import-error-table-wrapper"
      >
        <table className="import-error-table">
          <thead>
            <tr>
              <th className="import-error-expand-col" aria-label="Expand" />
              <th title="File Name">File Name</th>
              <th title="Created Date">Created Date</th>
              {showPharmacyName && <th title="Pharmacy Name">Pharmacy Name</th>}
              <th title="Action">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="import-error-no-data">
                  {loading ? "\u00A0" : "No data found"}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const isExpanded = expandedIds.has(row.id);
                const details = detailsByFileId[row.id] ?? [];
                const pageState = pageByFileId[row.id] ?? {
                  page: 1,
                  pageSize: 10,
                  totalRecords: 0,
                };
                const isLoadingDetails = loadingFileIds.has(row.id);

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={`import-error-parent-row${
                        isExpanded ? " import-error-parent-row--expanded" : ""
                      }`}
                    >
                      <td className="import-error-expand-col">
                        <button
                          type="button"
                          className="import-error-expand-btn"
                          onClick={() => toggleRow(row.id)}
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded ? "Collapse errors" : "Expand errors"
                          }
                        >
                          {isExpanded ? (
                            <ExpandMoreIcon fontSize="small" />
                          ) : (
                            <ChevronRightIcon fontSize="small" />
                          )}
                        </button>
                      </td>
                      <td>
                        <div className="import-error-filename-cell">
                          <ErrorStatusIcon />
                          <span className="import-error-filename">
                            {row.fileName || "–"}
                          </span>
                        </div>
                      </td>
                      <td>{formatCreatedDate(row.createdDate) || "–"}</td>
                      {showPharmacyName && (
                        <td>{row.pharmacyName || "–"}</td>
                      )}
                      <td className="actions-cell">
                        <div className="actions-wrap">
                          <TableActionButton
                            variant="edit"
                            tooltip={IMPORT_ERROR_ACTION_LABELS.download}
                            ariaLabel={IMPORT_ERROR_ACTION_LABELS.download}
                            disabled={downloadingFileIds.has(row.id)}
                            onClick={() => void handleDownload(row)}
                          >
                            <FileDownloadOutlinedIcon fontSize="small" />
                          </TableActionButton>
                          <TableActionButton
                            variant="delete"
                            tooltip={IMPORT_ERROR_ACTION_LABELS.delete}
                            ariaLabel={IMPORT_ERROR_ACTION_LABELS.delete}
                            onClick={() => setDeleteTarget(row)}
                          >
                            <DeleteTrashIcon />
                          </TableActionButton>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="import-error-detail-row">
                        <td colSpan={columnCount}>
                          <div className="import-error-detail-panel">
                            <table className="import-error-detail-table">
                              <thead>
                                <tr>
                                  <th title="Error Type">Error Type</th>
                                  <th title="NDC">NDC</th>
                                  <th title={referenceLabel}>{referenceLabel}</th>
                                  <th title="Action">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {isLoadingDetails ? (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="import-error-no-data"
                                    >
                                      Loading...
                                    </td>
                                  </tr>
                                ) : details.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="import-error-no-data"
                                    >
                                      No error details found
                                    </td>
                                  </tr>
                                ) : (
                                  details.map((detail) => (
                                    <tr key={detail.id}>
                                      <td>{detail.errorType || "–"}</td>
                                      <td>{detail.ndc || "–"}</td>
                                      <td>{detail.rxNoOrInvoice || "–"}</td>
                                      <td className="import-error-action-cell">
                                        <Tooltip
                                          title={IMPORT_ERROR_ACTION_LABELS.view}
                                        >
                                          <button
                                            type="button"
                                            className="import-error-view-btn"
                                            onClick={() =>
                                              void handleView(detail)
                                            }
                                            aria-label="View error details"
                                          >
                                            <VisibilityOutlinedIcon fontSize="small" />
                                          </button>
                                        </Tooltip>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>

                            <Pagination
                              recordLabel="results"
                              pageParam={{
                                page: pageState.page,
                                pageSize: pageState.pageSize,
                              }}
                              totalRecords={pageState.totalRecords}
                              onPageChange={(page) =>
                                void loadDetails(
                                  row.id,
                                  page,
                                  pageState.pageSize
                                )
                              }
                              onPageSizeChange={(size) =>
                                void loadDetails(row.id, 1, size)
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </ScrollAreaWithLoading>

      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Import Error"
        itemName={deleteTarget?.fileName ?? "this import error"}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
        confirming={isDeleting}
        onExited={() => setDeleteTarget(null)}
      />

      <CommonModal
        open={Boolean(viewDetail)}
        onClose={() => setViewDetail(null)}
        overlayClassName="import-error-detail-modal-overlay"
        contentClassName="modal-content app-modal-form import-error-detail-modal"
      >
        {viewDetail && errorDetailTheme && (
          <>
            <div className="import-error-detail-modal-header">
              <div className="import-error-detail-modal-header-main">
                <div
                  className={`import-error-detail-modal-icon import-error-detail-modal-icon--${errorDetailTheme.variant}`}
                >
                  <HeaderIcon fontSize="medium" />
                </div>
                <div className="import-error-detail-modal-header-text">
                  <h3>{errorTypeLabel}</h3>
                  {!viewLoading && (
                    <p>{getErrorCountSubtitle(errorCount)}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="import-error-detail-modal-close-x"
                onClick={() => setViewDetail(null)}
                aria-label="Close"
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="import-error-detail-modal-divider" />

            <div className="import-error-detail-modal-body">
              <section className="import-error-detail-section">
                <h4 className="import-error-detail-section-title">
                  <BadgeOutlinedIcon fontSize="small" />
                  Record Details
                </h4>
                <div className="import-error-detail-record-cards">
                  <div className="import-error-detail-record-card">
                    <span className="import-error-detail-record-label">
                      NDC
                    </span>
                    <span className="import-error-detail-record-value">
                      {viewDetail.ndc || "–"}
                    </span>
                  </div>
                  <div className="import-error-detail-record-card">
                    <span className="import-error-detail-record-label">
                      {referenceLabel}
                    </span>
                    <span className="import-error-detail-record-value">
                      {viewDetail.rxNoOrInvoice || "–"}
                    </span>
                  </div>
                </div>
              </section>

              <div className="import-error-detail-modal-divider" />

              <section className="import-error-detail-section">
                <h4 className="import-error-detail-section-title import-error-detail-section-title--errors">
                  <WarningAmberOutlinedIcon fontSize="small" />
                  Validation Errors
                  {!viewLoading && errorCount > 0 && (
                    <span className="import-error-detail-count-badge">
                      {errorCount}
                    </span>
                  )}
                </h4>

                {renderFieldErrorMessages(
                  displayedFieldErrors,
                  viewDetail.id,
                  viewLoading
                )}
              </section>
            </div>

            <div className="import-error-detail-modal-divider" />

            <div className="import-error-detail-modal-actions">
              <button
                type="button"
                className="import-error-detail-close-btn"
                onClick={() => setViewDetail(null)}
              >
                Close
              </button>
            </div>
          </>
        )}
      </CommonModal>
    </>
  );
}
