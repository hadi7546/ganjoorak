# Ganjoorak native apps

Android (Kotlin / Jetpack Compose) and Linux desktop (Tauri) clients for
[Ganjoorak](https://github.com/hadi7546/ganjoorak).

These used to live in the web repository. They are split out so the site can
stay web-only while native clients keep their own history and releases.

## Layout

| Path | What it is |
|------|------------|
| `android/` | Native Android app |
| `desktop/` | Tauri Linux app that embeds the Next.js site |
| `.github/workflows/` | Android and desktop release pipelines |

## Web app

The **Android** app talks to the Ganjoor API directly. You do not need the web
repo to build it.

The **desktop** app still compiles the Next.js site and embeds it. Clone the
web repo as a sibling named `ganjoorak`, or set `GANJOORAK_WEB_DIR`:

```bash
cd ~/src
git clone https://github.com/hadi7546/ganjoorak.git
git clone https://github.com/hadi7546/ganjoorak-native.git
```

```bash
export GANJOORAK_WEB_DIR=/path/to/ganjoorak
```

Desktop CI checks out `hadi7546/ganjoorak` automatically.

## Android

See [android/README.md](android/README.md).

```bash
cd android
./gradlew assembleDebug
```

## Desktop

See [desktop/README.md](desktop/README.md).

```bash
cd desktop
npm install
npm run dev      # needs the web app running (started automatically)
npm run build    # Linux .deb + AppImage
```
