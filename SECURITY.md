# Security & privacy

Resume Studio is a local-first static app. It does not upload resume data.

- Data lives in browser `localStorage`.
- The app has no accounts, analytics, or network calls.
- Photos and contact details are local only.
- The local Agent CLI/API only read and write files under `private/`.
- Do not commit `private/`; it is gitignored.
- Do not expose the local Agent API (`127.0.0.1:4178`) to a network. It has no authentication.
- Clearing site data deletes local resumes; export JSON for backups.

See [docs/PRIVACY.md](docs/PRIVACY.md) and [docs/AGENT_API.md](docs/AGENT_API.md).
