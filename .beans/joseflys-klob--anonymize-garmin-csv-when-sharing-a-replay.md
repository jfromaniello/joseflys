---
# joseflys-klob
title: Anonymize Garmin CSV when sharing a replay
status: completed
type: task
priority: normal
tags:
    - replay
    - privacy
created_at: 2026-06-10T13:52:33Z
updated_at: 2026-06-10T16:30:06Z
---

When a user shares a flight in /replay (app/replay/shareReplay.ts → ShareModal), the raw Garmin CSV track is uploaded as-is. It can contain personally identifying data that should be stripped or masked before upload:

- Aircraft registration / tail number (CSV header metadata)
- Pilot/owner identifiers in header fields
- Any other free-text metadata Garmin includes in the header

Scope:
- Anonymize at share time (client side, before upload in shareReplay.ts), so the stored blob never contains the identifying fields.
- Keep all track data needed for playback/analysis (timestamps, lat/lon, altitude, speeds, attitude) intact.
- Consider an option in ShareModal to show what will be removed.

Reference: commit 227c82c anonymized the test fixture the same way (registration, coords) — reuse the same notion of which fields are sensitive.

Acceptance:
- Shared replays contain no registration/owner metadata in the stored CSV.
- Playback of a shared replay is unchanged.
- Tests covering the anonymization function.



---

Implemented (2026-06-10) with revised scope:
- Anonymization is OPT-IN at share time (checkbox in ShareModal, default off). Blanks aircraft_ident and system_id via app/replay/anonymizeGarminCsv.ts.
- Upload now happens from the modal after the user's choice, so an identified blob is never stored unless chosen. GPX / placeholder-ident (SAMPLE) logs skip the option and auto-create the link.
- Registration + recording date/time shown in the side panel when the log carries a real ident (local load and shared links).
- Re-sharing reuses the cached short URL client-side and the server skips the blob upload when the content-hash blob already exists.
- Local dev fallback: shared replays stored in .dev-replay-blobs/ (gitignored) when BLOB_READ_WRITE_TOKEN is absent, so sharing works without Vercel credentials.
- Tests in __tests__/anonymizeGarminCsv.test.ts.
