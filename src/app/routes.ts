import { getMode, setMode, type UiMode } from "../lib/ipc";
import { renderCompass } from "./compass";
import { renderDecision } from "./decision";
import { renderCarnet } from "./carnet";
import { renderCheckin } from "./checkin";

// The five MVP surfaces as shells. Human-mode copy only; expert mode adds a
// discreet engine-term subtitle. No engine jargon in human mode.

export interface Route {
  id: string;
  human: string; // human-mode label (never contains engine jargon)
  expert: string; // engine subtitle, shown only in expert mode
  render: (el: HTMLElement, mode: UiMode) => void | Promise<void>;
}

function h(title: string, body: string): string {
  return `<section class="surface"><h1>${title}</h1>${body}</section>`;
}

export const ROUTES: Route[] = [
  {
    id: "home",
    human: "Accueil",
    expert: "conversation",
    render: (el) => renderDecision(el),
  },
  {
    id: "compass",
    human: "Ta boussole",
    expert: "life-spec",
    render: (el) => renderCompass(el),
  },
  {
    id: "log",
    human: "Ton carnet",
    expert: "change proposals",
    render: (el) => renderCarnet(el),
  },
  {
    id: "checkin",
    human: "Le point",
    expert: "review / QA",
    render: (el) => renderCheckin(el),
  },
  {
    id: "settings",
    human: "Réglages",
    expert: "settings",
    render: async (el, mode) => {
      el.innerHTML = h(
        "Réglages",
        `<label class="toggle">
           <input type="checkbox" id="expert" ${mode === "expert" ? "checked" : ""} />
           Mode expert
         </label>
         <p class="muted">Le mode expert révèle la mécanique interne. Par défaut, tout reste en mots simples.</p>`,
      );
      el.querySelector<HTMLInputElement>("#expert")!.addEventListener("change", async (e) => {
        const next: UiMode = (e.target as HTMLInputElement).checked ? "expert" : "human";
        await setMode(next);
        window.dispatchEvent(new CustomEvent("mode-changed", { detail: next }));
      });
    },
  },
];

export { getMode };
