import { getMode, setMode, memoryBackfill, exportData, eraseAll, syncExport, syncImport, isApiError, type UiMode } from "../lib/ipc";
import { renderCompass } from "./compass";
import { renderDecision } from "./decision";
import { renderCarnet } from "./carnet";
import { renderCheckin } from "./checkin";
import { renderDaily } from "./daily";

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
    id: "today",
    human: "Aujourd'hui",
    expert: "daily capture",
    render: (el) => renderDaily(el),
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
         <p class="muted">Le mode expert révèle la mécanique interne. Par défaut, tout reste en mots simples.</p>
         <hr style="border:none;border-top:1px solid var(--line);margin:24px 0" />
         <button id="reindex">Rafraîchir la mémoire</button>
         <p class="muted">Aide le compagnon à relier tes décisions et intentions. Nécessite le modèle local d'embeddings (<code>ollama pull embeddinggemma</code>).</p>
         <div id="reindex-msg" class="msg" hidden></div>

         <hr style="border:none;border-top:1px solid var(--line);margin:24px 0" />
         <h2 style="font-size:16px;font-weight:600">Tes données</h2>
         <p class="muted">Tout reste sur ton appareil. Tu peux tout emporter ou tout effacer.</p>
         <div class="row" style="gap:8px;margin-top:8px">
           <button id="export">Exporter mes données</button>
           <button id="erase" class="danger">Tout effacer…</button>
         </div>
         <div id="data-msg" class="msg" hidden></div>

         <hr style="border:none;border-top:1px solid var(--line);margin:24px 0" />
         <h2 style="font-size:16px;font-weight:600">Synchroniser tes appareils</h2>
         <p class="muted">Crée un instantané chiffré à porter sur un autre appareil (AirDrop, Syncthing, Tailscale, clé USB). Chiffré de bout en bout par ta phrase secrète — rien ne passe par un serveur.</p>
         <div class="sync-block">
           <input type="password" id="sync-pass" placeholder="Phrase secrète (8+ caractères)" autocomplete="off" />
           <div class="row"><button id="sync-export">Créer un instantané</button></div>
         </div>
         <div class="sync-block" style="margin-top:12px">
           <input type="text" id="sync-path" placeholder="Chemin du fichier .age à importer" autocomplete="off" />
           <input type="password" id="sync-pass2" placeholder="Phrase secrète" autocomplete="off" />
           <div class="row"><button id="sync-import">Importer et fusionner</button></div>
         </div>
         <p class="muted">Après un import sur un nouvel appareil, relance « Rafraîchir la mémoire ».</p>
         <div id="sync-msg" class="msg" hidden></div>

         <hr style="border:none;border-top:1px solid var(--line);margin:24px 0" />
         <p class="muted">Life OS n'est pas un thérapeute et ne pose aucun diagnostic. En cas de détresse : <strong>3114</strong> (prévention du suicide, 24h/24), SOS Amitié <strong>09 72 39 40 50</strong>, urgences <strong>112</strong>.</p>`,
      );

      const smsg = el.querySelector<HTMLDivElement>("#sync-msg")!;
      el.querySelector<HTMLButtonElement>("#sync-export")!.addEventListener("click", async () => {
        const pass = el.querySelector<HTMLInputElement>("#sync-pass")!.value;
        try {
          const path = await syncExport(pass);
          smsg.hidden = false;
          smsg.className = "msg info";
          smsg.textContent = `Instantané chiffré créé : ${path}`;
        } catch (err) {
          smsg.hidden = false;
          smsg.className = "msg warn";
          smsg.textContent = isApiError(err) ? err.message : "Export impossible.";
        }
      });
      el.querySelector<HTMLButtonElement>("#sync-import")!.addEventListener("click", async () => {
        const path = el.querySelector<HTMLInputElement>("#sync-path")!.value.trim();
        const pass = el.querySelector<HTMLInputElement>("#sync-pass2")!.value;
        try {
          const s = await syncImport(path, pass);
          smsg.hidden = false;
          smsg.className = "msg info";
          smsg.textContent = `Fusionné : ${s.inserted} ajoutés, ${s.updated} mis à jour, ${s.skipped} déjà à jour.`;
        } catch (err) {
          smsg.hidden = false;
          smsg.className = "msg warn";
          smsg.textContent = isApiError(err) ? err.message : "Import impossible.";
        }
      });
      el.querySelector<HTMLInputElement>("#expert")!.addEventListener("change", async (e) => {
        const next: UiMode = (e.target as HTMLInputElement).checked ? "expert" : "human";
        await setMode(next);
        window.dispatchEvent(new CustomEvent("mode-changed", { detail: next }));
      });
      const reindex = el.querySelector<HTMLButtonElement>("#reindex")!;
      const rmsg = el.querySelector<HTMLDivElement>("#reindex-msg")!;
      reindex.addEventListener("click", async () => {
        reindex.disabled = true;
        reindex.textContent = "En cours…";
        try {
          const n = await memoryBackfill();
          rmsg.hidden = false;
          rmsg.className = "msg info";
          rmsg.textContent = n > 0 ? `Mémoire rafraîchie (${n} éléments).` : "Tout est déjà à jour.";
        } catch (err) {
          rmsg.hidden = false;
          rmsg.className = "msg warn";
          rmsg.textContent = isApiError(err) ? err.message : "Un souci est survenu.";
        } finally {
          reindex.disabled = false;
          reindex.textContent = "Rafraîchir la mémoire";
        }
      });

      const dmsg = el.querySelector<HTMLDivElement>("#data-msg")!;
      el.querySelector<HTMLButtonElement>("#export")!.addEventListener("click", async () => {
        try {
          const path = await exportData();
          dmsg.hidden = false;
          dmsg.className = "msg info";
          dmsg.textContent = `Exporté ici : ${path}`;
        } catch (err) {
          dmsg.hidden = false;
          dmsg.className = "msg warn";
          dmsg.textContent = isApiError(err) ? err.message : "Export impossible.";
        }
      });

      // Erase is two-step: first click arms, second click confirms.
      const erase = el.querySelector<HTMLButtonElement>("#erase")!;
      let armed = false;
      erase.addEventListener("click", async () => {
        if (!armed) {
          armed = true;
          erase.textContent = "Confirmer : tout effacer";
          dmsg.hidden = false;
          dmsg.className = "msg warn";
          dmsg.textContent = "C'est irréversible. Clique encore pour tout effacer, ou change d'écran pour annuler.";
          return;
        }
        try {
          await eraseAll("EFFACER");
          dmsg.className = "msg info";
          dmsg.textContent = "Tout a été effacé.";
        } catch (err) {
          dmsg.className = "msg warn";
          dmsg.textContent = isApiError(err) ? err.message : "Effacement impossible.";
        } finally {
          armed = false;
          erase.textContent = "Tout effacer…";
        }
      });
    },
  },
];

export { getMode };
