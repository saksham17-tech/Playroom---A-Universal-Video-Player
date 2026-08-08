import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
    | (new () => SpeechRecognitionLike)
    | null;
}

/**
 * Live captions from the microphone (browser speech recognition). Works with
 * anything you can hear — including DRM streams that have no subtitle track.
 */
export function useLiveCaptions(lang: string) {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);

  useEffect(() => setSupported(Boolean(getCtor())), []);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setActive(false);
    setText("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Live captions need Chrome or Edge — this browser has no speech recognition.");
      return;
    }
    setError(null);
    wantRef.current = true;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (event: any) => {
      let out = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        out += event.results[i][0].transcript;
      }
      setText(out.trim().split(/\s+/).slice(-14).join(" "));
    };
    rec.onerror = (event: any) => {
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setError("Microphone access was blocked, so live captions cannot listen.");
        wantRef.current = false;
        setActive(false);
      }
    };
    rec.onend = () => {
      if (wantRef.current) {
        try {
          rec.start();
        } catch {
          /* already restarting */
        }
      }
    };
    try {
      rec.start();
      recRef.current = rec;
      setActive(true);
    } catch {
      setError("Could not start live captions.");
    }
  }, [lang]);

  useEffect(() => () => recRef.current?.stop(), []);

  return { supported, active, text, error, start, stop };
}
