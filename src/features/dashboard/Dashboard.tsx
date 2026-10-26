import React, { useEffect, useMemo } from "react";
import "./Dashboard.css";
import { useSelector, useDispatch } from "react-redux";
import { fetchBilling } from "../../slice/BillingSlice";
import { fetchPurchase } from "../../slice/PurchaseSlice";
import { fetchInsurance } from "../../slice/InsuranceSlice";
import { fetchPharmacy } from "../../slice/PharmacySlice";
import {
  hasManagerRole,
  hasPharmacyAdminRole,
  hasPharmacistRole,
  hasPharmacyTechRole,
  isAdminUser,
  isEmployee,
} from "../../component/auth/authUtils";
import {
  FaHospital,
  FaFileInvoice,
  FaShoppingCart,
  FaShieldAlt,
} from "react-icons/fa";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatDisplayDate } from "../../utils/formatDisplayDate";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import DashSummaryCard from "../../component/molecules/DashSummaryCard";
import DashPanel from "../../component/molecules/DashPanel";
import DashActivityItem from "../../component/molecules/DashActivityItem";
import DashSimpleTable from "../../component/molecules/DashSimpleTable";
import { dashChart } from "../../theme/dashChart";

export default function Dashboard() {
  const dispatch = useDispatch<any>();
  const superAdminSession = isAdminUser();
  const isBillingPurchaseOnlyDashboard =
    isEmployee() &&
    (hasPharmacyAdminRole() ||
      hasPharmacistRole() ||
      hasPharmacyTechRole() ||
      hasManagerRole());

  const billingList = useSelector((state: any) => state.billing.list || []);
  const billingTotalRecords = useSelector(
    (state: any) => state.billing.totalRecords || 0
  );
  const purchaseList = useSelector((state: any) => state.purchase.list || []);
  const purchaseTotalRecords = useSelector(
    (state: any) => state.purchase.totalRecords || 0
  );
  const insuranceList = useSelector((state: any) => state.insurance.list || []);
  const insuranceTotalRecords = useSelector(
    (state: any) => state.insurance.totalRecords || 0
  );
  const pharmacyList = useSelector((state: any) => state.pharmacy.list || []);
  const pharmacyTotalRecords = useSelector(
    (state: any) => state.pharmacy.totalRecords || 0
  );

  useEffect(() => {
    const dashPage = { page: 1, pageSize: 200 };
    dispatch(fetchBilling(dashPage));
    dispatch(fetchPurchase(dashPage));
    if (superAdminSession) {
      dispatch(fetchPharmacy({ page: 1, pageSize: 20 }));
    }
    if (!isBillingPurchaseOnlyDashboard) {
      dispatch(fetchInsurance({ page: 1, pageSize: 50 }));
    }
  }, [dispatch, isBillingPurchaseOnlyDashboard, superAdminSession]);

  const chartData = useMemo(() => {
    const ndcMap: Record<string, number> = {};

    billingList.forEach((item: any) => {
      if (!ndcMap[item.ndc]) {
        ndcMap[item.ndc] = 0;
      }
      ndcMap[item.ndc] += Number(item.quantityBilled || 0);
    });

    const data = Object.keys(ndcMap).map((ndc) => ({
      ndc,
      quantity: ndcMap[ndc],
    }));

    data.sort((a: any, b: any) => b.quantity - a.quantity);

    return data.slice(0, 10);
  }, [billingList]);

  const lastPharmacy = useMemo(
    () =>
      [...pharmacyList]
        .filter((p: any) => p.businessTradeName)
        .sort((a: any, b: any) => {
          const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          return dateB - dateA;
        })[0],
    [pharmacyList]
  );

  const lastBilling = billingList.at(-1);
  const lastInsurance = insuranceList.at(-1);
  const lastPurchase = purchaseList.at(-1);

  const formatTime = (date: any) => {
    if (!date) return "No date available";

    const d = new Date(date);

    if (isNaN(d.getTime())) return "Invalid date";

    const now = new Date();

    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;

    return formatDisplayDate(date) || d.toLocaleDateString("en-US");
  };

  const hasActivity =
    (superAdminSession && lastPharmacy) ||
    lastBilling ||
    lastInsurance ||
    lastPurchase;

  return (
    <div
      className={`page-shell dashboard${
        isBillingPurchaseOnlyDashboard ? " dashboard--billing-purchase-only" : ""
      }`}
    >
      <div className="card page-card dashboard-card">
        <PageCardHeader
          icon={<DashboardOutlinedIcon />}
          title="Dashboard"
          subtitle="Here’s what’s happening in your RxIntel system today."
        />

        <div
          className={`page-dash-kpi-grid${
            isBillingPurchaseOnlyDashboard ? " page-dash-kpi-grid--max-2" : ""
          }`}
        >
          {superAdminSession && (
            <DashSummaryCard
              title="Total Pharmacy"
              value={pharmacyTotalRecords || pharmacyList.length}
              icon={<FaHospital />}
              color="teal"
            />
          )}
          <DashSummaryCard
            title="Total Billing"
            value={billingTotalRecords || billingList.length}
            icon={<FaFileInvoice />}
            color="green"
          />
          <DashSummaryCard
            title="Total Purchase"
            value={purchaseTotalRecords || purchaseList.length}
            icon={<FaShoppingCart />}
            color="mint"
          />
          {!isBillingPurchaseOnlyDashboard && (
            <DashSummaryCard
              title="Total Insurance"
              value={insuranceTotalRecords || insuranceList.length}
              icon={<FaShieldAlt />}
              color="navy"
            />
          )}
        </div>

        <div
          className={`page-dash-split${
            isBillingPurchaseOnlyDashboard ? " page-dash-split--stack" : ""
          }`}
        >
          <DashPanel
            title="Billing Overview"
            subtitle="Top NDCs by quantity billed"
          >
            {chartData.length > 0 ? (
              <div className="page-dash-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      stroke={dashChart.grid}
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="ndc"
                      tick={{ fill: dashChart.axis, fontSize: 11 }}
                      axisLine={{ stroke: dashChart.grid }}
                      tickLine={{ stroke: dashChart.grid }}
                    />
                    <YAxis
                      tick={{ fill: dashChart.axis, fontSize: 11 }}
                      axisLine={{ stroke: dashChart.grid }}
                      tickLine={{ stroke: dashChart.grid }}
                    />
                    <Tooltip
                      contentStyle={dashChart.tooltip}
                      labelStyle={dashChart.label}
                    />
                    <Line
                      type="linear"
                      dataKey="quantity"
                      stroke={dashChart.line}
                      strokeWidth={3}
                      dot={{ r: 4, fill: dashChart.dot, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: dashChart.line }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="page-dash-empty">No billing data to chart yet.</p>
            )}
          </DashPanel>

          {!isBillingPurchaseOnlyDashboard && (
            <DashPanel
              title="Recent Activity"
              subtitle="Latest updates across modules"
            >
              {hasActivity ? (
                <div className="page-dash-activity-list">
                  {superAdminSession && lastPharmacy && (
                    <DashActivityItem
                      icon={<FaHospital />}
                      title="New Pharmacy Added"
                      name={lastPharmacy.businessTradeName}
                      time={formatTime(lastPharmacy.createdDate)}
                    />
                  )}

                  {lastBilling && (
                    <DashActivityItem
                      icon={<FaFileInvoice />}
                      title="New Billing Created"
                      name={lastBilling.ndc}
                      time={formatTime(lastBilling.createdDate)}
                    />
                  )}

                  {lastInsurance && (
                    <DashActivityItem
                      icon={<FaShieldAlt />}
                      title="New Insurance Added"
                      name={lastInsurance.insuranceName}
                      time={formatTime(lastInsurance.createdDate)}
                    />
                  )}

                  {lastPurchase && (
                    <DashActivityItem
                      icon={<FaShoppingCart />}
                      title="New Purchase Entry"
                      name={lastPurchase.ndc}
                      time={formatTime(lastPurchase.createdDate)}
                    />
                  )}
                </div>
              ) : (
                <p className="page-dash-empty">No recent activity to show.</p>
              )}
            </DashPanel>
          )}
        </div>

        <div className="page-dash-pair">
          <DashPanel title="Recent Billing Record">
            <DashSimpleTable
              columns={[
                { key: "ndc", label: "NDC" },
                { key: "qty", label: "Quantity Billed" },
              ]}
              rows={
                lastBilling
                  ? [
                      {
                        ndc: lastBilling.ndc,
                        qty: lastBilling.quantityBilled,
                      },
                    ]
                  : []
              }
              emptyMessage="No billing records yet."
            />
          </DashPanel>

          <DashPanel title="Recent Purchase Record">
            <DashSimpleTable
              columns={[
                { key: "ndc", label: "NDC" },
                { key: "qty", label: "Quantity Purchased" },
              ]}
              rows={
                lastPurchase
                  ? [
                      {
                        ndc: lastPurchase.ndc,
                        qty: lastPurchase.quantityPurchased,
                      },
                    ]
                  : []
              }
              emptyMessage="No purchase records yet."
            />
          </DashPanel>
        </div>
      </div>
    </div>
  );
}
