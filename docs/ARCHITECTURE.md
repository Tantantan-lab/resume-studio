# Architecture

## Overview

Resume Studio is a static, local-first application. There is no runtime backend. The same `src/` bundle can be served from any static host or opened through `npm run dev`.

```
Browser
  ├─ index.html
  ├─ styles.css
  ├─ vendor/{docx,jszip,pdf-lib}.js
  └─ app.js
       ├─ data.js      demo state + library seeds
       ├─ demo-photo.js  fictional portrait + legacy photo helper
       ├─ demo-content.js  role factory + exact-identity demo replacement
       ├─ terms.js     terminology
       └─ io.js        import/export (DOCX, JSON, visual DOCX/PDF)
```

`localStorage` is the database. JSON import/export is the portability layer. The local Agent CLI/API operates on files in `private/` and produces an importable JSON.

## State and storage

- `resume-studio.v1` — active resume state
- `resume-studio.v1.library` — array of resume entries
- `resume-studio.v1.active` — active library entry id
- `resume-studio.v1.versions` — up to 8 manual snapshots
- `resume-studio.v1.<migration>-<date>` — one-time migration flags

A library entry is `{ id, state, region, note, createdAt, updatedAt }`. The display name is derived from the active state's `meta.title` (seeded as 岗位 + 薪资 + 地区) and the entry note.

On load:

1. Load cached active state (or demo/default state).
2. Apply one-time migrations (target/salary, project date order, titles, photo sync). The dated demo-avatar migration only fills missing photos for the matching demo name/email pair; user photos and other identities are preserved.
3. Load the library; seed 5 fictional role variants + a current-version copy on first run.
4. The dated fictional-demo-content migration replaces only the legacy dual-language demo name/email pair, including demo-only snapshots. It preserves personal/mixed identities, uploaded photos, layout, storage keys and library ids.
5. Render the editor and preview.

On edit:

1. `setAt()` updates the active state; target/salary edits auto-update `meta.title` if it was auto-generated.
2. Debounced `save()` writes the active state and updates the active library entry.
3. `renderPreview()` renders the paper and sets `document.title` / the top title input.

## Preview and exports

`viewState()` returns the selected library entry while browsing the library, otherwise the active state. `renderPreview()` is the single renderer.

| Export             | Method                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| PNG                | Clone `.resume`, inline stylesheets, SVG `foreignObject` → canvas → PNG |
| PDF                | Slice the rendered canvas into A4 pages → `pdf-lib` PDF                 |
| Word（与预览一致） | Same A4 page PNGs embedded in a zero-margin DOCX                        |
| Word（可编辑）     | `docx.js` text document (approximate layout)                            |
| JSON               | normalized full state                                                   |

The image-based exports guarantee visual parity but are not text-editable. The editable Word is intentionally approximate and labeled as such.

## Library interaction

- Clicking a card only sets `previewResumeId` and re-renders the preview; the editor pane stays on 我的简历.
- Clicking 修改 calls `openLibraryResume()`: persist the current entry, switch the active state, enter `basics`, and show the language switch/title editing again.
- Downloads use `viewState()` and `state.meta.title` for file names.

## Agent bridge

`scripts/agent.mjs` handles files only; it never touches browser storage. Browser and Agent normalization share `src/io.js`'s `normalizeState`; `scripts/lib/resume-schema.mjs` only adds Agent policy (project ordering, region-aware title, risk-word warnings).

- `export` copies a master JSON into `private/agent/current.json`
- `prompt` builds a fact-constrained prompt from chat history + current resume
- `apply` validates a candidate state, backs up the master, writes `private/resume.json` and `private/agent/resume-import.json`

`scripts/agent-server.mjs` exposes `GET/POST /api/resume` for local agents. The app remains import-based for now.

## Known limitations

- One `app.js` monolith (~42 KB); see Roadmap for splitting.
- Browser print is still available for Ctrl/Cmd+P, but PDF downloads no longer use it.
- Image-based Word/PDF pages are sliced at A4 height; very long resumes may split mid-block.
- `localStorage` is ~5 MB and photos are copied into each library entry.
- No account/cloud sync; JSON is the backup format.
