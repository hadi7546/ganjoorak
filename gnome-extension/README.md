# Ganj Random Poem GNOME Extension

This directory contains a GNOME Shell extension that surfaces a random poem from [Ganjoor](https://ganjoor.net) directly inside the top panel.  It is designed for the modern GNOME 47+ JavaScript module system and has been tested to build against GNOME Shell 49.

## Features
- Adds a status indicator to the panel with the current poem title
- Fetches a random poem from the Ganjoor public API on demand
- Displays the verses inside the indicator menu, optimized for right-to-left typography
- Provides quick actions to open the poem in Ganjoor or request another random selection

## Installing locally
1. Copy the folder `ganj-poem@ganjoor` to `~/.local/share/gnome-shell/extensions/`.
2. Restart GNOME Shell (`Alt` + `F2`, then type `r`) or log out and back in.
3. Enable the extension with the Extensions app or `gnome-extensions enable ganj-poem@ganjoor`.

The extension advertises compatibility with GNOME Shell 47, 48, and 49 via `metadata.json`.  If you are running a newer development snapshot, update the list in that file accordingly.

## Development notes
- The extension relies on the Ganjoor HTTPS API and uses the modern `Soup.Session` API available in GNOME 47+.
- Styling overrides live in `stylesheet.css`; adjust them to better match your desktop theme if needed.
- When packaging for release, compress the `ganj-poem@ganjoor` directory into a `.zip` archive and upload it to extensions.gnome.org.
