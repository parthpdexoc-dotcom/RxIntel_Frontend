import React from "react";
import TableSortLabel from "@mui/material/TableSortLabel";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import type { ListSortDirection } from "../../types/listPageParam";
import "./SortableColumnHeader.css";

type SortableColumnHeaderProps = {
  label: string;
  active: boolean;
  direction: ListSortDirection;
  onSort: () => void;
  align?: "left" | "center" | "right";
  rowSpan?: number;
  colSpan?: number;
  className?: string;
  style?: React.CSSProperties;
  resizeHandle?: React.ReactNode;
};

export default function SortableColumnHeader({
  label,
  active,
  direction,
  onSort,
  align = "center",
  rowSpan,
  colSpan,
  className,
  style,
  resizeHandle,
}: SortableColumnHeaderProps) {
  const textAlign =
    align === "left" ? "left" : align === "right" ? "right" : "center";

  return (
    <th
      rowSpan={rowSpan}
      colSpan={colSpan}
      scope="col"
      title={label}
      style={style}
      className={`sortable-column-header sortable-column-header--${align}${className ? ` ${className}` : ""}`}
      aria-sort={
        active
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <TableSortLabel
        active={active}
        direction={active ? direction : "asc"}
        onClick={onSort}
        IconComponent={ArrowDownwardRoundedIcon}
        className="sortable-column-header__sort-label"
        sx={{
          color: "inherit",
          flexDirection: textAlign === "right" ? "row-reverse" : "row",
          gap: "4px",
          "&:hover": { color: "inherit" },
          "&:focus": { color: "inherit" },
          "& .MuiTableSortLabel-icon": {
            opacity: active ? 1 : 0.45,
            color: active ? "var(--rd-gold, #2d5bff)" : "inherit",
            fontSize: "15px !important",
            width: "15px",
            height: "15px",
            margin: 0,
            marginLeft: "4px",
          },
        }}
      >
        <span className="sortable-column-header__text">{label}</span>
      </TableSortLabel>
      {resizeHandle}
    </th>
  );
}
