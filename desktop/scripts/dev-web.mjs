#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolveWebDir } from "./resolve-web-dir.mjs";

const webDir = resolveWebDir();
console.log(`Starting Ganjoorak web app from ${webDir}`);

const child = spawn("npm", ["run", "dev"], {
  cwd: webDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
