# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-10-21

### Added

- Vite production build with hashed JS/CSS assets and relative base for GitHub Pages
- Text-layer PDF export via browser print (searchable/copyable), alongside the visual PDF
- ESLint with browser/Node globals; DOCX export→import round-trip coverage
- CI and Pages run `npm run verify` before publishing; Pages deploys only verified builds

### Changed

- Split `app.js` into store, migrations, editor, library, preview, photo, versions, import and download modules (~86 lines left)
- Moved demo fixtures under `src/demo/`; moved vendor scripts and favicon under `src/public/`
- Browser and Agent share `src/lib/schema.js`; Agent wrapper only adds policy
- Consolidated project sorting, titles, file names, style defaults, empty entries and legacy defaults
- Replaced the copy build with Vite; removed `scripts/build.mjs` and `dist/build.json`

### Fixed

- Restored the missing `normalizeProfile` export used by DOCX import (caught by ESLint)
- Escaped `<` in the preview CSS before SVG serialization, fixing visual exports after Vite minification
- Agent static server and src preview now resolve `/vendor/*.js` and `/favicon.svg` from `src/public/`

### Known limitations

- Image-based Word/PDF exports are not text-editable
- Editable Word layout is approximate
- localStorage only; no cloud sync

## [0.1.0] - 2026-10-20

### Added

- Local-first bilingual resume editor with A4 live preview
- Resume library ("我的简历") with role + salary + region names
- Preview-only card selection and a separate 修改 action
- Per-resume document title and title-based download file names
- Expected salary field shown in preview and exports
- Photo sync across all library entries and both languages
- Downloads: visual-accurate DOCX/PDF/PNG, editable DOCX, JSON
- Project entries sorted by latest date, undated last
- Local agent CLI/API prompt pack for Codex / Claude / DeepSeek
- GitHub-style docs, CI, issue/PR templates, privacy notes
