import { defineConfig } from "tsup";

export default defineConfig({
    target: "es2020",
    entry: {
        index: "src/index.ts",
    },
    format: ["cjs", "esm"], // Build for commonJS and ESmodules
    dts: true, // Generate declaration file (.d.ts)
    treeshake: true,
    clean: true,
    minify: true,
    bundle: true,
    skipNodeModulesBundle: false, // Skip bundling of node_modules
    external: ["motion", "react", "react-dom", "react-markdown"],
    outExtension({ format }) {
        return {
            js: format === "esm" ? ".mjs" : ".cjs",
        };
    },
});
