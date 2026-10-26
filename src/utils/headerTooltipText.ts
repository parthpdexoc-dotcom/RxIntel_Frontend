import React from "react";

/** Flatten a header React node into plain text for tooltips. */
export function headerTooltipText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    return node.map(headerTooltipText).filter(Boolean).join(" ").trim();
  }
  if (React.isValidElement(node)) {
    return headerTooltipText(
      (node.props as { children?: React.ReactNode }).children
    );
  }
  return "";
}
