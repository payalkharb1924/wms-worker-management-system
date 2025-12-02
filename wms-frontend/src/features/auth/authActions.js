import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

// Load logged-in user's data when token exists
export const loadUser = createAsyncThunk(
  "auth/loadUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/auth/me");
      return res.data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.msg || "Failed to load user");
    }
  }
);
