import Notification from "../models/Notification.js";
import DeviceToken from "../models/DeviceToken.js";
import Settlement from "../models/Settlement.js";
import Worker from "../models/Worker.js";
import Farmer from "../models/Farmer.js";
import Attendance from "../models/Attendance.js";
import Advance from "../models/Advance.js";
import Extra from "../models/Extra.js";
import { sendPushNotification } from "../utils/notifications.js";

export const sendNotificationToUser = async (
  userId,
  title,
  body,
  category,
  metadata = {}
) => {
  // 1. Save notification in DB
  await Notification.create({
    userId,
    title,
    body,
    category,
    metadata,
  });

  // 2. Fetch active tokens
  const tokens = await DeviceToken.find({
    userId,
    isActive: true,
  });

  if (!tokens.length) return;

  // 3. Send push to all active devices
  for (const t of tokens) {
    await sendPushNotification({
      token: t.token,
      title,
      body,
      data: {
        category,
        metadata: JSON.stringify(metadata),
        appControlled: "true",
      },
    });
  }
};

// 1. Overdue / Pending Settlement Notifications
export const checkOverdueSettlements = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Find unsettled entries older than 30 days
  const unsettledAttendances = await Attendance.find({
    isSettled: false,
    date: { $lt: thirtyDaysAgo },
  }).populate("workerId");

  const unsettledAdvances = await Advance.find({
    isSettled: false,
    date: { $lt: thirtyDaysAgo },
  }).populate("workerId");

  const unsettledExtras = await Extra.find({
    isSettled: false,
    date: { $lt: thirtyDaysAgo },
  }).populate("workerId");

  console.log(
    `Found ${unsettledAttendances.length} unsettled attendances, ${unsettledAdvances.length} advances, ${unsettledExtras.length} extras older than 30 days`
  );

  const userGroups = {};

  // Group by farmerId
  const addToGroup = (entries, type) => {
    for (const entry of entries) {
      if (!entry.workerId || !entry.workerId.farmerId) continue; // Skip if worker not found
      const farmerId = entry.workerId.farmerId.toString();
      if (!userGroups[farmerId])
        userGroups[farmerId] = { attendances: [], advances: [], extras: [] };
      userGroups[farmerId][type].push(entry);
    }
  };

  addToGroup(unsettledAttendances, "attendances");
  addToGroup(unsettledAdvances, "advances");
  addToGroup(unsettledExtras, "extras");

  for (const [userId, data] of Object.entries(userGroups)) {
    const totalUnsettled =
      data.attendances.length + data.advances.length + data.extras.length;
    if (totalUnsettled > 0) {
      const title = `⚠️ Unsettled Entries Overdue`;
      const body = `You have ${totalUnsettled} unsettled entries older than 30 days. Please settle payments.`;
      await sendNotificationToUser(userId, title, body, "overdue", {
        attendances: data.attendances.length,
        advances: data.advances.length,
        extras: data.extras.length,
      });
    }
  }
};

