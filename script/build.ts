import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, copyFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

// Task #526 — Recursively copy a directory into the dist bundle so files
// referenced at runtime (e.g. data/changelog-snapshot.json read by
// applyChangelogSnapshot in server/index.ts) ship with the deploy.
async function copyDir(src: string, dest: string) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src);
  for (const name of entries) {
    const s = join(src, name);
    const d = join(dest, name);
    const st = await stat(s);
    if (st.isDirectory()) {
      await copyDir(s, d);
    } else {
      await copyFile(s, d);
    }
  }
}

function spawnPhase(phase: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "tsx",
      ["script/build.ts", `--phase=${phase}`],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_OPTIONS: "--max-old-space-size=4096",
        },
      }
    );
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build phase "${phase}" exited with code ${code}`));
      }
    });
    child.on("error", reject);
  });
}

async function buildClient() {
  console.log("building client...");
  await viteBuild();
}

async function buildServer() {
  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  await spawnPhase("client");
  await spawnPhase("server");

  // Task #526 — Ship data/changelog-snapshot.json (and any future runtime
  // data files) inside the deploy bundle. server/index.ts resolves the
  // snapshot from process.cwd()/data first, then falls back to dist/data
  // beside the bundled bundle. Without this copy step the snapshot file
  // never reaches production and prod silently boots with an empty
  // changelog.
  console.log("copying data/ into dist/data/...");
  await copyDir("data", "dist/data");
}

const phase = process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1];

if (phase === "client") {
  buildClient().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (phase === "server") {
  buildServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  buildAll().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
