/**
 * ERx Audit Module - Centralized UI Labels & Text Dictionary
 * 
 * Provides a single source of truth for all labels, titles, section names,
 * table headers, button texts, dialog messages, and filter toggles within
 * the ERx Audit module.
 */

export const ERX_AUDIT_LABELS = {
  // Module Root
  MODULE_NAME: "ERx Audit",

  // Sections / Submodules
  SECTIONS: {
    DATA: {
      KEY: "data",
      label: "Uploaded Prescription Data",
      title: "ERx Prescription Audit & Discrepancies",
      description:
        "Review audited prescriptions, compare MicroMerchant (dispensed source of truth) vs ERX (prescriber system), and resolve discrepancies.",
      LABEL: "Uploaded Prescription Data",
      TITLE: "ERx Prescription Audit & Discrepancies",
      DESCRIPTION:
        "Review audited prescriptions, compare MicroMerchant (dispensed source of truth) vs ERX (prescriber system), and resolve discrepancies.",
    },
    BATCHES: {
      KEY: "batches",
      label: "Audit Batches & Upload",
      title: "Audit Batches & Upload Management",
      description:
        "Upload raw prescription spreadsheets (Excel/CSV), review import summaries, and trigger automatic discrepancy comparison batches.",
      LABEL: "Audit Batches & Upload",
      TITLE: "Audit Batches & Upload Management",
      DESCRIPTION:
        "Upload raw prescription spreadsheets (Excel/CSV), review import summaries, and trigger automatic discrepancy comparison batches.",
    },
    RULES: {
      KEY: "rules",
      label: "Comparison Rules Configuration",
      title: "Prescription Comparison Rules",
      description:
        "Manage matching rules, tolerances (exact vs loose matches, date ranges, number formats), and field discrepancy severity.",
      LABEL: "Comparison Rules Configuration",
      TITLE: "Prescription Comparison Rules",
      DESCRIPTION:
        "Manage matching rules, tolerances (exact vs loose matches, date ranges, number formats), and field discrepancy severity.",
    },
    SIG_DICTIONARY: {
      KEY: "sig",
      label: "SIG Intelligence (TypeSafe AI)",
      title: "SIG Intelligence & Clinical Evaluation (TypeSafe AI)",
      description:
        "Calibrated System One AI evaluation (jev-latest) for prescription directions (MicroMerchant vs eRx) with real-time clinical equivalence testing.",
      LABEL: "SIG Intelligence (TypeSafe AI)",
      TITLE: "SIG Intelligence & Clinical Evaluation (TypeSafe AI)",
      DESCRIPTION:
        "Calibrated System One AI evaluation (jev-latest) for prescription directions (MicroMerchant vs eRx) with real-time clinical equivalence testing.",
    },
  },

  // KPI Stats Cards
  KPIS: {
    PRESCRIPTIONS_AUDITED: "Prescriptions Audited",
    PRESCRIPTIONS_AUDITED_SUB: "Total records in system",
    TOTAL_RECORDS_IN_BATCH: "Total records in this batch",
    DISCREPANCIES_TO_REVIEW: "Discrepancies To Review",
    DISCREPANCIES_TO_REVIEW_SUB: "Prescriptions needing review",
    REQUIRES_OPERATOR_ATTENTION: "Requires operator attention",
    TOTAL_BATCHES: "Total Batches",
    TOTAL_BATCHES_SUB: "Upload batches processed",
    AUDIT_STATUS: "Audit Status",
    VERIFIED_AUDIT_READY: "Verified & audit ready",
  },

  // Batch Detail Specific Labels
  BATCH_DETAIL: {
    BATCH_PREFIX: "Batch #",
    DETAILS: "Details",
    DEFAULT_FILE_NAME: "Audit File",
    BACK_TO_BATCHES: "Back to Batches",
    TITLE: "Batch Upload & Prescription Audit Data",
    FILE_LABEL: "File:",
    UPLOADED_LABEL: "Uploaded:",
    RECENTLY: "Recently",
  },

  // Action Buttons & Labels
  ACTIONS: {
    RELOAD_DATA: "Refresh",
    RELOAD_DATA_TOOLTIP: "Refresh prescription records from database",
    RELOAD_SEED_DATA: "Refresh",
    RELOAD_SEED_TOOLTIP: "Refresh prescription records from database",
    REFRESH: "Refresh",
    REFRESH_TOOLTIP: "Refresh audit records and discrepancy summary",
    EXPORT_EXCEL: "Export Excel",
    EXPORT_EXCEL_TOOLTIP: "Export all data with backend columns to Excel (.xlsx)",
    EXPORT_CSV: "Export CSV",
    EXPORT_CSV_TOOLTIP: "Export all data with backend columns to CSV",
    EXPORTING: "Exporting...",
    UPLOAD_AUDIT_FILE: "Upload ERx Audit File",
    UPLOAD_MODAL_TITLE: "Upload ERx Audit Comparison Sheet",
    PROCESSING_BATCH: "Processing Batch...",
    UPLOAD_AND_COMPARE: "Upload & Compare",
    BACK_TO_BATCHES: "Back to Batches",
    VIEW_AUDIT: "View Audit",
    VIEW_AUDIT_TOOLTIP: "Drill into batch prescriptions",
    DELETE: "Delete",
    DELETE_TOOLTIP: "Delete audit batch",
    COMPARE: "Compare",
    COMPARE_TOOLTIP: "Compare MicroMerchant vs ERX side-by-side",
    IGNORE: "Ignore",
    REVIEW: "Review",
    CORRECT: "Correct",
    REOPEN: "Reopen",
    CLEAR_FILTER: "Clear Filter",
    CLEAR_FILTERS: "Clear Filters",
    DESELECT_ALL: "Deselect All",
    SWITCH_TO_FOCUSED: "Switch to Focused Columns",
    VIEW_ALL_COLUMNS: "View All Columns",
    ADD_RULE: "Add Comparison Rule",
    SAVE_RULE: "Save Rule",
    ADD_SIG_MAPPING: "Add Direction / SIG Mapping",
    SAVE_SIG_MAPPING: "Save Mapping",
  },

  // View & Filter Toggles
  FILTERS: {
    LAYOUT_VIEW: "Layout View:",
    FULL_GRID: "All Uploaded Data (Full Grid)",
    SUMMARY_VIEW: "Audit Summary View",
    DATA_FILTER: "Data Filter:",
    ALL_PRESCRIPTIONS: "All Prescriptions",
    DISCREPANCIES_ONLY: "Discrepancies Only",
    FILTER_BY_BATCH: "Filter by Upload Batch",
    ALL_UPLOADED_BATCHES: "All Uploaded Batches",
    FILTER_BY_DISCREPANCY_TYPE: "Filter by Discrepancy Type:",
    SEARCH_PRESCRIPTIONS_PLACEHOLDER: "Search by RX#, Patient, Doctor, Drug...",
    SEARCH_BATCHES_PLACEHOLDER: "Search batches by file name or uploader...",
    SEARCH_RULES_PLACEHOLDER: "Search rules by rule name or column name...",
    SEARCH_SIG_PLACEHOLDER: "Search abbreviation (e.g. PO, BID) or English statement...",
  },

  // Table Super-Headers (Categories across columns)
  SUPER_HEADERS: {
    IDENTIFIERS_ACTIONS: "IDENTIFIERS & ACTIONS",
    INSURANCE_BILLING: "INSURANCE & BILLING (AUDIT PRIORITY & CLAIMS)",
    MICROMERCHANT: "MICROMERCHANT (INTERNAL PHARMACY SYSTEM SOURCE OF TRUTH)",
    ERX: "ERX (PHYSICIAN E-PRESCRIBING SYSTEM DATA)",
    LOGISTICS_DUR: "CLINICAL, LOGISTICS & DUR",
  },

  // Table Headers
  TABLE_HEADERS: {
    // Identifiers & Actions
    SELECT_ALL: "Select All",
    RX_NUMBER: "RX Number",
    STATUS: "Status",
    ACTIONS: "Actions",
    DISCREPANCIES: "Discrepancies",
    BATCH_ID: "Batch ID",
    FILE_NAME: "File Name",
    TOTAL_ROWS: "Total Rows",
    UPLOADED_AT: "Uploaded At",
    UPLOADED_BY: "Uploaded By",

    // Payment & Insurance Columns (Columns L, M, N, O)
    PAYMENT_METHOD: "Payment Method",
    INS_CODE: "Insurance Code",
    BIN_NO: "Insurance BIN",
    TOTAL_INS_PAID: "Total Amount Paid",
    PAYMENT_INSURANCE: "Payment & Insurance",
    CLAIM_AMOUNT: "Claim Amount",

    // MicroMerchant Columns
    MM_FILL_NUMBER: "MM Fill #",
    MM_ORDER_DATE: "MM Order Date",
    MM_DATE_FILLED: "MM Date Filled",
    MM_TIME_FILLED: "MM Time Filled",
    MM_PICKUP_DATE: "MM Pickup Date",
    MM_PATIENT_NAME: "MM Patient Name",
    MM_PATIENT_DOB: "MM Patient DOB",
    MM_PATIENT_PHONE: "MM Patient Phone",
    MM_PATIENT_ADDRESS: "MM Patient Address",
    MM_PRESCRIBER_NAME: "MM Prescriber Name",
    MM_PRESCRIBER_NPI: "MM Prescriber NPI",
    MM_PRESCRIBER_DEA: "MM Prescriber DEA",
    MM_DISPENSED_DRUG: "MM Dispensed Drug",
    MM_POTENCY_UNIT: "MM Potency Unit",
    MM_DISPENSED_NDC: "MM Dispensed NDC",
    MM_QTY_ORD: "MM Qty Ord",
    MM_QTY_DISPENSED: "MM Qty Dispensed",
    MM_DAYS_SUPPLY: "MM Days Supply",
    MM_DISPENSED_SIG: "MM Dispensed Sig",

    // ERX Columns
    ERX_RX_NUMBER: "ERX RX #",
    ERX_ORDER_DATE: "ERX Order Date",
    ERX_EFFECTIVE_DATE: "ERX Effective Date",
    ERX_RECEIVED_TIME: "ERX Received Time",
    ERX_PATIENT_NAME: "ERX Patient Name",
    ERX_PATIENT_DOB: "ERX Patient DOB",
    ERX_PATIENT_PHONE: "ERX Patient Phone",
    ERX_PATIENT_ADDRESS: "ERX Patient Address",
    ERX_PRESCRIBER_NAME: "ERX Prescriber Name",
    SUPERVISOR_NAME: "Supervisor Name",
    ERX_PRESCRIBER_NPI: "ERX Prescriber NPI",
    ERX_PRESCRIBER_DEA: "ERX Prescriber DEA",
    ERX_DRUG_NAME: "ERX Drug Name",
    ERX_POTENCY_UNIT: "ERX Potency Unit",
    ERX_NDC: "ERX NDC",
    ERX_QTY_ORD: "ERX Qty Ord",
    ERX_QTY_DISPENSED: "ERX Qty Dispensed",
    ERX_DAYS_SUPPLY: "ERX Based Days Supply",
    ERX_SIG: "ERX Sig",

    // Clinical, Logistics & DUR Columns
    DAW_CODE: "MM DAW / ERX DAW",
    REFILLS: "Refills (MM / ERX)",
    COPAY: "Copay",
    DELIVERY: "Delivery",
    RX_ORIGIN: "Rx Origin",
    SIGNATURE: "Signature",
    FOLLOW_UP_TAG: "Follow Up Tag",
    TELEPHONE_NOTES: "Telephone Notes",
    ERX_NOTES: "ERX Notes",
    DUR_REASON: "DUR Reason",
    MESSAGE: "Message",

    // Focused & Summary Columns
    DISPENSED_DRUG: "Dispensed Drug",
    DISPENSED_DRUG_MM: "Dispensed Drug (MM)",
    PRESCRIBED_DRUG_ERX: "Prescribed Drug (ERX)",
    PATIENT: "Patient",
    PRESCRIBER: "Prescriber",
    DATES_FILL_ORDER: "Dates (Fill / Order)",
    QTY_MM_ERX: "Qty (MM / ERX)",
    DAYS_SUPPLY_SUMMARY: "Days Supply",
    REFILLS_SUMMARY: "Refills (MM / ERX)",
    AUDIT_RESULT: "Audit Result",
    ACTION: "Action",
    FIELD_NAME: "Field Name",
    MM_SOURCE_OF_TRUTH: "MicroMerchant (Internal Source of Truth)",
    ERX_PRESCRIBED: "ERX (Physician Prescribed)",
    STATUS_COL: "Status",
    RESOLUTION_COL: "Resolution",
    RULE_ID: "Rule ID",
    FIELD_GROUP: "Field Group",
    MM_COLUMN: "MicroMerchant Column",
    ERX_COLUMN: "ERX Column",
    MATCH_TYPE: "Match Type",
    INSURANCE_SCOPE: "Insurance Scope",
    ACTIVE: "Active",
    ABBREVIATION_CODE: "Abbreviation (Code)",
    CLINICAL_MEANING: "Expanded Clinical Meaning (English)",
    SUPPLY_CALCULATION_RULE: "Supply Calculation Rule",
  },

  // Status & Badges
  STATUS_BADGES: {
    MATCH_CLEAN: "Match (Clean)",
    MATCH: "Match",
    ALL_CLEAN_0_MISMATCHES: "All Clean (0 Mismatches)",
    MISMATCH: "Mismatch",
    MISMATCHES: "Mismatches",
    IGNORED: "Ignored",
    REVIEWED: "Reviewed",
    CORRECTED: "Corrected",
    OPEN: "Open",
    RESOLVED: "Resolved",
    ACTIVE: "Active",
    DISABLED: "Disabled",
    ALL_PAYERS: "All Payers",
    NORMALIZED_SIG: "Normalized SIG",
    MM_SOURCE: "MM Source",
    ERX_SOURCE: "ERX Source",
    MM_DISPENSED_LABEL: "MicroMerchant (Dispensed)",
    ERX_PRESCRIBED_LABEL: "Physician E-Prescribed",
    COMPLETED: "Completed",
    FAILED: "Failed",
  },

  // User Notifications, Empty States & Explanatory Texts
  MESSAGES: {
    UPLOAD_SUCCESS: "ERx audit file uploaded and processed successfully.",
    SEED_SUCCESS: "Sample ERx audit data loaded and processed successfully.",
    LOADING_DATA: "Loading uploaded data...",
    NO_RECORDS_FOUND:
      "No prescription records found. Click \"Refresh\" or upload an Excel file.",
    NO_DISCREPANCIES_DETECTED:
      "No discrepancies detected for this prescription. All fields match.",
    COLUMN_DISCREPANCY_LEGEND_TITLE: "Column Discrepancy Legend:",
    COLUMN_DISCREPANCY_LEGEND_DESC:
      "Column headers display red warning badges showing the open discrepancy count for that field. Click any badge or column header to toggle filtering, or select chips below.",
    COLUMN_DISCREPANCY_LEGEND_PREFIX: "Column headers display red warning badges (e.g.",
    COLUMN_DISCREPANCY_LEGEND_SUFFIX: ") showing the open discrepancy count for that field. Click any badge or column header to toggle filtering, or select chips below.",
    FILTERED_BY: "Filtered by:",
    ALL_COLUMNS_VIEW: "All Columns View",
    SWITCH_TO_FOCUSED_COLUMNS: "Switch to Focused Columns",
    VIEW_ALL_COLUMNS: "View All Columns",
    IGNORE_SELECTED_DISCREPANCIES: "Ignore Selected Discrepancies",
    FILE_VALIDATION_EXCEL_CSV: "Please select a valid Excel (.xlsx, .xls, .xlsm) or CSV file.",
    FILE_DROP_VALIDATION: "Please drop a valid Excel or CSV file.",
    FILE_CHOOSE_PROMPT: "Please choose a file to upload.",
    DRAG_DROP_PROMPT: "Drag and drop your audit file here",
    BROWSE_COMPUTER_PROMPT: "or click to browse your computer (.xlsx, .xls, .xlsm, .csv)",
    FILE_SELECTED: "File Selected",
    UPLOAD_MODAL_DESC:
      "Upload an Excel (.xlsx, .xls) or CSV sheet containing prescription rows with both MICROMERCHANT (internal pharmacy source) and ERX (e-prescribing) columns.",
    DELETE_BATCH_TITLE: "Delete Audit Batch",
    DELETE_BATCH_ITEM: "this audit batch",
    DELETE_RULE_TITLE: "Delete Comparison Rule",
    DELETE_RULE_ITEM: "this comparison rule",
    DELETE_SIG_TITLE: "Delete Direction / SIG Mapping",
    DELETE_SIG_ITEM: "this SIG mapping",
    DISCREPANCY_MODAL_SUBTITLE: "Showing complete uploaded data comparing MicroMerchant and ERX",
    ADDITIONAL_RULE_DISCREPANCIES: "Additional Rule Discrepancies",
  },

  // String Formatter Helpers
  formatMismatches: (count: number) => `${count} Mismatch${count > 1 ? "es" : ""}`,
  formatDiscrepanciesCount: (count: number) => `${count} Discrepanc${count > 1 ? "ies" : "y"}`,
  formatPrescriptionsSelected: (count: number) => `${count} prescription${count > 1 ? "s" : ""} selected`,
  formatShowingMismatches: (count: number) => `Showing ${count} prescription(s) with mismatches`,
  formatIgnoreAllForColumn: (ruleName: string, count: number) => `Ignore All for "${ruleName}" (${count})`,
  formatIgnoreSelectedForColumn: (ruleName: string, count: number) => `Ignore Selected for "${ruleName}" (${count})`,
  formatClearFilters: (count: number) => `Clear Filters (${count})`,
  formatFocusedViewBadge: (ruleName: string) => `Focused "${ruleName}" View`,
  formatIgnoreColumnTooltip: (ruleName: string, rxNumber: string) => `Ignore ${ruleName} discrepancy for RX# ${rxNumber}`,
  formatAllUploadedDataTitle: (rxNumber: string) => `All Uploaded Prescription Data — RX# ${rxNumber}`,
  formatShowingFieldsCount: (displayed: number, total: number) => `Showing ${displayed} of ${total} fields`,
} as const;

export default ERX_AUDIT_LABELS;
