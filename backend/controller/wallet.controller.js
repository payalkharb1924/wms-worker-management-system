import Worker from "../models/Worker.js";
import Settlement from "../models/Settlement.js";

// POST /settlement/worker/:workerId/wallet-withdraw
export const withdrawFromWallet = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { amount, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: "Invalid withdraw amount" });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ msg: "Worker not found" });

    if (worker.walletBalance < amount) {
      return res.status(400).json({ msg: "Insufficient wallet balance" });
    }

    // deduct wallet
    worker.walletBalance -= amount;
    await worker.save();

    // record settlement entry
    await Settlement.create({
      workerId,
      farmerId: req.user.id,
      startDate: new Date(),
      endDate: new Date(),
      attendanceTotal: 0,
      advancesTotal: 0,
      extrasTotal: 0,
      netAmount: -amount,
      paidAmount: amount,
      walletDeposit: -amount,
      note: note || "Wallet withdrawal",
    });

    return res.status(201).json({
      msg: "Wallet withdrawal successful",
      walletBalance: worker.walletBalance,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Wallet withdrawal failed" });
  }
};
