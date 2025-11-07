# German Flashcards (with Audio)

A tiny, offline-first web app to make and review your own German flashcards with a lightweight spaced-repetition scheduler. No accounts, no servers, no frameworks.

## iPad/iPhone usage
- Unzip the folder in **Files** → tap `index.html` → open in **Safari** (or use “Share → Open in Safari”).  
- The web app runs entirely on-device. Your deck is stored in Safari’s local storage.
- Tip: Add to Home Screen (Share → **Add to Home Screen**) for a full-screen app-like experience.
- Back up using **Manage → Export JSON** (saves to Files/iCloud).

## Audio (Text‑to‑Speech)
- Go to **Settings → Audio** and enable **Audio**.
- Choose a voice (prefer a **German** one if available), set **Rate** and **Pitch**.
- Optionally enable **Auto‑speak on reveal**.
- In **Review**, use **🔊 Front** / **🔊 Back** to play pronunciations.
- Note: iOS requires a user tap before first playback; after that, auto-speech works during the session.

## Quick start
1. Open `index.html`.
2. Add cards in **Manage** (single or bulk: `German = English`).
3. Review: **Show** → grade **Again / Good / Easy**.
4. Export regularly to back up.

## Features
- Local-only storage (browser `localStorage`)
- Lightweight SRS (SM‑2‑style)
- Optional typing mode before reveal
- Audio TTS with voice picker, auto-speak, rate/pitch
- Import/Export JSON, delete, clear-all
- Keyboard shortcuts on desktop (Space/1/2/3)

## Privacy
Everything stays on your device. No network requests are made.
