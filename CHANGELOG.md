# Changelog

## 2026-10-20 Fictional demo content

- Rebuilt every demo resume section in Chinese and English around a new fictional persona, Zhiyao Chen.
- Replaced all five role demos, the previous demo copy and matching demo snapshots through an exact dual-language identity migration.
- Added visible fictional labels, placeholder contacts and a shared demo-role factory.
- Removed personal resume evidence from the public terminology library and rewrote example chat material.
- Verified identity protection, migration idempotence, content replacement, bilingual one-page previews and all five exports.

## 2026-10-20 Demo portrait

- Added an AI-generated fictional portrait to default demo profiles and variants.
- Added safe migration for matching demo identities with no existing photo.
- Added regression checks for photo defaults, safe migration and rendered visibility.
- Verified all five actual export downloads, selected resume titles, bilingual JSON photos, editable Word photo media, and A4 PDF/PNG structure.
- Corrected a duplicated word in demo skills.

## 2026-10-20 Project maintenance

- Added pinned Prettier formatting commands and CI checks; excluded vendor, private data and build output.
- Expanded syntax checks to first-party application, script and test files.
- Added explicit local server ports and clearer startup errors.
- Fixed malformed URL handling in the optional Agent API and added regression coverage.
- Added a dated comparison and prioritized roadmap against popular open-source resume projects.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Changed

- Demo fixtures moved to `src/demo/` (data, roles, avatar)
- Browser and Agent now share `src/io.js#normalizeState`; the Agent wrapper only adds policy
- CI now runs the browser smoke test
- Extracted `src/lib/schema.js`, `visual-export.js`, `download.js` and `resume-utils.js` from `app.js`/`io.js`
- Split `app.js` into store, migrations, editor, library, preview, photo, versions, import and download modules (~86 lines left)
- Consolidated shared naming, sorting, filename, style, empty-entry and download helpers

### Known limitations

- Image-based Word/PDF exports are not text-editable
- Editable Word layout is approximate
- `src/app.js` is still a single module
- localStorage only; no cloud sync
