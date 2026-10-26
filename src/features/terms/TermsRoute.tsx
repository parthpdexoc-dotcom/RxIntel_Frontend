import React, { useEffect } from "react";
import TermsAppPage from "./TermsAppPage";
import "./Terms.css";

/** Standalone terms page (new tab / direct URL) — not embedded in the app shell. */
export default function TermsRoute() {
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div className="terms-standalone-shell">
      <TermsAppPage />
    </div>
  );
}
