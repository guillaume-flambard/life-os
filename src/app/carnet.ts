import { listDecisions, decisionDetail, type DecisionDetail } from "../lib/ipc";

// The decision log ("ton carnet"): past decisions and what they changed. Read-only.

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

const STATUS_LABEL: Record<string, string> = {
  draft: "en cours",
  exploring: "en cours",
  proposed: "acté",
  applied: "intégré",
  archived: "archivé",
};

export async function renderCarnet(el: HTMLElement): Promise<void> {
  const decisions = await listDecisions();
  el.innerHTML = `
    <section class="surface">
      <h1>Ton carnet</h1>
      <p class="lead">Tes décisions et ce qu'elles ont changé.</p>
      ${
        decisions.length === 0
          ? `<p class="muted">Rien encore. Ta première décision t'attend sur l'accueil.</p>`
          : `<div class="domains">${decisions
              .map(
                (d) => `<article class="domain" data-open="${d.id}">
                  <header><h2>${esc(d.title)}</h2><span class="muted">${STATUS_LABEL[d.status] ?? d.status}</span></header>
                  <div class="detail" id="detail-${d.id}"></div>
                </article>`,
              )
              .join("")}</div>`
      }
    </section>`;

  el.querySelectorAll<HTMLElement>("[data-open]").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.open!;
      const slot = card.querySelector<HTMLElement>(`#detail-${id}`)!;
      if (slot.dataset.loaded) {
        slot.innerHTML = "";
        delete slot.dataset.loaded;
        return;
      }
      slot.dataset.loaded = "1";
      decisionDetail(id).then((d) => (slot.innerHTML = detailHtml(d)));
    });
  });
}

function detailHtml(d: DecisionDetail): string {
  const chosen = d.options.find((o) => o.chosen);
  return `
    ${chosen ? `<p><strong>Choix :</strong> ${esc(chosen.label)}</p>` : ""}
    ${d.decision.proposal ? `<p><strong>Pourquoi :</strong> ${esc(d.decision.proposal)}</p>` : ""}
    ${d.decision.values_alignment_note ? `<p><strong>Face à ta boussole :</strong> ${esc(d.decision.values_alignment_note)}</p>` : ""}
    ${
      d.deltas.length
        ? `<p><strong>Ce que ça change :</strong></p><ul class="intentions">${d.deltas
            .map((x) => `<li>${esc(x.op)} — ${esc(x.payload_statement ?? "")}</li>`)
            .join("")}</ul>`
        : ""
    }
    ${
      d.stories.length
        ? `<p><strong>Prochain pas :</strong> ${esc(d.stories[0].title)}${d.stories[0].when_cue ? ` (${esc(d.stories[0].when_cue)})` : ""}</p>`
        : ""
    }
    ${d.decision.review_at ? `<p class="muted">Point prévu le ${esc(d.decision.review_at.slice(0, 10))}</p>` : ""}`;
}
