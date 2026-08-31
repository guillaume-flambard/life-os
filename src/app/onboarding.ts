import { setOnboarded } from "../lib/ipc";

// First-run welcome. No wizard, no personality quiz, no account — one line of
// framing, a privacy line, and a single action that starts a real decision.

export function renderOnboarding(app: HTMLElement, onDone: () => void): void {
  app.innerHTML = `
    <div class="onboarding">
      <section class="welcome">
        <div class="brand-lg">Life OS</div>
        <h1>Salut.</h1>
        <p class="lead">Un compagnon pour tes décisions. Pas un test de personnalité, pas de questionnaire, pas de compte.</p>
        <p class="muted">On commence par une vraie décision que tu as là, maintenant. Tout reste sur ton appareil.</p>
        <button class="primary" id="begin">Commencer par une décision</button>
      </section>
    </div>`;
  app.querySelector<HTMLButtonElement>("#begin")!.addEventListener("click", async () => {
    try {
      await setOnboarded();
    } catch {
      /* even if persisting fails, don't trap the user on the welcome */
    }
    onDone();
  });
}
