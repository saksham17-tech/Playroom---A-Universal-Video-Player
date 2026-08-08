export type SubtitleStyle = {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundOpacity: number;
  /** distance from the bottom of the frame, in % of frame height */
  bottomOffset: number;
  edge: "none" | "outline" | "shadow";
};

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontSize: 22,
  fontFamily: '"Space Grotesk", system-ui, sans-serif',
  color: "#ffffff",
  backgroundOpacity: 0.55,
  bottomOffset: 8,
  edge: "outline",
};

export const SUBTITLE_FONTS = [
  { label: "Sans (Space Grotesk)", value: '"Space Grotesk", system-ui, sans-serif' },
  { label: "System sans", value: "system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: '"JetBrains Mono", ui-monospace, monospace' },
];

export const SUBTITLE_COLORS = ["#ffffff", "#ffd166", "#7ee787", "#8ab4ff", "#ff8fa3", "#000000"];

export function cueTextStyle(style: SubtitleStyle): React.CSSProperties {
  const edge =
    style.edge === "outline"
      ? "0 0 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.75)"
      : style.edge === "shadow"
        ? "2px 2px 4px rgba(0,0,0,0.9)"
        : "none";
  return {
    fontSize: `${style.fontSize}px`,
    fontFamily: style.fontFamily,
    color: style.color,
    backgroundColor: `rgba(0,0,0,${style.backgroundOpacity})`,
    textShadow: edge,
  };
}
