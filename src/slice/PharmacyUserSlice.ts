import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getPharmacyUserApi,
  savePharmacyUserApi,
  deletePharmacyUserApi,
} from "../service/PharmacyUserService";
import { showSuccess, showError } from "../component/atoms/ToastHelper";
import type {
  PharmacyUserDto,
  PharmacyUserListParams,
  PharmacyUserPagedResponse,
} from "../dto/pharmacyUserDto";

interface PharmacyUserState {
  list: PharmacyUserDto[];
  loading: boolean;
  totalRecords: number;
}

const initialState: PharmacyUserState = {
  list: [],
  loading: false,
  totalRecords: 0,
};

export const fetchPharmacyUser = createAsyncThunk<
  PharmacyUserPagedResponse,
  PharmacyUserListParams | undefined,
  { rejectValue: unknown }
>("pharmacyUser/fetch", async (pageParam, { rejectWithValue }) => {
  try {
    const res = await getPharmacyUserApi(pageParam);
    return res.data as PharmacyUserPagedResponse;
  } catch (err: unknown) {
    showError("Error fetching pharmacy user data");
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

export const addPharmacyUser = createAsyncThunk<
  PharmacyUserDto,
  Partial<PharmacyUserDto>,
  { rejectValue: unknown }
>("pharmacyUser/add", async (data, { rejectWithValue }) => {
  try {
    const res = await savePharmacyUserApi(data);
    showSuccess(res.data.message);
    return res.data.data as PharmacyUserDto;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data ?? "Error");
  }
});

export const deletePharmacyUser = createAsyncThunk<
  string,
  string,
  { rejectValue: unknown }
>("pharmacyUser/delete", async (id, { rejectWithValue }) => {
  try {
    const res = await deletePharmacyUserApi(id);
    showSuccess(res.data.message);
    return id;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } };
    showError(axiosErr.response?.data?.message || "Delete failed");
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

const pharmacyUserSlice = createSlice({
  name: "pharmacyUser",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPharmacyUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPharmacyUser.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data ?? [];
        state.totalRecords =
          action.payload.totalRecords ?? state.list.length;
      })
      .addCase(fetchPharmacyUser.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default pharmacyUserSlice.reducer;
