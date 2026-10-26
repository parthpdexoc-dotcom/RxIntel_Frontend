import { configureStore } from "@reduxjs/toolkit";
import loginReducer from "../slice/LoginSlice";
import pharmacyReducer from "../slice/PharmacySlice"; 
import pharmacyUserReducer from "../slice/PharmacyUserSlice";
import insuranceReducer from "../slice/InsuranceSlice";
import wholesalerReducer from "../slice/WholesalerSlice";
import wholesalerFieldMappingReducer from "../slice/WholesalerFieldMappingSlice";
import billingFieldMappingReducer from "../slice/BillingFieldMappingSlice";
import pharmacyWholesalerReducer from "../slice/PharmacyWholesalerSlice";
import purchaseReducer from "../slice/PurchaseSlice";
import billingReducer from "../slice/BillingSlice";
import ndcGroupReducer from "../slice/NDCGroupSlice";
import medicineMasterReducer from "../slice/MedicineMasterSlice";
import adminProfileReducer from "../slice/AdminProfileSlice";
import stateReducer from "../slice/StateSlice";
import pharmacySoftwareReducer from "../slice/PharmacySoftwareSlice";
import dataAnalyticsReducer from "../slice/DataAnalyticsSlice";
import importErrorReducer from "../slice/ImportErrorSlice";
import erxAuditReducer from "../slice/ErxAuditSlice";

export const store = configureStore({
  reducer: {
    login: loginReducer,
    pharmacy: pharmacyReducer,
    pharmacyuser: pharmacyUserReducer,
    insurance: insuranceReducer,
    wholesaler: wholesalerReducer,
    wholesalerfieldmapping: wholesalerFieldMappingReducer,
    billingfieldmapping: billingFieldMappingReducer,
    pharmacywholesaler: pharmacyWholesalerReducer,
    purchase: purchaseReducer,
    billing: billingReducer,
    ndcgroup: ndcGroupReducer,
    medicinemaster: medicineMasterReducer,
    adminProfile: adminProfileReducer,
    state: stateReducer,
    pharmacysoftware: pharmacySoftwareReducer,
    dataAnalytics: dataAnalyticsReducer,
    importError: importErrorReducer,
    erxAudit: erxAuditReducer,
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;