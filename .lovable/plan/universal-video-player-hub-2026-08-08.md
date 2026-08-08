# Universal Video Player Hub

A single browser-based player site that handles every format you juggle today — MP4, MKV, WebM, HLS (`.m3u8`), DASH (`.mpd`), and playlists — from either a local file drop or a pasted URL. Plus a dedicated IMAX room for true 1.43:1 sources.

## Pages

- `/` — Player hub: drop zone + URL bar, auto-detects the format and loads it. Format cards (MP4/MKV, HLS, DASH, Playlists) explain what each supports and act as quick entry points.
- `/imax` — 1.43:1 viewer. Loads a source, reads its intrinsic aspect ratio, and if it is ~1.43:1 gives it a dedicated max-height fullscreen frame with pillarbox bars and no UI chrome. Non-1.43:1 sources get a notice with a link back to the main player.
- `/playlists` — Load an `.m3u8` master/variant playlist or a simple list of URLs, see the parsed entries, and click through them with next/prev.
- `/about` — Short explanation of supported formats and browser limitations.

## Player features (shared component, used everywhere)

- Source input: drag-and-drop from desktop, file picker, or remote URL.
- Format routing: HLS and DASH via streaming engines with native playback fallback on Safari; progressive files play natively.
- Quality selector: lists real variants for HLS/DASH (auto + each rendition with resolution/bitrate); hidden with an explanation for single-quality progressive files.
- Subtitle upload: add one or more `.srt` / `.vtt` files, switch between tracks, toggle off. SRT is converted to VTT in the browser.
- Standard controls: play/pause, seek, volume, playback speed, fullscreen, picture-in-picture, keyboard shortcuts.
- Optional DRM panel: collapsible advanced section for a Widevine/PlayReady license-server URL or ClearKey key pairs, applied to DASH/HLS playback when supplied.
- Recents: recent URLs, playlist entries, and subtitle names saved in browser local storage, listed under the input with one-click reload and a clear-all. Local files can't be re-opened without re-picking, so those are labelled as such.

## Known browser limits (surfaced in the UI, not hidden)

- MKV plays only when its internal codecs are browser-supported (H.264/VP9/AV1 + AAC/Opus). HEVC or DTS inside MKV will show a clear "codec not supported by this browser" message instead of a blank player.
- Remote URLs must allow cross-origin requests; a CORS failure gets an explicit message rather than a silent stall.
- DRM playback requires a working license server and a supported browser; failures report the EME error.

## Design direction

Dark control-room aesthetic: near-black surfaces, one warm signal accent, tight monospace labels for technical readouts (codec, bitrate, resolution) against a clean sans for UI. Player-first layout — the video dominates, controls stay quiet until hover.

## Technical notes

- `hls.js` for HLS, `dashjs` for DASH, both dynamically imported client-side only (SSR-safe) and instantiated after mount.
- One `useVideoSource` hook resolves input (File → object URL, URL → type sniffing by extension and content type) and returns the engine to use.
- Quality list comes from `hls.levels` / dash `getBitrateInfoListFor('video')`, normalized into one shape so the selector is engine-agnostic.
- Subtitle tracks injected as `<track>` elements from blob URLs; SRT→VTT conversion is a small local util.
- Local storage recents kept in a versioned key with a capped list.
- No backend or accounts — everything runs in the browser.
