// utils/sendEmail.js
import SibApiV3Sdk from "sib-api-v3-sdk";

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendEmail = async ({ to, subject, html }) => {
  try {
    await emailApi.sendTransacEmail({
      sender: {
        email: "mywms.connect@gmail.com", // verified sender
        name: "WMS",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
  } catch (err) {
    console.error("❌ BREVO EMAIL ERROR:", err.response?.body || err.message);
    throw err;
  }
};
