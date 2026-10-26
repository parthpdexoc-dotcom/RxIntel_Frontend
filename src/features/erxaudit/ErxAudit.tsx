import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { FaBalanceScale } from "react-icons/fa";
import ErxAuditBatchList from "./ErxAuditBatchList";
import ErxAuditUploadedDataTab from "./ErxAuditUploadedDataTab";
import ErxAuditRuleConfig from "./ErxAuditRuleConfig";
import ErxSigMappingTab from "./ErxSigMappingTab";
import ERX_AUDIT_LABELS from "./erxAuditLabels";
import "./ErxAudit.css";

const SECTION_CONFIG = {
  data: ERX_AUDIT_LABELS.SECTIONS.DATA,
  batches: ERX_AUDIT_LABELS.SECTIONS.BATCHES,
  rules: ERX_AUDIT_LABELS.SECTIONS.RULES,
  sig: ERX_AUDIT_LABELS.SECTIONS.SIG_DICTIONARY,
} as const;

type ErxSectionKey = keyof typeof SECTION_CONFIG;

export default function ErxAudit() {
  const location = useLocation();
  const navigate = useNavigate();

  // Clean up any old localStorage override so normal dashboard operation is restored
  useEffect(() => {
    try {
      localStorage.removeItem("rxintel_show_erx_dashboard");
    } catch {
      // ignore
    }
  }, []);

  const path = location.pathname.toLowerCase().replace(/\/$/, "") || "/";

  let activeSection: ErxSectionKey = "data";
  if (path === "/erx-audit/batches") {
    activeSection = "batches";
  } else if (path === "/erx-audit/rules") {
    activeSection = "rules";
  } else if (path === "/erx-audit/sig-dictionary" || path === "/erx-audit/sig") {
    activeSection = "sig";
  } else {
    activeSection = "data";
  }

  const current = SECTION_CONFIG[activeSection];

  return (
    <Box
      sx={{
        p: { xs: "2px 4px 6px 4px", sm: "2px 8px 8px 4px", md: "2px 10px 10px 6px" },
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        "@media (max-height: 700px)": {
          p: "2px 6px 6px 4px",
        },
      }}
    >
      {/* Top Content Area Breadcrumb - Responsive Material Box */}
      <Box
        component="nav"
        aria-label="breadcrumb"
        sx={{
          display: "flex",
          alignItems: "center",
          mb: { xs: 0.5, sm: 0.75 },
          fontSize: { xs: "0.75rem", sm: "0.8rem" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <Box
            component="span"
            onClick={() => navigate("/erx-audit/data")}
            role="button"
            tabIndex={0}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              color: "#64748b",
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: "4px",
              py: 0.25,
              px: 0.75,
              transition: "all 0.15s ease",
              "&:hover": {
                color: "#2d5bff",
                bgcolor: "rgba(45, 91, 255, 0.08)",
              },
            }}
          >
            <FaBalanceScale style={{ fontSize: "0.85rem", color: "#2d5bff" }} />
            {ERX_AUDIT_LABELS.MODULE_NAME}
          </Box>
          <Typography component="span" sx={{ color: "#94a3b8", fontWeight: 600, fontSize: "0.85rem", userSelect: "none" }}>
            ›
          </Typography>
          <Box
            component="span"
            sx={{
              color: "#0f172a",
              fontWeight: 600,
              bgcolor: "#f1f5f9",
              py: 0.25,
              px: 1,
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
            }}
          >
            {current.label}
          </Box>
        </Box>
      </Box>

      {/* Header Titles - Responsive Material Typography */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: { xs: 1, sm: 1.25 },
          gap: 1,
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{
              m: "0 0 2px 0",
              fontSize: { xs: "1.05rem", sm: "1.15rem", md: "1.25rem" },
              fontWeight: 700,
              color: "#1e293b",
              lineHeight: 1.25,
            }}
          >
            {current.title}
          </Typography>
          <Typography
            component="p"
            sx={{
              m: 0,
              color: "#64748b",
              fontSize: { xs: "0.74rem", sm: "0.8rem" },
              lineHeight: 1.35,
            }}
          >
            {current.description}
          </Typography>
        </Box>
      </Box>

      {/* Section Content */}
      {activeSection === "data" ? (
        <ErxAuditUploadedDataTab />
      ) : activeSection === "batches" ? (
        <ErxAuditBatchList />
      ) : activeSection === "rules" ? (
        <ErxAuditRuleConfig />
      ) : (
        <ErxSigMappingTab />
      )}
    </Box>
  );
}

