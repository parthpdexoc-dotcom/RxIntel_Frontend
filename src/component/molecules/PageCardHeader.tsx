import React from "react";

type PageCardHeaderProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Renders before the title icon (e.g. back navigation). */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
};

export default function PageCardHeader({
  icon,
  title,
  subtitle,
  leading,
  actions,
}: PageCardHeaderProps) {
  const iconNode = React.isValidElement(icon)
    ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: ["page-card-title-icon", (icon.props as { className?: string }).className]
          .filter(Boolean)
          .join(" "),
      })
    : icon;

  return (
    <div className="card-header page-card-header">
      <div className="page-card-title-block">
        <div className="page-card-title-row">
          {leading ? (
            <div className="page-card-title-leading">{leading}</div>
          ) : null}
          <span className="page-card-title-badge" aria-hidden>
            {iconNode}
          </span>
          <div>
            <h2 className="common-header page-card-title">{title}</h2>
            {subtitle ? (
              <p className="page-card-subtitle">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="page-card-actions">{actions}</div> : null}
    </div>
  );
}
