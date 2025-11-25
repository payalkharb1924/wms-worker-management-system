import api from "../api/axios.js";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { login } from "../features/auth/authSlice.js";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      dispatch(
        login({
          token: res.data.token,
          user: res.data.user,
        })
      );
      toast.success("Logged in successfully");

      setTimeout(() => navigate("/dashboard"), 700);
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.msg || "Login failed. Try again");
    }
  };

  return (
    <div className="flex min-h-screen justify-center items-center px-4 primary-bg">
      <div className="flex flex-col w-full max-w-sm bg-white shadow-lg rounded-xl p-8">
        <h1 className="text-3xl font-bold primary-font text-center mb-8">
          Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-1">
            <label className="font-medium">Email</label>
            <input
              className="signup-input border-b rounded-md border-gray-300 focus:outline-none focus:border-[var(--primary)] p-2"
              type="email"
              name="email"
              value={form.email}
              placeholder="example@gmail.com"
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="font-medium">Password</label>
            <input
              className="signup-input border-b rounded-md border-gray-300 focus:outline-none focus:border-[var(--primary)] p-2"
              type="password"
              name="password"
              value={form.password}
              placeholder="example@123"
              onChange={handleChange}
            />
          </div>

          <button
            className="w-full cursor-pointer primary-bg text-white py-3 mt-4 rounded-lg text-lg font-semibold hover:bg-orange-400 transition"
            type="submit"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
