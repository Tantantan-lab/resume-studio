# Resume Studio · 简历工坊

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Local-first](https://img.shields.io/badge/privacy-local--first-2ea44f)
![Static](https://img.shields.io/badge/runtime-static%20%2F%20no%20backend-ff5b4e)
![Status](https://img.shields.io/badge/status-MVP-orange)
[![CI](https://github.com/Tantantan-lab/resume-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/Tantantan-lab/resume-studio/actions/workflows/ci.yml)
[![Pages](https://github.com/Tantantan-lab/resume-studio/actions/workflows/pages.yml/badge.svg)](https://tantantan-lab.github.io/resume-studio/)

[中文](README.md) | **English**

A **local-first bilingual resume editor** with an A4 live preview, a resume library, photo sync, and exports that match the preview.

**Live demo:** https://tantantan-lab.github.io/resume-studio/

> MVP: static frontend, no account, no uploads, no backend. AI editing is provided by a **local MCP server / Agent workflow** (Codex / Claude / DeepSeek read the chat, fill a role template, and validate the JSON locally).

<p align="center">
  <img src="docs/screenshots/library.png" alt="Resume library" width="49%">
  <img src="docs/screenshots/editor.png" alt="Editor and downloads" width="49%">
</p>

## Features

- **Bilingual showcase** — Chinese interface with the fictional Chen Zhiyao profile by default; the English interface pairs with the fictional Emily Carter profile and generated portrait. Interface and resume languages switch independently.
- **Paper design** — Classic, Essential, Sidebar and Editorial layouts with accent colors and optional photo display.
- **Fill one page** — Expands vertical spacing without changing font sizes; long resumes keep their normal pagination.

- **Resume library** — multiple versions named by role + salary + region; click a card to preview, click 修改 to edit
- **Chinese / English profiles** — separate content, one toggle
- **A4 live preview** — fonts, sizes, line height and margins
- **Expected salary** — shown in the preview, Word, PDF and PNG
- **Photo sync** — upload once, sync to every resume and both languages
- **Downloads**
  - `Word（与预览一致）` — image-based DOCX, visually identical
  - `Word（可编辑）` — editable DOCX, approximate layout
  - `PDF（图片版）` — direct, identical to the preview
  - `PDF（文字版）` — print-to-PDF, selectable/searchable text
  - `PNG` — identical to the preview
  - `JSON` — full bilingual state and layout
- **Project date sorting** — newest first, undated last
- **MCP server** — AI discovers tools and role templates automatically

## Quick start

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev
# http://127.0.0.1:4173
```

Build and preview:

```bash
npm run build      # Vite -> dist (hashed assets)
npm run preview    # serve dist on 4173
```

Checks:

```bash
npm run format:check
npm run check
npm run lint
npm run test:unit      # server, schema, demo and MCP tests
npm run verify         # format + check + lint + unit + Vite build + browser smoke
npm test               # build + Playwright smoke (needs local Chrome)
```

The browser test downloads every export and verifies filenames, photos, multi-page image PDF, font, escaping, and the first-seed upgrade path. Set `CHROME_PATH` if Chrome is not auto-detected.

## MCP Server

The repo includes a local stdio MCP server and a project-level `.mcp.json` for Claude Code.

```bash
npm run mcp
```

Tools:

| Tool                          | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| `list_templates`              | List role templates                                    |
| `get_template`                | Template + valid schema v1 skeleton + writing guidance |
| `create_resume`               | Create a resume JSON from a template and a full state  |
| `update_resume`               | Replace the current master resume with a backup        |
| `list_resumes` / `get_resume` | Read local resume files                                |
| `get_instructions`            | Fact-only rules and workflow                           |

Templates: marketing/product, cross-border e-commerce, content operations, product operations, overseas marketing (English).

Typical flow: AI calls `list_templates` → `get_template` → fills it with real facts from the chat → `create_resume` → returns an importable JSON → the user imports it in the app. All states are validated by the shared schema. The MCP server never invents experience and never writes browser localStorage directly.

Setup and details: [docs/MCP.md](docs/MCP.md) (Chinese). Agent API: [docs/AGENT_API.md](docs/AGENT_API.md).

## Privacy

- Resume data lives in browser `localStorage`; no account, telemetry or upload
- The local MCP server / Agent API only read and write `private/` on this machine
- `private/`, `dist/`, `node_modules/` are gitignored
- `src/demo/` contains a fictional demo persona; screenshots are demo-only
- **GitHub Pages caveat:** project sites under `<user>.github.io` share one origin, so `localStorage` is shared with other Pages projects of the same account. Use the public demo with fictional data only; keep real resumes local or on a dedicated domain.

## Deploy

```bash
npm run build
# deploy dist/ to GitHub Pages, Netlify, Vercel or any static host
```

A GitHub Pages workflow is included and runs `npm run verify` before publishing. Vite uses `base: './'` and hashed JS/CSS for subpath hosting.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Prompt / modification guide](docs/PROMPTS.md)
- [MCP server](docs/MCP.md)
- [Agent API](docs/AGENT_API.md)
- [Customize](docs/CUSTOMIZE.md)
- [Deploy](docs/DEPLOY.md)
- [Privacy](docs/PRIVACY.md)

Most docs are written in Chinese; code and schema names are English.

## License

[MIT](LICENSE). Third-party notices: [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).

See [Paper design](docs/PAPER_DESIGN.md) for template settings, automatic spacing and language behavior.
