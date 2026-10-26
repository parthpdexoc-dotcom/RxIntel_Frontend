import React from "react";

export type DashSimpleTableColumn = {
  key: string;
  label: string;
};

type DashSimpleTableProps = {
  columns: DashSimpleTableColumn[];
  rows: Array<Record<string, React.ReactNode>>;
  emptyMessage?: string;
  className?: string;
};

export default function DashSimpleTable({
  columns,
  rows,
  emptyMessage = "No records yet.",
  className,
}: DashSimpleTableProps) {
  return (
    <table className={`page-dash-table${className ? ` ${className}` : ""}`}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} title={col.label}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col.key}>{row[col.key]}</td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="page-dash-table-empty">
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
