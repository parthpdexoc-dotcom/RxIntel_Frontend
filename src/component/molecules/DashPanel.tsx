import React from "react";

type DashPanelProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export default function DashPanel({
  title,
  subtitle,
  children,
  className,
}: DashPanelProps) {
  return (
    <section
      className={`page-dash-panel${className ? ` ${className}` : ""}`}
    >
      <h3 className="page-dash-panel-title">{title}</h3>
      {subtitle ? (
        <p className="page-dash-panel-subtitle">{subtitle}</p>
      ) : null}
      <div className="page-dash-panel-body">{children}</div>
    </section>
  );
}
