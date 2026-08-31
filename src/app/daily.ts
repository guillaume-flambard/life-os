import {
  captureAdd,
  capturesRecent,
  listOpenStories,
  setStoryStatus,
  isApiError,
  type Capture,
  type OpenStory,
} from "../lib/ipc";
import { distressBlocks } from "../lib/safety";

// "Aujourd'hui" — a deliberately thin daily surface: capture a quick note, do a
// next step, and be told plainly that a quiet day is fine. No streak, no debt.

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function notify(el: HTMLElement, message: string) {
  const bar = el.querySelector<HTMLDivElement>("#day-msg");
  if (!bar) return;
  bar.textContent = message;
  bar.className = "msg info";
  bar.hidden = false;
}

export async function renderDaily(el: HTMLElement): Promise<void> {
  let captures: Capture[] = [];
  let steps: OpenStory[] = [];
  try {
    captures = await capturesRecent(20);
  } catch {
    /* empty is fine */
  }
  try {
    steps = await listOpenStories();
  } catch {
    /* empty is fine */
  }

  const today = new Date().toISOString().slice(0, 10);
  const quiet = captures.length === 0 && steps.length === 0;

  el.innerHTML = `
    <section class="surface">
      <h1>Aujourd'hui</h1>
      <p class="lead">Un endroit léger pour poser une pensée, ou faire un petit pas. Rien de plus.</p>
      <div id="day-msg" class="msg" hidden></div>

      <form id="capture" class="add-intention">
        <textarea name="content" rows="2" placeholder="Une pensée à poser… (facultatif)"></textarea>
        <div class="row"><button type="submit" class="primary">Noter</button></div>
      </form>

      ${
        steps.length
          ? `<div class="open-steps">
              <div class="muted">Tes prochains pas :</div>
              <ul class="intentions">
                ${steps
                  .map(
                    (s) => `<li class="step">
                      <div class="marker">${esc(s.title)}${s.when_cue ? ` <span class="muted">— ${esc(s.when_cue)}</span>` : ""}</div>
                      <div class="row"><button data-done="${s.id}">Fait</button><button data-drop="${s.id}">Laisser</button></div>
                    </li>`,
                  )
                  .join("")}
              </ul>
            </div>`
          : ""
      }

      ${
        captures.length
          ? `<div class="captures">
              <div class="muted">Ce que tu as posé :</div>
              <ul class="intentions">
                ${captures
                  .map(
                    (c) => `<li>
                      <div class="marker">${esc(c.content)}</div>
                      <div class="muted">${c.created_at.slice(0, 10) === today ? "aujourd'hui" : esc(c.created_at.slice(0, 10))}</div>
                    </li>`,
                  )
                  .join("")}
              </ul>
            </div>`
          : ""
      }

      ${quiet ? `<p class="muted quiet">Rien aujourd'hui ? C'est très bien. Reviens quand tu veux.</p>` : ""}
    </section>`;

  el.querySelector<HTMLFormElement>("#capture")!.addEventListener("submit", (e) => {
    e.preventDefault();
    const ta = (e.target as HTMLFormElement).elements.namedItem("content") as HTMLTextAreaElement;
    const content = ta.value.trim();
    if (!content) return;
    (async () => {
      try {
        if (await distressBlocks(el, content)) return; // screen before saving
        await captureAdd(content, "note");
        await renderDaily(el);
      } catch (err) {
        notify(el, isApiError(err) ? err.message : "Un souci est survenu.");
      }
    })();
  });

  const mark = (id: string, status: "done" | "dropped") =>
    setStoryStatus(id, status).then(() => renderDaily(el)).catch(() => {});
  el.querySelectorAll<HTMLButtonElement>("[data-done]").forEach((b) =>
    b.addEventListener("click", () => mark(b.dataset.done!, "done")),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-drop]").forEach((b) =>
    b.addEventListener("click", () => mark(b.dataset.drop!, "dropped")),
  );
}
