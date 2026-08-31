import {
  listDomains,
  createDomain,
  renameDomain,
  archiveDomain,
  listIntentions,
  createIntention,
  setIntentionPriority,
  archiveIntention,
  reformulateIntention,
  isApiError,
  PRIORITY_LABELS,
  type Domain,
  type Intention,
  type Priority,
} from "../lib/ipc";
import { cleanSituation, cleanAction } from "../lib/marker";
import { distressBlocks } from "../lib/safety";

// The compass surface: life areas ("pans de vie") and intentions ("ce qui
// compte"), written as "quand [situation], je [action]". Human façade only.

const PRIORITIES: Priority[] = ["must", "should", "may"];

interface Draft {
  statement: string;
  situation: string;
  action: string;
  priority: Priority;
}

const drafts = new Map<string, Draft>(); // per-domain new-intention draft

function draftFor(domainId: string): Draft {
  let d = drafts.get(domainId);
  if (!d) {
    d = { statement: "", situation: "", action: "", priority: "should" };
    drafts.set(domainId, d);
  }
  return d;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function marker(i: Intention): string {
  if (i.situation && i.action)
    return `Quand ${esc(cleanSituation(i.situation))}, je ${esc(cleanAction(i.action))}.`;
  return esc(i.statement);
}

function notify(el: HTMLElement, message: string, kind: "info" | "warn" = "info") {
  const bar = el.querySelector<HTMLDivElement>("#compass-msg")!;
  bar.textContent = message;
  bar.className = `msg ${kind}`;
  bar.hidden = false;
}

async function handle(el: HTMLElement, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    if (isApiError(e)) notify(el, e.message, e.code === "cap_reached" ? "warn" : "info");
    else notify(el, "Un souci est survenu.", "info");
  }
}

export async function renderCompass(el: HTMLElement): Promise<void> {
  const domains = await listDomains();
  const intentions = new Map<string, Intention[]>();
  await Promise.all(
    domains.map(async (d) => intentions.set(d.id, await listIntentions(d.id))),
  );

  el.innerHTML = `
    <section class="surface">
      <h1>Ta boussole</h1>
      <p class="lead">Tes pans de vie et ce qui compte pour toi, dans tes mots.</p>
      <div id="compass-msg" class="msg" hidden></div>

      <div class="domains">
        ${domains.map((d) => domainCard(d, intentions.get(d.id) ?? [])).join("")}
      </div>

      <form class="add-domain" data-add-domain>
        <input name="name" placeholder="Ajouter un pan de vie…" autocomplete="off" />
        <button type="submit">Ajouter</button>
      </form>
    </section>`;

  wire(el);
}

function domainCard(d: Domain, items: Intention[]): string {
  const draft = draftFor(d.id);
  return `
    <article class="domain" data-domain="${d.id}">
      <header>
        <h2>${esc(d.name)}</h2>
        <div class="actions">
          <button data-rename="${d.id}" title="Renommer">Renommer</button>
          <button data-archive-domain="${d.id}" title="Mettre de côté">Mettre de côté</button>
        </div>
      </header>

      <ul class="intentions">
        ${items
          .map(
            (i) => `
          <li>
            <div class="marker">${marker(i)}</div>
            <div class="row">
              <select data-priority="${i.id}">
                ${PRIORITIES.map(
                  (p) =>
                    `<option value="${p}" ${p === i.priority ? "selected" : ""}>${PRIORITY_LABELS[p]}</option>`,
                ).join("")}
              </select>
              <button data-archive-intention="${i.id}">Retirer</button>
            </div>
          </li>`,
          )
          .join("")}
      </ul>

      <form class="add-intention" data-add-intention="${d.id}">
        <textarea name="statement" rows="2" placeholder="Qu'est-ce qui compte pour toi ici ?">${esc(draft.statement)}</textarea>
        <button type="button" data-reformulate="${d.id}">Reformuler</button>
        <div class="marker-fields">
          <input name="situation" placeholder="quand… (une situation)" value="${esc(draft.situation)}" />
          <input name="action" placeholder="je… (ce que tu fais)" value="${esc(draft.action)}" />
        </div>
        <div class="row">
          <select name="priority">
            ${PRIORITIES.map(
              (p) => `<option value="${p}" ${p === draft.priority ? "selected" : ""}>${PRIORITY_LABELS[p]}</option>`,
            ).join("")}
          </select>
          <button type="submit">Garder</button>
        </div>
      </form>
    </article>`;
}

