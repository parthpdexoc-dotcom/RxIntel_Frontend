import React, { useEffect, useRef } from "react";
import CommonModal from "../atoms/CommonModal";
import Button from "../atoms/Button";

type DeleteConfirmModalProps = {
  open: boolean;
  title: string;
  itemName: string;
  detail?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
  onExited?: () => void;
};

export default function DeleteConfirmModal({
  open,
  title,
  itemName,
  detail,
  onClose,
  onConfirm,
  confirming = false,
  onExited,
}: DeleteConfirmModalProps) {
  const wasOpen = useRef(open);

  useEffect(() => {
    if (wasOpen.current && !open) {
      onExited?.();
    }
    wasOpen.current = open;
  }, [open, onExited]);

  if (!open) return null;

  return (
    <CommonModal
      open={open}
      onClose={confirming ? () => {} : onClose}
      contentClassName="modal-content app-modal-form app-modal-form--compact"
    >
      <div className="app-modal-header">
        <h3>{title}</h3>
      </div>

      <div className="app-modal-body">
        <p className="app-modal-message">Are you sure you want to delete</p>
        <p className="app-modal-message-strong">{itemName}</p>
        {detail ? <p className="app-modal-message">{detail}</p> : null}
      </div>

      <div className="app-modal-actions">
        <div className="app-modal-actions-buttons">
          <Button type="cancel" onClick={onClose} disabled={confirming} />
          <button
            type="button"
            className={`common-btn primary${confirming ? " disabled" : ""}`}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </CommonModal>
  );
}
