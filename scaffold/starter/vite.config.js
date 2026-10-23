import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { builderHarness } from "builderharness/vite";

export default defineConfig({
  plugins: [
    builderHarness({
      root: process.cwd(),
      frsRegistry: "src/config/frs-map.js",
    }),
    react(),
  ],
  css: {
    postcss: "./postcss.config.cjs",
  },
});
