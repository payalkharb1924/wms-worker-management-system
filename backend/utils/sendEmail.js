// utils/sendEmail.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // MUST be false for 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"WMS" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};

transporter.verify((err) => {
  if (err) {
    console.error("❌ SMTP VERIFY FAILED:", err);
  } else {
    console.log("✅ SMTP READY TO SEND EMAILS");
  }
});
