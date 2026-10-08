import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

const shouldMinify = true;

export default defineConfig({
  base: "./",
  build: {
    minify: shouldMinify,
    terserOptions: { compress: shouldMinify, mangle: shouldMinify},
    outDir: resolve(__dirname, "./build"),
    lib: {
      // The entry point for your library
      entry: resolve(__dirname, "./src/index.ts"),
      formats: ["es", "umd"],
      // The name of your library
      name: "@dgreenheck/three-pinata",
      // The file name formats for different module systems
      fileName: (format) => `three-pinata.${format}.js`,
    },
    
    rollupOptions: {
      // Make sure to externalize dependencies that shouldn't be bundled
      // into your library
      external: ["three", "babylon", "@babylonjs/core/pure"],
      output: {
        // Provide global variables to use in UMD build
        globals: {
          three: "THREE",
		  babylon: "BABYLON",
		  "@babylonjs/core/pure": "BABYLON",
        },
      },
    },
  },


});

{
  plugins: [
    
	dts({
      entryRoot: "./src",
      rootDir: "./src",
      include: ["src/**/*"],
      outDir: "./build",
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ]
}

