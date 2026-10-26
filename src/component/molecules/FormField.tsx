import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./FormField.css";

interface Props {
  label: string;
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<any>) => void;
  onBlur?: (e: React.FocusEvent<any>) => void;
  error?: string;
  required?: boolean;

  type?: "text" | "select" | "date" | "email" | "password";
  options?: any[];
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  remoteOptions?: boolean;
  optionsLoading?: boolean;
  hasMoreOptions?: boolean;
  onOptionsSearch?: (query: string) => void;
  onLoadMoreOptions?: () => void;
}

const MENU_MAX_HEIGHT = 220;
const MENU_Z_INDEX = 10050;

function getSelectPlaceholder(label: string) {
  return `Select ${label}`;
}

function createSelectChangeEvent(
  name: string,
  value: string | string[]
): React.ChangeEvent<HTMLSelectElement> {
  return {
    target: { name, value } as unknown as HTMLSelectElement,
  } as React.ChangeEvent<HTMLSelectElement>;
}

export function CustomSelect({
  label,
  name,
  value,
  options,
  optionLabel,
  optionValue,
  onChange,
  multiple = false,
  searchable = true,
  remoteOptions = false,
  optionsLoading = false,
  hasMoreOptions = false,
  onOptionsSearch,
  onLoadMoreOptions,
  triggerClassName,
  disabled = false,
}: {
  label: string;
  name: string;
  value: string | string[];
  options: any[];
  optionLabel: string;
  optionValue: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  multiple?: boolean;
  searchable?: boolean;
  remoteOptions?: boolean;
  optionsLoading?: boolean;
  hasMoreOptions?: boolean;
  onOptionsSearch?: (query: string) => void;
  onLoadMoreOptions?: () => void;
  triggerClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement | HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const canTypeSearch = searchable;

  const selectedValues = multiple
    ? (Array.isArray(value) ? value.map(String) : [])
    : value
      ? [String(value)]
      : [];

  const filteredOptions = useMemo(() => {
    if (remoteOptions) return options;
    if (!canTypeSearch || !searchQuery.trim()) return options;

    const query = searchQuery.trim().toLowerCase();
    return options.filter((opt) => {
      const labelText = String(opt[optionLabel]).toLowerCase();
      return labelText.includes(query);
    });
  }, [canTypeSearch, options, optionLabel, remoteOptions, searchQuery]);

  const handleMenuScroll = (event: React.UIEvent<HTMLUListElement>) => {
    if (
      !remoteOptions ||
      !onLoadMoreOptions ||
      !hasMoreOptions ||
      optionsLoading
    ) {
      return;
    }

    const menu = event.currentTarget;
    const distanceFromBottom =
      menu.scrollHeight - menu.scrollTop - menu.clientHeight;
    if (distanceFromBottom < 48) {
      onLoadMoreOptions();
    }
  };

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 2;
    const viewportPadding = 12;
    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
    const spaceAbove = rect.top - gap - viewportPadding;
    const preferredHeight = Math.min(
      MENU_MAX_HEIGHT,
      window.innerHeight * 0.4
    );
    const openUp = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
    const availableSpace = openUp ? spaceAbove : spaceBelow;
    const menuHeight = Math.min(
      preferredHeight,
      Math.max(availableSpace, 120)
    );

    const nextStyle: React.CSSProperties = {
      position: "fixed",
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom + gap,
      bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
      maxHeight: menuHeight,
      zIndex: MENU_Z_INDEX,
    };

    setMenuStyle((prev) => {
      if (
        prev.left === nextStyle.left &&
        prev.width === nextStyle.width &&
        prev.top === nextStyle.top &&
        prev.bottom === nextStyle.bottom &&
        prev.maxHeight === nextStyle.maxHeight
      ) {
        return prev;
      }
      return nextStyle;
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    updateMenuPosition();
    if (canTypeSearch) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }

    const handleReposition = (event?: Event) => {
      // Scrolling inside the menu must not reposition it (causes shake/jitter).
      const target = event?.target;
      if (
        target instanceof Node &&
        menuRef.current &&
        (target === menuRef.current || menuRef.current.contains(target))
      ) {
        return;
      }
      updateMenuPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [canTypeSearch, open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        wrapRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const selectedOptions = options.filter((opt) =>
    selectedValues.includes(String(opt[optionValue]))
  );

  const selectedLabels = selectedOptions.map((opt) => opt[optionLabel]);

  const displayText = selectedLabels.join(", ");
  const selectPlaceholder = getSelectPlaceholder(label);
  const selectedOption = !multiple ? selectedOptions[0] : undefined;

  const comboboxInputValue = multiple
    ? searchQuery
    : open
      ? searchQuery
      : selectedOption
        ? String(selectedOption[optionLabel])
        : searchQuery;

  const comboboxPlaceholder = multiple
    ? selectedOptions.length === 0
      ? selectPlaceholder
      : "Type to search..."
    : selectedOption && !open
      ? ""
      : selectPlaceholder;

  const openCombobox = () => {
    if (disabled) return;
    setOpen(true);
    if (!multiple && selectedOption && !open) {
      setSearchQuery("");
    }
  };

  const handleComboboxInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (disabled) return;

    const input = event.target.value;
    setSearchQuery(input);
    if (remoteOptions) {
      onOptionsSearch?.(input);
    }
    if (!open) setOpen(true);

    if (!multiple && selectedOption && input !== String(selectedOption[optionLabel])) {
      onChange(createSelectChangeEvent(name, ""));
    }
  };

  const handleComboboxInputFocus = () => {
    if (disabled) return;
    setOpen(true);
    if (!multiple && selectedOption) {
      setSearchQuery("");
      setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  const handleOptionClick = (optionVal: string) => {
    if (multiple) {
      const nextValues = selectedValues.includes(optionVal)
        ? selectedValues.filter((item) => item !== optionVal)
        : [...selectedValues, optionVal];
      onChange(createSelectChangeEvent(name, nextValues));
      setSearchQuery("");
      inputRef.current?.focus();
      return;
    }

    onChange(createSelectChangeEvent(name, optionVal));
    setSearchQuery("");
    setOpen(false);
  };

  return (
    <div
      className={`form-field-custom-select${multiple ? " form-field-custom-select--multiple" : ""}${open ? " is-open" : ""}`}
      ref={wrapRef}
    >
      {canTypeSearch ? (
        <div
          ref={triggerRef as React.RefObject<HTMLDivElement>}
          className={`form-field-custom-select-trigger form-field-custom-select-trigger--combobox${triggerClassName ? ` ${triggerClassName}` : ""}${disabled ? " is-disabled" : ""}`}
          onMouseDown={() => openCombobox()}
        >
          <div className="form-field-custom-select-chips-container">
            {multiple &&
              selectedOptions.map((opt) => {
                const optVal = String(opt[optionValue]);
                return (
                  <span key={optVal} className="form-field-custom-select-chip">
                    <span className="form-field-custom-select-chip-label">
                      {opt[optionLabel]}
                    </span>
                    <button
                      type="button"
                      className="form-field-custom-select-chip-remove"
                      tabIndex={-1}
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleOptionClick(optVal);
                      }}
                      title={`Remove ${opt[optionLabel]}`}
                      aria-label={`Remove ${opt[optionLabel]}`}
                    >
                      <svg
                        className="form-field-custom-select-chip-remove-icon"
                        viewBox="0 0 10 10"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          d="M2.2 2.2L7.8 7.8M7.8 2.2L2.2 7.8"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </span>
                );
              })}
            <input
              ref={inputRef}
              type="text"
              className="form-field-custom-select-chip-input"
              value={comboboxInputValue}
              placeholder={comboboxPlaceholder}
              disabled={disabled}
              readOnly={!multiple && !!selectedOption && !open}
              onFocus={handleComboboxInputFocus}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={handleComboboxInputChange}
            />
          </div>
        </div>
      ) : multiple ? (
        <div
          ref={triggerRef as React.RefObject<HTMLDivElement>}
          className={`form-field-custom-select-trigger form-field-custom-select-trigger--combobox${triggerClassName ? ` ${triggerClassName}` : ""}${disabled ? " is-disabled" : ""}`}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
          }}
        >
          <div className="form-field-custom-select-chips-container">
            {selectedOptions.map((opt) => {
              const optVal = String(opt[optionValue]);
              return (
                <span key={optVal} className="form-field-custom-select-chip">
                  <span className="form-field-custom-select-chip-label">
                    {opt[optionLabel]}
                  </span>
                  <button
                    type="button"
                    className="form-field-custom-select-chip-remove"
                    tabIndex={-1}
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleOptionClick(optVal);
                    }}
                    title={`Remove ${opt[optionLabel]}`}
                    aria-label={`Remove ${opt[optionLabel]}`}
                  >
                    <svg
                      className="form-field-custom-select-chip-remove-icon"
                      viewBox="0 0 10 10"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M2.2 2.2L7.8 7.8M7.8 2.2L2.2 7.8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </span>
              );
            })}
            {selectedOptions.length === 0 ? (
              <span className="form-field-custom-select-placeholder">
                {selectPlaceholder}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          className={`form-field-custom-select-trigger${triggerClassName ? ` ${triggerClassName}` : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
          }}
        >
          <span
            className={
              selectedValues.length === 0
                ? "form-field-custom-select-placeholder"
                : undefined
            }
          >
            {selectedValues.length === 0 ? selectPlaceholder : displayText}
          </span>
        </button>
      )}

      <span className="form-field-custom-select-arrow" aria-hidden="true">
        <svg viewBox="0 0 10 6" width="10" height="6">
          <path
            d="M1 1l4 4 4-4"
            stroke="#667085"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            className="form-field-custom-select-menu form-field-custom-select-menu--portal"
            style={menuStyle}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            onScroll={handleMenuScroll}
          >
            {!multiple && (
              <li
                role="option"
                aria-selected={selectedValues.length === 0}
                className={selectedValues.length === 0 ? "is-selected" : undefined}
                onClick={() => handleOptionClick("")}
                onMouseDown={(e) => e.preventDefault()}
              >
                {selectPlaceholder}
              </li>
            )}
            {filteredOptions.length === 0 ? (
              remoteOptions && optionsLoading ? (
                <li
                  className="form-field-custom-select-loading"
                  role="presentation"
                >
                  Loading...
                </li>
              ) : (
                <li className="form-field-custom-select-empty" role="presentation">
                  No results found
                </li>
              )
            ) : (
              <>
                {filteredOptions.map((opt) => {
                  const optionVal = String(opt[optionValue]);
                  const isSelected = selectedValues.includes(optionVal);

                  return (
                    <li
                      key={optionVal}
                      role="option"
                      aria-selected={isSelected}
                      className={
                        multiple
                          ? isSelected
                            ? "is-multi-selected"
                            : undefined
                          : isSelected
                            ? "is-selected"
                            : undefined
                      }
                      onClick={() => handleOptionClick(optionVal)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {multiple && (
                        <span
                          className="form-field-custom-select-check"
                          aria-hidden
                        >
                          {isSelected ? "✓" : ""}
                        </span>
                      )}
                      <span>{opt[optionLabel]}</span>
                    </li>
                  );
                })}
                {remoteOptions && optionsLoading ? (
                  <li
                    className="form-field-custom-select-loading"
                    role="presentation"
                  >
                    Loading...
                  </li>
                ) : null}
              </>
            )}
          </ul>,
          document.body
        )}
    </div>
  );
}

export default function FormField({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required,
  type = "text",
  options = [],
  optionLabel = "",
  optionValue = "",
  placeholder,
  multiple = false,
  searchable = true,
  remoteOptions = false,
  optionsLoading = false,
  hasMoreOptions = false,
  onOptionsSearch,
  onLoadMoreOptions,
}: Props) {
  const inputClassName = error ? "error-input" : undefined;

  return (
    <div className="form-field">
      <label>
        {label} {required && <span className="star">*</span>}
      </label>

      {type === "select" ? (
        <CustomSelect
          label={label}
          name={name}
          value={
            multiple
              ? Array.isArray(value)
                ? value.map(String)
                : []
              : value ?? ""
          }
          options={options}
          optionLabel={optionLabel}
          optionValue={optionValue}
          onChange={onChange}
          multiple={multiple}
          searchable={searchable}
          remoteOptions={remoteOptions}
          optionsLoading={optionsLoading}
          hasMoreOptions={hasMoreOptions}
          onOptionsSearch={onOptionsSearch}
          onLoadMoreOptions={onLoadMoreOptions}
          triggerClassName={inputClassName}
        />
      ) : type === "date" ? (
        <div className="form-field-date-wrap">
          <input
            type="date"
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            className={!value ? "form-field-date-empty" : undefined}
          />
          {!value && placeholder && (
            <span className="form-field-date-placeholder">{placeholder}</span>
          )}
        </div>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={inputClassName}
        />
      )}

      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
