export type MediaKind = "hls" | "dash" | "progressive" | "youtube" | "embed";

export type MediaSource = {
  id: string;
  kind: MediaKind;
  url: string;
  name: string;
  isLocal: boolean;
  /** for youtube/embed sources: the URL to put in the iframe */
  embedUrl?: string;
};

export type DrmConfig = {
  licenseUrl?: string | undefined;
  /** raw "kid:key" pairs, one per line, hex encoded */
  clearKeys?: string | undefined;
};

export type QualityLevel = {
  index: number;
  label: string;
  height?: number | undefined;
  bitrate?: number | undefined;
};

const MEDIA_EXTENSIONS = new Set([
  "mp4",
  "m4v",
  "mkv",
  "webm",
  "mov",
  "ogv",
  "ogg",
  "avi",
  "flv",
  "wmv",
  "ts",
  "m2ts",
  "mpg",
  "mpeg",
  "3gp",
  "mp3",
  "m4a",
  "aac",
  "flac",
  "wav",
  "opus",
]);

export function youtubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.slice(1).split("/")[0] || null;
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return null;
    const v = parsed.searchParams.get("v");
    if (v) return v;
    const match = parsed.pathname.match(/\/(embed|shorts|live|v)\/([^/?#]+)/);
    return match?.[2] ?? null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeId(url);
  if (!id) return null;
  let start = 0;
  try {
    const t = new URL(url).searchParams.get("t") ?? new URL(url).searchParams.get("start");
    if (t) start = Number(t.replace(/[^0-9]/g, "")) || 0;
  } catch {
    /* ignore */
  }
  const params = new URLSearchParams({ autoplay: "0", rel: "0", modestbranding: "1" });
  if (start) params.set("start", String(start));
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function detectKind(pathOrUrl: string, opts?: { local?: boolean }): MediaKind {
  const clean = stripQuery(pathOrUrl).toLowerCase();
  if (clean.endsWith(".m3u8") || clean.endsWith(".m3u")) return "hls";
  if (clean.endsWith(".mpd")) return "dash";
  if (!opts?.local) {
    if (youtubeId(pathOrUrl)) return "youtube";
    if (/^https?:\/\//i.test(pathOrUrl.trim())) {
      const ext = extensionOf(pathOrUrl);
      // A remote link with no recognisable media extension is a web page: embed it.
      if (!MEDIA_EXTENSIONS.has(ext)) return "embed";
    }
  }
  return "progressive";
}

export function isEmbedKind(kind: MediaKind) {
  return kind === "youtube" || kind === "embed";
}

export function stripQuery(pathOrUrl: string): string {
  return pathOrUrl.split("?")[0]?.split("#")[0] ?? pathOrUrl;
}

export function basename(pathOrUrl: string): string {
  const clean = stripQuery(pathOrUrl);
  const last = clean.split("/").pop() ?? clean;
  try {
    return decodeURIComponent(last) || clean;
  } catch {
    return last || clean;
  }
}

export function extensionOf(pathOrUrl: string): string {
  const clean = stripQuery(pathOrUrl);
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot + 1).toLowerCase();
}

const RISKY_CONTAINERS = new Set(["mkv", "avi", "mov", "flv", "wmv", "ts", "m2ts"]);

export function containerNote(pathOrUrl: string): string | null {
  const ext = extensionOf(pathOrUrl);
  if (ext === "mkv")
    return "MKV plays only when its internal codecs are browser-supported (H.264/VP9/AV1 with AAC/Opus). HEVC or DTS tracks will not decode here.";
  if (RISKY_CONTAINERS.has(ext))
    return `.${ext} is not a standard web container — playback depends entirely on your browser's codec support.`;
  return null;
}

export function makeSourceFromUrl(url: string): MediaSource {
  const trimmed = url.trim();
  const name = basename(trimmed) || trimmed;
  const kind = detectKind(trimmed);
  const source: MediaSource = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    url: trimmed,
    name: kind === "youtube" ? `YouTube · ${youtubeId(trimmed) ?? trimmed}` : name || trimmed,
    isLocal: false,
  };
  if (kind === "youtube") source.embedUrl = youtubeEmbedUrl(trimmed) ?? trimmed;
  if (kind === "embed") source.embedUrl = trimmed;
  return source;
}

export function makeSourceFromFile(file: File): MediaSource {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: detectKind(file.name, { local: true }),
    url: URL.createObjectURL(file),
    name: file.name,
    isLocal: true,
  };
}

