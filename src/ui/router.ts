import { useEffect, useState } from "react";

// Minimal hash router. Tauri serves a single file; hashes avoid a router dep
// and survive reloads. Route = the hash without the leading "#/".
export type Route =
  | "home"
  | "compass"
  | "carnet"
  | "review"
  | "daily"
  | "settings"
  | "onboarding"
  | "distress";

export function currentRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const known: Route[] = [
    "home",
    "compass",
    "carnet",
    "review",
    "daily",
    "settings",
    "onboarding",
    "distress",
  ];
  return (known.includes(h as Route) ? h : "home") as Route;
}

export function navigate(route: Route) {
  window.location.hash = `#/${route}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute());
  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}
