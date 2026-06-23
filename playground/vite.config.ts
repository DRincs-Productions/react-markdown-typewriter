import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "react-markdown-typewriter": resolve(__dirname, "../src/index.ts"),
            // needed for the library's internal "@/" imports (e.g. "@/functions/...")
            "@": resolve(__dirname, "../src"),
        },
    },
});
