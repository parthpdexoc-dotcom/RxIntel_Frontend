import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Tooltip from "@mui/material/Tooltip";
import React, { useMemo, useState } from "react";
import DeleteConfirmModal from "./DeleteConfirmModal";
import ScrollAreaWithLoading from "./ScrollAreaWithLoading";
import { resolveDeleteItemName, resolveDeleteTitle } from "../../utils/deleteModalResolver";
import "./Table.css";

export type TableActionButtonVariant =
  | "edit"
  | "delete"
  | "more";

type TableActionButtonProps = {
  variant: TableActionButtonVariant;
  tooltip: string;
  ariaLabel: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
};

export function DeleteTrashIcon() {
  return (
    <svg
      className="delete-trash-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9.5 4h5l.75 1.5h-6.5L9.5 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5 7h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 7l1.1 13a1 1 0 0 0 1 .9h6.8a1 1 0 0 0 1-.9L18 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 10.5v7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 10.5v7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TableActionButton({
  variant,
  tooltip,
  ariaLabel,
  onClick,
  disabled = false,
  children,
}: TableActionButtonProps) {
  return (
    <Tooltip title={tooltip}>
      <span className="action-tooltip-wrap">
        <button
          type="button"
          className={`action-btn action-btn--${variant}`}
          onClick={onClick}
          disabled={disabled}
          aria-label={ariaLabel}
        >
          {children}
        </button>
      </span>
    </Tooltip>
  );
}

export type Column<T> = {
  header: React.ReactNode;
  accessor: keyof T | string;
  render?: (row: T) => React.ReactNode;
};

const formatCellValue = (value: React.ReactNode): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="cell-empty">–</span>;
  }

  if (typeof value === "string" && value.trim() === "") {
    return <span className="cell-empty">–</span>;
  }

  return value;
};

const renderCellContent = <T,>(col: Column<T>, row: T): React.ReactNode => {
  const value = col.render
    ? col.render(row)
    : ((row as any)[col.accessor] as React.ReactNode);

  return formatCellValue(value);
};

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  /** Zero-based global row index of first row (e.g. API pagination offset) so Sr. No. continues across pages. */
  serialNumberOffset?: number;
  /** When true, shows the same full-area loading overlay used on the report grid. */
  loading?: boolean;
  loadingMessage?: string;
  onEdit?: (row: T) => void;
  onDelete?: (id: any) => void;
  onMore?: (row: T, anchorEl: HTMLElement) => void;
  showEdit?: boolean;
  showDelete?: boolean;
  isEditDisabled?: (row: T) => boolean;
  isDeleteDisabled?: (row: T) => boolean;
  showMore?: boolean;
  moreTooltip?: string;
  /** Icon for the more/group action button (defaults to three-dot menu). */
  moreIcon?: React.ReactNode;
};

function Table<T extends { id?: any }>({
  columns,
  data,
  serialNumberOffset = 0,
  loading = false,
  loadingMessage = "Loading...",
  onEdit,
  onDelete,
  onMore,
  showEdit = false,
  showDelete = false,
  isEditDisabled,
  isDeleteDisabled,
  showMore = false,
  moreTooltip = "More",
  moreIcon,
}: TableProps<T>) {
  const moreActionIcon = moreIcon ?? <MoreVertIcon />;
  const safeData = Array.isArray(data) ? data : [];
  const showActions = showEdit || showDelete || showMore;
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteItemName = useMemo(() => {
    if (!deleteTarget) return "this item";
    return resolveDeleteItemName(deleteTarget as Record<string, unknown>);
  }, [deleteTarget]);

  const deleteTitle = useMemo(() => {
    if (!deleteTarget) return "Delete Item";
    return resolveDeleteTitle(deleteTarget as Record<string, unknown>);
  }, [deleteTarget]);

  const handleOpenDeleteModal = (row: T) => {
    setDeleteTarget(row);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
  };

  const handleDeleteModalExited = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget?.id;
    if (id === null || id === undefined) {
      console.error("DELETE FAILED - ID missing", deleteTarget);
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      setIsDeleting(true);
      const result = onDelete?.(id);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        await result;
      }
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ScrollAreaWithLoading
        loading={loading}
        message={loadingMessage}
        className="table-scroll-shell"
        viewportClassName="table-wrapper"
      >
        <table className="custom-table">
          <thead>
            <tr>
              <th>No.</th>
              {columns.map((col, idx) => (
                <th key={idx}>{col.header}</th>
              ))}
              {showActions && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {safeData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length + (showActions ? 1 : 0) + 1
                  }
                  className="no-data"
                >
                  {loading ? "\u00A0" : "No data found"}
                </td>
              </tr>
            ) : (
              safeData.map((row, rIdx) => {
                const editDisabled = isEditDisabled?.(row) ?? false;
                const deleteDisabled = isDeleteDisabled?.(row) ?? false;

                return (
                <tr key={rIdx}>
                  <td>{serialNumberOffset + rIdx + 1}</td>

                  {columns.map((col, cIdx) => (
                    <td key={cIdx}>{renderCellContent(col, row)}</td>
                  ))}

                  {showActions && (
                    <td className="actions-cell">
                      <div className="actions-wrap">
                        {showEdit && (
                          <TableActionButton
                            variant="edit"
                            tooltip={
                              editDisabled ? "Editing is not allowed" : "Edit"
                            }
                            ariaLabel="Edit"
                            onClick={() => onEdit?.(row)}
                            disabled={editDisabled}
                          >
                            <EditOutlinedIcon />
                          </TableActionButton>
                        )}

                        {showDelete && (
                          <TableActionButton
                            variant="delete"
                            tooltip={
                              deleteDisabled
                                ? "Deleting is not allowed"
                                : "Delete"
                            }
                            ariaLabel="Delete"
                            onClick={() => handleOpenDeleteModal(row)}
                            disabled={deleteDisabled}
                          >
                            <DeleteTrashIcon />
                          </TableActionButton>
                        )}

                        {showMore && (
                          <TableActionButton
                            variant="more"
                            tooltip={moreTooltip}
                            ariaLabel={moreTooltip}
                            onClick={(event) => onMore?.(row, event.currentTarget)}
                          >
                            {moreActionIcon}
                          </TableActionButton>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </ScrollAreaWithLoading>
      <DeleteConfirmModal
        open={isDeleteModalOpen}
        title={deleteTitle}
        itemName={deleteItemName}
        onClose={handleCloseDeleteModal}
        onExited={handleDeleteModalExited}
        onConfirm={() => void handleConfirmDelete()}
        confirming={isDeleting}
      />
    </>
  );
}

export default Table;