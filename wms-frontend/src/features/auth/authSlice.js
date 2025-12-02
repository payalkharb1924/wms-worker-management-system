import { createSlice } from "@reduxjs/toolkit";
import { loadUser } from "./authActions";

const token = localStorage.getItem("wms-token");

const initialState = {
  token: token || null,
  user: null,
  isAuthenticated: Boolean(token),
  loading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
      state.isAuthenticated = true;
      localStorage.setItem("wms-token", token);
    },
    logout: (state, action) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem("wms-token");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(loadUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        localStorage.removeItem("wms-token");
      });
  },
});

export const { login, logout } = authSlice.actions;

export default authSlice.reducer;
