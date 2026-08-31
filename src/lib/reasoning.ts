import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

// The Rust backend streams the local model's private reasoning while an
// AI-assisted moment runs. Contract:
//   event "ai-reasoning"      payload { delta: string }   — a thinking token
//   event "ai-reasoning-end"  payload { }                 — the call finished
// Assists happen one at a time in the UI, so a single global stream is enough.
//
// The hook exposes just enough to render a Claude/ChatGPT-style panel: the live
// text, whether it's still thinking, and how long it thought (live, then final).

export type ReasoningPhase = "idle" | "thinking" | "done";

export interface ReasoningStream {
  text: string; // accumulated reasoning so far
  phase: ReasoningPhase;
  active: boolean; // convenience: phase === "thinking"
  seconds: number; // elapsed thinking time — ticks live, then freezes
  reset: () => void;
}

export function useReasoningStream(): ReasoningStream {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<ReasoningPhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef<number | null>(null);
  const offs = useRef<Array<() => void>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const off1 = await listen<{ delta: string }>("ai-reasoning", (e) => {
        if (!mounted) return;
        setPhase((p) => {
          if (p !== "thinking") startRef.current = performance.now();
          return "thinking";
        });
        setText((t) => t + (e.payload?.delta ?? ""));
      });
      const off2 = await listen("ai-reasoning-end", () => {
        if (!mounted) return;
        setPhase((p) => (p === "thinking" ? "done" : p));
      });
      offs.current = [off1, off2];
    })();
    return () => {
      mounted = false;
      offs.current.forEach((f) => f());
    };
  }, []);

  // Tick the elapsed counter while thinking; freeze it when done.
  useEffect(() => {
    if (phase !== "thinking") return;
    const id = window.setInterval(() => {
      if (startRef.current != null) {
        setSeconds((performance.now() - startRef.current) / 1000);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase]);

  return {
    text,
    phase,
    active: phase === "thinking",
    seconds,
    reset: () => {
      setText("");
      setPhase("idle");
      setSeconds(0);
      startRef.current = null;
    },
  };
}