/* ---------------- subtitles ---------------- */

export type SubtitleTrack = { id: string; label: string; url: string };

function normalizeTimestamp(value: string) {
  return value.trim().replace(",", ".");
}

export function srtToVtt(input: string): string {
  const body = input
    .replace(/\r\n|\r/g, "\n")
    .split("\n")
    .map((line) => {
      const match = line.match(
        /^(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})(.*)$/,
      );
      if (!match) return line;
      return `${normalizeTimestamp(match[1] ?? "")} --> ${normalizeTimestamp(match[2] ?? "")}${match[3] ?? ""}`;
    })
    .join("\n");
  return `WEBVTT\n\n${body.trim()}\n`;
}

export async function subtitleFileToTrack(file: File): Promise<SubtitleTrack> {
  const text = await file.text();
  const isVtt = /\.vtt$/i.test(file.name) || text.trimStart().startsWith("WEBVTT");
  const vtt = isVtt ? text : srtToVtt(text);
  const blob = new Blob([vtt], { type: "text/vtt" });
  return {
    id: `${file.name}-${Date.now()}`,
    label: file.name.replace(/\.(srt|vtt)$/i, ""),
    url: URL.createObjectURL(blob),
  };
}

/* ---------------- recents (browser only) ---------------- */

const RECENTS_KEY = "vph.recents.v1";
const MAX_RECENTS = 12;

export type RecentEntry = { url: string; name: string; kind: MediaKind; at: number };

export function readRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

export function pushRecent(entry: Omit<RecentEntry, "at">): RecentEntry[] {
  if (typeof window === "undefined") return [];
  const next = [
    { ...entry, at: Date.now() },
    ...readRecents().filter((r) => r.url !== entry.url),
  ].slice(0, MAX_RECENTS);
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked */
  }
  return next;
}

export function clearRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    window.localStorage.removeItem(RECENTS_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

/* ---------------- playlist parsing ---------------- */

export type PlaylistEntry = { name: string; url: string; kind: MediaKind };

function resolveUrl(raw: string, base?: string) {
  if (!base) return raw;
  try {
    return new URL(raw, base).toString();
  } catch {
    return raw;
  }
}

/** Parses an .m3u/.m3u8 playlist (or a plain newline list of URLs). */
export function parsePlaylist(text: string, base?: string): PlaylistEntry[] {
  const lines = text.replace(/\r\n|\r/g, "\n").split("\n");
  const entries: PlaylistEntry[] = [];
  let pendingName: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const extinf = line.match(/^#EXTINF:[^,]*,(.*)$/i);
      if (extinf) pendingName = (extinf[1] ?? "").trim();
      const streamInf = line.match(/^#EXT-X-STREAM-INF:(.*)$/i);
      if (streamInf) {
        const attrs = streamInf[1] ?? "";
        const res = attrs.match(/RESOLUTION=(\d+x\d+)/i);
        const bw = attrs.match(/BANDWIDTH=(\d+)/i);
        const parts = [res?.[1], bw ? `${Math.round(Number(bw[1]) / 1000)} kbps` : null].filter(
          Boolean,
        );
        pendingName = parts.length ? `Variant ${parts.join(" · ")}` : "Variant";
      }
      continue;
    }
    const url = resolveUrl(line, base);
    entries.push({
      name: pendingName || basename(url) || url,
      url,
      kind: detectKind(url),
    });
    pendingName = null;
  }
  return entries;
}

export function parseClearKeys(input: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of input.split(/[\n,]/)) {
    const [kid, key] = line.split(":").map((s) => s.trim());
    if (kid && key) out[kid] = key;
  }
  return out;
}

export function formatBitrate(bitrate?: number) {
  if (!bitrate) return "";
  return bitrate >= 1_000_000
    ? `${(bitrate / 1_000_000).toFixed(1)} Mbps`
    : `${Math.round(bitrate / 1000)} kbps`;
}
