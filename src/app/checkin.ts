import {
  listDomains,
  listIntentions,
  reviewOpen,
  reviewAddItem,
  listProposedDecisions,
  decisionDetail,
  applyDecision,
  isApiError,
  OUTCOME_LABELS,
  type Intention,
  type Review,
  type Outcome,
  type DeltaResolution,
  type DecisionDetail,
} from "../lib/ipc";
import { cleanSituation, cleanAction } from "../lib/marker";
import { distressBlocks } from "../lib/safety";

// "Le point" — a kind, periodic check-in: replay each intention (no judgment),
// then integrate any confirmed decision into the compass. Human façade only.

const OUTCOMES: Outcome[] = ["better", "as_expected", "worse", "too_early"];

interface ReplayState {
  review: Review;
  intentions: Intention[];
  idx: number;
  outcome: Outcome | null;
  learning: string;
}

let replay: ReplayState | null = null;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function notify(el: HTMLElement, message: string, kind: "info" | "warn" = "info") {
  const bar = el.querySelector<HTMLDivElement>("#cmsg");
  if (!bar) return;
  bar.textContent = message;
  bar.className = `msg ${kind}`;
  bar.hidden = false;
}

async function guard(el: HTMLElement, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    if (isApiError(e)) notify(el, e.message, e.code === "cap_reached" || e.code === "incomplete" ? "warn" : "info");
    else notify(el, "Un souci est survenu.", "info");
  }
}

function marker(i: Intention): string {
  if (i.situation && i.action)
    return `Quand ${esc(cleanSituation(i.situation))} est arrivé, tu as ${esc(cleanAction(i.action))} ?`;
  return `${esc(i.statement)} — ça a suivi ?`;
}

async function activeIntentions(): Promise<Intention[]> {
  const domains = await listDomains();
  const all: Intention[] = [];
  for (const d of domains) all.push(...(await listIntentions(d.id)));
  return all;
}

export async function renderCheckin(el: HTMLElement): Promise<void> {
  if (replay) return renderReplay(el);
  return renderMenu(el);
}

