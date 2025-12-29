// routes/bot.route.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import Advance from "../models/Advance.js";
import Settlement from "../models/Settlement.js";

const router = express.Router();

router.post("/query", authMiddleware, async (req, res) => {
  try {
    const { entity, filters = {}, aggregation } = req.body;
    const farmerId = req.user.id;

    let data = [];

    // ---------------- WORKERS ----------------
    if (entity === "worker") {
      data = await Worker.find({ farmerId, ...filters });
    }

    // ---------------- ATTENDANCE ----------------
    else if (entity === "attendance") {
      data = await Attendance.aggregate([
        {
          $lookup: {
            from: "workers",
            localField: "workerId",
            foreignField: "_id",
            as: "worker",
          },
        },
        { $unwind: "$worker" },
        {
          $match: {
            "worker.farmerId": farmerId,
            ...filters,
          },
        },
      ]);
    }

    // ---------------- ADVANCE ----------------
    else if (entity === "advance") {
      // 🔥 who has most advance
      if (aggregation?.type === "sum" && aggregation.groupBy === "workerId") {
        data = await Advance.aggregate([
          {
            $lookup: {
              from: "workers",
              localField: "workerId",
              foreignField: "_id",
              as: "worker",
            },
          },
          { $unwind: "$worker" },
          {
            $match: {
              "worker.farmerId": farmerId,
            },
          },
          {
            $group: {
              _id: "$workerId",
              totalAdvance: { $sum: "$amount" },
              workerName: { $first: "$worker.name" },
            },
          },
          { $sort: { totalAdvance: -1 } },
          { $limit: aggregation.limit || 1 },
          {
            $project: {
              _id: 0,
              workerName: 1,
              totalAdvance: 1,
            },
          },
        ]);
      } else {
        data = await Advance.aggregate([
          {
            $lookup: {
              from: "workers",
              localField: "workerId",
              foreignField: "_id",
              as: "worker",
            },
          },
          { $unwind: "$worker" },
          {
            $match: {
              "worker.farmerId": farmerId,
              ...filters,
            },
          },
        ]);
      }
    }

    // ---------------- SETTLEMENT ----------------
    else if (entity === "settlement") {
      data = await Settlement.aggregate([
        {
          $lookup: {
            from: "workers",
            localField: "workerId",
            foreignField: "_id",
            as: "worker",
          },
        },
        { $unwind: "$worker" },
        {
          $match: {
            "worker.farmerId": farmerId,
            ...filters,
          },
        },
        { $sort: { createdAt: -1 } },
      ]);
    }

    return res.json({ data });
  } catch (err) {
    console.error("BOT QUERY ERROR:", err);
    return res.status(500).json({ error: "Bot query failed" });
  }
});

export default router;
