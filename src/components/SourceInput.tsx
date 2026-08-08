import { useRef, useState } from "react";
import { FileVideo, Link2, Trash2, UploadCloud } from "lucide-react";
import type { DrmConfig, MediaSource, SubtitleTrack } from "@/lib/media";
import {
  clearRecents,
  makeSourceFromFile,
  makeSourceFromUrl,
  pushRecent,
  type RecentEntry,
  subtitleFileToTrack,
} from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  onSource: (source: MediaSource) => void;
  onSubtitles: (tracks: SubtitleTrack[]) => void;
  subtitles: SubtitleTrack[];
  drm: DrmConfig;
  onDrm: (drm: DrmConfig) => void;
  recents: RecentEntry[];
  onRecents: (recents: RecentEntry[]) => void;
  accept?: string;
  hint?: string;
};

const KIND_LABEL: Record<string, string> = {
  hls: "HLS",
  dash: "DASH",
  progressive: "FILE",
  youtube: "YT",
  embed: "PAGE",
};

export function SourceInput({
  onSource,
  onSubtitles,
  subtitles,
  drm,
  onDrm,
  recents,
  onRecents,
  accept = "video/*,.mkv,.mp4,.webm,.mov,.m3u8,.mpd",
  hint,
}: Props) {
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showDrm, setShowDrm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    const source = makeSourceFromFile(file);
    onSource(source);
    onRecents(pushRecent({ url: `local:${file.name}`, name: file.name, kind: source.kind }));
  };

  const loadUrl = (value: string) => {
    if (!value.trim()) return;
    const source = makeSourceFromUrl(value);
    onSource(source);
    onRecents(pushRecent({ url: source.url, name: source.name, kind: source.kind }));
  };

  const addSubtitles = async (files: FileList | null) => {
    if (!files?.length) return;
    const tracks = await Promise.all(Array.from(files).map(subtitleFileToTrack));
    onSubtitles([...subtitles, ...tracks]);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) loadFile(file);
          else {
            const text = e.dataTransfer.getData("text/plain");
            if (text) loadUrl(text);
          }
        }}
        className={cn(
          "rounded-xl border border-dashed border-border bg-card/60 p-6 text-center transition",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <UploadCloud className="mx-auto size-6 text-primary" />
        <p className="mt-3 text-sm font-medium text-foreground">
          Drop a video file here, or pick one from your desktop
        </p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {hint ?? "mp4 · mkv · webm · mov · m3u8 · mpd"}
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <FileVideo className="size-4" /> Choose file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadUrl(url);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="master.m3u8 · .mpd · .mp4 · YouTube · any video page link"
            aria-label="Stream or file URL"
            className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 font-mono text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/20"
        >
          Load link
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => subRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/50"
        >
          Upload subtitles (.srt / .vtt)
        </button>
        <input
          ref={subRef}
          type="file"
          accept=".srt,.vtt,text/vtt"
          multiple
          className="hidden"
          onChange={(e) => {
            void addSubtitles(e.target.files);
            e.target.value = "";
          }}
        />
        {subtitles.map((sub) => (
          <span
            key={sub.id}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] text-muted-foreground"
          >
            {sub.label}
            <button
              aria-label={`Remove ${sub.label}`}
              onClick={() => onSubtitles(subtitles.filter((s) => s.id !== sub.id))}
              className="text-muted-foreground transition hover:text-destructive"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card/60">
        <button
          onClick={() => setShowDrm((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Advanced · DRM licence
          <span className="font-mono">{showDrm ? "−" : "+"}</span>
        </button>
        {showDrm && (
          <div className="space-y-3 border-t border-border px-4 py-4">
            <label className="block space-y-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Widevine / PlayReady licence server URL
              </span>
              <input
                value={drm.licenseUrl ?? ""}
                onChange={(e) => onDrm({ ...drm, licenseUrl: e.target.value })}
                placeholder="https://licence.example.com/widevine"
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                ClearKey pairs — one kid:key per line (hex)
              </span>
              <textarea
                value={drm.clearKeys ?? ""}
                onChange={(e) => onDrm({ ...drm, clearKeys: e.target.value })}
                rows={3}
                placeholder="9eb4050de44b4802932e27d75083e266:166634c675823209..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
              />
            </label>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              DRM playback applies to DASH sources and needs a reachable licence server plus a
              browser with the matching content decryption module. Licence failures are reported
              under the player.
            </p>
          </div>
        )}
      </div>

      {recents.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Recent
            </h2>
            <button
              onClick={() => onRecents(clearRecents())}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition hover:text-destructive"
            >
              <Trash2 className="size-3" /> Clear all
            </button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {recents.map((entry) => {
              const isLocal = entry.url.startsWith("local:");
              return (
                <li key={entry.url}>
                  <button
                    disabled={isLocal}
                    onClick={() => loadUrl(entry.url)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-xs transition",
                      isLocal
                        ? "cursor-not-allowed text-muted-foreground/70"
                        : "text-foreground hover:bg-primary/10",
                    )}
                  >
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground">
                      {KIND_LABEL[entry.kind]}
                    </span>
                    <span className="truncate">{entry.name}</span>
                    {isLocal && (
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                        local file · re-pick to play
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
