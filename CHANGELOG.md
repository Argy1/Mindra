# Changelog

All notable changes to **Mindra** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/), and the
project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased] — 2026-10-14

Alignment with Mindra Web (one account, one backend). Details: `web/docs/DECISIONS.md`, "Gelombang 1".

### Security
- **The AI companion no longer ships a model key.** The app used to bundle `CLAUDE_API_KEY` (extractable from any APK/IPA, finding F7)
  and call Anthropic directly. It now calls the Mindra Web endpoint `POST /api/v1/companion/chat` with the user's Supabase
  session token; crisis detection, the fixed crisis reply, persistence and the 20-messages-per-hour limit are enforced on
  the server. `ClaudeApiService` and `AppConstants.claudeApiKey` were removed; set `WEB_API_BASE_URL` instead
  (see `.env.example`). The old key must still be revoked at console.anthropic.com.

### Fixed
- **Booking a consultation now works against the real database.** The app read a `psychologist_slots` table that
  never existed, so no schedule ever loaded. It now uses the server functions `psychologist_available_slots` and
  `book_consultation` (shared with the web app): one schedule model, conflicts rejected by the database, duration and
  fee decided by the server. Needs migration `20261014000600`.
- The 119 ext. 8 hotline was labelled "Into The Light"; it is SEJIWA (Kementerian Kesehatan). Corrected in three places.
- Removed the dead `crisis_access_logs` write (the table does not exist and nothing called it).
- "Edit Profil" was a "coming soon" placeholder. It now edits name, city, province and the anonymous regional statistics
  opt-in.
- Account deletion only removed the profile row and left the login account. It is now a real "Hapus Akun" flow
  (password re-check, then the `delete_my_account` database function removes the account and all its data).

### Added
- Opt-in **anonymous regional statistics** (`profiles.share_region_stats`, off by default). Only users who opt in are
  counted in the facility dashboards, and only in groups of 10 or more.
- Registration requires confirming age 17+ and accepting the terms; the accepted version is stored in account metadata.
- Terms of Service and Privacy Policy 1.1.0 (web and mobile share one document set).

### Known
- The AI companion still calls the Anthropic API directly with a key bundled in the app (finding F7). Rotate that key;
  the safe path is the web endpoint `POST /api/v1/companion/chat`, to be wired once the web app is deployed.

## [1.0.0] — 2026-05-16

First public release. Mindra is a digital mental-health companion for
Indonesian users — built around clinically validated screening, daily
self-tracking, and a clear path to professional care.

### Added — Clinical assessments
- **PHQ-9** depression screening (9 items, score 0–27).
- **GAD-7** anxiety screening (7 items, score 0–21).
- **PSS-10** perceived-stress scale with reverse-scored items 4, 5, 7, 8.
- **SRQ-20** WHO common-mental-disorder screen (20 items).
- Clinically accurate, per-instrument severity bands and warm,
  plain-language Indonesian result explanations.
- Crisis detection on PHQ-9 item 9 and SRQ-20 item 17, with an immediate
  supportive banner and direct links to crisis resources.
- Personalised, severity-aware recommendations after every assessment.
- Assessment history and trend charts per instrument.

### Added — Daily tracking & reflection
- **Mood tracker** — 7-mood daily check-in with notes, energy level and
  triggers.
- **Sleep tracker** — bedtime/wake logging with quality and 7-day history.
- **Night reflection** — guided 3-question journaling before sleep.
- **Voice journal** — audio journaling with AES-256 encryption; recordings
  are encrypted on-device before upload.
- **CBT exercises** — thought record, behavioural activation, progressive
  muscle relaxation, and guided breathing.

### Added — Insight & support
- **Weekly Insight dashboard** — narrative summary, mood/sleep stats, 7-day
  mood chart, achievement badges, rule-based pattern detection (including a
  mood↔sleep correlation insight) and one personalised recommendation.
- **AI companion** — supportive, streaming conversational support with
  crisis-aware responses.
- **Caregiver mode** — invite trusted family/friends with granular,
  permissioned visibility into mood, assessments and activity.

### Added — Professional care
- **Telemedicine** — psychologist directory, booking and video consultation
  scaffolding, with consultation history and session summaries.
- **Crisis support** — 24-hour hotline directory, grounding (5-4-3-2-1),
  breathing exercises and emergency contacts.
- **Facilities map** — nearby mental-health facilities, with a crisis mode.

### Added — National health integration
- **SATUSEHAT** — opt-in, consent-gated synchronisation of assessment
  results to the Indonesian national health record as FHIR Observations.
- **PDF reports** — exportable summary of assessments, mood and sleep for
  sharing with a clinician.

### Added — Accessibility & personalisation
- Adjustable text size (Small / Normal / Large / Extra Large), applied
  app-wide.
- High-contrast mode.
- Language style toggle — *Bahasa Formal* (Anda) ↔ *Bahasa Santai* (kamu).
- Reduce-motion mode that disables non-essential animations.

### Added — Platform
- Local notifications: adaptive daily mood check-in, night reflection,
  weekly insight, assessment reminders, consultation reminders and a
  supportive low-mood pattern alert.
- Supabase backend with row-level security on every table.
- Android release build: R8 shrinking + obfuscation, ProGuard rules, and a
  release signing configuration.

### Security & privacy
- Voice recordings are AES-256 encrypted on-device with a per-user key held
  in the OS secure keystore.
- SATUSEHAT sharing is strictly opt-in and limited to assessment scores and
  categories — journal entries, AI conversations and voice notes are never
  shared.
- Row-level security ensures users can only ever read their own data;
  caregivers and psychologists see only what is explicitly permitted.

### Known limitations
- Video calls and Google Maps require native API keys not bundled in this
  release (see `docs/api_integration_guide.md`).
- Push notifications (FCM) require `google-services.json`; local
  notifications work without it.

[1.0.0]: https://example.com/mindra/releases/tag/v1.0.0
