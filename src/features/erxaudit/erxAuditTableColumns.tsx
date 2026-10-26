import { Box, Chip, Checkbox, Typography, Button as MuiButton, Tooltip } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LocalAtmOutlinedIcon from "@mui/icons-material/LocalAtmOutlined";
import StarsOutlinedIcon from "@mui/icons-material/StarsOutlined";
import { Column } from "../../component/molecules/Table";
import { ErxAuditRecordDto, ErxAuditDiscrepancyDto } from "../../dto/erxAuditDto";
import { formatDisplayDate as formatUsaDate } from "../../utils/formatDisplayDate";
import ERX_AUDIT_LABELS from "./erxAuditLabels";

/**
 * Maps developer/database rule names to clear, pharmacy-friendly terminology
 * so non-tech operators immediately understand what is being audited.
 */
export const formatDiscrepancyRuleName = (name?: string | null): string => {
  if (!name) return "";
  if (name.includes(",")) {
    return name
      .split(",")
      .map((part) => formatDiscrepancyRuleName(part.trim()))
      .filter(Boolean)
      .join(", ");
  }
  const norm = name.trim().toLowerCase();
  if (norm === "fill date sequence") return "Fill Date Mismatch";
  if (norm === "effective date compliance") return "Effective Date Mismatch";
  if (norm === "pickup date sequence") return "Pickup Date Mismatch";
  if (norm === "class 2 narcotic refills") return "C-II Zero Refills";
  if (norm === "dea class 2 narcotic 30-day expiration") return "C-II 30-Day Expiry";
  if (norm === "dea class 3-5 narcotic 180-day expiration") return "C-III-V 180-Day Expiry";
  if (norm === "texas class 2 narcotic 21-day expiration") return "Texas C-II 21-Day Expiry";
  if (norm === "erxorder/erxeffective" || norm === "order vs effective") return "Order vs Effective Date";
  if (norm === "patient refill" || norm === "refill" || norm === "refills originally prescriber sent") return "Refill Count";
  if (norm === "potencyunitcode" || norm === "potency unit") return "Potency Unit";
  if (norm === "days supply") return "Days Supply";
  if (norm === "drug name") return "Drug Name";
  if (norm === "ndc") return "NDC Code";
  if (norm === "sig / directions" || norm === "sig") return "Sig (Directions)";
  return name;
};

export const getDeaBadge = (rxNumber?: string | null, erxRxNumber?: string | null) => {
  const clean = (val?: string | null) => (val || "").replace(/\D/g, "").trim();
  const n1 = clean(rxNumber);
  const n2 = clean(erxRxNumber);
  if (n1.startsWith("2") || n2.startsWith("2")) {
    return (
      <Chip
        size="small"
        label="C-II"
        sx={{
          height: 18,
          fontSize: "0.68rem",
          fontWeight: 700,
          ml: 0.5,
          bgcolor: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #fecaca",
        }}
        title="Class 2 Controlled Substance (Narcotic)"
      />
    );
  }
  const starts345 = (n: string) => n.startsWith("3") || n.startsWith("4") || n.startsWith("5");
  if (starts345(n1) || starts345(n2)) {
    const d = starts345(n1) ? n1[0] : n2[0];
    return (
      <Chip
        size="small"
        label={`C-${d}`}
        sx={{
          height: 18,
          fontSize: "0.68rem",
          fontWeight: 700,
          ml: 0.5,
          bgcolor: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fde68a",
        }}
        title={`Class ${d} Controlled Substance`}
      />
    );
  }
  return null;
};

/**
 * Renders a stylized badge for Payment Method (Column L).
 * Insurance prescriptions are flagged with highest audit priority.
 */
export const getPaymentMethodBadge = (paymentMethod?: string | null) => {
  if (!paymentMethod) return <span style={{ color: "#94a3b8" }}>—</span>;
  const pm = paymentMethod.trim().toUpperCase();
  const isInsurance = pm === "I" || pm === "INSURANCE";
  const isCash = pm === "C" || pm === "CASH";

  if (isInsurance) {
    return (
      <Tooltip title="Insurance Claim: High-Priority Audit Target" arrow>
        <Chip
          size="small"
          icon={<ShieldOutlinedIcon sx={{ fontSize: "14px !important", color: "#1e40af !important" }} />}
          label="Insurance (Priority)"
          sx={{
            height: 22,
            fontSize: "0.72rem",
            fontWeight: 700,
            bgcolor: "#eff6ff",
            color: "#1e40af",
            border: "1px solid #bfdbfe",
            "& .MuiChip-label": { px: 0.75 },
          }}
        />
      </Tooltip>
    );
  }

  if (isCash) {
    return (
      <Chip
        size="small"
        icon={<LocalAtmOutlinedIcon sx={{ fontSize: "14px !important", color: "#475569 !important" }} />}
        label="Cash (C)"
        sx={{
          height: 22,
          fontSize: "0.72rem",
          fontWeight: 600,
          bgcolor: "#f8fafc",
          color: "#475569",
          border: "1px solid #cbd5e1",
          "& .MuiChip-label": { px: 0.75 },
        }}
      />
    );
  }

  return (
    <Chip
      size="small"
      label={paymentMethod}
      sx={{
        height: 22,
        fontSize: "0.72rem",
        fontWeight: 600,
        bgcolor: "#f1f5f9",
        color: "#334155",
      }}
    />
  );
};

