# Vibes Modded

An unofficial modded version of [Vibes](https://github.com/KlarzAI/Vibes), a Chromium extension for changing the sound of videos, music and other media directly in the browser.

This fork focuses on a more configurable interface, additional languages, shortcut presets and multiple audio-capture modes.

## Features

- Change pitch without changing playback speed.
- Control playback speed and volume.
- Add adjustable reverb.
- Use built-in presets such as Slowed Down, Sped Up, Slow & Reverb and Nightcore.
- Create custom shortcuts with an emoji, color and per-setting behavior.
- Switch between pill sliders and classic sliders.
- Use fine-tune controls and an optional vinyl-style pitch mode.
- Support Tab Capture for pages where direct media processing is unavailable.
- Support Fast Capture and the default media-processing mode.
- Localized UI and quote packs for English, Russian, Chinese, French and Spanish.
- Includes a welcome page and browser-theme-aware UI behavior.

## Installation

This repository contains the unpacked extension source. It does not include a prebuilt package.

1. Download or clone this repository.
2. Open `chrome://extensions` in Chromium, Google Chrome or a compatible browser.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository directory containing `manifest.json`.
6. Pin **Vibes** to the browser toolbar and open the extension on a page with audio or video.

After changing source files, return to `chrome://extensions` and click **Reload** for the extension.

## Usage

1. Open a page with a video, audio player or supported streaming service.
2. Open Vibes from the browser toolbar.
3. Enable the extension with the main toggle.
4. Adjust Volume, Pitch, Speed and Reverb.
5. Use the preset buttons for common combinations, or create your own shortcut.

If a site blocks direct media access, select **Tab Capture** or enable **Always Tab** in Settings. Tab Capture can provide broader audio compatibility, but some browser-level limitations may apply, including unavailable speed control on certain pages.

## Project Layout

```text
manifest.json       Chrome extension manifest
popup.html/css/js    Extension popup and controls
background.js        Service worker and extension lifecycle logic
backend/             Capture, routing, audio and optional account integrations
ui/                  Themes, sliders, modes and premium UI
lang/                Application translations and quote packs
_locales/            Chromium localization messages
resources/           Icons, screenshots and other static assets
welcome.html         First-run welcome page
```

The audio implementation includes a port of the Jungle pitch-shifting algorithm and a Freeverb implementation. See `LICENSE` for the relevant acknowledgements.

## Optional Vibes+ Configuration

The optional account and premium integration is disabled until it is configured. The public repository intentionally contains placeholders in `backend/connect/config.js`:

```js
const VIBES_PRO_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-KEY",
  GOOGLE_CLIENT_ID: "YOUR-CLIENT-ID.apps.googleusercontent.com"
};
```

To configure your own deployment, replace these values with credentials for services you control and review the corresponding code in `backend/connect/`. Never commit service-role keys, private keys, payment secrets or user data.

## Development

The project is a plain Manifest V3 browser extension and has no package manager or build step. Edit the source files directly, reload the unpacked extension and inspect the popup/service worker consoles through the browser's extension tooling.

There are currently no automated tests. Manual smoke testing should cover:

- enabling and disabling the extension;
- pitch, speed, volume and reverb changes;
- preset and custom shortcut persistence;
- language and theme settings;
- direct capture and Tab Capture modes;
- reload behavior after browser restart.

## Credits

- Original Vibes project by [Klarz](https://github.com/KlarzAI/Vibes).
- Jungle pitch-shifting algorithm by Chris Wilson, from [Audio](https://github.com/cwilso/Audio).
- Freeverb algorithm based on Jezar's public-domain implementation.

## License

The project is distributed under the terms in [`LICENSE`](LICENSE). Third-party components retain their respective licenses and notices.
