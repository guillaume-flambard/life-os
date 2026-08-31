import {
  openDecision,
  decisionSetReality,
  decisionSetDistance,
  decisionSetAlignment,
  decisionSetWhy,
  decisionSetConfidence,
  decisionSetReviewAt,
  decisionAddOption,
  decisionSetPremortem,
  decisionChooseOption,
  decisionAddDelta,
  decisionAddStory,
  decisionDetail,
  decisionFinalize,
  decisionSuggestOptions,
  decisionAlignValues,
  decisionGenerateStory,
  listDomains,
  listIntentions,
  memoryRecall,
  contradictionCheck,
  isApiError,
  type DecisionDetail,
  type MemoryHit,
} from "../lib/ipc";

// The guided decision flow (GROW-shaped), one focus at a time. The engine records
// a change proposal; the user sees a warm, step-by-step conversation. No jargon.

const STEPS = [
  "Où tu en es",
  "Tes options",
  "Et si ça ratait",
  "Prends du recul",
  "Ce que ça touche",
  "Pourquoi, au fond",
  "Ton prochain petit pas",
  "Tu tranches",
] as const;

interface Session {
  detail: DecisionDetail;
  step: number;
}

let session: Session | null = null;

// Recalled history + an optional gentle question, fetched when a session opens.
let ctx: { recall: MemoryHit[]; question: string | null } = { recall: [], question: null };

async function loadContext(el: HTMLElement, title: string) {
  ctx = { recall: [], question: null };
  try {
    ctx.recall = await memoryRecall(title, 4);
  } catch {
    /* keyword-only or no memory yet — silent */
  }
  try {
    ctx.question = await contradictionCheck(title);
  } catch {
    /* no model / no tension — silent */
  }
  if (session && session.step === 0) renderStep(el);
}

