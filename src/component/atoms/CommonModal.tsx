import React from "react";
import { createPortal } from "react-dom";
import "./ActionMessage.css";
import "./CommonModal.css";

type CommonModalProps = {
  open: boolean;
  onClose: () => void;
  overlayClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

type ModalActionMessageProps = {
  message: string;
};

export function ModalActionMessage({ message }: ModalActionMessageProps) {
  if (!message) return null;

  return (
    <p className="action-message" role="alert">
      {message}
    </p>
  );
}

export default function CommonModal({
  open,
  onClose,
  overlayClassName = "modal-overlay app-modal-overlay",
  contentClassName = "modal-content app-modal-form",
  children,
}: CommonModalProps) {
  if (!open) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest?.(".form-field-custom-select-menu--portal") ||
      target?.closest?.(".MuiPickersPopper-root") ||
      target?.closest?.(".MuiPopover-root") ||
      target?.closest?.(".MuiDialog-root")
    ) {
      return;
    }
    onClose();
  };

  return createPortal(
    <div
      className={overlayClassName}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className={contentClassName}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
