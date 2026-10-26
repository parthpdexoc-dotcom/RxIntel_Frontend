import React from "react";
import { Route, Routes } from "react-router-dom";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import PurchaseBatchList from "./PurchaseBatchList";
import PurchaseBatchDetail from "./PurchaseBatchDetail";
import PurchaseAddPurchaseActions from "./PurchaseAddPurchaseActions";
import "./Purchase.css";
import "./PurchaseBatches.css";

function PurchaseUploadHub() {
  return (
    <div className="page-shell purchase-page">
      <div className="card page-card">
        <PageCardHeader
          icon={<ShoppingCartOutlinedIcon />}
          title="Purchase Uploads & Batch Management"
          subtitle="Upload purchase CSV files, review import summaries, and open View Purchase to manage rows for a single file only."
          actions={<PurchaseAddPurchaseActions />}
        />

        <PurchaseBatchList />
      </div>
    </div>
  );
}

export default function Purchase() {
  return (
    <Routes>
      <Route path="batch/:batchId" element={<PurchaseBatchDetail />} />
      <Route index element={<PurchaseUploadHub />} />
      <Route path="*" element={<PurchaseUploadHub />} />
    </Routes>
  );
}
