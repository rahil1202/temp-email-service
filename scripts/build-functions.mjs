import { build } from "esbuild";

const entries = [
  "appwrite/functions/create-inbox/main.ts",
  "appwrite/functions/get-inbox/main.ts",
  "appwrite/functions/get-email/main.ts",
  "appwrite/functions/delete-inbox/main.ts",
  "appwrite/functions/receive-email/main.ts",
  "appwrite/functions/cleanup-expired/main.ts"
];

await build({
  entryPoints: entries,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  outbase: ".",
  outdir: "dist",
  sourcemap: false,
  logLevel: "info",
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
  }
});
