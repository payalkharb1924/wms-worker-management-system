import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createExtra,
  getExtrasByWorker,
  getExtrasByDateRange,
  updateExtra,
  deleteExtra,
} from "../controller/extra.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createExtra);
router.put("/:id", authMiddleware, updateExtra);
router.delete("/:id", authMiddleware, deleteExtra);
router.get("/worker/:workerId", authMiddleware, getExtrasByWorker);
router.get("/", authMiddleware, getExtrasByDateRange);

export default router;
