# Life OS

Local-first, spec-driven life coach. Your life has a living spec (values written
as testable markers); every decision is a change proposal with a delta; the
check-in reviews what you actually lived against it. **Human mode by default**
(no jargon), **expert mode** optional. Data never leaves the device.

> MVP scope: Phase 1, Epics 1–3 (foundations, compass, decision-as-change-proposal).

## Stack

Tauri v2 · TypeScript + Vite (front) · Rust backend owning an encrypted SQLite
(SQLCipher) source of truth with FTS5 + sqlite-vec · local AI via Ollama ·
License **AGPL-3.0-or-later**.

## Prerequisites

- Node.js 20+ and npm
- Rust (stable) + Cargo
- [Ollama](https://ollama.com) running locally
- macOS Apple Silicon (primary target)

## Local AI models

The docs are inconsistent on model names ("Qwen3.5" does not exist). Targets:

```bash
ollama pull qwen3:8b            # conversation (or gemma3:12b on 24-32 GB RAM)
ollama pull embeddinggemma      # embeddings (768-dim, matches memory_vec)
```

Override the model with `LIFEOS_MODEL` and the endpoint with `LIFEOS_OLLAMA_URL`.

## Develop

```bash
npm install
cargo install tauri-cli --version "^2"   # first time only
npm run tauri dev
```

The encrypted DB is created on first run under the app data dir; its key is
stored in the OS keychain.

> Dev tip: unsigned dev binaries get a fresh code signature on each rebuild, so
> the keychain denies the previous key and the app would refuse to open the
> existing DB. For local dev, set a fixed key to keep the same DB across
> rebuilds (any 64 hex chars):
>
> ```bash
> export LIFEOS_DEV_KEY=$(python3 -c "import secrets;print(secrets.token_hex(32))")
> ```
>
> Production builds have a stable signature and use the keychain unchanged.

## Layout

- `openspec/` — the artifact backbone (specs + change proposals). Start with
  `openspec/project.md`.
- `src-tauri/` — Rust backend (DB, encryption, migrations, AI client, commands).
- `src/` — TypeScript front (five surface shells, typed IPC).
- `docs/` — source of truth (PRD, blueprint, psychology, resources).

## Safety

Not a therapist, no diagnosis. Distress signals route out of coaching to local
resources without exfiltrating data. High-stakes decisions (health/money/legal)
are structured, then handed to a human professional.
