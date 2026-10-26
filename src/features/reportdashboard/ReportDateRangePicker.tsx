import React, { useRef, useState } from "react";
import Popover from "@mui/material/Popover";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import dayjs, { Dayjs } from "dayjs";
import { DISPLAY_DATE_FORMAT } from "../../utils/formatDisplayDate";
import "./ReportDateRangePicker.css";

const DATE_RANGE_PLACEHOLDER = "Select date range";

type DateRange = {
  start: Dayjs;
  end: Dayjs;
};

type DateRangeValue = DateRange | null;

function createPickerDraftRange(): DateRange {
  return {
    start: dayjs().subtract(29, "day").startOf("day"),
    end: dayjs().endOf("day"),
  };
}

export function isDateRangeSet(range: DateRangeValue): range is DateRange {
  return range != null && range.start.isValid() && range.end.isValid();
}

type Preset = {
  label: string;
  getRange: () => DateRange;
};

const DATE_PRESETS: Preset[] = [
  {
    label: "Last 7 days",
    getRange: () => ({
      start: dayjs().subtract(6, "day").startOf("day"),
      end: dayjs().endOf("day"),
    }),
  },
  {
    label: "Last 30 days",
    getRange: () => ({
      start: dayjs().subtract(29, "day").startOf("day"),
      end: dayjs().endOf("day"),
    }),
  },
  {
    label: "Last 90 days",
    getRange: () => ({
      start: dayjs().subtract(89, "day").startOf("day"),
      end: dayjs().endOf("day"),
    }),
  },
  {
    label: "Last 365 Days",
    getRange: () => ({
      start: dayjs().subtract(364, "day").startOf("day"),
      end: dayjs().endOf("day"),
    }),
  },
  {
    label: "Month to Date",
    getRange: () => ({
      start: dayjs().startOf("month"),
      end: dayjs().endOf("day"),
    }),
  },
  {
    label: "Last Month",
    getRange: () => ({
      start: dayjs().subtract(1, "month").startOf("month"),
      end: dayjs().subtract(1, "month").endOf("month"),
    }),
  },
  {
    label: "Year to Date",
    getRange: () => ({
      start: dayjs().startOf("year"),
      end: dayjs().endOf("day"),
    }),
  },
  {
    label: "Last Year",
    getRange: () => ({
      start: dayjs().subtract(1, "year").startOf("year"),
      end: dayjs().subtract(1, "year").endOf("year"),
    }),
  },
];

const formatRangeLabel = (range: DateRange) =>
  `${range.start.format(DISPLAY_DATE_FORMAT)} - ${range.end.format(DISPLAY_DATE_FORMAT)}`;

type ReportDateRangePickerProps = {
  value: DateRangeValue;
  onChange: (range: DateRange) => void;
  prefixLabel?: string;
  prefixTone?: "billing" | "purchase";
  placeholder?: string;
  /** Used as the calendar selection when the field is empty and the picker opens. */
  defaultDraftRange?: DateRange;
};

export default function ReportDateRangePicker({
  value,
  onChange,
  prefixLabel,
  prefixTone = "billing",
  placeholder = DATE_RANGE_PLACEHOLDER,
  defaultDraftRange,
}: ReportDateRangePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange>(
    value ?? defaultDraftRange ?? createPickerDraftRange()
  );

  const openPicker = () => {
    setDraftRange(value ?? defaultDraftRange ?? createPickerDraftRange());
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const applyRange = (range: DateRange) => {
    const normalized = {
      start: range.start.startOf("day"),
      end: range.end.startOf("day"),
    };
    setDraftRange(normalized);
    onChange(normalized);
  };

  const handleStartChange = (
    date: Dayjs | null,
    _selectionState?: string,
    selectedView?: string
  ) => {
    if (!date?.isValid()) return;
    if (selectedView && selectedView !== "day") return;
    const nextStart = date.startOf("day");
    const nextEnd = nextStart.isAfter(draftRange.end) ? nextStart : draftRange.end;
    applyRange({ start: nextStart, end: nextEnd });
  };

  const handleEndChange = (
    date: Dayjs | null,
    _selectionState?: string,
    selectedView?: string
  ) => {
    if (!date?.isValid()) return;
    if (selectedView && selectedView !== "day") return;
    const nextEnd = date.startOf("day");
    const nextStart = nextEnd.isBefore(draftRange.start) ? nextEnd : draftRange.start;
    applyRange({ start: nextStart, end: nextEnd });
  };

  const handlePreset = (preset: Preset) => {
    applyRange(preset.getRange());
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <button
        ref={triggerRef}
        type="button"
        className={`report-date-range-trigger${open ? " is-open" : ""}`}
        onClick={openPicker}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={prefixLabel ? `${prefixLabel} date range` : "Date range"}
      >
        {prefixLabel && (
          <span
            className={`report-date-range-prefix report-date-range-prefix--${prefixTone}`}
          >
            {prefixLabel}
          </span>
        )}
        <CalendarMonthOutlinedIcon className="report-date-range-trigger-icon" />
        <span
          className={
            value ? undefined : "report-date-range-trigger-placeholder"
          }
        >
          {value ? formatRangeLabel(value) : placeholder}
        </span>
      </button>

      <Popover
        open={open}
        anchorEl={triggerRef.current}
        onClose={closePicker}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: { className: "report-date-range-panel" },
        }}
      >
        <div className="report-date-range-content">
          <div className="report-date-range-column">
            <h4 className="report-date-range-heading">Start Date</h4>
            <DateCalendar
              value={draftRange.start}
              onChange={handleStartChange}
              maxDate={draftRange.end}
              views={["year", "month", "day"]}
              openTo="day"
              className="report-date-range-calendar"
            />
          </div>

          <div className="report-date-range-divider" aria-hidden />

          <div className="report-date-range-column">
            <h4 className="report-date-range-heading">End Date</h4>
            <DateCalendar
              value={draftRange.end}
              onChange={handleEndChange}
              minDate={draftRange.start}
              views={["year", "month", "day"]}
              openTo="day"
              className="report-date-range-calendar"
            />
          </div>

          <div className="report-date-range-divider" aria-hidden />

          <div className="report-date-range-presets">
            <h4 className="report-date-range-heading">Presets</h4>
            <ul className="report-date-range-preset-list">
              {DATE_PRESETS.map((preset) => (
                <li key={preset.label}>
                  <button
                    type="button"
                    className="report-date-range-preset-btn"
                    onClick={() => handlePreset(preset)}
                  >
                    {preset.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Popover>
    </LocalizationProvider>
  );
}

export type { DateRange, DateRangeValue };
export { formatRangeLabel };
