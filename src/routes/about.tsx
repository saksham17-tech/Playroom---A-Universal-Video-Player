import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Supported Formats and Browser Limits | Playroom" },
      {
        name: "description",
        content:
          "What Playroom can play — MP4, MKV, WebM, HLS and DASH — plus the honest limits: codec support inside MKV, CORS on remote links, and DRM requirements.",
      },
      { property: "og:title", content: "Supported formats and limits — Playroom" },
      {
        property: "og:description",
        content:
          "Format support, codec caveats, CORS behaviour and DRM requirements for browser-based video playback.",
      },
    ],
  }),
  component: About,
});

const SECTIONS = [
  {
    title: "What plays",
    body: [
      "Progressive files: MP4, WebM, MOV and MKV, straight from your desktop or a direct link.",
      "HLS: .m3u8 master and media playlists, with every rendition listed in the quality menu.",
      "DASH: .mpd manifests, including ClearKey and licence-server protected streams.",
      "Playlists: .m3u / .m3u8 files and plain newline lists of video URLs.",
    ],
  },
  {
    title: "Codec limits inside containers",
    body: [
      "A container is just a wrapper. MKV plays only when the tracks inside it are browser-supported — H.264, VP9 or AV1 video with AAC, Opus or Vorbis audio.",
      "HEVC/H.265 video and DTS or TrueHD audio generally will not decode in a browser. Those files report a clear codec error rather than a blank player.",
    ],
  },
  {
    title: "Remote links and CORS",
    body: [
      "Streams are fetched directly by your browser, so the host must send permissive cross-origin headers.",
      "When a host blocks that, you get an explicit CORS/load message instead of a silent stall — for playlists you can paste the text in manually as a workaround.",
    ],
  },
  {
    title: "DRM",
    body: [
      "The advanced panel accepts a Widevine or PlayReady licence-server URL, or ClearKey kid:key pairs.",
      "Protected playback still needs a reachable licence server and a browser with the matching content decryption module. Licence errors are surfaced under the player.",
    ],
  },
  {
    title: "Privacy",
    body: [
      "Everything runs in your browser. There is no account and no upload — local files never leave your machine.",
      "Recent links are stored in your browser's local storage only, and you can clear them any time from the Recent list.",
    ],
  },
];

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">Reference</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Formats, limits and honesty
      </h1>
      <div className="mt-8 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {section.body.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Link
        to="/"
        className="mt-10 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Back to the player
      </Link>
    </div>
  );
}