/**
 * Renders stylized Insurance Code (Column M) & Insurance BIN (Column N).
 */
export const getInsuranceBadge = (insCode?: string | null, binNo?: string | null) => {
  if (!insCode && !binNo) return <span style={{ color: "#94a3b8" }}>—</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {insCode && (
        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.82rem" }}>
          {insCode}
        </span>
      )}
      {binNo && (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "#475569",
            background: "#f1f5f9",
            padding: "1px 6px",
            borderRadius: 4,
            width: "fit-content",
            border: "1px solid #e2e8f0",
          }}
          title={`Insurance BIN Number: ${binNo}`}
        >
          BIN: {binNo}
        </span>
      )}
    </div>
  );
};

/**
 * Renders Total Amount Paid (Column O), highlighting high-value claims (>= $500).
 */
export const getTotalInsPaidBadge = (amount?: number | null) => {
  if (amount == null) return <span style={{ color: "#94a3b8" }}>—</span>;
  const num = Number(amount);
  const isHighValue = !isNaN(num) && num >= 500;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);

  if (isHighValue) {
    return (
      <Tooltip title={`High-Value Claim: ${formatted} (≥ $500.00)`} arrow>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Chip
            size="small"
            icon={<StarsOutlinedIcon sx={{ fontSize: "14px !important", color: "#92400e !important" }} />}
            label={formatted}
            sx={{
              height: 24,
              fontSize: "0.78rem",
              fontWeight: 800,
              bgcolor: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fcd34d",
              "& .MuiChip-label": { px: 0.75 },
            }}
          />
        </Box>
      </Tooltip>
    );
  }

  return (
    <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.82rem" }}>
      {formatted}
    </span>
  );
};

/**
 * Renders Rx Origin (Column BE), flagging non-electronic prescriptions
 * that require comparison against scanned hardcopies.
 */
export const getRxOriginBadge = (origin?: string | null) => {
  if (!origin) return <span style={{ color: "#94a3b8" }}>—</span>;
  const org = origin.trim().toUpperCase();
  const isElectronic = org === "ELECTRONIC";

  if (isElectronic) {
    return (
      <Chip
        size="small"
        label="ELECTRONIC"
        sx={{
          height: 20,
          fontSize: "0.68rem",
          fontWeight: 600,
          bgcolor: "#f0fdf4",
          color: "#166534",
          border: "1px solid #bbf7d0",
        }}
      />
    );
  }

  return (
    <Tooltip
      title={`Non-Electronic (${origin}): Verify signature, DEA, and details against scanned physical hardcopy`}
      arrow
    >
      <Chip
        size="small"
        icon={<WarningAmberIcon sx={{ fontSize: "13px !important", color: "#991b1b !important" }} />}
        label={`${origin} (Compare Hardcopy)`}
        sx={{
          height: 22,
          fontSize: "0.70rem",
          fontWeight: 700,
          bgcolor: "#fff1f2",
          color: "#991b1b",
          border: "1px solid #fecdd3",
          "& .MuiChip-label": { px: 0.5 },
        }}
      />
    </Tooltip>
  );
};

export const areNdcsMatching = (ndc1?: string | null, ndc2?: string | null): boolean => {
  if (!ndc1 || !ndc2) return false;
  const c1 = ndc1.trim().replace(/[^\w]/g, "");
  const c2 = ndc2.trim().replace(/[^\w]/g, "");
  if (!c1 || !c2) return false;
  const invalid = ["supply", "na", "none", "unknown", "null"];
  if (invalid.includes(c1.toLowerCase()) || invalid.includes(c2.toLowerCase())) return false;
  if (c1.toLowerCase() === c2.toLowerCase()) return true;
  if (c1.replace(/^0+/, "").toLowerCase() === c2.replace(/^0+/, "").toLowerCase()) return true;

  const d1 = c1.replace(/\D/g, "");
  const d2 = c2.replace(/\D/g, "");
  if (d1.length >= 4 && d2.length >= 4) {
    if (d1 === d2) return true;
    if (d1.replace(/^0+/, "") === d2.replace(/^0+/, "")) return true;
    const is10to11 = (ten: string, eleven: string) => {
      if (ten.length !== 10 || eleven.length !== 11) return false;
      return (
        "0" + ten === eleven ||
        ten.substring(0, 5) + "0" + ten.substring(5) === eleven ||
        ten.substring(0, 9) + "0" + ten.substring(9) === eleven
      );
    };
    if (d1.length === 10 && d2.length === 11 && is10to11(d1, d2)) return true;
    if (d1.length === 11 && d2.length === 10 && is10to11(d2, d1)) return true;
  }
  return false;
};

