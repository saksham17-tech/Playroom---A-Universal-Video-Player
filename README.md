# Playroom

Playroom is a browser-based universal video player for files, direct links, adaptive
streams, and playlists. Load a video without installing another desktop player, switch
available stream qualities, add your own subtitles, and keep playback history locally in
your browser.

## Features

- Play local files and direct links for MP4, MKV, WebM, MOV, and other browser-supported media.
- Play HLS (`.m3u8`) and MPEG-DASH (`.mpd`) streams with quality selection.
- Paste YouTube links or video-page URLs into an embedded player.
- Upload SRT or VTT subtitle files.
- Parse M3U/M3U8 playlists and plain lists of video URLs into a navigable queue.
- Configure ClearKey pairs or a licence server for supported DASH DRM streams.
- Open true 1.43:1 content in a dedicated, full-height IMAX viewer.
- Save recent links in browser local storage; local video files never leave your device.

## Browser limitations

Playroom uses browser media APIs, so support depends on the codecs available in the
browser. An MKV file, for example, only works when its internal video and audio codecs
are supported. Remote streams must also allow cross-origin requests (CORS), and DRM
playback requires a reachable licence server and a compatible browser CDM.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Main player for files, links, HLS, DASH, YouTube, and embedded pages |
| `/playlists` | Parse and play M3U/M3U8 or newline-separated URL lists |
| `/imax` | Full-height viewer for 1.43:1 sources |
| `/about` | Supported formats, browser limits, and privacy notes |

## Getting started

### Requirements

- Node.js (current LTS release recommended)
- npm

### Install and run

```bash
git clone https://github.com/saksham17-tech/Playroom---A-Universal-Video-Player.git
cd Playroom---A-Universal-Video-Player
npm install
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
