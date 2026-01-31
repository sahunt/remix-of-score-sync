import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Precache built assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        
        // Runtime caching for song jackets from Supabase Storage
        runtimeCaching: [
          {
            urlPattern: /\/storage\/v1\/object\/public\/song-jackets\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "song-jackets-cache",
              expiration: {
                maxEntries: 2000,               // ~1300 songs + buffer
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "DDR Score Tracker",
        short_name: "DDR Tracker",
        description: "Track and analyze your Dance Dance Revolution scores",
        theme_color: "#1a1a2e",
        background_color: "#0f0f1a",
        display: "standalone",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
}));