export const isQuantityDispensedCompliant = (
  record?: ErxAuditRecordDto | null
): boolean => {
  if (!record) return false;
  const dispensed =
    record.mmQtyDispensed != null ? Number(record.mmQtyDispensed) : null;
  const ordered =
    record.erxQtyOrd != null
      ? Number(record.erxQtyOrd)
      : record.mmQtyOrd != null
      ? Number(record.mmQtyOrd)
      : record.erxQtyDispensed != null
      ? Number(record.erxQtyDispensed)
      : null;

  if (dispensed == null && ordered == null) return true;
  if (
    dispensed == null ||
    ordered == null ||
    isNaN(dispensed) ||
    isNaN(ordered)
  )
    return false;

  return dispensed <= ordered;
};

export const isDaysSupplyCompliant = (
  record?: ErxAuditRecordDto | null
): boolean => {
  if (!record) return false;
  const mmDays =
    record.mmDispensedDaysSupply != null
      ? Number(record.mmDispensedDaysSupply)
      : null;
  const erxDays =
    record.erxBasedDaysSupply != null
      ? Number(record.erxBasedDaysSupply)
      : record.erxDaysSupply != null
      ? Number(record.erxDaysSupply)
      : null;

  if (mmDays == null && erxDays == null) return true;
  if (mmDays == null || erxDays == null || isNaN(mmDays) || isNaN(erxDays))
    return false;

  // 1. Direct match
  if (Math.abs(mmDays - erxDays) <= 0) return true;

  const maxDays = Math.max(mmDays, erxDays);
  const minDays = Math.min(mmDays, erxDays);
  if (minDays <= 0) return false;

  // 2. Clean 2:1 ratio (e.g. 70 vs 35, 60 vs 30, 56 vs 28, 30 vs 15)
  // Mathematical volumetric days supply vs 1-month / 28-35 day multi-dose vial duration
  if (Math.abs(maxDays - minDays * 2) <= 1) return true;

  // 3. Clean 3:1 ratio (e.g. 84 vs 28, 90 vs 30)
  // 3-month volumetric supply vs 1-month punctured multi-dose vial duration
  if (Math.abs(maxDays - minDays * 3) <= 1) return true;

  // 4. USP <797> Multi-Dose Vial (MDV) 28-35 day beyond-use-date (BUD) punctured container discard rule
  if (minDays >= 28 && minDays <= 35) {
    const drug = `${record.mmDispensedDrugName || ""} ${record.erxDrugName || ""}`.toLowerCase();
    const form = `${record.mmPotencyUnitCode || ""} ${record.erxPotencyUnitCode || ""}`.toLowerCase();
    const sig = `${record.erxSig || ""} ${record.mmDispensedSig || ""}`.toLowerCase();
    const isMultiDose =
      drug.includes("testosterone") ||
      drug.includes("insulin") ||
      drug.includes("cyanocobalamin") ||
      drug.includes("b12") ||
      drug.includes("b-12") ||
      drug.includes("hcg") ||
      drug.includes("chorionic") ||
      drug.includes("medroxyprogesterone") ||
      drug.includes("depo") ||
      drug.includes("somatropin") ||
      drug.includes("growth hormone") ||
      drug.includes("leuprolide") ||
      drug.includes("lupron") ||
      drug.includes("methotrexate") ||
      drug.includes("heparin") ||
      drug.includes("enoxaparin") ||
      drug.includes("lovenox") ||
      drug.includes("vial") ||
      form.includes("inj") ||
      form.includes("ml") ||
      form.includes("vial") ||
      form.includes("mdv") ||
      form.includes("solution") ||
      form.includes("suspension") ||
      sig.includes("inject") ||
      sig.includes("im") ||
      sig.includes("sc") ||
      sig.includes("sq") ||
      sig.includes("subq") ||
      sig.includes("vial") ||
      sig.includes("multidose") ||
      sig.includes("drops") ||
      sig.includes("instill");

    if (isMultiDose) return true;
  }

  return false;
};

