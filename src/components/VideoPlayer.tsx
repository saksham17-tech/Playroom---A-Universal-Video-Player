import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AudioLines,
  Captions,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  Pause,
  PictureInPicture2,
  Play,
  Settings2,
  Subtitles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { DrmConfig, MediaSource, QualityLevel, SubtitleTrack } from "@/lib/media";
import { containerNote, formatBitrate, isEmbedKind, parseClearKeys } from "@/lib/media";
import { DEFAULT_SUBTITLE_STYLE, cueTextStyle, type SubtitleStyle } from "@/lib/subtitle-style";
import { SubtitleStylePanel } from "@/components/SubtitleStylePanel";
import { useLiveCaptions } from "@/hooks/use-live-captions";
import { cn } from "@/lib/utils";

type EngineHandle = {
  destroy: () => void;
  setLevel: (index: number) => void;
  setAudio?: (index: number) => void;
};

type AudioOption = { index: number; label: string };

/** Text tracks live on the media element, so uploaded and in-stream tracks share one list. */
type TextOption = { index: number; label: string; embedded: boolean };

type FitMode = "auto" | "contain" | "cover" | "fill";
type ScreenMode = "inline" | "fit";

const FIT_MODES: { value: FitMode; label: string; hint: string }[] = [
  { value: "auto", label: "Automatic", hint: "Follows the source ratio, never cropped" },
  { value: "contain", label: "Fit to screen", hint: "Whole frame visible, bars if needed" },
  { value: "cover", label: "Fill screen", hint: "Crops the edges to remove all bars" },
  { value: "fill", label: "Stretch", hint: "Ignores the ratio and distorts the image" },
];

