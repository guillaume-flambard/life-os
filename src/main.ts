import "./styles/app.css";
import { ROUTES, getMode } from "./app/routes";
import { isOnboarded } from "./lib/ipc";
import { renderOnboarding } from "./app/onboarding";
import type { UiMode } from "./lib/ipc";

const app = document.querySelector<HTMLDivElement>("#app")!;

let mode: UiMode = "human";

function currentRouteId(): string {
  const id = location.hash.replace(/^#\/?/, "");
  return ROUTES.some((r) => r.id === id) ? id : ROUTES[0].id;
}

function renderChrome() {
  app.innerHTML = `
    <nav class="sidebar">
      <div class="brand">Life OS</div>
      <ul>
        ${ROUTES.map(
          (r) => `<li><a href="#/${r.id}" data-id="${r.id}">
            <span class="label">${r.human}</span>
            ${mode === "expert" ? `<span class="sub">${r.expert}</span>` : ""}
          </a></li>`,
        ).join("")}
      </ul>
    </nav>
    <div class="content">
      <main id="view"></main>
      <footer class="disclaimer">Life OS n'est pas un thérapeute et ne pose aucun diagnostic. En cas de détresse, parle à quelqu'un — appelle le 3114.</footer>
    </div>`;
}

async function renderView() {
  const id = currentRouteId();
  app.querySelectorAll<HTMLAnchorElement>(".sidebar a").forEach((a) => {
    a.classList.toggle("active", a.dataset.id === id);
  });
  const view = app.querySelector<HTMLElement>("#view")!;
  const route = ROUTES.find((r) => r.id === id)!;
  await route.render(view, mode);
}

async function renderAll() {
  renderChrome();
  await renderView();
}

async function start() {
  mode = await getMode();
  await renderAll();
  window.addEventListener("hashchange", renderView);
  window.addEventListener("mode-changed", async (e) => {
    mode = (e as CustomEvent<UiMode>).detail;
    await renderAll();
  });
}

async function boot() {
  // First run: value-first welcome before the app, once per device.
  let onboarded = true;
  try {
    onboarded = await isOnboarded();
  } catch {
    onboarded = true; // never trap the user on the welcome if the check fails
  }
  if (!onboarded) {
    renderOnboarding(app, () => void start());
    return;
  }
  await start();
}

boot();
