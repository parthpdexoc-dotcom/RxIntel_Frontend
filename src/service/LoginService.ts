import { createAsyncThunk } from "@reduxjs/toolkit";
import { post } from "../utils/CommonApi";
import type {
  LoginCredentialsDto,
  RegisterDto,
  RegisterResponseDto,
  EmployeePharmacySignupDto,
  TokenDto,
} from "../dto/loginDto";
import { toLoginRequest, unwrapTokenPayload } from "../dto/loginDto";
import { OTHER_PHARMACY_SOFTWARE_ID } from "../utils/pharmacyBillingSoftware";

export type { LoginCredentialsDto, RegisterDto };

export const registerUserAsync = createAsyncThunk(
  "User/register",
  async (userData: RegisterDto, { rejectWithValue }) => {
    try {
      const response = await post("/Login/register", userData);
      const res = response.data as RegisterResponseDto;

      if (res.status !== 200) {
        return rejectWithValue(res.message);
      }
      return res;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Register failed"
      );
    }
  }
);

function buildPharmacySignupPayload(
  body: EmployeePharmacySignupDto
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    dea: body.dea,
    businessTradeName: body.businessTradeName,
    email: body.email,
    userEmail: body.userEmail?.trim(),
    name: body.name?.trim(),
    password: body.password,
    confirmPassword: body.confirmPassword,
    role: body.role,
    acceptedTermsAndConditions: body.acceptedTermsAndConditions === true,
  };
  if (body.npi?.trim()) {
    payload.npi = body.npi.trim();
  }
  if (body.streetAddress?.trim()) {
    payload.streetAddress = body.streetAddress.trim();
  }
  if (body.pharmacyAddress?.trim()) {
    payload.pharmacyAddress = body.pharmacyAddress.trim();
  }
  if (body.phoneNumber?.trim()) {
    payload.phoneNumber = body.phoneNumber.trim();
  }
  if (body.city?.trim()) {
    payload.city = body.city.trim();
  }
  if (body.zipCode?.trim()) {
    payload.zipCode = body.zipCode.trim();
  }
  if (body.businessLegalName?.trim()) {
    payload.businessLegalName = body.businessLegalName.trim();
  }
  if (body.fax?.trim()) {
    payload.fax = body.fax.trim();
  }
  if (body.stateId?.trim()) {
    payload.stateId = body.stateId.trim();
  }
  if (body.stateName?.trim()) {
    payload.stateName = body.stateName.trim();
  }
  if (body.deaExpirationDate?.trim()) {
    payload.deaExpirationDate = body.deaExpirationDate.trim();
  }
  if (body.stateBoardOfPharmacyLicenseNumber?.trim()) {
    payload.stateBoardOfPharmacyLicenseNumber =
      body.stateBoardOfPharmacyLicenseNumber.trim();
  }
  if (body.bopLicenseExpirationDate?.trim()) {
    payload.bopLicenseExpirationDate = body.bopLicenseExpirationDate.trim();
  }
  if (body.globalLocationNumber?.trim()) {
    payload.globalLocationNumber = body.globalLocationNumber.trim();
  }
  if (
    body.pharmacySoftwareId?.trim() &&
    body.pharmacySoftwareId !== OTHER_PHARMACY_SOFTWARE_ID
  ) {
    payload.pharmacySoftwareId = body.pharmacySoftwareId.trim();
  }
  if (body.pharmacyBillingSoftwareName?.trim()) {
    payload.pharmacyBillingSoftwareName = body.pharmacyBillingSoftwareName.trim();
  }
  if (body.pharmacyBillingSoftwarePhone?.trim()) {
    payload.pharmacyBillingSoftwarePhone = body.pharmacyBillingSoftwarePhone.trim();
  }
  if (body.pharmacyBillingSoftwareEmail?.trim()) {
    payload.pharmacyBillingSoftwareEmail = body.pharmacyBillingSoftwareEmail.trim();
  }
  if (body.primaryContactName?.trim()) {
    payload.primaryContactName = body.primaryContactName.trim();
  }
  if (body.primaryContactTitle?.trim()) {
    payload.primaryContactTitle = body.primaryContactTitle.trim();
  }
  if (body.primaryContactPhone?.trim()) {
    payload.primaryContactPhone = body.primaryContactPhone.trim();
  }
  if (body.primaryWholesalerName?.trim()) {
    payload.primaryWholesalerName = body.primaryWholesalerName.trim();
  }
  if (body.primaryWholesalerContactName?.trim()) {
    payload.primaryWholesalerContactName =
      body.primaryWholesalerContactName.trim();
  }
  if (body.primaryWholesalerPhone?.trim()) {
    payload.primaryWholesalerPhone = body.primaryWholesalerPhone.trim();
  }
  if (body.primaryWholesalerEmail?.trim()) {
    payload.primaryWholesalerEmail = body.primaryWholesalerEmail.trim();
  }
  return payload;
}

function buildPharmacySignupFormData(
  body: EmployeePharmacySignupDto
): FormData {
  const formData = new FormData();
  const payload = buildPharmacySignupPayload(body);

  for (const [key, value] of Object.entries(payload)) {
    if (value != null && value !== "") {
      formData.append(key, String(value));
    }
  }
  if (body.deaLicenseFile) {
    formData.append("deaDocument", body.deaLicenseFile);
  }
  if (body.stateBoardLicenseFile) {
    formData.append("stateBoardLicenseDocument", body.stateBoardLicenseFile);
  }
  return formData;
}

export const registerPharmacyEmployeeAsync = createAsyncThunk(
  "User/registerPharmacyEmployee",
  async (body: EmployeePharmacySignupDto, { rejectWithValue }) => {
    try {
      const response = await post(
        "/Pharmacy/register/pharmacy",
        buildPharmacySignupFormData(body)
      );
      const res = response.data as RegisterResponseDto;
      if (res.status !== 200) {
        return rejectWithValue(res);
      }
      return res;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } };
      const data = err.response?.data;
      if (data !== undefined) {
        return rejectWithValue(data);
      }
      return rejectWithValue("Register failed");
    }
  }
);

export const loginUserAsync = createAsyncThunk(
  "User/login",
  async ({ Email, Password }: LoginCredentialsDto, { rejectWithValue }) => {
    try {
      const response = await post("/Login/login", toLoginRequest({ Email, Password }));
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } };
      return rejectWithValue(err.response?.data || "Login failed");
    }
  }
);

export const refreshSession = async (): Promise<TokenDto> => {
  const response = await post("/Login/refresh", {});
  const token = unwrapTokenPayload(response.data as TokenDto);
  if (!token?.token) {
    throw new Error("Session refresh failed");
  }
  return token;
};

export const loginEmployeeAsync = createAsyncThunk(
  "User/loginEmployee",
  async ({ Email, Password }: LoginCredentialsDto, { rejectWithValue }) => {
    try {
      const response = await post("/Pharmacy/login", toLoginRequest({ Email, Password }));
      return response.data as TokenDto;
    } catch (error: unknown) {
      const err = error as { response?: { data?: string | { message?: string } } };
      const data = err.response?.data;
      const message =
        typeof data === "string"
          ? data
          : (data as { message?: string })?.message || "Login failed";
      return rejectWithValue(message);
    }
  }
);
