import React from "react";
import { FaArrowLeft } from "react-icons/fa";
import "./Button.css";

type ButtonType = "add" | "save" | "reset" | "cancel" | "active" | "inactive" | "back";

type Props = {
  type: ButtonType;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
  isActive?: boolean;
};

export default function Button({ type, onClick, disabled, label, isActive }: Props) {
  const config = {
    add: { text: label || "+ Add", style: "primary" },
    save: { text: "Save", style: "primary" },
    reset: { text: "Reset", style: "secondary" },
    cancel: { text: "Cancel", style: "secondary" },

    // 👇 STATUS CHIPS (table rows: no isActive → always filled; filters: pass isActive)
    active: { text: label || "Active", style: "status active" },
    inactive: { text: label || "Inactive", style: "status inactive" },
  };

  if (type === "back") {
    return (
      <button
        type="button"
        className={`common-btn back ${disabled ? "disabled" : ""}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={label || "Go back"}
      >
        <span className="common-btn-back-arrow" aria-hidden>
          <FaArrowLeft />
        </span>
        <span className="common-btn-back-label">{label || "Back"}</span>
      </button>
    );
  }

  const btn = config[type];

  if (type === "active" || type === "inactive") {
    const selected = isActive === undefined ? true : Boolean(isActive);
    const pillClass = selected
      ? `common-btn status ${type === "active" ? "active" : "inactive"}`
      : "common-btn status-filter-plain";

    return (
      <button
        className={`${pillClass} ${disabled ? "disabled" : ""}`}
        onClick={onClick}
        disabled={disabled}
      >
        {btn.text}
      </button>
    );
  }

  return (
    <button
      className={`common-btn ${btn.style} ${disabled ? "disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {btn.text}
    </button>
  );
}