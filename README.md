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

## Photo filter update

The Memories export shows uploaded photos at 80% opacity and reduces the pink bloom over them. Cards without photos keep their existing styling.


## Souvenir update

The Memories screen now shows a **live on-page preview** rendered using the exact same canvas drawing function as the PNG export. Your chosen photo and editable text appear immediately; no uploads occur. The Loop Tour poster is restricted to the bottom portion at 55% draw opacity, with the circles and heart at 15%. All souvenir labels are left-aligned, and the former “Your night · Your soundtrack” footer has been removed.


## Souvenir tint update

The souvenir live preview and PNG export are drawn by the same `drawCard` function.
Adjust the `SOUVENIR_ART_OPACITY`, `SOUVENIR_PHOTO_OPACITY`, `SOUVENIR_TOUR_PINK` and `SOUVENIR_PINK_OVERLAY_OPACITY` constants in `app.js` to fine-tune the look. The pink `#D73F82` is a representative dominant color sampled from the supplied Loop Tour poster. The tint is applied uniformly to the uploaded photo, not to the entire souvenir. The Loop Tour branding artwork stays in the bottom half.


### Seamless photo-to-poster transition

The uploaded souvenir photo and the Loop Tour poster now use separate feathered alpha masks,
with a soft pink transition band between them. No hard top edge is visible on the lower
poster. The setting `SOUVENIR_TOUR_POSTER_OPACITY = 0.55` controls the image's peak opacity,
while `SOUVENIR_ART_OPACITY = 0.15` continues to control the circles and heart.
The live canvas preview and downloaded PNG use the same `drawCard()` function.

To deploy, replace `app.js`, `styles.css`, and `sw.js` in GitHub and refresh the site;
all other included files are unchanged.


## Sing Along (updated)

- All 43 songs can open a targeted YouTube search for an official lyric video. Four specific videos have verified direct Ed Sheeran Official Artist Channel links (Shape of You, Thinking Out Loud, Shivers, Castle on the Hill).
- Paste lyrics you have permission to use, or import one or more `.lrc` / `.txt` files, using the song title as filename (e.g. `Perfect.lrc`). For a single file without a recognizable name, it loads into the currently selected song.
- `.lrc` files with `[mm:ss.xx]` timestamp markers auto-highlight the correct line while playing and support seek, 3-second nudges, and manual line synchronization. Plain text uses the interval slider and previous/next buttons.
- Include `[chorus]` on its own line to enable Jump to Chorus.
- Imported lyrics are stored only in local browser storage; the site does not transmit or publish lyrics. Not all browsers can import every text encoding.
- The original demo text in Try Demo is not Ed Sheeran lyrics. Automatic microphone-based song matching remains experimental speech-title recognition only.
- Displaying complete commercial lyrics in a publicly distributed application requires appropriate permission or a licensed lyrics API. No unlicensed copyrighted lyrics are bundled.