async function renderMenu(el: HTMLElement) {
  const intentions = await activeIntentions();
  const proposed = await listProposedDecisions();
  const details = await Promise.all(proposed.map((p) => decisionDetail(p.id)));
  const domains = await listDomains();
  const domainOpts = domains.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
  const intentionOpts = intentions
    .map((i) => `<option value="${i.id}">${esc(i.statement)}</option>`)
    .join("");

  el.innerHTML = `
    <section class="surface">
      <h1>Le point</h1>
      <p class="lead">Un moment calme pour regarder ce que tu as vécu. Pas de jugement, juste toi.</p>
      <div id="cmsg" class="msg" hidden></div>

      <button class="primary" id="start" ${intentions.length ? "" : "disabled"}>Faire le point (${intentions.length})</button>
      ${intentions.length ? "" : `<p class="muted">Pose d'abord ce qui compte dans ta boussole.</p>`}

      ${
        details.length
          ? `<h2 style="margin-top:28px">À intégrer</h2>
             <p class="muted">Des décisions prêtes à devenir ton nouveau normal.</p>
             <div class="domains">${details.map((d) => integrationCard(d, domainOpts, intentionOpts)).join("")}</div>`
          : ""
      }
    </section>`;

  el.querySelector<HTMLButtonElement>("#start")?.addEventListener("click", () =>
    guard(el, async () => {
      const today = new Date().toISOString().slice(0, 10);
      const review = await reviewOpen(null, today);
      replay = { review, intentions, idx: 0, outcome: null, learning: "" };
      renderReplay(el);
    }),
  );

  el.querySelectorAll<HTMLButtonElement>("[data-integrate]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.integrate!;
      const card = btn.closest("article")!;
      const resolutions: DeltaResolution[] = [];
      card.querySelectorAll<HTMLSelectElement>("[data-delta]").forEach((sel) => {
        const kind = sel.dataset.kind!;
        resolutions.push(
          kind === "added"
            ? { delta_id: sel.dataset.delta!, domain_id: sel.value }
            : { delta_id: sel.dataset.delta!, target_intention_id: sel.value },
        );
      });
      guard(el, async () => {
        await applyDecision(id, resolutions);
        notify(el, "C'est intégré. Ta boussole a été mise à jour.", "info");
        await renderMenu(el);
      });
    }),
  );
}

function integrationCard(d: DecisionDetail, domainOpts: string, intentionOpts: string): string {
  const opLabel: Record<string, string> = { added: "tu ajoutes", modified: "tu changes", removed: "tu arrêtes" };
  return `
    <article class="domain">
      <header><h2>${esc(d.decision.title)}</h2></header>
      ${d.decision.proposal ? `<p class="muted">${esc(d.decision.proposal)}</p>` : ""}
      ${
        d.deltas.length
          ? d.deltas
              .map(
                (x) => `
        <div class="row" style="margin:8px 0">
          <span>${opLabel[x.op] ?? x.op} : <strong>${esc(x.payload_statement ?? "")}</strong> →</span>
          ${
            x.op === "added"
              ? `<select data-delta="${x.id}" data-kind="added">${domainOpts}</select>`
              : `<select data-delta="${x.id}" data-kind="${x.op}">${intentionOpts}</select>`
          }
        </div>`,
              )
              .join("")
          : `<p class="muted">Rien à changer dans la boussole.</p>`
      }
      <button class="primary" data-integrate="${d.decision.id}">Intégrer</button>
    </article>`;
}

function renderReplay(el: HTMLElement) {
  const st = replay!;
  if (st.idx >= st.intentions.length) return renderSummary(el);
  const i = st.intentions[st.idx];

  el.innerHTML = `
    <section class="surface decision">
      <div class="crumbs"><span class="here">Le point</span><span>${st.idx + 1} / ${st.intentions.length}</span></div>
      <h1>${esc(i.statement)}</h1>
      <div id="cmsg" class="msg" hidden></div>
      <p class="lead">${marker(i)}</p>
      <div class="options-pick">
        ${OUTCOMES.map(
          (o) => `<label class="pick"><input type="radio" name="outcome" value="${o}" ${st.outcome === o ? "checked" : ""} /> ${OUTCOME_LABELS[o]}</label>`,
        ).join("")}
      </div>
      <textarea id="learning" rows="3" placeholder="Un apprentissage, si tu veux…">${esc(st.learning)}</textarea>
      <div class="nav">
        <button id="next" class="primary">${st.idx === st.intentions.length - 1 ? "Terminer" : "Suivant"}</button>
        <button id="quit" class="ghost">Arrêter là</button>
      </div>
    </section>`;

  el.querySelectorAll<HTMLInputElement>('input[name="outcome"]').forEach((r) =>
    r.addEventListener("change", () => (st.outcome = r.value as Outcome)),
  );
  el.querySelector<HTMLTextAreaElement>("#learning")!.addEventListener("input", (e) => {
    st.learning = (e.target as HTMLTextAreaElement).value;
  });
  el.querySelector<HTMLButtonElement>("#next")!.addEventListener("click", () =>
    guard(el, async () => {
      if (await distressBlocks(el, st.learning)) return;
      await reviewAddItem(st.review.id, i.id, null, st.outcome, st.learning.trim() || null);
      st.idx++;
      st.outcome = null;
      st.learning = "";
      renderReplay(el);
    }),
  );
  el.querySelector<HTMLButtonElement>("#quit")!.addEventListener("click", () => {
    replay = null;
    renderMenu(el);
  });
}

function renderSummary(el: HTMLElement) {
  const count = replay!.intentions.length;
  replay = null;
  el.innerHTML = `
    <section class="surface">
      <h1>Merci d'avoir pris ce temps</h1>
      <p class="lead">Tu as regardé ${count} repère${count > 1 ? "s" : ""}, sans te juger. C'est déjà beaucoup.</p>
      <button class="primary" id="back">Revenir</button>
    </section>`;
  el.querySelector<HTMLButtonElement>("#back")!.addEventListener("click", () => renderMenu(el));
}
