import React from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import "./Pagination.css";

export type PageParam = {
  page: number;
  pageSize: number;
};

type PaginationProps = {
  pageParam: PageParam;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  recordLabel?: string;
};

const getVisiblePages = (current: number, total: number): (number | "ellipsis")[] => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);

  return pages.filter((page, index, items) => {
    if (page !== "ellipsis") {
      return true;
    }

    return items[index - 1] !== "ellipsis";
  });
};

const PaginationComponent: React.FC<PaginationProps> = ({
  pageParam,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  recordLabel = "records",
}) => {
  const pageSize = pageParam?.pageSize || 10;
  const currentPage = pageParam?.page || 1;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startRecord = totalRecords === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRecord = totalRecords === 0 ? 0 : Math.min(safePage * pageSize, totalRecords);
  const visiblePages = getVisiblePages(safePage, totalPages);

  const handleClick = (page: number) => {
    if (page < 1 || page > totalPages || page === safePage) return;
    onPageChange(page);
  };

  return (
    <div className="list-pagination">
      <div className="list-pagination-info">
        <Select
          className="list-pagination-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          size="small"
        >
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={20}>20</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
        </Select>

        <span className="list-pagination-summary">
          {totalRecords === 0
            ? `Showing 0 ${recordLabel}`
            : `Showing ${startRecord} to ${endRecord} of ${totalRecords} ${recordLabel}`}
        </span>
      </div>

      <div className="list-pagination-controls">
        <button
          type="button"
          className="list-pagination-nav"
          onClick={() => handleClick(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="list-pagination-nav-icon" />
          Prev
        </button>

        <div className="list-pagination-pages">
          {visiblePages.map((page, index) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="list-pagination-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                className={`list-pagination-page${page === safePage ? " is-active" : ""}`}
                onClick={() => handleClick(page)}
                aria-label={`Page ${page}`}
                aria-current={page === safePage ? "page" : undefined}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="list-pagination-nav"
          onClick={() => handleClick(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRightIcon className="list-pagination-nav-icon" />
        </button>
      </div>
    </div>
  );
};

export default PaginationComponent;
