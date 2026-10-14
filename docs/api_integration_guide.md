# Mindra — API & Integration Guide

**Audience:** Kementerian Kesehatan RI technical team and integration partners.
**Version:** 1.0.0 · **Last updated:** 2026-05-16

This document describes Mindra's architecture, data model, clinical scoring,
and the SATUSEHAT integration surface. It is intended for engineers evaluating
or integrating with the application.

---

## 1. Overview

Mindra is a cross-platform mobile mental-health application (Flutter) backed by
a managed PostgreSQL service (Supabase). It provides clinically validated
screening, daily self-tracking, psychoeducation, teleconsultation, and opt-in
synchronisation of screening results to the SATUSEHAT national health record.

```
┌───────────────────┐     HTTPS / JWT      ┌────────────────────────┐
│  Mindra (Flutter) │ ───────────────────► │  Supabase              │
│  Android / iOS    │                      │  · PostgreSQL + RLS    │
│                   │ ◄─────────────────── │  · Auth (GoTrue)       │
└─────────┬─────────┘   Realtime / Storage │  · Storage             │
          │                                └───────────┬────────────┘
          │ opt-in, consent-gated                      │
          ▼                                            ▼
┌───────────────────┐                      ┌────────────────────────┐
│  SATUSEHAT FHIR   │                      │  satusehat_sync_log    │
│  (Observation)    │                      │  (audit trail)         │
└───────────────────┘                      └────────────────────────┘
```

### Technology stack

| Layer        | Technology                                            |
|--------------|--------------------------------------------------------|
| Client       | Flutter 3.22+, Dart ≥ 3.3, Material 3                  |
| State        | Riverpod 2.x                                           |
| Backend      | Supabase (PostgreSQL 15, GoTrue auth, Storage)         |
| Realtime     | Supabase Realtime (caregiver dashboard)                |
| Interop      | SATUSEHAT FHIR R4 (Observation resources)              |

---

## 2. Authentication

- Authentication is handled by Supabase Auth (GoTrue): email/password.
- The client holds a short-lived JWT access token plus a refresh token.
- Every authenticated request carries the JWT; PostgreSQL Row-Level Security
  (RLS) authorises it server-side using `auth.uid()`.
- A database trigger (`handle_new_user`) provisions a `profiles` row on signup.

There is **no custom API server**. The client talks to Postgres directly
through Supabase's PostgREST layer; authorisation is enforced entirely by RLS
policies (Section 4).

---

## 3. Data model

All tables live in the `public` schema. Primary keys are UUIDs.

| Table                     | Purpose                                            |
|---------------------------|----------------------------------------------------|
| `profiles`                | User profile (1:1 with `auth.users`)               |
| `assessments`             | Completed screening results                        |
| `mood_entries`            | Daily mood check-ins                               |
| `sleep_entries`           | Sleep logs                                         |
| `night_reflections`       | Guided journaling entries                          |
| `reflection_questions`    | Reflection prompt catalogue                        |
| `voice_journals`          | Voice-journal metadata (audio is encrypted)        |
| `cbt_exercises`           | Completed CBT exercise records                     |
| `psychologists`           | Psychologist directory                             |
| `psychologist_schedules`  | Availability windows                               |
| `consultations`           | Teleconsultation bookings & summaries              |
| `consultation_messages`   | In-consultation chat                               |
| `ai_conversations`        | AI companion transcripts                           |
| `emergency_contacts`      | User emergency contacts                            |
| `caregiver_relationships` | Caregiver ↔ patient links + permissions            |
| `notifications_log`       | Delivered-notification audit                       |
| `satusehat_sync_log`      | SATUSEHAT synchronisation audit trail              |

The authoritative schema is `supabase/migrations/`. Notable details:

- **`assessments`** — `type` ∈ {`phq9`,`gad7`,`pss`,`srq20`}; `answers` is a
  JSONB array of `{question_id, score}`; `category` ∈
  {`minimal`,`mild`,`moderate`,`severe`}; `sent_to_satusehat` boolean.
- **`caregiver_relationships.permissions`** — JSONB, e.g.
  `{"can_see_mood":true,"can_see_assessment":true,"can_see_activity":false}`.
- **`ai_conversations.messages`** — JSONB array of
  `{role:"user"|"assistant", content}`.

---

## 4. Authorisation (Row-Level Security)

RLS is enabled on **every** table. The governing principles:

1. **Ownership** — a user may read/write only rows where
   `user_id = auth.uid()`.
2. **Caregiver access** — a caregiver may *read* a patient's `mood_entries` /
   `assessments` only when an `active` `caregiver_relationships` row exists
   *and* the relevant `permissions` flag is `true`.
3. **Psychologist access** — a psychologist may read a patient's `profiles`
   and `assessments` only for consultations in
   {`confirmed`,`ongoing`,`completed`}.
4. **Reference data** — `psychologists`, `psychologist_schedules` and
   `reflection_questions` are readable by any authenticated user; writes are
   restricted to the service role.

Integration partners requiring bulk/aggregate access should use a dedicated
service-role key server-side — never ship it in a client.

---

## 5. Clinical assessment scoring

