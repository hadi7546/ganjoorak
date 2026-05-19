# Ganjoorak Android (گنجورک)

Kotlin Jetpack Compose Android client for the [Ganjoorak](https://github.com) web app — Persian poetry feed with Material 3 UI, themes, fonts, audio recitations, and verse sync.

## Features

- **Home feed** — vertical poem pager with prefetch (like the web `PoemFeedPager`)
- **Themes** — dark, light, and paper color schemes matching the web CSS variables
- **Fonts** — Vazirmatn, Samim, Shabnam, Gandom (bundled TTF); more can be added under `app/src/main/res/font/`
- **Settings** — font size slider (85–125%), line numbers, UI visibility toggles, zen scroll lock, followed poets
- **Audio player** — ExoPlayer with recitation switching and verse highlighting during playback
- **Poets & search** — browse poets list and search Ganjoor API
- **Local poets** — bundled `rahmani` / `farrokhzad` JSON from the web app

## API

Default Ganjoor API base URL: `http://api.offline.ganjoor.net` (configured in `app/build.gradle.kts`).

Cleartext HTTP is enabled for the offline Ganjoor API host.

## Build

Requirements: Android SDK 35, JDK 17.

```bash
cd android
./gradlew assembleDebug
```

Open the `android/` folder in Android Studio for emulator/device runs.

## Project structure

```
app/src/main/kotlin/net/ganjoorak/app/
  data/          # Retrofit APIs, models, repositories
  domain/        # Settings (DataStore)
  ui/            # Compose screens (feed, poem, settings, poets, search)
  audio/         # ExoPlayer wrapper
```
