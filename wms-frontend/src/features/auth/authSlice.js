import { createSlice } from "@reduxjs/toolkit";

const token = localStorage.getItem("wms-token");

const initialState = {
  token: token || null,
  user: null,
  isAuthenticated: Boolean(token),
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
});

export const { login, logout } = authSlice.actions;

export default authSlice.reducer;