Scoring is implemented in `AssessmentClinical`
(`lib/features/assessment/presentation/providers/assessment_provider.dart`) and
mirrored by the database function `classify_assessment(type, score)`.

Thresholds follow the published clinical references and are **per-instrument** —
they are deliberately not uniform.

### PHQ-9 — depression (0–27) · Kroenke et al. (2001)

| Score  | Category (ID)   | Category (EN) |
|--------|-----------------|---------------|
| 0–4    | Minimal         | minimal       |
| 5–9    | Ringan          | mild          |
| 10–14  | Sedang          | moderate      |
| 15–19  | Sedang–Berat    | severe        |
| 20–27  | Berat           | severe        |

### GAD-7 — anxiety (0–21) · Spitzer et al. (2006)

| Score  | Category (ID) | Category (EN) |
|--------|---------------|---------------|
| 0–4    | Minimal       | minimal       |
| 5–9    | Ringan        | mild          |
| 10–14  | Sedang        | moderate      |
| 15–21  | Berat         | severe        |

### PSS-10 — perceived stress (0–40) · Cohen et al. (1983)

Items 4, 5, 7, 8 are positively worded and **reverse-scored**:
`adjusted = maxOptionValue − rawAnswer`.

| Score   | Category (ID)  | Category (EN) |
|---------|----------------|---------------|
| 0–13    | Stres Rendah   | minimal       |
| 14–26   | Stres Sedang   | moderate      |
| 27–40   | Stres Tinggi   | severe        |

### SRQ-20 — common mental disorders (0–20) · WHO (1994)

WHO caseness threshold for Indonesian populations is ≥ 6.

| Score  | Category (ID)                  | Category (EN) |
|--------|--------------------------------|---------------|
| 0–5    | Tidak ada gangguan             | minimal       |
| 6–10   | Kemungkinan gangguan ringan    | mild          |
| 11–15  | Kemungkinan gangguan sedang    | moderate      |
| 16–20  | Kemungkinan gangguan berat     | severe        |

### Crisis detection

A crisis flag is raised when **PHQ-9 item 9 > 0** or **SRQ-20 item 17 = 1**
(suicidal ideation). The client immediately surfaces crisis resources.

---

## 6. SATUSEHAT integration

SATUSEHAT synchronisation is **opt-in and consent-gated**. No clinical data
leaves the device without explicit, recorded user consent.

### Flow

1. After an assessment is saved, the user is shown a consent dialog.
2. On consent, the assessment result is mapped to a FHIR **Observation** and
   submitted to SATUSEHAT.
3. The local `assessments.sent_to_satusehat` flag is set, and a row is written
   to `satusehat_sync_log` (`resource_type`, `local_record_id`,
   `satusehat_id`, `sync_status` ∈ {`pending`,`synced`,`failed`}).
4. Consent can be revoked at any time in **Profil → SATUSEHAT**; revocation
   stops future syncs (records already submitted remain in the national
   record, per regulation).

### What is shared / not shared

| Shared with SATUSEHAT          | Never shared                          |
|--------------------------------|---------------------------------------|
| Instrument type & total score  | Per-question answers                  |
| Severity category              | AI companion conversations            |
| Completion timestamp           | Voice journals & night reflections    |
| Basic patient identity         | Mood notes / triggers                 |

### Configuration

SATUSEHAT credentials (client ID/secret, organisation ID) are supplied via
environment configuration. When credentials are absent the app runs in a
clearly labelled development/mock mode and performs no external calls.

---

## 7. Environment & configuration

Runtime configuration is loaded from a `.env` file (see `flutter_dotenv`):

| Key                     | Description                              |
|-------------------------|------------------------------------------|
| `SUPABASE_URL`          | Supabase project URL                     |
| `SUPABASE_ANON_KEY`     | Supabase anonymous (publishable) key     |
| `SATUSEHAT_CLIENT_ID`   | SATUSEHAT OAuth client ID (optional)     |
| `SATUSEHAT_CLIENT_SECRET` | SATUSEHAT OAuth client secret (optional) |

Native integrations not bundled in v1.0.0 — each requires its own key/config:

- **Google Maps** (facilities map) — Maps SDK key.
- **Agora** (video consultations) — Agora App ID.
- **Firebase Cloud Messaging** (push) — `google-services.json`.

---

## 8. Build & release

- Android: `minSdk 23`, `targetSdk 34`, version `1.0.0+1`.
- Release builds use R8 (shrinking + obfuscation); see
  `android/app/proguard-rules.pro`.
- Release signing is configured via `android/key.properties`
  (see `android/key.properties.example`).
- Build a release artifact: `flutter build appbundle --release`.

---

## 9. Testing

| Suite              | Location                              | Run                                   |
|--------------------|---------------------------------------|----------------------------------------|
| Unit & widget      | `test/`                               | `flutter test`                         |
| Integration        | `integration_test/`                   | `flutter test integration_test/`       |
| Demo walkthrough   | `test_driver/`                        | `flutter drive --target=test_driver/demo_walkthrough.dart` |

Clinical scoring is covered by exhaustive boundary-value tests in
`test/features/assessment/`.

---

## 10. Contact

For integration support, contact the Mindra engineering team via the
repository issue tracker or the address listed in the project README.
