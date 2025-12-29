import axios from "./axios"; // your existing axios instance

export const sendBotMessage = async (message) => {
  const token = localStorage.getItem("token");

  const res = await axios.post(
    "http://127.0.0.1:8000/chat",
    { message },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};
