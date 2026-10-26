import React, { useEffect, useRef, useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  DISPLAY_DATE_FORMAT,
  isPartialDisplayDate,
  parseDisplayDateOnly,
  toApiDateOnly,
} from "../../utils/formatDisplayDate";
import "./FormDateField.css";

interface Props {
  label: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  /** Render the calendar in a body portal (use inside scrollable modals). */
  popperInPortal?: boolean;
  disabled?: boolean;
  minDate?: Dayjs;
  shouldDisableDate?: (date: Dayjs) => boolean;
}

const DATE_PICKER_UI_SELECTORS = [
  ".MuiPickerPopper-root",
  ".MuiPickersPopper-root",
  ".MuiPickerPopper-paper",
  ".MuiPickersLayout-root",
  ".MuiDateCalendar-root",
  ".MuiMonthCalendar-root",
  ".MuiYearCalendar-root",
  ".MuiPickersCalendarHeader-root",
].join(", ");

function isInsideDatePickerUi(target: Node): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest(DATE_PICKER_UI_SELECTORS))
  );
}

function commitDateValue(
  date: Dayjs | null | undefined,
  onChange: (value: string | null) => void
) {
  if (date?.isValid()) {
    onChange(toApiDateOnly(date));
    return;
  }
  onChange(null);
}

function commitTypedDateValue(
  rawValue: string | undefined,
  onChange: (value: string | null) => void
) {
  const trimmed = rawValue?.trim() ?? "";
  if (!trimmed) {
    onChange(null);
    return;
  }

  const parsed = parseDisplayDateOnly(trimmed);
  if (parsed?.isValid()) {
    commitDateValue(parsed, onChange);
    return;
  }
  if (isPartialDisplayDate(trimmed)) {
    return;
  }
  onChange(null);
}

function readPickerFieldText(container: HTMLDivElement | null): string {
  if (!container) return "";

  const sectionList = container.querySelector(".MuiPickersSectionList-root");
  if (sectionList?.textContent?.trim()) {
    return sectionList.textContent.trim();
  }

  const input = container.querySelector("input");
  return input?.value?.trim() ?? "";
}

export default function FormDateField({
  label,
  value,
  onChange,
  onBlur,
  required,
  error,
  placeholder = DISPLAY_DATE_FORMAT,
  popperInPortal = false,
  disabled = false,
  minDate,
  shouldDisableDate,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedDateRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  valueRef.current = value;
  onChangeRef.current = onChange;

  const closePicker = (options?: { clickAway?: boolean }) => {
    setOpen(false);

    if (
      options?.clickAway &&
      !selectedDateRef.current &&
      !parseDisplayDateOnly(valueRef.current)
    ) {
      selectedDateRef.current = true;
      onChangeRef.current(toApiDateOnly(dayjs().startOf("day")));
    }

    selectedDateRef.current = false;
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (isInsideDatePickerUi(target)) return;
      closePicker({ clickAway: true });
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleOpen = () => {
    selectedDateRef.current = false;
    setOpen(true);
  };

  const handlePickerChange = (date: Dayjs | null) => {
    if (date?.isValid()) {
      selectedDateRef.current = true;
      commitDateValue(date, onChange);
    }
  };

  const handlePickerAccept = (date: Dayjs | null) => {
    selectedDateRef.current = Boolean(date?.isValid());
    commitDateValue(date, onChange);
    setOpen(false);
  };

  const handleFieldBlur = (event: React.FocusEvent) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && wrapRef.current?.contains(nextTarget)) return;
    if (nextTarget && isInsideDatePickerUi(nextTarget)) return;
    commitTypedDateValue(readPickerFieldText(wrapRef.current), onChange);
    onBlur?.();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div
        className={`form-date-field${
          placeholder && !value ? " form-date-field--has-placeholder" : ""
        }`}
      >
        <label>
          {label} {required && <span className="star">*</span>}
        </label>
        <div className="form-date-field-input-wrap" ref={wrapRef}>
          <DesktopDatePicker
            views={["year", "month", "day"]}
            openTo="day"
            format={DISPLAY_DATE_FORMAT}
            value={parseDisplayDateOnly(value)}
            disabled={disabled}
            minDate={minDate}
            shouldDisableDate={shouldDisableDate}
            open={open}
            onOpen={handleOpen}
            onClose={() => closePicker({ clickAway: popperInPortal })}
            onChange={handlePickerChange}
            onAccept={handlePickerAccept}
            slotProps={{
              field: {
                onBlur: handleFieldBlur,
              },
              textField: {
                size: "small",
                fullWidth: true,
                error: Boolean(error),
              },
              openPickerButton: {
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen((current) => {
                    if (current) {
                      selectedDateRef.current = false;
                    }
                    return !current;
                  });
                },
              },
              popper: popperInPortal
                ? {
                    disablePortal: false,
                    placement: "bottom-start",
                    popperOptions: {
                      strategy: "fixed",
                    },
                    sx: { zIndex: 10000 },
                  }
                : {
                    disablePortal: true,
                    placement: "bottom-start",
                    popperOptions: {
                      strategy: "absolute",
                      modifiers: [{ name: "flip", enabled: false }],
                    },
                    sx: { zIndex: 10000 },
                  },
            }}
          />
          {placeholder && !value && (
            <span className="form-date-field-placeholder">{placeholder}</span>
          )}
        </div>
        {error && <span className="error-text">{error}</span>}
      </div>
    </LocalizationProvider>
  );
}
