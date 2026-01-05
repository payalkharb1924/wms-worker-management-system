import api from "../api/axios.js";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { login } from "../features/auth/authSlice.js";
import { Loader, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
    } finally {
      setLoading(false);
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
          <div className="flex flex-col space-y-1 relative">
            <label className="font-medium">Password</label>
            <input
              className="signup-input border-b rounded-md border-gray-300 focus:outline-none focus:border-[var(--primary)] p-2 pr-10"
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              placeholder="example@123"
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-9 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            disabled={loading}
            className={`w-full cursor-pointer primary-bg text-white py-3 mt-4 rounded-lg text-lg font-semibold hover:bg-orange-400 transition ${
              loading ? "opacity-70 cursor-not-allowed" : "hover:bg-orange-400"
            }`}
            type="submit"
          >
            {loading ? (
              <div className="flex justify-center items-center gap-2">
                <Loader className="w-5 h-5 animate-spin" />
                Logging in...
              </div>
            ) : (
              "Login"
            )}
          </button>
        </form>
        <p className="text-sm text-center mt-4">
          <button
            onClick={() => navigate("/forgot-password")}
            className="text-[var(--primary)] font-semibold hover:underline"
          >
            Forgot Password?
          </button>
        </p>

        {/* Footer link */}
        <p className="text-sm text-gray-600 text-center mt-6">
          New here?{" "}
          <button
            onClick={() => navigate("/signup")}
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
