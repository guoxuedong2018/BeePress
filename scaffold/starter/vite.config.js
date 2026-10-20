import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { beePress } from "beepress/vite";

export default defineConfig({
  plugins: [
    beePress({
      root: process.cwd(),
      frsRegistry: "src/config/frs-map.js",
    }),
    react(),
  ],
  css: {
    postcss: "./postcss.config.cjs",
  },
});
