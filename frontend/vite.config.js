import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "icons/*.png"],
      manifest: {
        name: "KUPE — AI Linkage Engine",
        short_name: "KUPE",
        description:
          "Constraint-aware tourism, auto-crafted by AI. Halal & accessible itineraries with self-healing linkages.",
        theme_color: "#0194F3",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
          { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  server: {
    port: 5173,
    host: true,
    // Allow Cloudflare TryCloudflare tunnel hosts to load the dev server.
    // Vite 5+ blocks unknown hosts by default — this trusts any *.trycloudflare.com.
    allowedHosts: [".trycloudflare.com", "localhost"],
    hmr: {
      // When loaded via HTTPS tunnel, HMR WebSocket must use 443 + wss
      clientPort: 443,
      protocol: "wss",
    },
  },
  preview: { port: 4173 }
});