function contextPanel(): string {
  if (!ctx.recall.length && !ctx.question) return "";
  return `
    <div class="recall">
      ${ctx.question ? `<div class="question"><strong>Une question me vient :</strong> ${esc(ctx.question)}</div>` : ""}
      ${
        ctx.recall.length
          ? `<div class="muted">Ça me rappelle :</div>
             <ul class="intentions">${ctx.recall.map((h) => `<li>${esc(h.content)}</li>`).join("")}</ul>`
          : ""
      }
    </div>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

async function refresh(el: HTMLElement) {
  if (session) session.detail = await decisionDetail(session.detail.decision.id);
  render(el);
}

function notify(el: HTMLElement, message: string, kind: "info" | "warn" = "info") {
  const bar = el.querySelector<HTMLDivElement>("#dmsg");
  if (!bar) return;
  bar.textContent = message;
  bar.className = `msg ${kind}`;
  bar.hidden = false;
}

async function guard(el: HTMLElement, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    if (isApiError(e)) notify(el, e.message, e.code === "incomplete" || e.code === "cap_reached" ? "warn" : "info");
    else notify(el, "Un souci est survenu.", "info");
  }
}

export async function renderDecision(el: HTMLElement): Promise<void> {
  render(el);
}

function render(el: HTMLElement) {
  if (!session) {
    el.innerHTML = `
      <section class="surface">
        <h1>Bonjour</h1>
        <p class="lead">Une décision te trotte en tête ? On la regarde ensemble, tranquillement.</p>
        <form id="open" class="add-domain">
          <input name="title" placeholder="Quelle décision te trotte ?" autocomplete="off" />
          <button type="submit">On y va</button>
        </form>
        <div id="dmsg" class="msg" hidden></div>
      </section>`;
    el.querySelector<HTMLFormElement>("#open")!.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = el.querySelector<HTMLInputElement>('#open input[name="title"]')!.value.trim();
      if (!value) return;
      guard(el, async () => {
        const d = await openDecision(value);
        session = { detail: await decisionDetail(d.id), step: 0 };
        render(el);
        void loadContext(el, value); // recall + gentle question, non-blocking
      });
    });
    return;
  }

  const { detail, step } = session;
  el.innerHTML = `
    <section class="surface decision">
      <div class="crumbs">${STEPS.map((s, i) => `<span class="${i === step ? "here" : i < step ? "done" : ""}">${s}</span>`).join("")}</div>
      <h1>${esc(detail.decision.title)}</h1>
      <div id="dmsg" class="msg" hidden></div>
      <div id="stepbody"></div>
      <div class="nav">
        <button id="back" ${step === 0 ? "disabled" : ""}>Précédent</button>
        ${step < STEPS.length - 1 ? `<button id="next" class="primary">Continuer</button>` : `<button id="finalize" class="primary">Trancher</button>`}
        <button id="quit" class="ghost">Laisser pour l'instant</button>
      </div>
    </section>`;

  renderStep(el);

  el.querySelector<HTMLButtonElement>("#back")?.addEventListener("click", () => {
    if (session && session.step > 0) session.step--;
    render(el);
  });
  el.querySelector<HTMLButtonElement>("#next")?.addEventListener("click", () =>
    guard(el, async () => {
      await persistStep(el);
      if (session) session.step++;
      await refresh(el);
    }),
  );
  el.querySelector<HTMLButtonElement>("#finalize")?.addEventListener("click", () =>
    guard(el, async () => {
      await persistStep(el);
      await decisionFinalize(session!.detail.decision.id);
      renderDone(el);
    }),
  );
  el.querySelector<HTMLButtonElement>("#quit")?.addEventListener("click", () => {
    session = null;
    render(el);
  });
}

function body(el: HTMLElement): HTMLElement {
  return el.querySelector<HTMLElement>("#stepbody")!;
}

function renderStep(el: HTMLElement) {
  const { detail, step } = session!;
  const b = body(el);
  const d = detail.decision;

  switch (step) {
    case 0:
      b.innerHTML = `
        <p class="lead">Dis-moi où tu en es avec ça — la situation, ce que tu ressens.</p>
        <textarea id="reality" rows="4" placeholder="Là, je…">${esc(d.emotional_context ?? "")}</textarea>
        ${contextPanel()}`;
      break;

    case 1:
      b.innerHTML = `
        <p class="lead">Quelles routes possibles ? Vise au moins trois, dont « et si aucune ? ».</p>
        <ul class="intentions">
          ${detail.options.map((o) => `<li>${esc(o.label)}${o.is_null_option ? ' <span class="muted">(et si aucune ?)</span>' : ""}</li>`).join("") || '<li class="muted">Aucune option pour l\'instant.</li>'}
        </ul>
        <form id="addopt" class="add-intention">
          <input name="label" placeholder="Une option…" autocomplete="off" />
          <label class="toggle"><input type="checkbox" name="isnull" /> C'est l'option « et si aucune ? »</label>
          <div class="row">
            <button type="button" id="suggest">Aide-moi à en trouver</button>
            <button type="submit" class="primary">Ajouter</button>
          </div>
        </form>`;
      b.querySelector<HTMLFormElement>("#addopt")!.addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target as HTMLFormElement;
        const label = (f.elements.namedItem("label") as HTMLInputElement).value.trim();
        const isnull = (f.elements.namedItem("isnull") as HTMLInputElement).checked;
        if (!label) return;
        guard(el, async () => {
          await decisionAddOption(detail.decision.id, label, isnull);
          await refresh(el);
        });
      });
      b.querySelector<HTMLButtonElement>("#suggest")!.addEventListener("click", (e) => {
        const btn = e.target as HTMLButtonElement;
        btn.disabled = true;
        btn.textContent = "…";
        guard(el, async () => {
          const ctx = `Décision : ${detail.decision.title}\nContexte : ${detail.decision.emotional_context ?? ""}`;
          const s = await decisionSuggestOptions(ctx);
          for (const label of s.options) await decisionAddOption(detail.decision.id, label, /aucune|rien|ne rien/i.test(label));
          await refresh(el);
        });
      });
      break;

    case 2: {
      b.innerHTML = `
        <p class="lead">Vers laquelle penches-tu ? Puis : dans un an, ça a raté — pourquoi ?</p>
        <div class="options-pick">
          ${detail.options
            .map(
              (o) => `<label class="pick"><input type="radio" name="chosen" value="${o.id}" ${o.chosen ? "checked" : ""} /> ${esc(o.label)}</label>`,
            )
            .join("")}
        </div>
        <textarea id="premortem" rows="4" placeholder="Dans un an, ça a raté parce que…">${esc(detail.options.find((o) => o.chosen)?.premortem ?? "")}</textarea>`;
      b.querySelectorAll<HTMLInputElement>('input[name="chosen"]').forEach((r) =>
        r.addEventListener("change", () =>
          guard(el, async () => {
            await decisionChooseOption(detail.decision.id, r.value);
            await refresh(el);
          }),
        ),
      );
      break;
    }

    case 3:
      b.innerHTML = `
        <p class="lead">Prends du recul : comment tu vivras ce choix dans 10 minutes, 10 mois, 10 ans ?</p>
        <textarea id="distance" rows="4" placeholder="Dans 10 min… / dans 10 mois… / dans 10 ans…">${esc(d.distance_10_10_10 ?? "")}</textarea>`;
      break;

    case 4: {
      const chosen = detail.options.find((o) => o.chosen);
      b.innerHTML = `
        <p class="lead">Regardons comment ça se pose face à ta boussole — ce que ça sert, ce que ça tire.</p>
        <button type="button" id="align" ${chosen ? "" : "disabled"}>Éclaire-moi</button>
        <textarea id="alignment" rows="4" placeholder="Ça colle avec… / ça tire contre…">${esc(d.values_alignment_note ?? "")}</textarea>`;
      b.querySelector<HTMLButtonElement>("#align")?.addEventListener("click", (e) => {
        const btn = e.target as HTMLButtonElement;
        btn.disabled = true;
        btn.textContent = "…";
        guard(el, async () => {
          const domains = await listDomains();
          const lines: string[] = [];
          for (const dom of domains) {
            for (const i of await listIntentions(dom.id)) {
              lines.push(`- ${i.situation && i.action ? `quand ${i.situation}, je ${i.action}` : i.statement} (${i.priority})`);
            }
          }
          const note = await decisionAlignValues(chosen!.label, lines.join("\n") || "(rien encore)");
          (b.querySelector<HTMLTextAreaElement>("#alignment")!).value = note.note;
        });
      });
      break;
    }

    case 5:
      b.innerHTML = `
        <p class="lead">Au fond, pourquoi ce choix ? Et à quel point tu le sens.</p>
        <textarea id="why" rows="4" placeholder="Je choisis ça parce que…">${esc(d.proposal ?? "")}</textarea>
        <label class="row">Confiance <input type="range" id="confidence" min="0" max="100" value="${d.confidence ?? 60}" /></label>
        <label class="row">On refait le point le <input type="date" id="review" value="${(d.review_at ?? "").slice(0, 10)}" /></label>`;
      break;

    case 6:
      b.innerHTML = `
        <p class="lead">Ce que ça change dans ta boussole (facultatif) : tu ajoutes, tu changes, ou tu arrêtes quelque chose ?</p>
        <ul class="intentions">
          ${detail.deltas.map((x) => `<li>${esc(x.op)} — ${esc(x.payload_statement ?? "")}</li>`).join("") || '<li class="muted">Rien pour l\'instant.</li>'}
        </ul>
        <form id="adddelta" class="add-intention">
          <div class="row">
            <select name="op">
              <option value="added">j'ajoute</option>
              <option value="modified">je change</option>
              <option value="removed">j'arrête</option>
            </select>
            <input name="statement" placeholder="…quoi ?" autocomplete="off" />
            <button type="submit">Noter</button>
          </div>
        </form>`;
      b.querySelector<HTMLFormElement>("#adddelta")!.addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target as HTMLFormElement;
        const op = (f.elements.namedItem("op") as HTMLSelectElement).value as "added" | "modified" | "removed";
        const statement = (f.elements.namedItem("statement") as HTMLInputElement).value.trim();
        if (!statement) return;
        guard(el, async () => {
          await decisionAddDelta(detail.decision.id, { op, payload_statement: statement });
          await refresh(el);
        });
      });
      break;

    case 7:
      b.innerHTML = `
        <p class="lead">Un seul prochain pas, tout petit et concret. C'est ce qui fait avancer.</p>
        <ul class="intentions">
          ${detail.stories.map((s) => `<li>${esc(s.title)}${s.when_cue ? ` <span class="muted">— ${esc(s.when_cue)}</span>` : ""}</li>`).join("") || '<li class="muted">Pas encore de petit pas.</li>'}
        </ul>
        <form id="addstory" class="add-intention">
          <input name="title" placeholder="Le petit pas…" autocomplete="off" />
          <div class="marker-fields">
            <input name="when_cue" placeholder="quand ? (un déclencheur)" />
            <input name="done_when" placeholder="fait quand…" />
          </div>
          <div class="row">
            <button type="button" id="genstory">Propose-m'en un</button>
            <button type="submit" class="primary">Garder</button>
          </div>
        </form>`;
      b.querySelector<HTMLFormElement>("#addstory")!.addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target as HTMLFormElement;
        const title = (f.elements.namedItem("title") as HTMLInputElement).value.trim();
        const whenCue = (f.elements.namedItem("when_cue") as HTMLInputElement).value.trim() || null;
        const doneWhen = (f.elements.namedItem("done_when") as HTMLInputElement).value.trim() || null;
        if (!title) return;
        guard(el, async () => {
          await decisionAddStory(detail.decision.id, title, null, whenCue, doneWhen);
          await refresh(el);
        });
      });
      b.querySelector<HTMLButtonElement>("#genstory")!.addEventListener("click", (e) => {
        const btn = e.target as HTMLButtonElement;
        btn.disabled = true;
        btn.textContent = "…";
        guard(el, async () => {
          const ctx = `Décision : ${detail.decision.title}. Choix : ${detail.options.find((o) => o.chosen)?.label ?? ""}. Pourquoi : ${detail.decision.proposal ?? ""}`;
          const s = await decisionGenerateStory(ctx);
          (b.querySelector<HTMLInputElement>('input[name="title"]')!).value = s.title;
          if (s.when_cue) (b.querySelector<HTMLInputElement>('input[name="when_cue"]')!).value = s.when_cue;
          if (s.done_when) (b.querySelector<HTMLInputElement>('input[name="done_when"]')!).value = s.done_when;
          btn.disabled = false;
          btn.textContent = "Propose-m'en un";
        });
      });
      break;

    case 8:
      b.innerHTML = `<p class="lead">Prêt à acter ? Je vérifie qu'on n'a rien oublié d'important.</p>`;
      break;
  }
}

