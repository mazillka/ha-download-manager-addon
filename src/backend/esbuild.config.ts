import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes("--watch");

// Plugin: resolve .js → .ts
const resolveExtensions = {
  name: "resolve-extensions",
  setup(build: any) {
    build.onResolve({ filter: /.*/ }, (args: any) => {
      if (!args.importer) return;

      if (args.path.startsWith(".") || args.path.startsWith("/")) {
        const resolveDir = args.resolveDir || path.dirname(args.importer);
        const absolutePath = path.resolve(resolveDir, args.path);

        if (args.path.endsWith(".js")) {
          const tsPath = absolutePath.replace(/\.js$/, ".ts");
          if (fs.existsSync(tsPath)) {
            return { path: tsPath };
          }
        }
      }
    });
  },
};

const config: esbuild.BuildOptions = {
  entryPoints: [path.join(__dirname, "server.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: path.join(__dirname, "../dist/backend/server.js"),
  packages: "external",
  plugins: [resolveExtensions],
  sourcemap: isWatch ? "inline" : false,
  logLevel: "info",
  minify: !isWatch,
  treeShaking: true,
  // Additional minification options for production
  ...(!isWatch && {
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    keepNames: false,
  }),
  // Optimize output
  legalComments: "none",
  charset: "utf8",
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("👀 esbuild watching backend...");
} else {
  await esbuild.build(config);
}
