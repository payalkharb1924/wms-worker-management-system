import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/axios";
import { Loader, MailCheck } from "lucide-react";

const OTP_LENGTH = 6;

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email;

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);

  if (!email) {
    navigate("/signup");
    return null;
  }
  useEffect(() => {
    const finalOtp = otp.join("");
    if (finalOtp.length === OTP_LENGTH && !loading) {
      handleVerify(new Event("submit"));
    }
  }, [otp]);

  const handleChange = (value, index) => {
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

  const handleVerify = async (e) => {
    e.preventDefault();
    const finalOtp = otp.join("");

    if (finalOtp.length !== OTP_LENGTH) {
      toast.error("Please enter complete OTP");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-signup-otp", {
        email,
        otp: finalOtp,
      });
      toast.success("Email verified successfully");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen justify-center items-center primary-bg px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
        {/* Icon */}
        <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-orange-100">
          <MailCheck className="text-[var(--primary)] w-7 h-7" />
        </div>

        <h2 className="text-2xl font-bold mb-2">Verification Code</h2>
        <p className="text-sm text-gray-500 mb-6">
          Enter the 6-digit code sent to <br />
          <span className="font-semibold text-gray-700">{email}</span>
        </p>

        <form onSubmit={handleVerify}>
          {/* OTP BOXES */}
          <div className="flex justify-between gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-8 h-10 text-center text-xl font-bold
                           border-2 border-gray-400 rounded-xl
                           focus:outline-none focus:border-[var(--primary)]
                           focus:ring-2 focus:ring-orange-200
                           transition"
              />
            ))}
          </div>

          {/* BUTTON */}
          <button
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
                Verifying...
              </div>
            ) : (
              "Confirm Code"
            )}
          </button>
        </form>

        {/* FOOTER */}
        <p className="text-xs text-gray-400 mt-6">
          Didn’t receive the code? Check spam
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
