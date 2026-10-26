import React from "react";

export type DashSummaryCardColor = "teal" | "green" | "mint" | "navy";

type DashSummaryCardProps = {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color?: DashSummaryCardColor;
  className?: string;
};

export default function DashSummaryCard({
  title,
  value,
  icon,
  color = "green",
  className,
}: DashSummaryCardProps) {
  return (
    <div
      className={`page-dash-summary-card${className ? ` ${className}` : ""}`}
    >
      <div className="page-dash-summary-copy">
        <p className="page-dash-summary-label">{title}</p>
        <h2 className="page-dash-summary-value">{value}</h2>
      </div>
      <div className={`page-dash-card-icon page-dash-card-icon--${color}`}>
        {icon}
      </div>
    </div>
  );
}
