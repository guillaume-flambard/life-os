import { useMemo, useState } from "react";
import type { ReasoningStream } from "../lib/reasoning";
import "../guide/chat.css";

// Live reasoning as a monochrome timeline, hand-written to match the thread.
// The streamed thinking is split into short steps on a hairline rail; the
// current step pulses, past ones settle and dim, a timer runs; then it folds
// to a quiet "Réfléchi pendant N s" you can re-open.

function splitSteps(text: string): string[] {
  const t = text.replace(/\r/g, "").trim();
  if (!t) return [];
  const parts = t
    .split(/\n+|(?<=[.!?…])\s+(?=[A-ZÀ-Ÿ0-9"«])/u)
    .map((s) => s.trim().replace(/^\s*(?:\d+[.)]|[-•*])\s+/, "").trim())
    .filter(Boolean);
  const merged: string[] = [];
  for (const p of parts) {
    if (p.length < 12 && merged.length) merged[merged.length - 1] += " " + p;
    else merged.push(p);
  }
  return merged.length ? merged : [t];
}

const SPARK = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M12 2l1.4 6.6L20 10l-6.6 1.4L12 18l-1.4-6.6L4 10l6.6-1.4z" />
  </svg>
);

export function ReasoningPanel({ stream }: { stream: ReasoningStream }) {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => splitSteps(stream.text), [stream.text]);
  const thinking = stream.phase === "thinking";
  const secs = Math.max(1, Math.round(stream.seconds));

  if (stream.phase === "idle" && !stream.text) return null;

  const showBody = thinking || open;

  return (
    <div className="rs">
      <button
        type="button"
        className={"rs-head" + (thinking ? "" : " clickable")}
        onClick={() => !thinking && setOpen((v) => !v)}
        aria-expanded={thinking ? undefined : open}
      >
        {thinking ? <span className="rs-dot" /> : <span className="rs-spark">{SPARK}</span>}
        {thinking ? (
          <span className="rs-lead">Réflexion</span>
        ) : (
          <span className="rs-lead rest">Réfléchi pendant {secs}&nbsp;s</span>
        )}
        {thinking && <span className="rs-timer">{secs}&nbsp;s</span>}
        {!thinking && (
          <span className={"rs-chev" + (open ? " open" : "")}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </button>

      {showBody && steps.length > 0 && (
        <ol className="rs-steps">
          {steps.map((s, i) => {
            const active = thinking && i === steps.length - 1;
            return (
              <li key={i} className={"rs-step" + (active ? " active" : "")}>
                <span className="rs-node">
                  <b />
                </span>
                <span className="rs-text">
                  {s}
                  {active && <span className="rs-caret">▍</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
