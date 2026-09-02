import { useEffect, useRef, useState } from "react";
import type { Choice, Turn } from "./flow";
import "./chat.css";
import { t } from "../i18n";

// Bespoke, hand-written conversation — no component-library defaults. Plain
// elements styled by chat.css for the clean ChatGPT/Claude register.

function Typing() {
  return (
    <div className="cv-typing">
      <i />
      <i />
      <i />
    </div>
  );
}

function Chips({
  options,
  answered,
  onPick,
}: {
  options: Choice[];
  answered?: string;
  onPick: (v: string, label: string) => void;
}) {
  if (answered) return null;
  return (
    <div className="cv-chips">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={"cv-chip" + (o.tone === "accent" ? " primary" : "")}
          onClick={() => onPick(o.value, o.label)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Composer({
  placeholder,
  multiline,
  answered,
  onSubmit,
}: {
  placeholder?: string;
  multiline?: boolean;
  cta?: string;
  answered?: boolean;
  onSubmit: (t: string) => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  useEffect(() => {
    if (!answered) ref.current?.focus();
  }, [answered]);
  if (answered) return null;

  const send = () => {
    if (value.trim()) onSubmit(value.trim());
  };

  return (
    <div className="cv-composer">
      {multiline ? (
        <textarea
          ref={ref as any}
          rows={1}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
      ) : (
        <input
          ref={ref as any}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
      )}
      <button type="button" className="cv-send" onClick={send} disabled={!value.trim()} aria-label={t("Send")}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}

export function Conversation({ turns }: { turns: Turn[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  return (
    <div className="cv">
      {turns.map((t) => {
        switch (t.kind) {
          case "assistant":
            return (
              <div className="cv-a" key={t.id}>
                {t.content}
              </div>
            );
          case "user":
            return (
              <div className="cv-u" key={t.id}>
                {t.text}
              </div>
            );
          case "typing":
            return <Typing key={t.id} />;
          case "choices":
            return <Chips key={t.id} options={t.options} answered={t.answered} onPick={t.onPick} />;
          case "input":
            return (
              <Composer
                key={t.id}
                placeholder={t.placeholder}
                multiline={t.multiline}
                cta={t.cta}
                answered={t.answered}
                onSubmit={t.onSubmit}
              />
            );
          case "widget":
            if (t.answered) return null;
            return <div key={t.id}>{t.render(t.done)}</div>;
          default:
            return null;
        }
      })}
      <div ref={endRef} />
    </div>
  );
}
