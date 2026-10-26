/**
 * Login / Register — DTOs for auth API and local storage.
 */

/** POST /Login/register body (Admin). */
export interface RegisterDto {
  name?: string | null;
  pharmacyName?: string | null;
  dea?: string | null;
  email: string | null;
  password: string | null;
  confirmPassword?: string | null;
  role?: string | number | null;
  id?: string | null;
  createdDate?: string | null;
  updatedDate?: string | null;
}

/** POST /PharmacyUser/register/pharmacy */
export interface EmployeePharmacySignupDto {
  dea: string;
  businessTradeName: string;
  /** Omitted on pharmacy-only signup; backend should leave PharmacyUser.Name null. */
  name?: string | null;
  email: string;
  userEmail?: string | null;
  password: string;
  confirmPassword: string;
  role: number;
  businessLegalName?: string | null;
  npi?: string | null;
  streetAddress?: string | null;
  pharmacyAddress?: string | null;
  phoneNumber?: string | null;
  fax?: string | null;
  city?: string | null;
  stateId?: string | null;
  stateName?: string | null;
  zipCode?: string | null;
  deaExpirationDate?: string | null;
  stateBoardOfPharmacyLicenseNumber?: string | null;
  bopLicenseExpirationDate?: string | null;
  globalLocationNumber?: string | null;
  pharmacySoftwareId?: string | null;
  pharmacyBillingSoftwareName?: string | null;
  pharmacyBillingSoftwarePhone?: string | null;
  pharmacyBillingSoftwareEmail?: string | null;
  primaryContactName?: string | null;
  primaryContactTitle?: string | null;
  primaryContactPhone?: string | null;
  primaryContactEmail?: string | null;
  primaryWholesalerName?: string | null;
  primaryWholesalerContactName?: string | null;
  primaryWholesalerPhone?: string | null;
  primaryWholesalerEmail?: string | null;
  deaLicenseFile?: File | null;
  stateBoardLicenseFile?: File | null;
  acceptedTermsAndConditions?: boolean;
}

/** POST /PharmacyUser/register/pharmacy-user */
export interface EmployeePharmacyUserSignupDto {
  dea: string;
  pharmacyName: string;
  name?: string | null;
  userEmail: string;
  password: string;
  role?: number;
  pharmacies?: Array<{
    dea?: string;
    pharmacyName?: string;
    DEA?: string;
    PharmacyName?: string;
  }>;
}

export interface LoginCredentialsDto {
  Email: string;
  Password: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface TokenDto {
  token?: string | null;
  expiresAt?: string | null;
  tokenType?: string | null;
  deviceToken?: string | null;
}

export interface RegisterResponseDto {
  status?: number;
  message?: string | null;
  data?: unknown;
}

export interface LoginResponseDto {
  message?: string | null;
  data?: TokenDto | null;
}

export const EMPTY_REGISTER: RegisterDto = {
  name: null,
  email: null,
  password: null,
  confirmPassword: null,
  role: null,
};

export function toRegisterPayload(dto: RegisterDto): RegisterDto {
  const {
    id: _id,
    createdDate: _createdDate,
    updatedDate: _updatedDate,
    ...fields
  } = dto;

  return fields;
}

export function toLoginRequest(credentials: LoginCredentialsDto): LoginRequestDto {
  return {
    email: credentials.Email,
    password: credentials.Password,
  };
}

export function unwrapTokenPayload(
  payload: TokenDto | LoginResponseDto | { data?: TokenDto } | undefined
): TokenDto | null {
  if (!payload || typeof payload !== "object") return null;
  if ("data" in payload && payload.data?.token) return payload.data;
  if ("token" in payload && payload.token) return payload as TokenDto;
  return null;
}
