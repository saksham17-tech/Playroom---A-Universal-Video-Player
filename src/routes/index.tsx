import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Film, Radio, Rows3, Waves, Youtube } from "lucide-react";
import { SourceInput } from "@/components/SourceInput";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { DrmConfig, MediaSource, SubtitleTrack } from "@/lib/media";
import { readRecents, type RecentEntry } from "@/lib/media";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Playroom — Play MP4, MKV, M3U8 and MPD in One Browser Tab" },
      {
        name: "description",
        content:
          "Drop a local video or paste a link and play MP4, MKV, WebM, HLS (.m3u8) and DASH (.mpd) streams with quality switching and subtitle upload. No installs, no juggling apps.",
      },
      { property: "og:title", content: "Playroom — One player for every video format" },
      {
        property: "og:description",
        content:
          "MP4, MKV, HLS and DASH playback in the browser with quality selection, subtitle upload and a dedicated 1.43:1 viewer.",
      },
    ],
  }),
  component: PlayerHub,
});

const FORMATS = [
  {
    icon: Film,
    name: "MP4 · MKV · WebM · MOV",
    body: "Progressive files straight off your desktop. Plays whenever the browser supports the codecs inside.",
  },
  {
    icon: Waves,
    name: "HLS · .m3u8",
    body: "Adaptive HTTP streaming with every rendition exposed in the quality menu.",
  },
  {
    icon: Radio,
    name: "DASH · .mpd",
    body: "MPEG-DASH manifests, including ClearKey and licence-server protected streams.",
  },
  {
    icon: Rows3,
    name: "Playlists",
    body: "Master playlists and plain URL lists, parsed into a clickable queue.",
  },
  {
    icon: Youtube,
    name: "YouTube · Page links",
    body: "Paste a YouTube link or any streaming page URL and it loads in an embedded frame.",
  },
];

function PlayerHub() {
  const [source, setSource] = useState<MediaSource | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [drm, setDrm] = useState<DrmConfig>({});
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  useEffect(() => setRecents(readRecents()), []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
        Universal video bench
      </p>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
        One tab that plays the formats everything else refuses.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Drop a file or paste a link. Playroom detects whether it is a progressive file, an HLS
        playlist or a DASH manifest, picks the right engine, and hands you quality control plus your
        own subtitle files.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <VideoPlayer source={source} subtitles={subtitles} drm={drm} />
          {source && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                {source.kind}
              </span>
              <span className="truncate text-xs text-muted-foreground">{source.name}</span>
            </div>
          )}
          <section className="grid gap-3 sm:grid-cols-2">
            {FORMATS.map((format) => (
              <article key={format.name} className="rounded-xl border border-border bg-card/60 p-4">
                <format.icon className="size-4 text-primary" />
                <h2 className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                  {format.name}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{format.body}</p>
              </article>
            ))}
          </section>
        </div>

        <SourceInput
          onSource={setSource}
          subtitles={subtitles}
          onSubtitles={setSubtitles}
          drm={drm}
          onDrm={setDrm}
          recents={recents}
          onRecents={setRecents}
        />
      </div>
    </div>
  );
}
