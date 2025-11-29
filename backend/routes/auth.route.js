import express from "express";
import {
  login,
  me,
  signup,
  verifyPassword,
} from "../controller/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/auth/verify-password", authMiddleware, verifyPassword);

export default router;
