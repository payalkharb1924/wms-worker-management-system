import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Loader, KeyRound } from "lucide-react";

const OTP_LENGTH = 6;

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");

  const inputsRef = useRef([]);

  /* ---------------- SEND OTP ---------------- */
  const sendOtp = async () => {
    if (!email) {
      toast.error("Please enter email");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("OTP sent to your email 📩");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- OTP INPUT HANDLERS ---------------- */
  const handleOtpChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  /* ---------------- RESET PASSWORD ---------------- */
  const resetPassword = async () => {
    const finalOtp = otp.join("");

    if (finalOtp.length !== OTP_LENGTH) {
      toast.error("Please enter complete OTP");
      return;
    }

    if (!newPassword || newPassword.length < 5) {
      toast.error("Password must be at least 5 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        otp: finalOtp,
        newPassword,
      });
      toast.success("Password reset successful");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 2) return;

    const finalOtp = otp.join("");
    if (finalOtp.length === OTP_LENGTH && newPassword && !loading) {
      resetPassword();
    }
  }, [otp]);

  return (
    <div className="flex min-h-screen justify-center items-center primary-bg px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
        {/* ICON */}
        <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-orange-100">
          <KeyRound className="text-[var(--primary)] w-7 h-7" />
        </div>

        <h2 className="text-2xl font-bold mb-2">Reset Password</h2>

        {step === 1 && (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Enter your registered email to receive an OTP
            </p>

            <input
              className="w-full border rounded-xl p-3 mb-4
                         focus:outline-none focus:border-[var(--primary)]
                         focus:ring-2 focus:ring-orange-200"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              onClick={sendOtp}
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white font-semibold
                primary-bg transition
                ${
                  loading
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:bg-orange-400"
                }
              `}
            >
              {loading ? (
                <Loader className="animate-spin mx-auto" />
              ) : (
                "Send OTP"
              )}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Enter the 6-digit OTP sent to <br />
              <span className="font-semibold text-gray-700">{email}</span>
            </p>

            {/* OTP BOXES */}
            <div className="flex justify-between gap-2 mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputsRef.current[index] = el)}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-8 h-10 text-center text-xl font-bold
                             border rounded-xl
                             focus:outline-none focus:border-[var(--primary)]
                             focus:ring-2 focus:ring-orange-200
                             transition"
                />
              ))}
            </div>

            {/* NEW PASSWORD */}
            <input
              type="password"
              className="w-full border rounded-xl p-3 mb-4
                         focus:outline-none focus:border-[var(--primary)]
                         focus:ring-2 focus:ring-orange-200"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <button
              onClick={resetPassword}
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white font-semibold
                primary-bg transition
                ${
                  loading
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:bg-orange-400"
                }
              `}
            >
              {loading ? (
                <div className="flex justify-center items-center gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  Resetting...
                </div>
              ) : (
                "Reset Password"
              )}
            </button>
          </>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Remembered your password? Try logging in 🙂
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