export const getMatchingDiscrepancy = (
  record: ErxAuditRecordDto,
  colName: string,
  ruleId?: number | null
): ErxAuditDiscrepancyDto | undefined => {
  if (!record.discrepancies || record.discrepancies.length === 0) return undefined;

  const target = (colName || "").toLowerCase().replace(/[\s_/-]/g, "");
  const isDrugOrNdc = target.includes("drug") || target.includes("medication") || target.includes("ndc");
  if (isDrugOrNdc && areNdcsMatching(record.mmDispensedNdc, record.erxNdc)) {
    return undefined;
  }

  const isQtyDisp =
    target.includes("quantitydispensed") ||
    target.includes("qtydispensed") ||
    target === "quantity" ||
    target === "qty";
  if ((ruleId === 5 || isQtyDisp) && isQuantityDispensedCompliant(record)) {
    return undefined;
  }

  const isDaysSupply = target.includes("dayssupply") || target.includes("days");
  if ((ruleId === 6 || isDaysSupply) && isDaysSupplyCompliant(record)) {
    return undefined;
  }

  let disc: ErxAuditDiscrepancyDto | undefined;
  if (ruleId) {
    disc = record.discrepancies.find((d) => d.ruleId === ruleId);
  } else if (target) {
    disc = record.discrepancies.find((d) => {
      const fg = (d.fieldGroupName || "").toLowerCase().replace(/[\s_/-]/g, "");
      const mm = (d.mmColumnName || "").toLowerCase().replace(/[\s_/-]/g, "");
      const erx = (d.erxColumnName || "").toLowerCase().replace(/[\s_/-]/g, "");
      return (
        fg === target ||
        mm === target ||
        erx === target ||
        fg.includes(target) ||
        target.includes(fg) ||
        mm.includes(target) ||
        target.includes(mm)
      );
    });
  }

  if (disc) {
    if (disc.status === "Corrected") return undefined;
    const fg = (disc.fieldGroupName || "").toLowerCase();
    const mm = (disc.mmColumnName || "").toLowerCase();
    const erx = (disc.erxColumnName || "").toLowerCase();
    const isDiscDrugOrNdc =
      fg.includes("drug") ||
      fg.includes("ndc") ||
      mm.includes("drug") ||
      mm.includes("ndc") ||
      erx.includes("drug") ||
      erx.includes("ndc");
    if (isDiscDrugOrNdc && areNdcsMatching(record.mmDispensedNdc, record.erxNdc)) {
      return undefined;
    }

    const isDiscQtyDisp =
      disc.ruleId === 5 ||
      fg.includes("quantity dispensed") ||
      fg.includes("qty dispensed") ||
      mm.includes("mmqtydispensed") ||
      erx.includes("erxqtydispensed");
    if (isDiscQtyDisp && isQuantityDispensedCompliant(record)) {
      return undefined;
    }

    const isDiscDaysSupply =
      disc.ruleId === 6 ||
      fg.includes("days supply") ||
      mm.includes("dayssupply") ||
      erx.includes("dayssupply");
    if (isDiscDaysSupply && isDaysSupplyCompliant(record)) {
      return undefined;
    }
  }

  return disc;
};

interface ColumnMetadata {
  mmHeader: string;
  erxHeader: string;
  renderMm: (row: ErxAuditRecordDto, disc?: ErxAuditDiscrepancyDto) => React.ReactNode;
  renderErx: (row: ErxAuditRecordDto, disc?: ErxAuditDiscrepancyDto) => React.ReactNode;
}

