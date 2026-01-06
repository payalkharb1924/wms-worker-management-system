// utils/sendEmail.js
import SibApiV3Sdk from "sib-api-v3-sdk";

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

export const sendEmail = async ({ to, subject, html }) => {
  const api = new SibApiV3Sdk.TransactionalEmailsApi();

  await api.sendTransacEmail({
    sender: {
      name: "WMS",
      email: "mywms.connect@gmail.com", // verified sender
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });
};
