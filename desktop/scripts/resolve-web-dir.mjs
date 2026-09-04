import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const nativeRoot = join(desktopDir, "..");

export function resolveWebDir() {
  const candidates = [
    process.env.GANJOORAK_WEB_DIR,
    join(nativeRoot, "ganjoorak-web"),
    join(nativeRoot, "..", "ganjoorak"),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (
      existsSync(join(dir, "package.json")) &&
      existsSync(join(dir, "next.config.js"))
    ) {
      return dir;
    }
  }

  console.error(`Could not find the Ganjoorak web app.
Clone https://github.com/hadi7546/ganjoorak next to this repo, or set GANJOORAK_WEB_DIR.

Looked in:
${candidates.map((dir) => `  - ${dir}`).join("\n")}`);
  process.exit(1);
}
