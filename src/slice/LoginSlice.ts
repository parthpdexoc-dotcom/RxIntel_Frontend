import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  registerUserAsync,
  registerPharmacyEmployeeAsync,
  loginUserAsync,
  loginEmployeeAsync,
} from "../service/LoginService";
import type { RegisterDto, TokenDto, LoginResponseDto } from "../dto/loginDto";
import { unwrapTokenPayload } from "../dto/loginDto";
import {
  fieldErrorsFromApiBody,
  messageFromApiBody,
} from "./mappingThunkUtils";

type LoginState = {
  loading: boolean;
  error: string | null;
  message: string | null;
  loggedInUser: TokenDto | null;
  login: RegisterDto | null;
};

const initialState: LoginState = {
  loading: false,
  error: null,
  message: null,
  loggedInUser: null,
  login: null,
};

const loginSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logout: (state) => {
      state.loggedInUser = null;
      state.loading = false;
      state.error = null;
      state.message = null;
    },
    clearAuthState: (state) => {
      state.error = null;
      state.message = null;
    },
    setLoggedInUser: (state, action: PayloadAction<TokenDto | null>) => {
      state.loggedInUser = action.payload;
    },
  },

  extraReducers: (builder) => {
    const pending = (state: LoginState) => {
      state.loading = true;
      state.error = null;
    };
    const rejected = (state: LoginState, action: { payload: unknown }) => {
      state.loading = false;
      const fieldErrors = fieldErrorsFromApiBody(action.payload);
      if (Object.keys(fieldErrors).length > 0) {
        state.error = null;
        return;
      }
      state.error =
        typeof action.payload === "string"
          ? action.payload
          : messageFromApiBody(action.payload) ?? "Request failed";
    };

    builder
      .addCase(registerUserAsync.pending, pending)
      .addCase(registerUserAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.login = (action.payload.data as RegisterDto) ?? null;
        state.message = action.payload.message ?? null;
      })
      .addCase(registerUserAsync.rejected, rejected)
      .addCase(registerPharmacyEmployeeAsync.pending, pending)
      .addCase(registerPharmacyEmployeeAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message ?? null;
      })
      .addCase(registerPharmacyEmployeeAsync.rejected, rejected)
      .addCase(loginUserAsync.pending, pending)
      .addCase(loginUserAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.loggedInUser = unwrapTokenPayload(
          action.payload as LoginResponseDto | TokenDto
        );
        const payload = action.payload as LoginResponseDto;
        state.message = payload?.message ?? null;
      })
      .addCase(loginUserAsync.rejected, rejected)
      .addCase(loginEmployeeAsync.pending, pending)
      .addCase(loginEmployeeAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.loggedInUser = unwrapTokenPayload(action.payload);
      })
      .addCase(loginEmployeeAsync.rejected, rejected);
  },
});

export const { logout, clearAuthState, setLoggedInUser } = loginSlice.actions;
export default loginSlice.reducer;