export const getColumnMeta = (columnName: string): ColumnMetadata => {
  const norm = (columnName || "").toLowerCase().trim();

  // 1. Days Supply
  if (norm.includes("day") && norm.includes("supply")) {
    return {
      mmHeader: "MM Days Supply (Dispensed)",
      erxHeader: "ERX Based Days Supply",
      renderMm: (r, d) => (
        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0369a1" }}>
          {r.mmDispensedDaysSupply ?? d?.mmValue ?? "—"}
        </span>
      ),
      renderErx: (r, d) => (
        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#c2410c" }}>
          {r.erxBasedDaysSupply ?? r.erxDaysSupply ?? d?.erxValue ?? "—"}
        </span>
      ),
    };
  }

  // 2. Drug Name
  if (norm.includes("drug") || norm.includes("medication")) {
    return {
      mmHeader: "MM Dispensed Drug",
      erxHeader: "ERX Prescribed Drug",
      renderMm: (r, d) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0369a1" }}>{r.mmDispensedDrugName || d?.mmValue || "—"}</div>
          {r.mmDispensedNdc && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>NDC: {r.mmDispensedNdc}</div>
          )}
        </div>
      ),
      renderErx: (r, d) => (
        <div>
          <div style={{ fontWeight: 600, color: "#c2410c" }}>{r.erxDrugName || d?.erxValue || "—"}</div>
          {r.erxNdc && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>NDC: {r.erxNdc}</div>
          )}
        </div>
      ),
    };
  }

  // 3. NDC
  if (norm.includes("ndc")) {
    return {
      mmHeader: "MM Dispensed NDC",
      erxHeader: "ERX Prescribed NDC",
      renderMm: (r, d) => (
        <div>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0369a1" }}>
            {r.mmDispensedNdc || d?.mmValue || "—"}
          </span>
          {r.mmDispensedDrugName && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.mmDispensedDrugName}</div>
          )}
        </div>
      ),
      renderErx: (r, d) => (
        <div>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#c2410c" }}>
            {r.erxNdc || d?.erxValue || "—"}
          </span>
          {r.erxDrugName && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.erxDrugName}</div>
          )}
        </div>
      ),
    };
  }

  // 4. POTENCYUNITCODE / Potency Unit
  if (norm.includes("potency") || norm.includes("unitcode")) {
    return {
      mmHeader: "MM Potency Unit Code",
      erxHeader: "ERX Potency Unit Code",
      renderMm: (r, d) => (
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0369a1" }}>
          {r.mmPotencyUnitCode || d?.mmValue || "—"}
        </span>
      ),
      renderErx: (r, d) => (
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#c2410c" }}>
          {r.erxPotencyUnitCode || d?.erxValue || "—"}
        </span>
      ),
    };
  }

  // 5. Sig / Directions
  if (norm.includes("sig") || norm.includes("direction")) {
    return {
      mmHeader: "MM Dispensed Sig (Directions)",
      erxHeader: "ERX Prescribed Sig (Directions)",
      renderMm: (r, d) => (
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0369a1" }}>
          {r.mmDispensedSig || d?.mmValue || "—"}
        </span>
      ),
      renderErx: (r, d) => (
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#c2410c" }}>
          {r.erxSig || d?.erxValue || "—"}
        </span>
      ),
    };
  }

  // 6. Fill Date Sequence (Fill Date vs Order Date)
  if (norm.includes("fill date sequence") || (norm.includes("fill") && norm.includes("sequence"))) {
    return {
      mmHeader: "MM Date Filled",
      erxHeader: "ERX Order Date (Must be ≤ Date Filled)",
      renderMm: (r, d) => (
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0369a1" }}>
          {formatUsaDate(r.mmDateFilled) || d?.mmValue || "—"}
        </span>
      ),
      renderErx: (r, d) => (
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c2410c" }}>
          {formatUsaDate(r.erxOrderDate) || d?.erxValue || "—"}
        </span>
      ),
    };
  }

  // 7. Effective Date Compliance (Fill Date vs Effective Date)
  if (norm.includes("effective date") || norm.includes("compliance")) {
    return {
      mmHeader: "MM Date Filled",
      erxHeader: "ERX Effective Date",
      renderMm: (r, d) => (
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0369a1" }}>
          {formatUsaDate(r.mmDateFilled) || d?.mmValue || "—"}
        </span>
      ),
      renderErx: (r, d) => (
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c2410c" }}>
          {formatUsaDate(r.erxEffectiveDate) || d?.erxValue || "—"}
        </span>
      ),
    };
  }

  // 8. ErxOrder/ErxEffective (Order Date vs Effective Date)
  if (norm.includes("erxorder") || (norm.includes("order") && norm.includes("effective"))) {
    return {
      mmHeader: "ERX Order Date",
      erxHeader: "ERX Effective Date",
      renderMm: (r, d) => (
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0369a1" }}>
          {formatUsaDate(r.erxOrderDate) || d?.mmValue || "—"}
        </span>
      ),
      renderErx: (r, d) => (
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c2410c" }}>
          {formatUsaDate(r.erxEffectiveDate) || d?.erxValue || "—"}
        </span>
      ),
    };
  }

  // 9. Patient Refill / Refills
  if (norm.includes("refill")) {
    return {
      mmHeader: "MM Fill # (Refill Number)",
      erxHeader: "ERX Refills Allowed",
      renderMm: (r, d) => (
        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0369a1" }}>
          {r.mmFillNumber ?? r.mmRefillsPharmacistEntered ?? d?.mmValue ?? "—"}
        </span>
      ),
      renderErx: (r, d) => (
        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#c2410c" }}>
          {r.erxRefill ?? d?.erxValue ?? "—"}
        </span>
      ),
    };
  }

  // 10. Quantity / Qty
  if (norm.includes("qty") || norm.includes("quantity")) {
    return {
      mmHeader: "MM Qty Dispensed",
      erxHeader: "ERX Qty Prescribed",
      renderMm: (r, d) => (
        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0369a1" }}>
          {r.mmQtyDispensed ?? d?.mmValue ?? "—"}
        </span>
      ),
      renderErx: (r, d) => (
        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#c2410c" }}>
          {r.erxQtyOrd ?? d?.erxValue ?? "—"}
        </span>
      ),
    };
  }

  // 11. Prescriber
  if (norm.includes("prescriber")) {
    if (norm.includes("npi")) {
      return {
        mmHeader: "MM Prescriber NPI",
        erxHeader: "ERX Prescriber NPI",
        renderMm: (r, d) => <span style={{ fontWeight: 700, color: "#0369a1" }}>{r.mmPrescriberNpi || d?.mmValue || "—"}</span>,
        renderErx: (r, d) => <span style={{ fontWeight: 700, color: "#c2410c" }}>{r.erxPrescriberNpi || d?.erxValue || "—"}</span>,
      };
    }
    if (norm.includes("dea")) {
      return {
        mmHeader: "MM Prescriber DEA",
        erxHeader: "ERX Prescriber DEA",
        renderMm: (r, d) => <span style={{ fontWeight: 700, color: "#0369a1" }}>{r.mmPrescriberDea || d?.mmValue || "—"}</span>,
        renderErx: (r, d) => <span style={{ fontWeight: 700, color: "#c2410c" }}>{r.erxPrescriberDea || d?.erxValue || "—"}</span>,
      };
    }
    return {
      mmHeader: "MM Prescriber Name",
      erxHeader: "ERX Prescriber Name",
      renderMm: (r, d) => <span style={{ fontWeight: 600, color: "#0369a1" }}>{r.mmPrescriberName || d?.mmValue || "—"}</span>,
      renderErx: (r, d) => <span style={{ fontWeight: 600, color: "#c2410c" }}>{r.erxPrescriberName || d?.erxValue || "—"}</span>,
    };
  }

  // 12. DAW Code
  if (norm.includes("daw")) {
    return {
      mmHeader: "MM DAW Code",
      erxHeader: "ERX DAW Code",
      renderMm: (r, d) => <span style={{ fontWeight: 700, color: "#0369a1" }}>{r.mmDawCode || d?.mmValue || "—"}</span>,
      renderErx: (r, d) => <span style={{ fontWeight: 700, color: "#c2410c" }}>{r.erxDawCode || d?.erxValue || "—"}</span>,
    };
  }

  // Generic Fallback for any other / dynamic rule
  return {
    mmHeader: `MM: ${columnName}`,
    erxHeader: `ERX: ${columnName}`,
    renderMm: (_r, d) => (
      <span style={{ fontWeight: 700, color: "#0369a1" }}>
        {d?.mmValue || "—"}
      </span>
    ),
    renderErx: (_r, d) => (
      <span style={{ fontWeight: 700, color: "#c2410c" }}>
        {d?.erxValue || "—"}
      </span>
    ),
  };
};

