//! Dev-only entry point: local HTTP bridge over the real engine. Run with
//! `cargo run --bin devserve` while the vite dev server (`pnpm dev`) is up,
//! then open http://localhost:1420 in a plain browser — the full app works
//! against a real encrypted DB (`LIFEOS_DEV_DB`, default `devserve.db`) and
//! the local model. Never shipped; gated to debug builds like the dev key.

fn main() {
    life_os_lib::devserve::run();
}
