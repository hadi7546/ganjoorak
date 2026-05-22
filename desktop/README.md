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

## Why is the download ~100–120 MB (not 250+)?

Release builds intentionally **do not** copy all of `public/` into the bundle. The web repo’s `public/audios` (~90 MB) and `public/videos` (~50 MB) are promo/update assets only; the desktop shell talks to the API for audio and does not need those trees.

What still adds weight:

| Piece | Rough size |
|-------|------------|
| Bundled Node.js runtime | ~50 MB |
| Next.js standalone server (`node_modules` trace) | ~50–80 MB |
| Poet images + static + Tauri/WebKit (AppImage) | ~20–40 MB |

`.deb` is usually smaller than `.AppImage` because AppImage ships extra GTK/WebKit glue.

## CI

Pushes to `master` that touch `desktop/**` trigger [`.github/workflows/desktop-release.yml`](../.github/workflows/desktop-release.yml), which builds Linux packages and publishes a GitHub Release.
