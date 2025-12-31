import cron from "node-cron";
import { checkOverdueSettlements } from "../services/notificationService.js";
import { generateDailySummary } from "../services/notificationService.js";
import { checkAnalytics } from "../services/notificationService.js";
import { generateAISuggestions } from "../services/notificationService.js";
import { sendEngagementNotification } from "../services/notificationService.js";
import { sendDailyFarmingHack } from "../services/notificationService.js";

// Schedule jobs
// Daily at 9 AM: Check overdue settlements
cron.schedule("0 9 * * *", async () => {
  console.log("🕘 Running daily overdue settlement check...");
  try {
    await checkOverdueSettlements();
  } catch (error) {
    console.error("Error in overdue settlement check:", error);
  }
});

// Daily at 10 AM: Generate daily summary
cron.schedule("0 10 * * *", async () => {
  console.log("🕙 Running daily summary generation...");
  try {
    await generateDailySummary();
  } catch (error) {
    console.error("Error in daily summary:", error);
  }
});

// Weekly on Monday at 11 AM: Analytics check
cron.schedule("0 11 * * 1", async () => {
  console.log("📊 Running weekly analytics check...");
  try {
    await checkAnalytics();
  } catch (error) {
    console.error("Error in analytics check:", error);
  }
});

// Weekly on Tuesday at 9 AM: AI suggestions
cron.schedule("0 9 * * 2", async () => {
  console.log("🤖 Running weekly AI suggestions...");
  try {
    await generateAISuggestions();
  } catch (error) {
    console.error("Error in AI suggestions:", error);
  }
});

// Daily at 8 AM: Engagement notifications
cron.schedule("0 8 * * *", async () => {
  console.log("🎉 Running daily engagement notifications...");
  try {
    await sendEngagementNotification();
  } catch (error) {
    console.error("Error in engagement notifications:", error);
  }
});

// Daily at 7 AM: Farming hack
cron.schedule("30 15 * * *", async () => {
  console.log("🌾 Running daily farming hack...");
  try {
    await sendDailyFarmingHack();
  } catch (error) {
    console.error("Error in farming hack:", error);
  }
});

console.log("✅ Notification scheduler started.");
