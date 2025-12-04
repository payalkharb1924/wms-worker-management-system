import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      sans: ["Poppins", "sans-serif"],
    },
  },

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icons/splash-screen.png", // 👈 Added here
      ],
      manifest: {
        name: "WMS - Worker Management System",
        short_name: "WMS",
        description: "Manage workers, payments & attendance offline too!",
        theme_color: "#EA580C",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/splash-screen.png",
            sizes: "1280x2688",
            type: "image/png",
          },
          {
            src: "icons/splash-screen.png",
            sizes: "1280x2688",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/wms-umf8\.onrender\.com\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
});

// npm run dev -- --host
