import "./styles/app.css";
import { ROUTES, getMode } from "./app/routes";
import type { UiMode } from "./lib/ipc";

const app = document.querySelector<HTMLDivElement>("#app")!;

let mode: UiMode = "human";

function currentRouteId(): string {
  const id = location.hash.replace(/^#\/?/, "");
  return ROUTES.some((r) => r.id === id) ? id : ROUTES[0].id;
}

function renderChrome() {
  app.innerHTML = `
    <nav class="nav">
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
    <main id="view"></main>`;
}

async function renderView() {
  const id = currentRouteId();
  app.querySelectorAll<HTMLAnchorElement>(".nav a").forEach((a) => {
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

async function boot() {
  mode = await getMode();
  await renderAll();
  window.addEventListener("hashchange", renderView);
  window.addEventListener("mode-changed", async (e) => {
    mode = (e as CustomEvent<UiMode>).detail;
    await renderAll();
  });
}

boot();
