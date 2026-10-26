import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getAdminApi, saveAdminApi } from "../service/AdminProfileService";
import { mergeStoredAuth } from "../component/auth/authUtils";
import { showSuccess, showError } from "../component/atoms/ToastHelper";

function mergeAdminProfileIntoAuth(profile: {
  name?: string | null;
  email?: string | null;
  role?: string | number | null;
  profileImage?: string | null;
}): void {
  mergeStoredAuth({
    name: profile.name ?? undefined,
    email: profile.email ?? undefined,
    role: profile.role != null ? String(profile.role) : undefined,
    profileImage: profile.profileImage ?? null,
  });
}

// 🔹 GET ADMIN BY ID
export const fetchAdminProfile = createAsyncThunk(
  "adminProfile/fetch",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await getAdminApi(id);
      return res.data.data;
    } catch (err: any) {
      showError("Failed to load profile");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

// 🔹 SAVE / UPDATE ADMIN
export const saveAdminProfile = createAsyncThunk(
  "adminProfile/save",
  async (data: any, { rejectWithValue }) => {
    try {
      const res = await saveAdminApi(data);
      showSuccess(res.data.message || "Profile updated successfully");
      return res.data.data;
    }
    catch (err: any) {
      showError(err.response?.data?.message || "Update failed");
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);

const initialState = {
  admin: null as any,
  loading: false,
  error: null as string | null,
};

const adminProfileSlice = createSlice({
  name: "adminProfile",
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    // 🔄 FETCH
    builder.addCase(fetchAdminProfile.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(fetchAdminProfile.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload) {
        state.admin = action.payload;
        mergeAdminProfileIntoAuth(action.payload);
      }
    });

    builder.addCase(fetchAdminProfile.rejected, (state) => {
      state.loading = false;
    });

    // 🔄 SAVE
    builder.addCase(saveAdminProfile.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(saveAdminProfile.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload) {
        state.admin = action.payload;
        mergeAdminProfileIntoAuth(action.payload);
      }
    });

    builder.addCase(saveAdminProfile.rejected, (state, action: any) => {
      state.loading = false;
      state.error = action.payload;
    });
  },
});

export default adminProfileSlice.reducer;