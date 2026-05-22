# Ganjoorak Desktop (Tauri)

Native Linux desktop shell for the Ganjoorak Next.js app. In development it loads the local Next dev server; release builds embed a standalone Next.js server and a bundled Node runtime.

## Development

From the repository root:

```bash
npm install
npm run dev
```

In another terminal:

```bash
cd desktop
npm install
npm run dev
```

`tauri dev` opens a window pointed at `http://localhost:3000`.

## Release build (Linux)

```bash
cd desktop
npm install
npm run prepare:icons   # once, or in CI
npm run build           # runs prepare:next + tauri build
```

Artifacts land under `src-tauri/target/release/bundle/` (`.deb` and `.AppImage`).

## CI

Pushes to `master` that touch `desktop/**` trigger [`.github/workflows/desktop-release.yml`](../.github/workflows/desktop-release.yml), which builds Linux packages and publishes a GitHub Release.
