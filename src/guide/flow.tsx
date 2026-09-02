import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// A tiny conversational engine. A "script" is a plain async function that talks
// to the user one turn at a time — say a line, offer choices, ask for text, or
// drop in a custom widget — and awaits the answer before moving on. This is what
// lets the app hold the user by the hand: exactly one thing on screen to do.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => crypto.randomUUID();

export interface Choice {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent";
}

export type Turn =
  | { kind: "assistant"; id: string; content: ReactNode }
  | { kind: "user"; id: string; text: string }
  | { kind: "typing"; id: string }
  | {
      kind: "choices";
      id: string;
      options: Choice[];
      answered?: string;
      onPick: (value: string, label: string) => void;
    }
  | {
      kind: "input";
      id: string;
      placeholder?: string;
      multiline?: boolean;
      cta?: string;
      initial?: string;
      answered?: boolean;
      onSubmit: (text: string) => void;
    }
  | {
      kind: "widget";
      id: string;
      render: (done: (echo?: string) => void) => ReactNode;
      done: (echo?: string) => void;
      answered?: boolean;
    };

export interface Flow {
  say: (content: ReactNode, opts?: { delay?: number }) => Promise<void>;
  ask: (options: Choice[], opts?: { prompt?: ReactNode }) => Promise<string>;
  input: (opts?: {
    placeholder?: string;
    multiline?: boolean;
    cta?: string;
    prompt?: ReactNode;
    initial?: string;
  }) => Promise<string>;
  widget: (render: (done: (echo?: string) => void) => ReactNode) => Promise<void>;
  echo: (text: string) => void;
}

export function useFlow(script: (flow: Flow) => Promise<void>) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    const push = (t: Turn) => {
      if (!cancelled) setTurns((x) => [...x, t]);
    };
    const patch = (id: string, fn: (t: Turn) => Turn) => {
      if (!cancelled) setTurns((x) => x.map((t) => (t.id === id ? fn(t) : t)));
    };

    const typing = async (delay: number) => {
      const id = uid();
      if (!cancelled) push({ kind: "typing", id });
      await sleep(delay);
      if (!cancelled) setTurns((x) => x.filter((t) => t.id !== id));
    };

    const flow: Flow = {
      echo: (text) => push({ kind: "user", id: uid(), text }),

      say: async (content, opts) => {
        if (cancelled) return;
        await typing(opts?.delay ?? 550);
        if (cancelled) return;
        push({ kind: "assistant", id: uid(), content });
      },

      ask: (options, opts) =>
        new Promise<string>(async (resolve) => {
          if (cancelled) return;
          if (opts?.prompt) await flow.say(opts.prompt);
          const id = uid();
          push({
            kind: "choices",
            id,
            options,
            onPick: (value, label) => {
              patch(id, (t) => ({ ...(t as any), answered: value }));
              push({ kind: "user", id: uid(), text: label });
              resolve(value);
            },
          });
        }),

      input: (opts) =>
        new Promise<string>(async (resolve) => {
          if (cancelled) return;
          if (opts?.prompt) await flow.say(opts.prompt);
          const id = uid();
          push({
            kind: "input",
            id,
            placeholder: opts?.placeholder,
            multiline: opts?.multiline,
            cta: opts?.cta,
            initial: opts?.initial,
            onSubmit: (text) => {
              patch(id, (t) => ({ ...(t as any), answered: true }));
              push({ kind: "user", id: uid(), text });
              resolve(text);
            },
          });
        }),

      widget: (render) =>
        new Promise<void>((resolve) => {
          if (cancelled) return;
          const id = uid();
          const done = (echo?: string) => {
            if (cancelled) return;
            patch(id, (t) => ({ ...(t as any), answered: true }));
            if (echo) push({ kind: "user", id: uid(), text: echo });
            resolve();
          };
          push({ kind: "widget", id, render, done });
        }),
    };

    script(flow).catch((e) => {
      console.error("flow error", e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return turns;
}
