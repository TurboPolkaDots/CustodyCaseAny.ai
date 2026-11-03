# CustodyCase.ai

**Free, open-source, local-first software for organizing a custody case.**

CustodyCase.ai helps a self-represented parent turn a pile of court orders, emails,
and parenting-app exports into something usable: a searchable timeline, a catalog of
order violations, grouped patterns, and an exportable hearing outline — all on your own
machine. No account, no cloud, no subscription. Your documents never leave your computer.

> ⚖️ **Not legal advice.** This is an organizational tool. You are solely responsible for
> verifying every fact, date, and conclusion before relying on it in any legal proceeding.
> Always consult a licensed attorney.

---

## Why

Legal help is expensive and most custody litigants end up representing themselves. The work
of *organizing* a case — building a timeline, finding where an order was violated, pulling
quotes back to their source document — is tedious but mechanical. This app does that
mechanical part locally, for free.

It was originally a paid product. It's now MIT-licensed and free for anyone who needs it.

## Features

- **Document ingestion** — import PDFs, Word docs, and plain text; OCR for scanned exhibits.
- **Interactive timeline** — events extracted from your documents, sorted and filterable.
- **Violations dashboard** — flag where conduct conflicts with a standing order, with the
  source passage attached.
- **Pattern groups** — cluster related incidents so a recurring problem reads as a pattern,
  not a list.
- **Hearing outline editor** — assemble an argument outline and export it to `.docx`.
- **Semantic search** — find the right passage across every document by meaning, not keywords.
- **Local encryption** — case data lives in an encrypted SQLite database behind a passphrase,
  with auto-lock on idle.

## Privacy & AI

Everything runs on your machine. The app ships with no telemetry and makes no network calls
unless *you* configure a cloud AI provider.

- **Default: [Ollama](https://ollama.com)** — runs the AI 100% locally, fully offline.
- **Optional cloud models** — you may supply your own OpenAI, Anthropic, xAI, OpenRouter or any OpenAI compatible API key and base URL in
  Settings. Keys are stored in your OS keychain; only then does the app contact that provider.


## Install

**Download a prebuilt release** from the [Releases](https://github.com/randylahey-dev/CustodyCase.ai/releases)
page — signed macOS `.dmg` (Apple Silicon + Intel) and Windows installer.

### Build from source

```bash
git clone https://github.com/randylahey-dev/CustodyCase.ai.git
cd CustodyCase.ai
npm install
npm run dev          # run in development
npm run dist:mac     # or dist:win / dist:linux to package
```

Requires Node.js 20+. For local AI, install [Ollama](https://ollama.com) and pull a model —
the app handles model downloads from there.

## Tech stack

Electron · React 19 · Zustand · Tailwind · better-sqlite3 (encrypted) · tesseract.js (OCR) ·
pdf-lib / mammoth / pdf-parse · docx · electron-vite

## License

[MIT](./LICENSE) — use it, fork it, ship it. Contributions welcome.
