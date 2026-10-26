import React from "react";

type DashActivityItemProps = {
  icon: React.ReactNode;
  title: string;
  name: string;
  time: string;
  className?: string;
};

export default function DashActivityItem({
  icon,
  title,
  name,
  time,
  className,
}: DashActivityItemProps) {
  return (
    <div
      className={`page-dash-activity-item${className ? ` ${className}` : ""}`}
    >
      <div className="page-dash-activity-icon">{icon}</div>
      <div className="page-dash-activity-content">
        <p className="page-dash-activity-title">{title}</p>
        <div className="page-dash-activity-meta">
          <span className="page-dash-activity-name">{name}</span>
          <span className="page-dash-activity-time">{time}</span>
        </div>
      </div>
    </div>
  );
}