export interface BuildFocusedColumnsOptions {
  selectedDiscrepancyColumn: string;
  selectedRuleId?: number | null;
  selectedRecordIds: number[];
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleRow: (recordId: number) => void;
  onOpenDetail: (record: ErxAuditRecordDto) => void;
  onIgnoreRecord: (record: ErxAuditRecordDto, column: string) => void;
  bulkUpdating: boolean;
  totalRecordCount: number;
  batchLookup?: Record<string, string>;
}

export const buildFocusedDiscrepancyColumns = (
  options: BuildFocusedColumnsOptions
): Column<ErxAuditRecordDto>[] => {
  const {
    selectedDiscrepancyColumn,
    selectedRuleId,
    selectedRecordIds,
    isAllSelected,
    isSomeSelected,
    onToggleSelectAll,
    onToggleRow,
    onOpenDetail,
    onIgnoreRecord,
    bulkUpdating,
    totalRecordCount,
    batchLookup,
  } = options;

  const meta = getColumnMeta(selectedDiscrepancyColumn);

  const cols: Column<ErxAuditRecordDto>[] = [
    // 1. Checkbox Column
    {
      header: (
        <Checkbox
          size="small"
          checked={isAllSelected}
          indeterminate={isSomeSelected}
          onChange={onToggleSelectAll}
          disabled={totalRecordCount === 0}
          sx={{ p: 0.5 }}
        />
      ),
      accessor: "recordId",
      render: (row: ErxAuditRecordDto) => (
        <Checkbox
          size="small"
          checked={selectedRecordIds.includes(row.recordId)}
          onChange={() => onToggleRow(row.recordId)}
          sx={{ p: 0.5 }}
        />
      ),
    },

    // 2. RX Number
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.RX_NUMBER,
      accessor: "rxNumber",
      render: (row: ErxAuditRecordDto) => (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontWeight: 700, color: "#1e40af", fontSize: "0.875rem" }}>
            {row.rxNumber}
          </span>
          {getDeaBadge(row.rxNumber, row.erxRxNumber)}
        </div>
      ),
    },
  ];

  // Optional: Batch identifier if multiple batches exist (e.g. in uploaded data view)
  if (batchLookup) {
    cols.push({
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.BATCH_ID,
      accessor: "batchId",
      render: (row: ErxAuditRecordDto) => (
        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
          {batchLookup[row.batchId] || row.batchId?.substring(0, 8) || "—"}
        </span>
      ),
    });
  }

  // Pharmacy identifier
  cols.push({
    header: "Pharmacy",
    accessor: "pharmacyName",
    render: (row: ErxAuditRecordDto) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#1e293b" }}>
          {row.pharmacyName || "—"}
        </div>
        {row.pharmacyNpi && (
          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
            NPI: {row.pharmacyNpi}
          </div>
        )}
      </div>
    ),
  });

  // 3. Patient
  cols.push({
    header: ERX_AUDIT_LABELS.TABLE_HEADERS.PATIENT,
    accessor: "mmPatientName",
    render: (row: ErxAuditRecordDto) => (
      <div>
        <div style={{ fontWeight: 600 }}>{row.mmPatientName || row.erxPatientName || "—"}</div>
        {(row.mmPatientDob || row.erxPatientDob) && (
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
            DOB: {formatUsaDate(row.mmPatientDob || row.erxPatientDob)}
          </div>
        )}
      </div>
    ),
  });

  // 4. MicroMerchant Discrepancy Column
  cols.push({
    header: (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Chip
          label={ERX_AUDIT_LABELS.STATUS_BADGES.MM_SOURCE}
          size="small"
          sx={{
            bgcolor: "#e0f2fe",
            color: "#0369a1",
            fontWeight: 700,
            fontSize: "0.68rem",
            height: 20,
          }}
        />
        <span>{meta.mmHeader}</span>
      </Box>
    ),
    accessor: "mmDispensedDaysSupply",
    render: (row: ErxAuditRecordDto) => {
      const disc = getMatchingDiscrepancy(row, selectedDiscrepancyColumn, selectedRuleId);
      const isIgnored = disc?.status === "Ignored";
      return (
        <Box
          sx={{
            p: 1,
            bgcolor: isIgnored ? "#f8fafc" : "#f0f9ff",
            border: `1px solid ${isIgnored ? "#e2e8f0" : "#bae6fd"}`,
            borderRadius: 1.5,
            minWidth: 120,
          }}
        >
          {meta.renderMm(row, disc)}
          <Typography variant="caption" sx={{ color: "#0369a1", fontSize: "0.7rem", display: "block", mt: 0.25, fontWeight: 500 }}>
            {ERX_AUDIT_LABELS.STATUS_BADGES.MM_DISPENSED_LABEL}
          </Typography>
        </Box>
      );
    },
  });

  // 5. ERX Discrepancy Column
  cols.push({
    header: (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Chip
          label={ERX_AUDIT_LABELS.STATUS_BADGES.ERX_SOURCE}
          size="small"
          sx={{
            bgcolor: "#f1f5f9",
            color: "#475569",
            fontWeight: 700,
            fontSize: "0.68rem",
            height: 20,
          }}
        />
        <span>{meta.erxHeader}</span>
      </Box>
    ),
    accessor: "erxDaysSupply",
    render: (row: ErxAuditRecordDto) => {
      const disc = getMatchingDiscrepancy(row, selectedDiscrepancyColumn, selectedRuleId);
      const isIgnored = disc?.status === "Ignored";
      return (
        <Box
          sx={{
            p: 1,
            bgcolor: isIgnored ? "#f8fafc" : "#fffbfa",
            border: `1px solid ${isIgnored ? "#e2e8f0" : "#fed7aa"}`,
            borderRadius: 1.5,
            minWidth: 120,
          }}
        >
          {meta.renderErx(row, disc)}
          <Typography variant="caption" sx={{ color: "#9a3412", fontSize: "0.7rem", display: "block", mt: 0.25, fontWeight: 500 }}>
            {ERX_AUDIT_LABELS.STATUS_BADGES.ERX_PRESCRIBED_LABEL}
          </Typography>
        </Box>
      );
    },
  });

  // 6. Audit Result
  cols.push({
    header: ERX_AUDIT_LABELS.TABLE_HEADERS.AUDIT_RESULT,
    accessor: "hasDiscrepancy",
    render: (row: ErxAuditRecordDto) => {
      const disc = getMatchingDiscrepancy(row, selectedDiscrepancyColumn, selectedRuleId);
      if (!disc) {
        return (
          <Chip
            size="small"
            icon={<CheckCircleOutlinedIcon sx={{ fontSize: "15px !important", color: "#15803d !important" }} />}
            label={ERX_AUDIT_LABELS.STATUS_BADGES.MATCH_CLEAN}
            sx={{
              bgcolor: "#f0fdf4",
              color: "#15803d",
              border: "1px solid #bbf7d0",
              fontWeight: 600,
              height: 24,
              fontSize: "0.75rem",
            }}
          />
        );
      }
      if (disc.status === "Ignored") {
        return (
          <Chip
            size="small"
            label={ERX_AUDIT_LABELS.STATUS_BADGES.IGNORED}
            sx={{
              bgcolor: "#f8fafc",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              fontWeight: 600,
              height: 24,
              fontSize: "0.75rem",
            }}
          />
        );
      }
      const activeRuleNames = (() => {
        if (!selectedDiscrepancyColumn) {
          return [formatDiscrepancyRuleName(disc.fieldGroupName)];
        }
        const colList = selectedDiscrepancyColumn.split(",").map((c) => c.trim().toLowerCase());
        const matchingTypes = (row.discrepancies || [])
          .filter((d) => d.status !== "Corrected" && d.status !== "Ignored")
          .filter((d) => {
            const fg = (d.fieldGroupName || "").toLowerCase().replace(/[\s_/-]/g, "");
            return colList.some((c) => {
              const normC = c.replace(/[\s_/-]/g, "");
              return fg === normC || fg.includes(normC) || normC.includes(fg);
            });
          })
          .map((d) => formatDiscrepancyRuleName(d.fieldGroupName));
        const uniqueNames = Array.from(new Set(matchingTypes.filter(Boolean)));
        return uniqueNames.length > 0
          ? uniqueNames
          : [formatDiscrepancyRuleName(disc.fieldGroupName || selectedDiscrepancyColumn)];
      })();

      const mismatchLabel = `${activeRuleNames.join(", ")} ${ERX_AUDIT_LABELS.STATUS_BADGES.MISMATCH}`;

      return (
        <Chip
          size="small"
          icon={<WarningAmberIcon sx={{ fontSize: "15px !important", color: "#b91c1c !important" }} />}
          label={mismatchLabel}
          sx={{
            bgcolor: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            fontWeight: 600,
            height: 24,
            fontSize: "0.75rem",
          }}
        />
      );
    },
  });

  // 7. Action
  cols.push({
    header: ERX_AUDIT_LABELS.TABLE_HEADERS.ACTION,
    accessor: "recordId",
    render: (row: ErxAuditRecordDto) => {
      const disc = getMatchingDiscrepancy(row, selectedDiscrepancyColumn, selectedRuleId);
      const isOpen = disc && (disc.status === "Open" || !disc.status);

      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <MuiButton
            size="small"
            variant="outlined"
            startIcon={<CompareArrowsOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => onOpenDetail(row)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              py: 0.4,
              px: 1.2,
              fontSize: "0.78rem",
              color: "#0369a1",
              borderColor: "#bae6fd",
              "&:hover": { borderColor: "#0284c7", bgcolor: "#f0f9ff" },
            }}
            title={ERX_AUDIT_LABELS.ACTIONS.COMPARE_TOOLTIP}
          >
            {ERX_AUDIT_LABELS.ACTIONS.COMPARE}
          </MuiButton>
          {isOpen ? (
            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<BlockOutlinedIcon sx={{ fontSize: 14 }} />}
              onClick={() => onIgnoreRecord(row, selectedDiscrepancyColumn)}
              disabled={bulkUpdating}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                py: 0.4,
                px: 1.2,
                fontSize: "0.75rem",
                color: "#64748b",
                borderColor: "#cbd5e1",
                "&:hover": { borderColor: "#f87171", color: "#dc2626", bgcolor: "#fef2f2" },
              }}
              title={ERX_AUDIT_LABELS.formatIgnoreColumnTooltip(formatDiscrepancyRuleName(selectedDiscrepancyColumn), row.rxNumber)}
            >
              {ERX_AUDIT_LABELS.ACTIONS.IGNORE}
            </MuiButton>
          ) : disc?.status === "Ignored" ? (
            <Chip
              size="small"
              label={ERX_AUDIT_LABELS.STATUS_BADGES.IGNORED}
              sx={{ bgcolor: "#f8fafc", color: "#94a3b8", fontSize: "0.72rem", height: 22, border: "1px solid #e2e8f0" }}
            />
          ) : null}
        </Box>
      );
    },
  });

  return cols;
};
