# Ganjoorak Desktop (Tauri)

Native Linux desktop shell for the [Ganjoorak](https://github.com/hadi7546/ganjoorak) Next.js app.

In development it starts the web repo's Next dev server and loads `http://localhost:3000`. Release builds embed a standalone Next.js server and a bundled Node runtime.

## Web app checkout

This desktop folder no longer lives inside the web repository. Clone the web app next to this repo (named `ganjoorak`), or set `GANJOORAK_WEB_DIR`:

```bash
git clone https://github.com/hadi7546/ganjoorak.git
git clone https://github.com/hadi7546/ganjoorak-native.git
```

## Development

```bash
cd desktop
npm install
npm run dev
```

`tauri dev` opens a window pointed at `http://localhost:3000`. It starts the web app via `npm run dev:web`.

## Release build (Linux)

```bash
cd desktop
npm install
npm run prepare:icons   # once, or in CI
npm run build           # runs prepare:next + tauri build
```

Artifacts land under `src-tauri/target/release/bundle/` (`.deb` and `.AppImage`).

Release builds omit heavy web-only assets (local `public/audios/`, unused video GIFs) and use unoptimized Next images so the embedded server stays smaller.

## CI

Pushes to `master`/`main` that touch `desktop/**` trigger [`.github/workflows/desktop-release.yml`](../.github/workflows/desktop-release.yml), which checks out the web repo, builds Linux packages, and publishes a GitHub Release.
