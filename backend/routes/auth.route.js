import express from "express";
import {
  login,
  me,
  signup,
  verifyPassword,
  verifySignupOTP,
  forgotPassword,
  resetPassword,
} from "../controller/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/verify-password", authMiddleware, verifyPassword);
router.post("/verify-signup-otp", verifySignupOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