function wire(el: HTMLElement) {
  const refresh = () => renderCompass(el);

  el.querySelector<HTMLFormElement>("[data-add-domain]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).elements.namedItem("name") as HTMLInputElement;
    const name = input.value.trim();
    if (!name) return;
    handle(el, async () => {
      await createDomain(name);
      await refresh();
    });
  });

  el.querySelectorAll<HTMLButtonElement>("[data-rename]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.rename!;
      const next = window.prompt("Nouveau nom du pan de vie ?");
      if (!next) return;
      handle(el, async () => {
        await renameDomain(id, next.trim());
        await refresh();
      });
    }),
  );

  el.querySelectorAll<HTMLButtonElement>("[data-archive-domain]").forEach((b) =>
    b.addEventListener("click", () =>
      handle(el, async () => {
        await archiveDomain(b.dataset.archiveDomain!);
        await refresh();
      }),
    ),
  );

  el.querySelectorAll<HTMLSelectElement>("[data-priority]").forEach((s) =>
    s.addEventListener("change", () =>
      handle(el, async () => {
        await setIntentionPriority(s.dataset.priority!, s.value as Priority);
        await refresh();
      }),
    ),
  );

  el.querySelectorAll<HTMLButtonElement>("[data-archive-intention]").forEach((b) =>
    b.addEventListener("click", () =>
      handle(el, async () => {
        await archiveIntention(b.dataset.archiveIntention!);
        await refresh();
      }),
    ),
  );

  el.querySelectorAll<HTMLButtonElement>("[data-reformulate]").forEach((b) =>
    b.addEventListener("click", () => {
      const domainId = b.dataset.reformulate!;
      const form = el.querySelector<HTMLFormElement>(`[data-add-intention="${domainId}"]`)!;
      const statement = (form.elements.namedItem("statement") as HTMLTextAreaElement).value.trim();
      if (!statement) {
        notify(el, "Écris d'abord ce qui compte, puis je le reformule.", "info");
        return;
      }
      b.disabled = true;
      b.textContent = "…";
      handle(el, async () => {
        try {
          const r = await reformulateIntention(statement);
          const d = draftFor(domainId);
          d.statement = statement;
          d.situation = r.situation;
          d.action = r.action;
          await refresh();
        } finally {
          // refresh() re-renders; nothing else to restore
        }
      });
    }),
  );

  el.querySelectorAll<HTMLFormElement>("[data-add-intention]").forEach((form) =>
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const domainId = form.dataset.addIntention!;
      const statement = (form.elements.namedItem("statement") as HTMLTextAreaElement).value.trim();
      const situation = (form.elements.namedItem("situation") as HTMLInputElement).value.trim();
      const action = (form.elements.namedItem("action") as HTMLInputElement).value.trim();
      const priority = (form.elements.namedItem("priority") as HTMLSelectElement).value as Priority;
      if (!statement && !(situation && action)) {
        notify(el, "Dis-moi ce qui compte, ou remplis « quand… je… ».", "info");
        return;
      }
      handle(el, async () => {
        if (await distressBlocks(el, `${statement} ${situation} ${action}`)) return;
        await createIntention(
          domainId,
          statement || `${situation} → ${action}`,
          situation || null,
          action || null,
          priority,
        );
        drafts.delete(domainId);
        await refresh();
      });
    }),
  );

  // Keep drafts as the user types so a reformulate/refresh doesn't lose input.
  el.querySelectorAll<HTMLFormElement>("[data-add-intention]").forEach((form) => {
    const domainId = form.dataset.addIntention!;
    form.addEventListener("input", () => {
      const d = draftFor(domainId);
      d.statement = (form.elements.namedItem("statement") as HTMLTextAreaElement).value;
      d.situation = (form.elements.namedItem("situation") as HTMLInputElement).value;
      d.action = (form.elements.namedItem("action") as HTMLInputElement).value;
      d.priority = (form.elements.namedItem("priority") as HTMLSelectElement).value as Priority;
    });
  });
}
