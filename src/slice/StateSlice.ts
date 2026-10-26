import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getStatesApi } from "../service/StateService";
import { showError } from "../component/atoms/ToastHelper";
import { normalizeStateList, type StateDto } from "../dto/stateDto";

interface StateSliceState {
  list: StateDto[];
  loading: boolean;
}

const initialState: StateSliceState = {
  list: [],
  loading: false,
};

export const fetchStates = createAsyncThunk<
  StateDto[],
  void,
  { rejectValue: unknown }
>("state/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await getStatesApi();
    return normalizeStateList(res.data);
  } catch (err: unknown) {
    showError("Error fetching states");
    const axiosErr = err as { response?: { data?: unknown } };
    return rejectWithValue(axiosErr.response?.data || "Error");
  }
});

const stateSlice = createSlice({
  name: "state",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStates.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStates.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchStates.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default stateSlice.reducer;