// 2. Daily Summary Notification
export const generateDailySummary = async () => {
  const farmers = await Farmer.find();
  console.log(`Found ${farmers.length} farmers for daily summary`);

  for (const farmer of farmers) {
    const totalSettlements = await Settlement.countDocuments({
      farmerId: farmer._id,
    });

    const workerIds = await Worker.find({ farmerId: farmer._id }).select("_id");
    const workerIdList = workerIds.map((w) => w._id);

    // Count unsettled entries
    const unsettledAttendances = await Attendance.countDocuments({
      workerId: { $in: workerIdList },
      isSettled: false,
    });
    const unsettledAdvances = await Advance.countDocuments({
      workerId: { $in: workerIdList },
      isSettled: false,
    });
    const unsettledExtras = await Extra.countDocuments({
      workerId: { $in: workerIdList },
      isSettled: false,
    });

    const totalUnsettled =
      unsettledAttendances + unsettledAdvances + unsettledExtras;

    // Calculate total unsettled amount (approximate)
    const attendanceAmount = await Attendance.aggregate([
      {
        $match: {
          workerId: { $in: workerIdList },
          isSettled: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const advanceAmount = await Advance.aggregate([
      {
        $match: {
          workerId: { $in: workerIdList },
          isSettled: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const extraAmount = await Extra.aggregate([
      {
        $match: {
          workerId: { $in: workerIdList },
          isSettled: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    const totalAmount =
      (attendanceAmount[0]?.total || 0) -
      (advanceAmount[0]?.total || 0) -
      (extraAmount[0]?.total || 0);

    console.log(
      `Farmer ${farmer._id} (${farmer.name}): total settlements: ${totalSettlements}, unsettled entries: ${totalUnsettled}, ₹${totalAmount}`
    );

    if (totalUnsettled > 0) {
      const title = `📅 Daily Summary`;
      const body = `${totalUnsettled} unsettled entr${
        totalUnsettled > 1 ? "ies" : "y"
      }, ₹${totalAmount} at risk.`;
      console.log(`Sending daily summary to ${farmer._id}: ${title} - ${body}`);
      await sendNotificationToUser(farmer._id, title, body, "summary", {
        unsettledCount: totalUnsettled,
        totalAmount,
      });
    } else {
      console.log(
        `No unsettled entries for ${farmer._id}, skipping daily summary`
      );
    }
  }
};

// 3. Analytic Notifications
export const checkAnalytics = async () => {
  console.log("Checking analytics for high unsettled amounts");
  const farmers = await Farmer.find();
  console.log(`Found ${farmers.length} farmers for analytics`);

  for (const farmer of farmers) {
    const workerIds = await Worker.find({ farmerId: farmer._id }).select("_id");
    const workerIdList = workerIds.map((w) => w._id);

    const attendanceAmount = await Attendance.aggregate([
      { $match: { workerId: { $in: workerIdList }, isSettled: false } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const advanceAmount = await Advance.aggregate([
      { $match: { workerId: { $in: workerIdList }, isSettled: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const extraAmount = await Extra.aggregate([
      { $match: { workerId: { $in: workerIdList }, isSettled: false } },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    const amount =
      (attendanceAmount[0]?.total || 0) -
      (advanceAmount[0]?.total || 0) -
      (extraAmount[0]?.total || 0);

    console.log(
      `Farmer ${farmer._id} (${farmer.name}): total unsettled ₹${amount}`
    );

    if (amount > 10000) {
      const title = `📊 High Unsettled Amount`;
      const body = `Unsettled entries total ₹${amount}, which is above threshold.`;
      console.log(
        `Sending analytics notification to ${farmer._id}: ${title} - ${body}`
      );
      await sendNotificationToUser(farmer._id, title, body, "analytics", {
        totalAmount: amount,
      });
    } else {
      console.log(`Amount below threshold for ${farmer._id}, skipping`);
    }
  }
};

// 4. AI-Driven Suggestions (placeholder)
export const generateAISuggestions = async () => {
  console.log("Generating AI suggestions for long-unsettled entries");
  const oldDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

  const oldAttendances = await Attendance.find({
    isSettled: false,
    date: { $lt: oldDate },
  }).populate("workerId");

  const oldAdvances = await Advance.find({
    isSettled: false,
    date: { $lt: oldDate },
  }).populate("workerId");

  const oldExtras = await Extra.find({
    isSettled: false,
    date: { $lt: oldDate },
  }).populate("workerId");

  console.log(
    `Found ${
      oldAttendances.length + oldAdvances.length + oldExtras.length
    } unsettled entries > 15 days`
  );

  const userGroups = {};
  const addToGroup = (entries) => {
    for (const entry of entries) {
      if (!entry.workerId || !entry.workerId.farmerId) continue; // Skip if worker not found
      const userId = entry.workerId.farmerId.toString();
      if (!userGroups[userId]) userGroups[userId] = [];
      userGroups[userId].push(entry);
    }
  };

  addToGroup(oldAttendances);
  addToGroup(oldAdvances);
  addToGroup(oldExtras);

  for (const [userId, entries] of Object.entries(userGroups)) {
    const workerNames = [...new Set(entries.map((e) => e.workerId.name))];
    const aiMessages = [
      "Consider settling with {workers} - they've been waiting over 15 days. Building trust pays off!",
      "AI Insight: {workers} have unsettled entries older than 15 days. Early settlement boosts morale and loyalty.",
      "Pro Tip: Workers like {workers} with pending dues for 15+ days might appreciate a quick resolution. Happy workers = productive farm!",
      "Smart Move: Settle with {workers} soon. Delaying payments can affect motivation – keep your team happy!",
      "AI Recommendation: {workers} have entries pending >15 days. Consider a bonus or timely payment to show appreciation.",
    ];
    const randomMessage =
      aiMessages[Math.floor(Math.random() * aiMessages.length)];
    const body = randomMessage.replace("{workers}", workerNames.join(", "));
    const title = `🤖 AI Insight`;
    console.log(`Sending AI suggestion to ${userId}: ${title} - ${body}`);
    await sendNotificationToUser(userId, title, body, "ai", {
      workers: workerNames,
    });
  }
};

// 5. Marketing & Engagement Notifications
export const sendMarketingNotification = async (userId, title, body) => {
  await sendNotificationToUser(userId, title, body, "marketing");
};

export const sendEngagementNotification = async () => {
  const farmers = await Farmer.find();
  console.log(`Sending engagement notifications to ${farmers.length} farmers`);

  const messages = [
    {
      title: "🌟 Farm Tip",
      body: "Regular settlements keep workers motivated. Try settling weekly for better productivity!",
    },
    {
      title: "📅 Reminder",
      body: "Don't forget to update worker wages for the new year. Fair pay leads to happy workers!",
    },
    {
      title: "🎉 Happy Holidays!",
      body: "Wishing you a prosperous farming season ahead. May your harvests be bountiful!",
    },
    {
      title: "💡 Productivity Hack",
      body: "Workers with consistent attendance records perform better. Reward reliability with timely payments.",
    },
    {
      title: "🔄 Update Check",
      body: "Have you checked for app updates? New features can make managing workers easier!",
    },
    {
      title: "🤝 Team Building",
      body: "Building strong relationships with workers leads to long-term success. Consider team outings or bonuses.",
    },
    {
      title: "📊 Analytics Insight",
      body: "Track your settlement patterns to optimize cash flow. Settle smart, farm better!",
    },
    {
      title: "🛡️ Safety First",
      body: "Ensure worker safety on the farm. Happy, safe workers are your best asset.",
    },
    {
      title: "🎯 Goal Setting",
      body: "Set monthly goals for settlements and worker management. Consistency is key!",
    },
    {
      title: "🌱 Seasonal Advice",
      body: "As seasons change, review worker schedules. Adapt for maximum efficiency.",
    },
  ];

  for (const farmer of farmers) {
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    console.log(
      `Sending engagement to ${farmer._id}: ${randomMsg.title} - ${randomMsg.body}`
    );
    await sendNotificationToUser(
      farmer._id,
      randomMsg.title,
      randomMsg.body,
      "engagement",
      {}
    );
  }
};

// 6. Daily Farming Hack
export const sendDailyFarmingHack = async () => {
  const farmers = await Farmer.find();
  console.log(`Sending daily farming hacks to ${farmers.length} farmers`);

  const farmingHacks = [
    {
      title: "🌾 Crop Rotation Tip",
      body: "Rotate crops like wheat and legumes to maintain soil fertility and reduce pests naturally.",
    },
    {
      title: "💧 Water Management",
      body: "Water your crops early in the morning to minimize evaporation and ensure deep root penetration.",
    },
    {
      title: "🐛 Pest Control Hack",
      body: "Use neem oil spray as a natural pesticide – it's effective against aphids and other common pests.",
    },
    {
      title: "🌱 Seed Saving",
      body: "Save seeds from your best-performing plants to improve future yields through natural selection.",
    },
    {
      title: "🧪 Soil Testing",
      body: "Test your soil pH regularly. Most crops prefer slightly acidic to neutral soil (pH 6-7).",
    },
    {
      title: "🌞 Sunlight Optimization",
      body: "Ensure crops get 6-8 hours of sunlight daily. Prune nearby trees if needed for better exposure.",
    },
    {
      title: "🌿 Companion Planting",
      body: "Plant basil with tomatoes to repel pests and improve flavor. Try marigolds to deter nematodes.",
    },
    {
      title: "🦗 Beneficial Insects",
      body: "Attract ladybugs to your farm – they naturally control aphid populations without chemicals.",
    },
    {
      title: "🌡️ Temperature Monitoring",
      body: "Monitor soil temperature for seed germination. Most seeds need 10-25°C for optimal sprouting.",
    },
    {
      title: "🌿 Organic Fertilizer",
      body: "Use compost from kitchen waste as fertilizer. It's rich in nutrients and improves soil structure.",
    },
  ];

  for (const farmer of farmers) {
    const randomHack =
      farmingHacks[Math.floor(Math.random() * farmingHacks.length)];
    console.log(
      `Sending farming hack to ${farmer._id}: ${randomHack.title} - ${randomHack.body}`
    );
    await sendNotificationToUser(
      farmer._id,
      randomHack.title,
      randomHack.body,
      "engagement",
      {}
    );
  }
};
