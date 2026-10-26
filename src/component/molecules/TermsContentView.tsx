import React from "react";
import "./TermsContentView.css";

type TermsContentViewProps = {
  html: string;
  className?: string;
};

export default function TermsContentView({
  html,
  className = "",
}: TermsContentViewProps) {
  return (
    <div
      className={`terms-content-view ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
