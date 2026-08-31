// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Icons are embedded at build time by generate_context!; keep this binary fresh.
    life_os_lib::run();
}
