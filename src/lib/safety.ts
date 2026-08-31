import { safetyScreen, type Resource } from "./ipc";

// Local distress screening for the front. Screening is done in Rust, on-device;
// this just relays and, on a hit, renders a calm resources screen and reports that
// the caller must stop (never run coaching AI on that text).

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export function renderDistress(el: HTMLElement, resources: Resource[]): void {
  el.innerHTML = `
    <section class="surface distress">
      <h1>On fait une pause.</h1>
      <p class="lead">Ce que tu traverses compte, et tu n'as pas à le porter seul. Life OS n'est pas un soignant — mais des personnes formées peuvent t'écouter, tout de suite.</p>
      <div class="resources">
        ${resources
          .map(
            (r) => `<div class="resource">
              <div class="rname">${esc(r.name)}</div>
              <div class="rcontact">${esc(r.contact)}</div>
              <div class="muted">${esc(r.note)}</div>
            </div>`,
          )
          .join("")}
      </div>
      <p class="muted">Si tu es en danger immédiat, appelle le 112 (ou le 15).</p>
      <button class="primary" id="later">Je reprendrai plus tard</button>
    </section>`;
  el.querySelector<HTMLButtonElement>("#later")!.addEventListener("click", () => {
    location.hash = "#/home";
  });
}

/// Screen `text` locally. If distress is detected, render the resources screen into
/// `el` and return true (the caller must stop and not process the text further).
export async function distressBlocks(el: HTMLElement, text: string): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    const r = await safetyScreen(text);
    if (r.distress) {
      renderDistress(el, r.resources);
      return true;
    }
  } catch {
    /* screening must never break the flow; on error, do not block */
  }
  return false;
}

/// Plain-words high-stakes note, or null. Non-blocking (NFR16).
export async function highStakesNote(text: string): Promise<string | null> {
  try {
    const r = await safetyScreen(text);
    if (r.distress || !r.high_stakes) return null;
    return `C'est un choix important (${r.high_stakes}). Je peux t'aider à y voir clair — mais pour trancher, l'avis d'un professionnel humain est précieux.`;
  } catch {
    return null;
  }
}
