import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // VITE_BASE=/kanban-demo/ for the GitHub Pages demo build, "/" otherwise.
  base: process.env.VITE_BASE ?? "/",
  server: { port: 5176 },
});
