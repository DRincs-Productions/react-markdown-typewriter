import { defineConfig, type Options } from "tsup";

const TANSTACK_MARKDOWN = /^@tanstack\/markdown/;

export default defineConfig((options) => {
    const base: Options = {
        target: "es2022",
        entry: {
            index: "src/index.ts",
        },
        treeshake: true,
        // `dist` is emptied by the `build` script: both configs below run in parallel, so letting
        // either one clean the folder could delete the other's output.
        clean: false,
        minify: true,
        bundle: true,
        skipNodeModulesBundle: false, // Skip bundling of node_modules
        outExtension({ format }) {
            return {
                js: format === "esm" ? ".mjs" : ".cjs",
            };
        },
        sourcemap: Boolean(options.watch),
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
    return [
        {
            ...base,
            format: ["esm"],
            dts: true, // index.d.mts
            external: ["motion", "react", "react-dom", TANSTACK_MARKDOWN],
        },
        {
            ...base,
            format: ["cjs"],
            dts: true, // index.d.ts, used by "types"/require consumers
            // @tanstack/markdown ships ESM only: bundle it (zero dependencies, a few KB) into the
            // CommonJS build so `require("react-markdown-typewriter")` also works where require()
            // can't load ES modules.
            external: ["motion", "react", "react-dom"],
            noExternal: [TANSTACK_MARKDOWN],
        },
    ];
});
