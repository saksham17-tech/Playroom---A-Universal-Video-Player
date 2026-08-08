import { Link } from "@tanstack/react-router";
import { MonitorPlay } from "lucide-react";

const LINKS = [
  { to: "/", label: "Player" },
  { to: "/imax", label: "1.43:1" },
  { to: "/playlists", label: "Playlists" },
  { to: "/about", label: "About" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <MonitorPlay className="size-5 text-primary" />
          <span>
            Playroom<span className="text-primary">.</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