// Persist the free-text fields of the current step before advancing.
async function persistStep(el: HTMLElement) {
  if (!session) return;
  const id = session.detail.decision.id;
  const b = body(el);
  const val = (sel: string) => b.querySelector<HTMLTextAreaElement | HTMLInputElement>(sel)?.value.trim() ?? "";

  switch (session.step) {
    case 0:
      if (val("#reality")) await decisionSetReality(id, val("#reality"));
      break;
    case 2: {
      const chosen = session.detail.options.find((o) => o.chosen);
      if (chosen && val("#premortem")) await decisionSetPremortem(chosen.id, val("#premortem"));
      break;
    }
    case 3:
      if (val("#distance")) await decisionSetDistance(id, val("#distance"));
      break;
    case 4:
      if (val("#alignment")) await decisionSetAlignment(id, val("#alignment"));
      break;
    case 5:
      if (val("#why")) await decisionSetWhy(id, val("#why"));
      if (val("#confidence")) await decisionSetConfidence(id, Number(val("#confidence")));
      if (val("#review")) await decisionSetReviewAt(id, val("#review"));
      break;
  }
}

function renderDone(el: HTMLElement) {
  const d = session!.detail;
  const chosen = d.options.find((o) => o.chosen);
  session = null;
  el.innerHTML = `
    <section class="surface">
      <h1>C'est acté</h1>
      <p class="lead">${esc(d.decision.title)}</p>
      ${chosen ? `<p><strong>Ton choix :</strong> ${esc(chosen.label)}</p>` : ""}
      ${d.decision.proposal ? `<p><strong>Pourquoi :</strong> ${esc(d.decision.proposal)}</p>` : ""}
      ${d.stories[0] ? `<p><strong>Ton prochain pas :</strong> ${esc(d.stories[0].title)}</p>` : ""}
      <p class="muted">Tu le retrouveras dans ton carnet. On en reparlera au prochain point.</p>
      <button class="primary" id="again">Une autre décision</button>
    </section>`;
  el.querySelector<HTMLButtonElement>("#again")!.addEventListener("click", () => render(el));
}
