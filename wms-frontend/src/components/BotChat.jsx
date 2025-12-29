import { useState, useRef, useEffect } from "react";
import { sendBotMessage } from "../api/botApi";

export default function BotChat({ onClose }) {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Namaste! Main aapka assistant hoon 👋" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendBotMessage(userMsg.text);

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: res.reply || "Kuch gadbad ho gayi 😅" },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Server se connect nahi ho paya ❌" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="fixed top-16 right-4 w-80 h-[420px] bg-white rounded-2xl shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-orange-500 text-white rounded-t-2xl">
        <span className="font-semibold">🤠 Farm Assistant</span>
        <button onClick={onClose} className="text-lg">
          ✖
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[75%] px-3 py-2 rounded-xl break-words ${
              m.role === "user"
                ? "ml-auto bg-orange-100 text-orange-900 text-right"
                : "mr-auto bg-gray-100 text-gray-800"
            }`}
          >
            {m.text}
          </div>
        ))}

        {loading && (
          <div className="mr-auto bg-gray-100 text-gray-500 px-3 py-2 rounded-xl w-fit">
            Typing...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex border-t">
        <input
          className="flex-1 px-3 py-2 outline-none text-gray-800"
          placeholder="Yahan likhiye..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="px-4 text-orange-600 font-semibold"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}