type Props = {
  source: MediaSource | null;
  subtitles: SubtitleTrack[];
  drm?: DrmConfig;
  /** when set, the video is letter/pillarboxed into this aspect ratio */
  forceAspect?: number;
  onAspectRatio?: (ratio: number) => void;
  className?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** Filled-track styling so the bar reads as "this much is done / this loud". */
function barFill(pct: number) {
  const clamped = Math.max(0, Math.min(100, pct));
  return {
    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${clamped}%, rgba(255,255,255,0.18) ${clamped}%, rgba(255,255,255,0.18) 100%)`,
  } as const;
}

/** Hover hint shown over any control button. */
function Tip({
  label,
  align = "center",
  children,
}: {
  label: string;
  align?: "center" | "right";
  children: ReactNode;
}) {
  return (
    <div className="group/tip relative flex items-center">
      {children}
      <span
        className={cn(
          "pointer-events-none absolute bottom-full z-30 mb-2 whitespace-nowrap rounded bg-black/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover/tip:opacity-100",
          align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function VideoPlayer({
  source,
  subtitles,
  drm,
  forceAspect,
  onAspectRatio,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [activeLevel, setActiveLevel] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [showQuality, setShowQuality] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [textOptions, setTextOptions] = useState<TextOption[]>([]);
  const [activeSub, setActiveSub] = useState<number>(-1);
  const [subOffset, setSubOffset] = useState(0);
  const [audioOptions, setAudioOptions] = useState<AudioOption[]>([]);
  const [activeAudio, setActiveAudio] = useState(-1);
  const [stats, setStats] = useState<string>("");
  const [ratio, setRatio] = useState<number | null>(null);

  /* sizing */
  const [fitMode, setFitMode] = useState<FitMode>("auto");
  const [zoom, setZoom] = useState(100);
  const [screenMode, setScreenMode] = useState<ScreenMode>("inline");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [pipNote, setPipNote] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [hover, setHover] = useState<{ time: number; pct: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pipWindowRef = useRef<Window | null>(null);

  /* subtitles */
  const [subStyle, setSubStyle] = useState<SubtitleStyle>(DEFAULT_SUBTITLE_STYLE);
  const [cueText, setCueText] = useState("");
  const [captionLang, setCaptionLang] = useState("en-US");
  const live = useLiveCaptions(captionLang);

  /* controls visibility — vanish as soon as playback resumes */
  const [controlsVisible, setControlsVisible] = useState(true);
  const menuOpen = showQuality || showSubs || showSize || showAudio;
  const isEmbed = Boolean(source && isEmbedKind(source.kind));

  const revealControls = useCallback(
    (linger = 1600) => {
      setControlsVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setControlsVisible(false), linger);
    },
    [],
  );

  useEffect(() => {
    if (!playing || menuOpen) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setControlsVisible(true);
      return;
    }
    // playback resumed: hide almost immediately
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 250);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [playing, menuOpen]);

  /* ---- engine attachment ---- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;

    let cancelled = false;
    setError(null);
    setLevels([]);
    setActiveLevel(-1);
    setAudioOptions([]);
    setActiveAudio(-1);
    setStats("");

    if (isEmbedKind(source.kind)) return;

    const attach = async () => {
      engineRef.current?.destroy();
      engineRef.current = null;

      if (source.kind === "hls") {
        const canNative = video.canPlayType("application/vnd.apple.mpegurl");
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
          hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
            setLevels(
              data.levels.map((lvl, index) => ({
                index,
                height: lvl.height,
                bitrate: lvl.bitrate,
                label: lvl.height ? `${lvl.height}p` : formatBitrate(lvl.bitrate) || `Level ${index + 1}`,
              })),
            );
          });
          hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
            const lvl = hls.levels[data.level];
            if (lvl) setStats(`${lvl.height ? `${lvl.height}p` : ""} ${formatBitrate(lvl.bitrate)}`.trim());
          });
          const readAudio = () => {
            setAudioOptions(
              hls.audioTracks.map((t, index) => ({
                index,
                label: t.name || t.lang || `Audio ${index + 1}`,
              })),
            );
            setActiveAudio(hls.audioTrack);
          };
          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, readAudio);
          hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, readAudio);
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            if (data.details === "manifestIncompatibleCodecsError") {
              setError(
                "This stream's codecs are not supported by your browser (often HEVC/H.265 or a non-web audio codec).",
              );
            } else if (data.response?.code === 0 || data.details === "manifestLoadError") {
              setError(
                "Could not load the stream. The server may block cross-origin requests (CORS), or the link expired.",
              );
            } else {
              setError(`Playback error: ${data.details}`);
            }
          });
          hls.loadSource(source.url);
          hls.attachMedia(video);
          engineRef.current = {
            destroy: () => hls.destroy(),
            setLevel: (index) => {
              hls.currentLevel = index;
            },
            setAudio: (index) => {
              hls.audioTrack = index;
            },
          };
          return;
        }
        if (canNative) {
          video.src = source.url;
          return;
        }
        setError("This browser cannot play HLS streams.");
        return;
      }

      if (source.kind === "dash") {
        const dashjs = await import("dashjs");
        if (cancelled) return;
        const player = dashjs.MediaPlayer().create();
        const clearKeys = drm?.clearKeys ? parseClearKeys(drm.clearKeys) : {};
        const protection: Record<string, unknown> = {};
        if (Object.keys(clearKeys).length) {
          protection["org.w3.clearkey"] = { clearkeys: clearKeys };
        }
        if (drm?.licenseUrl) {
          protection["com.widevine.alpha"] = { serverURL: drm.licenseUrl };
          protection["com.microsoft.playready"] = { serverURL: drm.licenseUrl };
        }
        player.initialize(video, source.url, false);
        if (Object.keys(protection).length) player.setProtectionData(protection as never);
        player.on("streamInitialized", () => {
          const list = player.getRepresentationsByType?.("video") ?? [];
          setLevels(
            list.map((rep: { height?: number; bandwidth?: number }, index: number) => ({
              index,
              height: rep.height,
              bitrate: rep.bandwidth,
              label: rep.height ? `${rep.height}p` : formatBitrate(rep.bandwidth) || `Level ${index + 1}`,
            })),
          );
          const audio = (player.getTracksFor?.("audio") ?? []) as {
            lang?: string | null;
            labels?: { text?: string }[];
          }[];
          setAudioOptions(
            audio.map((t, index) => ({
              index,
              label: t.labels?.[0]?.text || t.lang || `Audio ${index + 1}`,
            })),
          );
          const current = player.getCurrentTrackFor?.("audio");
          setActiveAudio(current ? audio.indexOf(current as never) : audio.length ? 0 : -1);
        });
        player.on("error", (e: { error?: { message?: string } }) => {
          setError(e?.error?.message || "DASH playback failed. Check the link, CORS headers, or DRM licence.");
        });
        engineRef.current = {
          destroy: () => player.reset(),
          setLevel: (index) => {
            player.updateSettings({
              streaming: { abr: { autoSwitchBitrate: { video: index === -1 } } },
            });
            if (index >= 0) player.setRepresentationForTypeByIndex?.("video", index);
          },
          setAudio: (index) => {
            const tracks = player.getTracksFor?.("audio") ?? [];
            const track = tracks[index];
            if (track) player.setCurrentTrack(track);
          },
        };
        return;
      }

      video.src = source.url;
    };

    void attach().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Failed to initialise the player.");
    });

    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [source, drm?.licenseUrl, drm?.clearKeys]);

  /* ---- media element events ---- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setTime(video.currentTime);
    const onMeta = () => {
      setDuration(video.duration);
      if (video.videoWidth && video.videoHeight) {
        const r = video.videoWidth / video.videoHeight;
        setRatio(r);
        onAspectRatio?.(r);
        if (!levels.length) setStats(`${video.videoWidth}×${video.videoHeight}`);
      }
    };
    const onPlay = () => {
      setPlaying(true);
      setEnded(false);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setEnded(true);
      setPlaying(false);
      setTime(video.duration || video.currentTime);
    };
    const onSeeking = () => setEnded(false);
    const onErr = () => {
      const note = source ? containerNote(source.name) : null;
      setError(
        note ??
          "This file could not be decoded by your browser. The container or codec is unsupported.",
      );
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("error", onErr);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("error", onErr);
    };
  }, [source, levels.length, onAspectRatio]);

  /* ---- text tracks: uploaded <track> elements AND in-stream tracks ---- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const uploadedLabels = new Set(subtitles.map((s) => s.label));
    const read = () => {
      const list: TextOption[] = [];
      for (let i = 0; i < video.textTracks.length; i += 1) {
        const track = video.textTracks[i];
        if (!track) continue;
        if (track.kind !== "subtitles" && track.kind !== "captions") continue;
        const label = track.label || track.language || `Track ${i + 1}`;
        list.push({ index: i, label, embedded: !uploadedLabels.has(track.label) });
      }
      setTextOptions(list);
    };
    read();
    video.textTracks.addEventListener?.("addtrack", read);
    video.textTracks.addEventListener?.("removetrack", read);
    return () => {
      video.textTracks.removeEventListener?.("addtrack", read);
      video.textTracks.removeEventListener?.("removetrack", read);
    };
  }, [subtitles, source]);

  /* auto-enable the most recently uploaded file */
  useEffect(() => {
    if (!subtitles.length) return;
    const last = subtitles[subtitles.length - 1];
    const match = textOptions.find((t) => t.label === last?.label);
    if (match && activeSub === -1) setActiveSub(match.index);
  }, [subtitles, textOptions, activeSub]);

  /* ---- cue rendering (offset aware, so we scan cues ourselves) ---- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let selected: TextTrack | null = null;
    for (let i = 0; i < video.textTracks.length; i += 1) {
      const track = video.textTracks[i];
      if (!track) continue;
      const on = i === activeSub;
      // "hidden" keeps cues parsed while we render them ourselves
      track.mode = on ? "hidden" : "disabled";
      if (on) selected = track;
    }
    setCueText("");
    if (!selected) return;
    const track = selected;
    const render = () => {
      const cues = track.cues;
      if (!cues || cues.length === 0) {
        setCueText("");
        return;
      }
      const t = video.currentTime + subOffset;
      const parts: string[] = [];
      for (let i = 0; i < cues.length; i += 1) {
        const cue = cues[i] as VTTCue | undefined;
        if (!cue) continue;
        if (cue.startTime <= t && cue.endTime >= t && cue.text) {
          parts.push(cue.text.replace(/<[^>]+>/g, "").trim());
        }
      }
      setCueText(parts.join("\n"));
    };
    render();
    track.addEventListener("cuechange", render);
    video.addEventListener("timeupdate", render);
    video.addEventListener("seeked", render);
    return () => {
      track.removeEventListener("cuechange", render);
      video.removeEventListener("timeupdate", render);
      video.removeEventListener("seeked", render);
    };
  }, [activeSub, subOffset, textOptions]);

  /* ---- native audio tracks (progressive files, Safari HLS) ---- */
  useEffect(() => {
    const video = videoRef.current as (HTMLVideoElement & { audioTracks?: any }) | null;
    if (!video) return;
    const list = video.audioTracks;
    if (!list) return;
    const read = () => {
      if (engineRef.current?.setAudio) return; // engine-managed
      const options: AudioOption[] = [];
      let current = -1;
      for (let i = 0; i < list.length; i += 1) {
        const track = list[i];
        options.push({ index: i, label: track?.label || track?.language || `Audio ${i + 1}` });
        if (track?.enabled) current = i;
      }
      setAudioOptions(options);
      setActiveAudio(current);
    };
    read();
    list.addEventListener?.("addtrack", read);
    list.addEventListener?.("change", read);
    return () => {
      list.removeEventListener?.("addtrack", read);
      list.removeEventListener?.("change", read);
    };
  }, [source]);

  const pickAudio = (index: number) => {
    setActiveAudio(index);
    setShowAudio(false);
    if (engineRef.current?.setAudio) {
      engineRef.current.setAudio(index);
      return;
    }
    const list = (videoRef.current as (HTMLVideoElement & { audioTracks?: any }) | null)
      ?.audioTracks;
    if (!list) return;
    for (let i = 0; i < list.length; i += 1) {
      if (list[i]) list[i].enabled = i === index;
    }
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setError("Playback was blocked. Press play again."));
    else video.pause();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.requestFullscreen().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ---- picture in picture: native MSE video, or a document-PiP window for embeds ---- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setPipActive(true);
    const onLeave = () => setPipActive(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [source]);

  const togglePip = useCallback(async () => {
    setPipNote(null);
    const docPip = (window as unknown as { documentPictureInPicture?: any })
      .documentPictureInPicture;

    // already floating in a document-PiP window → put it back
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setPipActive(false);
      return;
    }

    const video = videoRef.current;
    if (!isEmbed && video) {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else if (document.pictureInPictureEnabled && !video.disablePictureInPicture)
          await video.requestPictureInPicture();
        else setPipNote("Picture-in-picture is not available for this source in this browser.");
      } catch {
        setPipNote("Your browser refused picture-in-picture for this stream.");
      }
      return;
    }

    // embeds (YouTube / page links): move the frame into a document PiP window
    const frame = frameRef.current;
    if (!docPip || !frame) {
      setPipNote(
        "Floating this embedded player needs Chrome or Edge 116+. Use the provider's own PiP button inside the frame, or fullscreen instead.",
      );
      return;
    }
    try {
      const pipWindow: Window = await docPip.requestWindow({ width: 480, height: 270 });
      pipWindowRef.current = pipWindow;
      const style = pipWindow.document.createElement("style");
      style.textContent =
        "html,body{margin:0;height:100%;background:#000;overflow:hidden}#pip-host,#pip-host>*{height:100%;width:100%}iframe{border:0;height:100%;width:100%}";
      pipWindow.document.head.append(style);
      const host = pipWindow.document.createElement("div");
      host.id = "pip-host";
      pipWindow.document.body.append(host);
      const placeholder = frame.parentElement;
      host.append(frame);
      setPipActive(true);
      pipWindow.addEventListener("pagehide", () => {
        placeholder?.append(frame);
        pipWindowRef.current = null;
        setPipActive(false);
      });
    } catch {
      setPipNote("Could not open a floating window for this embed.");
    }
  }, [isEmbed]);

  useEffect(() => () => pipWindowRef.current?.close(), []);

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key;
      // shortcuts that work for embeds too
      if (key === "p" || key === "P") {
        event.preventDefault();
        void togglePip();
        return;
      }
      if (key === "f" || key === "F") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }
      if (key === "c" || key === "C") {
        event.preventDefault();
        if (live.active) live.stop();
        else live.start();
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      const step = event.shiftKey ? 30 : 5;
      if (/^[0-9]$/.test(key) && Number.isFinite(video.duration)) {
        event.preventDefault();
        video.currentTime = (Number(key) / 10) * video.duration;
        revealControls();
        return;
      }
      switch (key) {
        case " ":
        case "k":
          event.preventDefault();
          togglePlay();
          break;
        case "l":
          video.currentTime += 10;
          revealControls();
          break;
        case "j":
          video.currentTime -= 10;
          revealControls();
          break;
        case "ArrowRight":
          event.preventDefault();
          video.currentTime += step;
          revealControls();
          break;
        case "ArrowLeft":
          event.preventDefault();
          video.currentTime -= step;
          revealControls();
          break;
        case "ArrowUp":
          event.preventDefault();
          video.volume = Math.min(1, video.volume + 0.05);
          setVolume(video.volume);
          revealControls();
          break;
        case "ArrowDown":
          event.preventDefault();
          video.volume = Math.max(0, video.volume - 0.05);
          setVolume(video.volume);
          revealControls();
          break;
        case "m":
          video.muted = !video.muted;
          setMuted(video.muted);
          break;
        case "t":
          setScreenMode((v) => (v === "fit" ? "inline" : "fit"));
          break;
        case "s":
          setShowSubs((v) => !v);
          break;
        case "q":
          setShowQuality((v) => !v);
          break;
        case "a":
          setShowAudio((v) => !v);
          break;
        case "Home":
          video.currentTime = 0;
          revealControls();
          break;
        case "End":
          if (Number.isFinite(video.duration)) video.currentTime = video.duration;
          revealControls();
          break;
        case ">":
        case ".": {
          const next = Math.min(4, Number((video.playbackRate + 0.25).toFixed(2)));
          video.playbackRate = next;
          setRate(next);
          revealControls();
          break;
        }
        case "<":
        case ",": {
          const next = Math.max(0.25, Number((video.playbackRate - 0.25).toFixed(2)));
          video.playbackRate = next;
          setRate(next);
          revealControls();
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, toggleFullscreen, togglePip, revealControls, live]);

  const pickLevel = (index: number) => {
    setActiveLevel(index);
    engineRef.current?.setLevel(index);
    setShowQuality(false);
  };

  const objectFit = fitMode === "auto" ? "contain" : fitMode;

  const frameStyle = useMemo(() => {
    if (screenMode === "fit" || isFullscreen) {
      return { height: isFullscreen ? "100vh" : "calc(100dvh - 6rem)" } as const;
    }
    if (forceAspect) return { aspectRatio: String(forceAspect), maxHeight: "100vh" } as const;
    if (fitMode === "auto" && ratio) return { aspectRatio: String(ratio), maxHeight: "80vh" } as const;
    return { aspectRatio: "16 / 9" } as const;
  }, [screenMode, isFullscreen, forceAspect, fitMode, ratio]);

  const displayedCaption = live.active && live.text ? live.text : cueText;

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={shellRef}
        onMouseMove={() => revealControls()}
        onMouseLeave={() => playing && !menuOpen && setControlsVisible(false)}
        onTouchStart={() => revealControls(2500)}
        className={cn(
          "group relative overflow-hidden bg-black",
          isFullscreen || screenMode === "fit"
            ? "rounded-none border-0 shadow-none"
            : "rounded-xl border border-border shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_60px_-20px_rgba(0,0,0,0.9)]",
          playing && !controlsVisible && "cursor-none",
        )}
      >
        <div
          className="relative mx-auto flex w-full items-center justify-center overflow-hidden bg-black"
          style={frameStyle}
        >
          {isEmbed ? (
            <div ref={frameRef} className="h-full w-full">
              <iframe
                key={source?.id}
                src={source?.embedUrl ?? source?.url}
                title={source?.name ?? "Embedded player"}
                className="h-full w-full border-0 bg-black"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              className="h-full w-full bg-black transition-transform duration-200"
              style={{ objectFit, transform: `scale(${zoom / 100})` }}
              controls={false}
              playsInline
              crossOrigin="anonymous"
              onClick={togglePlay}
            >
              {subtitles.map((sub) => (
                <track key={sub.id} kind="subtitles" label={sub.label} src={sub.url} srcLang="und" />
              ))}
            </video>
          )}

          {displayedCaption && (
            <div
              className="pointer-events-none absolute inset-x-0 flex justify-center px-6"
              style={{ bottom: `${subStyle.bottomOffset}%` }}
            >
              <p
                className="max-w-[90%] whitespace-pre-line rounded-md px-3 py-1 text-center font-medium leading-snug"
                style={cueTextStyle(subStyle)}
              >
                {displayedCaption}
              </p>
            </div>
          )}

          {!source && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
                No source loaded
              </p>
            </div>
          )}
        </div>

        {/* embed toolbar — the provider owns playback controls inside the frame */}
        {isEmbed && (
          <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/70 px-1.5 py-1 text-white">
            <Tip label={live.active ? "Stop live captions · C" : "Live captions · C"} align="right">
              <button
                onClick={() => (live.active ? live.stop() : live.start())}
                aria-label="Live captions"
                className={cn(
                  "rounded-md p-1.5 transition hover:bg-white/10",
                  live.active && "text-primary",
                )}
              >
                <Captions className="size-4" />
              </button>
            </Tip>
            <Tip label="Caption look · S" align="right">
              <button
                onClick={() => setShowSubs((v) => !v)}
                aria-label="Caption settings"
                className="rounded-md p-1.5 transition hover:bg-white/10"
              >
                <Subtitles className="size-4" />
              </button>
            </Tip>
            <Tip label={pipActive ? "Return from floating window · P" : "Float this player · P"} align="right">
              <button
                onClick={() => void togglePip()}
                aria-label="Picture in picture"
                className={cn(
                  "rounded-md p-1.5 transition hover:bg-white/10",
                  pipActive && "text-primary",
                )}
              >
                <PictureInPicture2 className="size-4" />
              </button>
            </Tip>
            <a
              href={source?.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition hover:bg-white/10"
            >
              Open
            </a>
            <Tip label={isFullscreen ? "Exit fullscreen · F" : "Fullscreen · F"} align="right">
              <button
                onClick={toggleFullscreen}
                aria-label="Fullscreen"
                className="rounded-md p-1.5 transition hover:bg-white/10"
              >
                <Maximize2 className="size-4" />
              </button>
            </Tip>
          </div>
        )}
        {isEmbed && showSubs && (
          <div className="absolute right-2 top-12 w-64 rounded-lg border border-white/10 bg-black/95 p-1 text-left text-white">
            <p className="px-2 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
              Caption look
            </p>
            <SubtitleStylePanel value={subStyle} onChange={setSubStyle} />
          </div>
        )}

        {/* control bar */}
        {!isEmbed && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 pb-3 pt-10 transition duration-200 focus-within:translate-y-0 focus-within:opacity-100",
            controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          <div
            className="group/seek relative"
            onMouseMove={(e) => {
              if (!duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setHover({ pct: pct * 100, time: pct * duration });
            }}
            onMouseLeave={() => setHover(null)}
          >
            <input
              type="range"
              aria-label="Seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={time}
              onChange={(e) => {
                const video = videoRef.current;
                if (video) video.currentTime = Number(e.target.value);
              }}
              className={cn(
                "h-1.5 w-full cursor-pointer appearance-none rounded-full accent-primary transition-all group-hover/seek:h-2.5",
                ended && "shadow-[0_0_10px_2px_var(--primary)]",
              )}
              style={barFill(duration ? (ended ? 100 : (time / duration) * 100) : 0)}
            />
            {hover && (
              <span
                className="pointer-events-none absolute bottom-5 -translate-x-1/2 rounded bg-black/90 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white ring-1 ring-white/10"
                style={{ left: `${hover.pct}%` }}
              >
                {formatTime(hover.time)}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/90">
            <Tip label={playing ? "Pause · space" : ended ? "Replay · space" : "Play · space"}>
              <button
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                className="rounded-md p-1.5 transition hover:bg-white/10"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
            </Tip>
            <Tip label={muted ? "Unmute · M" : "Mute · M"}>
              <button
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.muted = !video.muted;
                  setMuted(video.muted);
                }}
                aria-label={muted ? "Unmute" : "Mute"}
                className="rounded-md p-1.5 transition hover:bg-white/10"
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            </Tip>
            <Tip label={`Volume ${Math.round((muted ? 0 : volume) * 100)}% · ↑ ↓`}>
              <input
                type="range"
                aria-label="Volume"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.muted = false;
                  setMuted(false);
                  video.volume = Number(e.target.value);
                  setVolume(video.volume);
                }}
                className={cn(
                  "h-1.5 w-20 cursor-pointer appearance-none rounded-full accent-primary",
                  !muted && volume >= 0.999 && "shadow-[0_0_8px_1px_var(--primary)]",
                )}
                style={barFill((muted ? 0 : volume) * 100)}
              />
            </Tip>
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums text-white/70",
                ended && "text-primary",
              )}
            >
              {formatTime(ended && duration ? duration : time)} / {formatTime(duration)}
              {ended && <span className="ml-1.5 uppercase tracking-wider">finished</span>}
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              {stats && (
                <span className="hidden font-mono text-[10px] uppercase tracking-wider text-primary sm:inline">
                  {stats}
                </span>
              )}
              <select
                aria-label="Playback speed"
                value={rate}
                onChange={(e) => {
                  const video = videoRef.current;
                  const next = Number(e.target.value);
                  setRate(next);
                  if (video) video.playbackRate = next;
                }}
                className="rounded-md bg-white/10 px-1.5 py-1 font-mono text-[11px] text-white outline-none"
              >
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                  <option key={r} value={r} className="text-black">
                    {r}×
                  </option>
                ))}
              </select>

              {/* subtitles + live captions + styling */}
              <div className="relative">
                <Tip label="Subtitles & captions · S" align="right">
                <button
                  onClick={() => {
                    setShowSubs((v) => !v);
                    setShowQuality(false);
                    setShowSize(false);
                    setShowAudio(false);
                  }}
                  aria-label="Subtitles"
                  className={cn(
                    "rounded-md p-1.5 transition hover:bg-white/10",
                    (activeSub !== -1 || live.active) && "text-primary",
                  )}
                >
                  <Subtitles className="size-4" />
                </button>
                </Tip>
                {showSubs && (
                  <div className="absolute bottom-9 right-0 max-h-[60vh] w-64 overflow-auto rounded-lg border border-white/10 bg-black/95 p-1 text-left">
                    <p className="px-2 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                      Subtitle track
                    </p>
                    <button
                      onClick={() => setActiveSub(-1)}
                      className={cn(
                        "block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-white/10",
                        activeSub === -1 && "text-primary",
                      )}
                    >
                      Off
                    </button>
                    {textOptions.length === 0 && (
                      <p className="px-2 py-1.5 text-[11px] leading-snug text-white/50">
                        No subtitle tracks. Upload an .srt/.vtt file, or use live captions below.
                      </p>
                    )}
                    {textOptions.map((option) => (
                      <button
                        key={option.index}
                        onClick={() => setActiveSub(option.index)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-white/10",
                          activeSub === option.index && "text-primary",
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-white/40">
                          {option.embedded ? "in stream" : "uploaded"}
                        </span>
                      </button>
                    ))}

                    <div className="px-2 py-1.5">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                        Sync offset · {subOffset > 0 ? "+" : ""}
                        {subOffset.toFixed(1)}s
                      </span>
                      <input
                        type="range"
                        min={-10}
                        max={10}
                        step={0.1}
                        value={subOffset}
                        onChange={(e) => setSubOffset(Number(e.target.value))}
                        className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-primary"
                      />
                      <span className="mt-0.5 block text-[10px] leading-snug text-white/40">
                        Positive shows cues earlier, negative delays them.
                      </span>
                    </div>

                    <div className="mt-1 border-t border-white/10 pt-1">
                      <p className="px-2 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                        Live captions
                      </p>
                      <button
                        onClick={() => (live.active ? live.stop() : live.start())}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-white/10"
                      >
                        {live.active ? (
                          <MicOff className="size-3.5 text-primary" />
                        ) : (
                          <Mic className="size-3.5" />
                        )}
                        <span className={cn(live.active && "text-primary")}>
                          {live.active ? "Stop live captions" : "Start live captions"}
                        </span>
                      </button>
                      <label className="block px-2 py-1.5">
                        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                          Spoken language
                        </span>
                        <select
                          value={captionLang}
                          onChange={(e) => setCaptionLang(e.target.value)}
                          className="mt-1 w-full rounded bg-white/10 px-1.5 py-1 text-xs text-white outline-none"
                        >
                          {[
                            ["en-US", "English (US)"],
                            ["en-GB", "English (UK)"],
                            ["hi-IN", "Hindi"],
                            ["es-ES", "Spanish"],
                            ["fr-FR", "French"],
                            ["de-DE", "German"],
                            ["ja-JP", "Japanese"],
                            ["ko-KR", "Korean"],
                          ].map(([code, label]) => (
                            <option key={code} value={code} className="text-black">
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="px-2 pb-1 text-[10px] leading-snug text-white/45">
                        Live captions transcribe what your microphone hears — keep the speakers on.
                        Chrome or Edge only.
                      </p>
                      {live.error && (
                        <p className="px-2 pb-1 text-[10px] leading-snug text-destructive">
                          {live.error}
                        </p>
                      )}
                    </div>

                    <p className="px-2 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                      Caption look
                    </p>
                    <SubtitleStylePanel value={subStyle} onChange={setSubStyle} />
                  </div>
                )}
              </div>

              {/* audio tracks */}
              <div className="relative">
                <Tip label="Audio track · A" align="right">
                <button
                  onClick={() => {
                    setShowAudio((v) => !v);
                    setShowSubs(false);
                    setShowQuality(false);
                    setShowSize(false);
                  }}
                  aria-label="Audio track"
                  className={cn(
                    "rounded-md p-1.5 transition hover:bg-white/10",
                    audioOptions.length > 1 && "text-primary",
                  )}
                >
                  <AudioLines className="size-4" />
                </button>
                </Tip>
                {showAudio && (
                  <div className="absolute bottom-9 right-0 max-h-[60vh] w-60 overflow-auto rounded-lg border border-white/10 bg-black/95 p-1 text-left">
                    <p className="px-2 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                      Audio track
                    </p>
                    {audioOptions.length === 0 ? (
                      <p className="px-2 py-1.5 text-[11px] leading-snug text-white/50">
                        This source exposes a single audio track. Multi-language switching works on
                        HLS/DASH streams that publish alternate audio renditions.
                      </p>
                    ) : (
                      audioOptions.map((option) => (
                        <button
                          key={option.index}
                          onClick={() => pickAudio(option.index)}
                          className={cn(
                            "block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-white/10",
                            activeAudio === option.index && "text-primary",
                          )}
                        >
                          {option.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* quality */}
              <div className="relative">
                <Tip label="Video quality · Q" align="right">
                <button
                  onClick={() => {
                    setShowQuality((v) => !v);
                    setShowSubs(false);
                    setShowSize(false);
                    setShowAudio(false);
                  }}
                  aria-label="Quality"
                  className="rounded-md p-1.5 transition hover:bg-white/10"
                >
                  <Settings2 className="size-4" />
                </button>
                </Tip>
                {showQuality && (
                  <div className="absolute bottom-9 right-0 max-h-[60vh] min-w-48 overflow-auto rounded-lg border border-white/10 bg-black/95 p-1 text-left">
                    <p className="px-2 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                      Video quality
                    </p>
                    {levels.length === 0 ? (
                      <p className="px-2 py-1.5 text-[11px] leading-snug text-white/50">
                        Single-quality source — this file has only one rendition
                        {ratio ? ` (${stats || "native"})` : ""}, so there is nothing to switch
                        between.
                      </p>
                    ) : (
                      <>
                        <button
                          onClick={() => pickLevel(-1)}
                          className={cn(
                            "block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-white/10",
                            activeLevel === -1 && "text-primary",
                          )}
                        >
                          Auto (adaptive)
                        </button>
                        {levels.map((lvl) => (
                          <button
                            key={lvl.index}
                            onClick={() => pickLevel(lvl.index)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs hover:bg-white/10",
                              activeLevel === lvl.index && "text-primary",
                            )}
                          >
                            <span>{lvl.label}</span>
                            <span className="font-mono text-[10px] text-white/45">
                              {formatBitrate(lvl.bitrate)}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* sizing */}
              <div className="relative">
                <Tip label="Size & fit" align="right">
                <button
                  onClick={() => {
                    setShowSize((v) => !v);
                    setShowSubs(false);
                    setShowQuality(false);
                    setShowAudio(false);
                  }}
                  aria-label="Video size and fit"
                  className="rounded-md p-1.5 transition hover:bg-white/10"
                >
                  <Monitor className="size-4" />
                </button>
                </Tip>
                {showSize && (
                  <div className="absolute bottom-9 right-0 w-64 rounded-lg border border-white/10 bg-black/95 p-1 text-left">
                    <p className="px-2 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                      Video size
                    </p>
                    {FIT_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setFitMode(mode.value)}
                        className={cn(
                          "block w-full rounded px-2 py-1.5 text-left hover:bg-white/10",
                          fitMode === mode.value && "text-primary",
                        )}
                      >
                        <span className="block text-xs">{mode.label}</span>
                        <span className="block text-[10px] leading-snug text-white/45">
                          {mode.hint}
                        </span>
                      </button>
                    ))}
                    <label className="block px-2 py-1.5">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                        Manual zoom · {zoom}%
                      </span>
                      <input
                        type="range"
                        min={50}
                        max={250}
                        step={5}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-primary"
                      />
                    </label>
                    {zoom !== 100 && (
                      <button
                        onClick={() => setZoom(100)}
                        className="mx-2 mb-1 rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
                      >
                        Reset zoom
                      </button>
                    )}
                    <div className="mt-1 border-t border-white/10 pt-1">
                      <button
                        onClick={() => setScreenMode(screenMode === "fit" ? "inline" : "fit")}
                        className={cn(
                          "block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-white/10",
                          screenMode === "fit" && "text-primary",
                        )}
                      >
                        {screenMode === "fit" ? "Leave fit-to-screen (T)" : "Fit to screen height (T)"}
                      </button>
                      <button
                        onClick={toggleFullscreen}
                        className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-white/10"
                      >
                        {isFullscreen ? "Exit fullscreen (F)" : "Go fullscreen (F)"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Tip label={live.active ? "Stop live captions · C" : "Live captions · C"} align="right">
                <button
                  onClick={() => (live.active ? live.stop() : live.start())}
                  aria-label="Live captions"
                  className={cn(
                    "rounded-md p-1.5 transition hover:bg-white/10",
                    live.active && "text-primary",
                  )}
                >
                  <Captions className="size-4" />
                </button>
              </Tip>

              <Tip label={pipActive ? "Leave picture-in-picture · P" : "Picture-in-picture · P"} align="right">
                <button
                  onClick={() => void togglePip()}
                  aria-label="Picture in picture"
                  className={cn(
                    "rounded-md p-1.5 transition hover:bg-white/10",
                    pipActive && "text-primary",
                  )}
                >
                  <PictureInPicture2 className="size-4" />
                </button>
              </Tip>
              <Tip label={screenMode === "fit" ? "Leave fit to screen · T" : "Fit to screen · T"} align="right">
                <button
                  onClick={() => setScreenMode(screenMode === "fit" ? "inline" : "fit")}
                  aria-label={screenMode === "fit" ? "Exit fit to screen" : "Fit to screen"}
                  className={cn(
                    "rounded-md p-1.5 transition hover:bg-white/10",
                    screenMode === "fit" && "text-primary",
                  )}
                >
                  {screenMode === "fit" ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Monitor className="size-4" />
                  )}
                </button>
              </Tip>
              <Tip label={isFullscreen ? "Exit fullscreen · F" : "Fullscreen · F"} align="right">
                <button
                  onClick={toggleFullscreen}
                  aria-label="Fullscreen"
                  className="rounded-md p-1.5 transition hover:bg-white/10"
                >
                  <Maximize2 className="size-4" />
                </button>
              </Tip>
            </div>
          </div>
        </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {error}
        </p>
      )}
      {pipNote && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {pipNote}
        </p>
      )}
      {source && containerNote(source.name) && !error && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          {containerNote(source.name)}
        </p>
      )}
      {isEmbed && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {source?.kind === "youtube"
            ? "YouTube plays through its own embedded player, so quality, audio and subtitle menus live inside the frame. Live captions and caption styling above still work."
            : "This link is a web page, not a raw media file, so it plays inside a frame with the site's own player. Some sites block embedding — if the frame stays blank, use “Open”. Paste a direct .m3u8/.mpd/.mp4 link for full quality, audio and subtitle control."}
        </p>
      )}
    </div>
  );
}
