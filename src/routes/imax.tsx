import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SourceInput } from "@/components/SourceInput";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { DrmConfig, MediaSource, SubtitleTrack } from "@/lib/media";
import { readRecents, type RecentEntry } from "@/lib/media";

export const Route = createFileRoute("/imax")({
  head: () => ({
    meta: [
      { title: "1.43:1 Viewer — Fullscreen IMAX-Ratio Playback | Playroom" },
      {
        name: "description",
        content:
          "A dedicated viewer for true 1.43:1 IMAX-ratio video: maximum-height fullscreen framing with clean pillarbox bars, quality selection and subtitle upload.",
      },
      { property: "og:title", content: "1.43:1 Viewer — Playroom" },
      {
        property: "og:description",
        content:
          "Play true 1.43:1 IMAX-ratio video at full height with clean pillarbox bars and no cropping.",
      },
    ],
  }),
  component: ImaxRoom,
});

const TARGET = 1.43;
const TOLERANCE = 0.04;

function ImaxRoom() {
  const [source, setSource] = useState<MediaSource | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [drm, setDrm] = useState<DrmConfig>({});
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => setRecents(readRecents()), []);

  const isImax = ratio !== null && Math.abs(ratio - TARGET) <= TOLERANCE;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
        Aspect ratio 1.43 : 1
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The IMAX room</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Load a true 1.43:1 source and it gets its own viewer: framed to the full height of your
        screen, pillarboxed on the sides, never cropped and never downscaled. Anything else is sent
        back to the main player.
      </p>

      <div className="mt-8 space-y-6">
        <VideoPlayer
          source={source}
          subtitles={subtitles}
          drm={drm}
          onAspectRatio={setRatio}
          {...(isImax ? { forceAspect: TARGET } : {})}
        />

        {source && ratio !== null && (
          <div className="rounded-xl border border-border bg-card/60 px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Detected ratio · {ratio.toFixed(3)} : 1
            </p>
            {isImax ? (
              <p className="mt-1.5 text-sm text-primary">
                True 1.43:1 source detected — the 1.43:1 frame is active. Press F or the fullscreen
                button for the full-height presentation.
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">
                This source is {ratio.toFixed(2)}:1, not 1.43:1, so the dedicated frame stays off.{" "}
                <Link to="/" className="text-primary underline-offset-4 hover:underline">
                  Open it in the main player
                </Link>{" "}
                instead.
              </p>
            )}
          </div>
        )}

        <div className="max-w-xl">
          <SourceInput
            onSource={(next) => {
              setRatio(null);
              setSource(next);
            }}
            subtitles={subtitles}
            onSubtitles={setSubtitles}
            drm={drm}
            onDrm={setDrm}
            recents={recents}
            onRecents={setRecents}
            hint="1.43:1 sources · mp4 · mkv · m3u8 · mpd"
          />
        </div>
      </div>
    </div>
  );
}
