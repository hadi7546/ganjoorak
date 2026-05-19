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

## CI releases

Pushes to `master` that change `android/**` trigger [`.github/workflows/android-release.yml`](../.github/workflows/android-release.yml), which builds a signed release APK and publishes a GitHub Release (tag `android-v{version}-build{N}`).

Optional repository secrets for Play Store–grade signing (otherwise the workflow uses the debug keystore):

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded `.jks` / `.keystore` file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

Optional Telegram channel post after each release (e.g. [@ganjoorak](https://t.me/ganjoorak)):

| Secret | Description |
|--------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | Channel chat id or `@username` (defaults to `@ganjoorak` if omitted) |

The bot must be a channel **administrator** with **Post messages** enabled.

You can also run the workflow manually from the Actions tab (**Android Release** → **Run workflow**).

## Project structure

```
app/src/main/kotlin/net/ganjoorak/app/
  data/          # Retrofit APIs, models, repositories
  domain/        # Settings (DataStore)
  ui/            # Compose screens (feed, poem, settings, poets, search)
  audio/         # ExoPlayer wrapper
```
