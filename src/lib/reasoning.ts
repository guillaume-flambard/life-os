import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

// The Rust backend streams the local model's private reasoning while an
// AI-assisted moment runs. Contract:
//   event "ai-reasoning"      payload { delta: string }   — a thinking token
//   event "ai-reasoning-end"  payload { }                 — the call finished
// Assists happen one at a time in the UI, so a single global stream is enough.

export interface ReasoningStream {
  text: string; // accumulated reasoning so far
  active: boolean; // a call is currently thinking
  reset: () => void;
}

export function useReasoningStream(): ReasoningStream {
  const [text, setText] = useState("");
  const [active, setActive] = useState(false);
  const unlisten = useRef<Array<() => void>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const off1 = await listen<{ delta: string }>("ai-reasoning", (e) => {
        if (!mounted) return;
        setActive(true);
        setText((t) => t + (e.payload?.delta ?? ""));
      });
      const off2 = await listen("ai-reasoning-end", () => {
        if (!mounted) return;
        setActive(false);
      });
      unlisten.current = [off1, off2];
    })();
    return () => {
      mounted = false;
      unlisten.current.forEach((f) => f());
    };
  }, []);

  return {
    text,
    active,
    reset: () => {
      setText("");
      setActive(false);
    },
  };
}
