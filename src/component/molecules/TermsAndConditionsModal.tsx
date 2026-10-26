import React from "react";
import CommonModal from "../atoms/CommonModal";
import GradientButton from "../atoms/GradientButton";
import TermsContentView from "./TermsContentView";
import "./TermsAndConditionsModal.css";

type TermsAndConditionsModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  html: string;
  loading?: boolean;
  error?: string | null;
};

export default function TermsAndConditionsModal({
  open,
  onClose,
  title = "Terms and Conditions",
  html,
  loading = false,
  error = null,
}: TermsAndConditionsModalProps) {
  return (
    <CommonModal
      open={open}
      onClose={onClose}
      overlayClassName="terms-modal-overlay app-modal-overlay"
      contentClassName="terms-modal-content app-modal-form"
    >
      <div className="terms-modal-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="terms-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="terms-modal-body">
        {loading ? (
          <p className="terms-modal-status" role="status">
            Loading Terms and Conditions…
          </p>
        ) : error ? (
          <p className="terms-modal-error" role="alert">
            {error}
          </p>
        ) : (
          <TermsContentView html={html} />
        )}
      </div>
      <div className="terms-modal-footer">
        <GradientButton type="button" onClick={onClose}>
          Close
        </GradientButton>
      </div>
    </CommonModal>
  );
}
