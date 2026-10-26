import type { DateRangeValue } from "./ReportDateRangePicker";

const STORAGE_KEY = "rxintel-report-dashboard-filters";

const EMPTY_FILTERS = {
  pharmacyId: "",
  billingDateRange: null as DateRangeValue,
  orderedDateRange: null as DateRangeValue,
};

export function loadReportDashboardFilters() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore private mode / storage errors.
  }

  return EMPTY_FILTERS;
}

const DOLLARS_BILLED_VISIBLE_STORAGE_KEY = "rxintel-report-dashboard-show-dollars-billed";

export function loadShowDollarsBilled(): boolean {
  try {
    const saved = sessionStorage.getItem(DOLLARS_BILLED_VISIBLE_STORAGE_KEY);
    if (saved !== null) {
      return saved === "true";
    }
  } catch {
    // Ignore private mode / storage errors.
  }
  return true;
}

export function saveShowDollarsBilled(visible: boolean): void {
  try {
    sessionStorage.setItem(DOLLARS_BILLED_VISIBLE_STORAGE_KEY, String(visible));
  } catch {
    // Ignore
  }
}

export type VisibleMetricsConfig = {
  showDollarsBilled: boolean;
  hiddenColumns: string[];
};

export const DEFAULT_METRICS_CONFIG: VisibleMetricsConfig = {
  showDollarsBilled: true,
  hiddenColumns: [],
};

const METRICS_CONFIG_STORAGE_KEY = "rxintel-report-dashboard-metrics-config";

export function loadVisibleMetricsConfig(): VisibleMetricsConfig {
  try {
    const saved = sessionStorage.getItem(METRICS_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_METRICS_CONFIG,
        ...parsed,
        hiddenColumns: Array.isArray(parsed.hiddenColumns) ? parsed.hiddenColumns : [],
      };
    }
  } catch {
    // Ignore private mode / sessionStorage errors.
  }
  return DEFAULT_METRICS_CONFIG;
}

export function saveVisibleMetricsConfig(config: VisibleMetricsConfig): void {
  try {
    sessionStorage.setItem(METRICS_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore
  }
}


