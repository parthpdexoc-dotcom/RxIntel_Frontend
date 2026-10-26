import { createSlice } from "@reduxjs/toolkit";

const insuranceGroupSlice = createSlice({
  name: "insurancegroup",
  initialState: {
    list: [],
    loading: false,
  },
  reducers: {},
});

export default insuranceGroupSlice.reducer;
