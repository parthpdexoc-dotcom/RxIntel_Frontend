import React from "react";
import { Route, Routes } from "react-router-dom";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import BillingBatchList from "./BillingBatchList";
import BillingBatchDetail from "./BillingBatchDetail";
import BillingAddBillingActions from "./BillingAddBillingActions";
import "./Billing.css";
import "./BillingBatches.css";

function BillingUploadHub() {
  return (
    <div className="page-shell billing-page">
      <div className="card page-card">
        <PageCardHeader
          icon={<ReceiptLongOutlinedIcon />}
          title="Billing Uploads & Batch Management"
          subtitle="Upload billing CSV files, review import summaries, and open View Billing to manage rows for a single file only."
          actions={<BillingAddBillingActions />}
        />

        <BillingBatchList />
      </div>
    </div>
  );
}

export default function Billing() {
  return (
    <Routes>
      <Route path="batch/:batchId" element={<BillingBatchDetail />} />
      <Route index element={<BillingUploadHub />} />
      <Route path="*" element={<BillingUploadHub />} />
    </Routes>
  );
}
