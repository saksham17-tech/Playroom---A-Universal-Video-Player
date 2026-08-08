import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ListVideo } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { DrmConfig, MediaSource, PlaylistEntry, SubtitleTrack } from "@/lib/media";
import {
  makeSourceFromUrl,
  parsePlaylist,
  pushRecent,
  subtitleFileToTrack,
} from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/playlists")({
  head: () => ({
    meta: [
      { title: "Playlist Player — Load M3U8 and URL Lists | Playroom" },
      {
        name: "description",
        content:
          "Load an .m3u8 master playlist, an .m3u file or a plain list of video URLs, see every entry parsed out, and step through them with next and previous.",
      },
      { property: "og:title", content: "Playlist Player — Playroom" },
      {
        property: "og:description",
        content: "Parse M3U8 playlists and URL lists into a clickable queue and play them in order.",
      },
    ],
  }),
  component: Playlists,
});

function Playlists() {
  const [raw, setRaw] = useState("");
  const [entries, setEntries] = useState<PlaylistEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [source, setSource] = useState<MediaSource | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [drm] = useState<DrmConfig>({});
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<HTMLInputElement>(null);

  const load = (list: PlaylistEntry[], startAt = 0) => {
    setEntries(list);
    setIndex(startAt);
    const first = list[startAt];
    if (first) setSource(makeSourceFromUrl(first.url));
  };

  useEffect(() => {
    const entry = entries[index];
    if (entry) setSource(makeSourceFromUrl(entry.url));
  }, [index, entries]);

  const fetchPlaylist = async (url: string) => {
    setStatus("Fetching playlist…");
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Server responded ${response.status}`);
      const text = await response.text();
      const list = parsePlaylist(text, url);
      if (!list.length) throw new Error("No playable entries found in that playlist.");
      load(list);
      setStatus(`${list.length} entries parsed.`);
      pushRecent({ url, name: url.split("/").pop() || url, kind: "hls" });
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `${error.message} — the host may block cross-origin requests (CORS). You can paste the playlist text below instead.`
          : "Could not fetch that playlist.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">Queue</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Playlists</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Point at an <span className="font-mono text-foreground">.m3u8</span> master playlist, upload
        an <span className="font-mono text-foreground">.m3u</span> file, or paste a plain list of
        video links. Every entry becomes a clickable item you can step through.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <VideoPlayer source={source} subtitles={subtitles} drm={drm} />
          {entries.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="inline-flex items-center gap-1 rounded px-2 py-1 transition hover:bg-primary/10 disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" /> Previous
              </button>
              <span className="truncate px-3 font-mono text-[11px] text-muted-foreground">
                {index + 1} / {entries.length} · {entries[index]?.name}
              </span>
              <button
                onClick={() => setIndex((i) => Math.min(entries.length - 1, i + 1))}
                disabled={index >= entries.length - 1}
                className="inline-flex items-center gap-1 rounded px-2 py-1 transition hover:bg-primary/10 disabled:opacity-40"
              >
                Next <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => subRef.current?.click()}
              className="rounded-md border border-input bg-card px-3 py-2 text-xs font-medium transition hover:border-primary/50"
            >
              Upload subtitles (.srt / .vtt)
            </button>
            <input
              ref={subRef}
              type="file"
              accept=".srt,.vtt"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (files?.length) {
                  const tracks = await Promise.all(Array.from(files).map(subtitleFileToTrack));
                  setSubtitles((prev) => [...prev, ...tracks]);
                }
                e.target.value = "";
              }}
            />
            {subtitles.map((sub) => (
              <span
                key={sub.id}
                className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] text-muted-foreground"
              >
                {sub.label}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (raw.trim().startsWith("http") && !raw.includes("\n")) void fetchPlaylist(raw.trim());
              else {
                const list = parsePlaylist(raw);
                if (list.length) {
                  load(list);
                  setStatus(`${list.length} entries parsed.`);
                } else setStatus("No playable entries found in that text.");
              }
            }}
            className="space-y-2 rounded-xl border border-border bg-card/60 p-4"
          >
            <label className="block space-y-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Playlist URL or pasted list
              </span>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={5}
                placeholder={"https://example.com/master.m3u8\n\nor paste playlist text / one URL per line"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Parse playlist
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-input bg-card px-3.5 py-2 text-sm transition hover:border-primary/50"
              >
                Upload .m3u / .m3u8
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".m3u,.m3u8,.txt"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const text = await file.text();
                    setRaw(text);
                    const list = parsePlaylist(text);
                    if (list.length) {
                      load(list);
                      setStatus(`${list.length} entries parsed from ${file.name}.`);
                    } else setStatus("That playlist had no playable entries.");
                  }
                  e.target.value = "";
                }}
              />
            </div>
            {status && <p className="text-[11px] leading-relaxed text-muted-foreground">{status}</p>}
          </form>

          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <ListVideo className="size-3.5" /> Entries
            </h2>
            {entries.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Nothing parsed yet.</p>
            ) : (
              <ul className="mt-3 max-h-96 space-y-1 overflow-y-auto">
                {entries.map((entry, i) => (
                  <li key={`${entry.url}-${i}`}>
                    <button
                      onClick={() => setIndex(i)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition hover:bg-primary/10",
                        i === index && "bg-primary/15 text-primary",
                      )}
                    >
                      <span className="w-6 shrink-0 font-mono text-[10px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate">{entry.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
