import React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import "./ScrollAreaWithLoading.css";

type ScrollAreaWithLoadingProps = {
  loading: boolean;
  message?: string;
  className?: string;
  viewportClassName?: string;
  children: React.ReactNode;
};

/**
 * Scrollable region with a loading overlay pinned to the visible area.
 * Overlay stays full-size while content scrolls horizontally/vertically.
 */
export default function ScrollAreaWithLoading({
  loading,
  message = "Loading...",
  className,
  viewportClassName,
  children,
}: ScrollAreaWithLoadingProps) {
  return (
    <div
      className={`scroll-area-with-loading${className ? ` ${className}` : ""}`}
    >
      {loading ? (
        <div
          className="scroll-area-with-loading__overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <CircularProgress
            size={28}
            thickness={4}
            className="scroll-area-with-loading__spinner"
          />
          <span className="scroll-area-with-loading__message">{message}</span>
        </div>
      ) : null}
      <div
        className={`scroll-area-with-loading__viewport${
          viewportClassName ? ` ${viewportClassName}` : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
