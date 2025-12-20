import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import farmerBg from "../assets/farmer-svg.svg";
import { Download } from "lucide-react";

const container = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const logoLetter = {
  hidden: { opacity: 0, y: 20, scale: 0.8 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 18 },
  },
};

const Home = () => {
  const features = [
    "Track Workers",
    "Daily Attendance",
    "Advance & Settlements",
  ];

  const [deferredPrompt, setDeferredPrompt] = React.useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert("Use browser menu → Add to Home Screen 📲");
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center px-6
                 primary-bg relative overflow-hidden"
    >
      {/* 🌐 Language selector */}
      <div className="absolute top-4 left-4 z-30">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="absolute top-0 w-2xl left-4 z-30"
        >
          <button
            onClick={() => alert("Hindi support coming soon 🇮🇳")}
            className="flex items-center gap-2
               bg-white/60 px-2 py-2 rounded-full
               text-xs font-semibold shadow-md
               backdrop-blur
               hover:shadow-lg hover:scale-105
               active:scale-95 transition"
          >
            🌐 EN
            {/* <span className="text-[10px] opacity-60">HI</span> */}
          </button>
        </motion.div>
      </div>

      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        onClick={handleInstall}
        className="absolute top-3 right-2 z-30
             flex items-center gap-2
             bg-white/60 px-3 py-1.5 rounded-full
             text-xs font-semibold shadow-md
             backdrop-blur
             hover:shadow-lg transition"
      >
        <Download /> Install App
      </motion.button>

      {/* 🌾 Farmer illustration (background layer) */}
      <img
        src={farmerBg}
        alt="Farmer illustration"
        className=" absolute left-1/2 bottom-1/2 -translate-x-1/2 translate-y-[25%] scale-[2.8] w-auto h-[70vh] z-10 pointer-events-none drop-shadow-[0_20px_60px_rgba(0,0,0,0.15)] "
      />

      {/* ✨ Soft gradient blobs */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl" />

      {/* 🧊 Main animated card */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-20 bg-white/60 backdrop-blur-lg
                   rounded-3xl shadow-2xl
                   px-10 py-12
                   flex flex-col items-center
                   w-full max-w-sm mt-40"
      >
        {/* 🔤 Logo (for morph animation) */}
        <motion.div layoutId="app-logo" className="flex gap-1 mb-2">
          {["W", "M", "S"].map((char, i) => (
            <motion.span
              key={i}
              variants={logoLetter}
              className="primary-font text-6xl font-extrabold tracking-tight"
            >
              {char}
            </motion.span>
          ))}
        </motion.div>

        <motion.p variants={item} className="text-gray-600 text-sm text-center">
          Worker Management, made simple.
        </motion.p>

        <motion.div
          variants={item}
          className="w-12 h-1 rounded-full bg-[var(--primary)]/80 my-6"
        />

        {/* 👉 CTA Buttons */}
        <motion.div variants={item} className="flex flex-col w-full gap-4">
          <Link
            to="/signup"
            className="w-full text-center py-3 rounded-2xl
                       border border-white
                       text-gray-800 font-semibold
                       hover:bg-gray-100
                       active:scale-[0.97]
                       transition"
          >
            Create Account
          </Link>

          <Link
            to="/login"
            className="w-full text-center py-3 rounded-2xl
                       primary-bg text-white font-semibold
                       shadow-lg shadow-orange-200/40
                       hover:bg-orange-400
                       active:scale-[0.97]
                       transition"
          >
            Login
          </Link>
        </motion.div>
      </motion.div>

      {/* ✋ Farmer hand foreground (above card) */}
      <img
        src={farmerBg}
        alt=""
        className=" absolute left-1/2 bottom-1/2 top-0 -translate-x-1/2 translate-y-[-3%] scale-[2.8] h-[70vh] z-30 pointer-events-none drop-shadow-[0_0_1px_rgba(0,0,0,0.20)] "
        style={{ clipPath: "polygon(60% 30%, 100% 40%, 100% 60%, 60% 60%)" }}
      />

      {/* 🧾 Footer */}
      <motion.p
        variants={item}
        initial="hidden"
        animate="show"
        className="relative z-10 text-xs text-white/80 mt-6 text-center"
      >
        Built for farmers • Designed for simplicity
      </motion.p>
    </div>
  );
};

export default Home;
