import { useState } from "react";
import BotChat from "./BotChat";
import farmerIcon from "../assets/farmer-bot.png";

export default function BotFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bot Icon */}
      <button
        onClick={() => setOpen(true)}
        title="Ask Assistant"
        className="
          w-10 h-10
          rounded-full
          border-1 border-white
          bg-transparent
          flex items-center justify-center
          shadow-lg
          hover:scale-110
          transition
        "
      >
        <img
          src={farmerIcon}
          alt="Farm Assistant"
          className="w-9 h-9 object-contain"
        />
      </button>

      {/* Chat */}
      {open && <BotChat onClose={() => setOpen(false)} />}
    </>
  );
}
