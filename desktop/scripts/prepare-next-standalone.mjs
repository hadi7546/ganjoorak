#!/usr/bin/env node
/**
 * Builds the root Next.js app as standalone output and stages it for Tauri resources.
 * Optionally bundles a Node.js binary for Linux when BUNDLE_NODE=1 (CI).
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  rmSync,
  existsSync,
  chmodSync,
  createWriteStream,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopDir = join(__dirname, "..");
const repoRoot = join(desktopDir, "..");
const tauriDir = join(desktopDir, "src-tauri");
const standaloneDest = join(tauriDir, "next-standalone");
const shellDest = join(desktopDir, "dist-shell");
const shellSrc = join(desktopDir, "shell");

const NODE_VERSION = process.env.BUNDLE_NODE_VERSION || "20.18.3";
const GANJOOR_API_BASE_URL =
  process.env.GANJOOR_API_BASE_URL || "http://api.offline.ganjoor.net";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyStandalone() {
  const standaloneSrc = join(repoRoot, ".next", "standalone");
  const staticSrc = join(repoRoot, ".next", "static");
  const publicSrc = join(repoRoot, "public");

  if (!existsSync(join(standaloneSrc, "server.js"))) {
    console.error("Missing .next/standalone/server.js — did next build succeed?");
    process.exit(1);
  }

  rmSync(standaloneDest, { recursive: true, force: true });
  mkdirSync(standaloneDest, { recursive: true });
  cpSync(standaloneSrc, standaloneDest, { recursive: true });
  mkdirSync(join(standaloneDest, ".next"), { recursive: true });
  cpSync(staticSrc, join(standaloneDest, ".next", "static"), { recursive: true });
  cpSync(publicSrc, join(standaloneDest, "public"), { recursive: true });
  console.log(`Staged Next standalone at ${standaloneDest}`);
}

function copyShell() {
  rmSync(shellDest, { recursive: true, force: true });
  cpSync(shellSrc, shellDest, { recursive: true });
  console.log(`Staged loading shell at ${shellDest}`);
}

async function downloadNodeBinary() {
  const binariesDir = join(tauriDir, "binaries");
  mkdirSync(binariesDir, { recursive: true });
  const targetName = "node-x86_64-unknown-linux-gnu";
  const dest = join(binariesDir, targetName);
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz`;
  const tarPath = join(binariesDir, "node.tar.xz");

  console.log(`Downloading Node ${NODE_VERSION} for Linux x64…`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Node: ${response.status} ${response.statusText}`);
  }
  await pipeline(response.body, createWriteStream(tarPath));
  run("tar", ["-xJf", tarPath, "-C", binariesDir]);
  const extractedNode = join(
    binariesDir,
    `node-v${NODE_VERSION}-linux-x64`,
    "bin",
    "node",
  );
  if (!existsSync(extractedNode)) {
    throw new Error(`Expected node binary at ${extractedNode}`);
  }
  cpSync(extractedNode, dest);
  chmodSync(dest, 0o755);
  rmSync(tarPath, { force: true });
  rmSync(join(binariesDir, `node-v${NODE_VERSION}-linux-x64`), {
    recursive: true,
    force: true,
  });
  console.log(`Bundled Node at ${dest}`);
}

async function main() {
  console.log("Building Ganjoorak Next.js (standalone)…");
  run("npm", ["ci"], { cwd: repoRoot });
  run("npm", ["run", "build"], {
    cwd: repoRoot,
    env: {
      GANJOOR_API_BASE_URL,
      NEXT_PUBLIC_GANJOOR_API_BASE_URL: GANJOOR_API_BASE_URL,
    },
  });

  copyStandalone();
  copyShell();

  if (process.platform === "linux") {
    await downloadNodeBinary();
  } else {
    console.warn(
      "Skipping bundled Node download (linux only). Release builds expect linux CI.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
