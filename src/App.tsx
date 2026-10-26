import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ProtectedRoute from "./component/auth/ProtectedRoute";
import EmployeeRouteGuard from "./component/auth/EmployeeRouteGuard";
import SessionTimeoutProvider from "./component/SessionTimeoutProvider";
import Login from "./features/login/Login";

/** Eager login only — all app pages load on demand so first visit stays fast. */
const Home = lazy(() => import("./features/home/Home"));
const Pharmacy = lazy(() => import("./features/pharmacy/Pharmacy"));
const Dashboard = lazy(() => import("./features/dashboard/Dashboard"));
const PharmacyUser = lazy(() => import("./features/pharmacyuser/PharmacyUser"));
const Insurance = lazy(() => import("./features/insurance/Insurance"));
const Wholesaler = lazy(() => import("./features/wholesaler/Wholesaler"));
const WholesalerFieldMapping = lazy(
  () => import("./features/wholesalerfieldmapping/WholesalerFieldMapping")
);
const BillingFieldMapping = lazy(
  () => import("./features/billingfieldmapping/BillingFieldMapping")
);
const PharmacyWholesaler = lazy(
  () => import("./features/pharmacywholesaler/PharmacyWholesaler")
);
const Purchase = lazy(() => import("./features/purchase/Purchase"));
const Billing = lazy(() => import("./features/billing/Billing"));
const MedicineMaster = lazy(
  () => import("./features/medicinemaster/MedicineMaster")
);
const EditProfile = lazy(() => import("./features/editprofile/EditProfile"));
const PharmacySoftware = lazy(
  () => import("./features/pharmacysoftware/PharmacySoftware")
);
const ReportDashboard = lazy(
  () => import("./features/reportdashboard/ReportDashboard")
);
const ErxAudit = lazy(() => import("./features/erxaudit/ErxAudit"));
const ErxAuditBatchDetail = lazy(
  () => import("./features/erxaudit/ErxAuditBatchDetail")
);
const TermsRoute = lazy(() => import("./features/terms/TermsRoute"));
const TermsManagement = lazy(() => import("./features/terms/TermsManagement"));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#eef4fa",
        color: "#5b6777",
        fontFamily:
          '"Plus Jakarta Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: 14,
        fontWeight: 500,
      }}
      role="status"
      aria-live="polite"
    >
      Loading...
    </div>
  );
}

function ProtectedHome({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <EmployeeRouteGuard>
        <Suspense fallback={<RouteFallback />}>
          <Home>{children}</Home>
        </Suspense>
      </EmployeeRouteGuard>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <Router basename={process.env.PUBLIC_URL ?? ""}>
      <SessionTimeoutProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/admin" element={<Login />} />
            <Route path="/terms" element={<TermsRoute />} />
            <Route
              path="/home"
              element={
                <ProtectedHome>
                  <Dashboard />
                </ProtectedHome>
              }
            />
            <Route
              path="/pharmacy/*"
              element={
                <ProtectedHome>
                  <Pharmacy />
                </ProtectedHome>
              }
            />
            <Route
              path="/pharmacyuser"
              element={
                <ProtectedHome>
                  <PharmacyUser />
                </ProtectedHome>
              }
            />
            <Route
              path="/insurance/*"
              element={
                <ProtectedHome>
                  <Insurance />
                </ProtectedHome>
              }
            />
            <Route
              path="/wholesaler/*"
              element={
                <ProtectedHome>
                  <Wholesaler />
                </ProtectedHome>
              }
            />
            <Route
              path="/wholesalerfieldmapping"
              element={
                <ProtectedHome>
                  <WholesalerFieldMapping />
                </ProtectedHome>
              }
            />
            <Route
              path="/billingfieldmapping"
              element={
                <ProtectedHome>
                  <BillingFieldMapping />
                </ProtectedHome>
              }
            />
            <Route
              path="/pharmacywholesaler"
              element={
                <ProtectedHome>
                  <PharmacyWholesaler />
                </ProtectedHome>
              }
            />
            <Route
              path="/purchase/*"
              element={
                <ProtectedHome>
                  <Purchase />
                </ProtectedHome>
              }
            />
            <Route
              path="/primerx/*"
              element={
                <ProtectedHome>
                  <PharmacySoftware />
                </ProtectedHome>
              }
            />
            <Route
              path="/billing/*"
              element={
                <ProtectedHome>
                  <Billing />
                </ProtectedHome>
              }
            />
            <Route
              path="/medicinemaster/*"
              element={
                <ProtectedHome>
                  <MedicineMaster />
                </ProtectedHome>
              }
            />
            <Route
              path="/editprofile"
              element={
                <ProtectedHome>
                  <EditProfile />
                </ProtectedHome>
              }
            />
            <Route
              path="/terms-management"
              element={
                <ProtectedHome>
                  <TermsManagement />
                </ProtectedHome>
              }
            />
            <Route
              path="/reportdashboard"
              element={
                <ProtectedHome>
                  <ReportDashboard />
                </ProtectedHome>
              }
            />
            <Route
              path="/erx-audit"
              element={
                <ProtectedHome>
                  <ErxAudit />
                </ProtectedHome>
              }
            />
            <Route
              path="/erx-audit/data"
              element={
                <ProtectedHome>
                  <ErxAudit />
                </ProtectedHome>
              }
            />
            <Route
              path="/erx-audit/batches"
              element={
                <ProtectedHome>
                  <ErxAudit />
                </ProtectedHome>
              }
            />
            <Route
              path="/erx-audit/rules"
              element={
                <ProtectedHome>
                  <ErxAudit />
                </ProtectedHome>
              }
            />
            <Route
              path="/erx-audit/sig-dictionary"
              element={
                <ProtectedHome>
                  <ErxAudit />
                </ProtectedHome>
              }
            />
            <Route
              path="/erx-audit/batch/:batchId"
              element={
                <ProtectedHome>
                  <ErxAuditBatchDetail />
                </ProtectedHome>
              }
            />
          </Routes>
        </Suspense>
      </SessionTimeoutProvider>
      <ToastContainer position="top-right" autoClose={2000} />
    </Router>
  );
}

export default App;
