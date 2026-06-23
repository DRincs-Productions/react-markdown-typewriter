import { defineConfig } from "tsup";

export default defineConfig((options) => {
    const sourcemap = Boolean(options.watch);
    return {
        target: "es2022",
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
        sourcemap,
        esbuildOptions(opts) {
            // Force-transpile private class fields/methods to WeakMaps.
            // Keeping es2022 target ensures useDefineForClassFields:true so arrow-function
            // class fields stay as native class fields (outside the constructor body),
            // avoiding the Babel super()-in-arrow-function error in CRA/react-scripts.
            opts.supported = {
                ...opts.supported,
                "class-private-field": false,
                "class-private-method": false,
                "class-private-accessor": false,
                "class-private-static-field": false,
                "class-private-static-method": false,
                "class-private-static-accessor": false,
            };
        },
    };
});
