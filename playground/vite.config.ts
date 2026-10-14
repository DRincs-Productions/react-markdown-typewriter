import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            // The package's entry points, mapped to the library sources (most specific first).
            {
                find: /^react-markdown-typewriter\/core$/,
                replacement: resolve(__dirname, "../src/core/index.ts"),
            },
            {
                find: /^react-markdown-typewriter\/react$/,
                replacement: resolve(__dirname, "../src/react/index.ts"),
            },
            {
                find: /^react-markdown-typewriter$/,
                replacement: resolve(__dirname, "../src/index.ts"),
            },
            // needed for the library's internal "@/" imports (e.g. "@/core/...")
            { find: /^@\//, replacement: `${resolve(__dirname, "../src")}/` },
        ],
    },
});
