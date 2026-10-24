# LOOP NIGHT — Your concert, remixed

An **unofficial Ed Sheeran LOOP Tour fan companion**, created for the Arlington, Texas concert on October 24, 2026.

## What's included

- **Sing Along** — searchable Ed Sheeran song catalog, editable private lyrics, adjustable text size and line timing, previous/next lines, chorus jumps using `[chorus]` markers, and links to official lyric-video searches.
- **Experimental audio-cue assist** — on supported browsers, speech-to-text *may* recognize a spoken song title and suggest switching songs. It **does not fingerprint live music** and should not be described as true automatic live song detection. The browser's speech recognition provider may process microphone audio remotely.
- **Setlist Bingo** — randomized 5×5 card, free center, local progress saving, and automatic detection of complete rows, columns, and diagonals. This is not an official/confirmed setlist.
- **Build a Loop** — browser Web Audio synthesizer with four layers: kick, clap, hi-hat, melody, plus tempo control. No prerecorded copyrighted music.
- **Concert Memory** — keepsake PNG export with customized name, venue, favorite song, optional text, and photo. Photos are processed in-browser, never uploaded.
- **Offline support** — when served over HTTPS, a service worker caches the static pages after the initial online load. Browser speech recognition may still need internet.

## Run it

No dependencies or build step. From this directory:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. For microphone access on phones, host over HTTPS.

## Publish with GitHub Pages

1. Create a new public GitHub repository, for example `loop-night`, or upload this folder as `/loop-night/` inside an existing public repository.
2. Upload **all six website files** (`index.html`, `app.js`, `styles.css`, `icon.svg`, `manifest.webmanifest`, `sw.js`) plus this README. Preserve their filenames and relative locations.
3. In the repository, go to **Settings → Pages → Build and deployment**, set **Deploy from a branch**, select `main` and `/ (root)` for a new repository, and save.
4. For a new `avyaysaha/loop-night` repo, the usual URL would be `https://avyaysaha.github.io/loop-night/`. For `/loop-night/` inside `avyaysaha/pulse-interval-trainer`, the usual URL would be `https://avyaysaha.github.io/pulse-interval-trainer/loop-night/` **if Pages is configured to deploy that path**. URLs are examples, not verified live deployments.

There is also a **standalone HTML** version in the parent delivery folder; it contains CSS and JavaScript in one file for easier manual uploading. The multi-file version is preferable for offline caching and maintenance.

## Lyrics, privacy & rights

The site bundles **no copyrighted lyrics** and **no Ed Sheeran sound recordings**. Users can paste their own authorized lyrics into browser local storage; permissions for public redistribution must be obtained separately. Browser local storage stays on the user's device unless browser settings/other services affect it. The microphone is off unless the user chooses *Try it*. Recognition may be handled by the browser vendor and may not work offline; no captured audio is sent to the Loop Night website itself.

The site is not affiliated with, sponsored by, or endorsed by Ed Sheeran, his management, or the tour.

## GitHub push attempt

At creation, the connected GitHub app could read `avyaysaha/pulse-interval-trainer` but rejected writes with `403 Resource not accessible by integration` for both file creation and branch creation. Therefore, this local package was **not automatically pushed**; the user needs to grant suitable repository contents write access or upload manually.
