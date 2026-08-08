import type { SubtitleStyle } from "@/lib/subtitle-style";
import { SUBTITLE_FONTS, SUBTITLE_COLORS } from "@/lib/subtitle-style";
import { cn } from "@/lib/utils";

type Props = {
  value: SubtitleStyle;
  onChange: (next: SubtitleStyle) => void;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block px-2 py-1.5">
      <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function SubtitleStylePanel({ value, onChange }: Props) {
  const set = <K extends keyof SubtitleStyle>(key: K, v: SubtitleStyle[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="w-64 border-t border-white/10 pt-1">
      <Row label={`Text size · ${value.fontSize}px`}>
        <input
          type="range"
          min={12}
          max={56}
          step={1}
          value={value.fontSize}
          onChange={(e) => set("fontSize", Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-primary"
        />
      </Row>
      <Row label="Typeface">
        <select
          value={value.fontFamily}
          onChange={(e) => set("fontFamily", e.target.value)}
          className="w-full rounded bg-white/10 px-1.5 py-1 text-xs text-white outline-none"
        >
          {SUBTITLE_FONTS.map((f) => (
            <option key={f.label} value={f.value} className="text-black">
              {f.label}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Colour">
        <div className="flex flex-wrap gap-1.5">
          {SUBTITLE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Subtitle colour ${c}`}
              onClick={() => set("color", c)}
              style={{ background: c }}
              className={cn(
                "size-5 rounded-full border border-white/25",
                value.color === c && "ring-2 ring-primary ring-offset-1 ring-offset-black",
              )}
            />
          ))}
        </div>
      </Row>
      <Row label={`Backdrop · ${Math.round(value.backgroundOpacity * 100)}%`}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value.backgroundOpacity}
          onChange={(e) => set("backgroundOpacity", Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-primary"
        />
      </Row>
      <Row label={`Vertical position · ${value.bottomOffset}%`}>
        <input
          type="range"
          min={2}
          max={45}
          step={1}
          value={value.bottomOffset}
          onChange={(e) => set("bottomOffset", Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-primary"
        />
      </Row>
      <Row label="Edge">
        <div className="flex gap-1">
          {(["none", "outline", "shadow"] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => set("edge", e)}
              className={cn(
                "flex-1 rounded px-1.5 py-1 text-[11px] capitalize hover:bg-white/10",
                value.edge === e ? "bg-white/15 text-primary" : "text-white/70",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}
