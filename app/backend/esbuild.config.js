import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin to resolve .js imports to .ts files
const resolveExtensions = {
  name: 'resolve-extensions',
  setup(build) {
    build.onResolve({ filter: /.*/ }, async (args) => {
      if (args.importer && (args.path.startsWith('.') || args.path.startsWith('/'))) {
        const resolveDir = args.resolveDir || path.dirname(args.importer);
        const absolutePath = path.resolve(resolveDir, args.path);

        if (args.path.endsWith('.js')) {
          const tsPath = absolutePath.replace(/\.js$/, '.ts');
          if (fs.existsSync(tsPath)) {
            return { path: tsPath };
          }
        }
      }
    });
  },
};

await esbuild.build({
  entryPoints: [path.join(__dirname, 'server.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(__dirname, '../dist/backend/server.js'),
  packages: 'external',
  plugins: [resolveExtensions],
  sourcemap: true,
  logLevel: 'info',
});
