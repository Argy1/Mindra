# Mindra — Design System

> **Mindra** — Aplikasi Kesehatan Mental Digital Indonesia
> Aplikasi mobile kesehatan mental untuk semua kalangan masyarakat Indonesia.

Mindra adalah teman digital untuk kesehatan mental — sebuah ruang aman untuk bernapas, merenung, dan tumbuh. Bukan klinik, bukan dokter — tapi sahabat yang menemani.

---

## Sumber Material

This design system was built from the brand brief alone. The provided GitHub repository was empty at the time of build:

- **GitHub:** [`Argy1/Mindra`](https://github.com/Argy1/Mindra) — repository exists but contained no commits/files when explored. Once code is added, return to this design system and re-derive tokens, components, and screens from the real source. The whole `colors_and_type.css`, the UI kit, and screens here are the agent's best interpretation of the brief and should be reconciled with whatever real code/Figma the team adopts.

**Brief recap:**
- Mental health app for *all* layers of Indonesian society (mass-market, not just urban professionals).
- Tone: **hangat, aman, modern, tidak terasa medis/klinis** (warm, safe, modern, not medical/clinical).
- Primary palette: calm blue + sage green.
- References: Calm and Headspace, but **more local and more colorful**.
- Platforms: Android + iOS (mobile-first).

---

## Index

| File | What's in it |
|---|---|
| `README.md` | This file. Brand context, content + visual foundations, iconography, manifest. |
| `colors_and_type.css` | All design tokens: colors, type, spacing, radii, shadows, motion. |
| `SKILL.md` | Cross-compatible skill manifest for using this system inside Claude / Claude Code. |
| `assets/` | Logo lockups, illustration placeholders, mood glyphs, app icons. |
| `fonts/` | Notes on web fonts used (loaded via Google Fonts at runtime). |
| `preview/` | The cards you see in the **Design System** tab. |
| `ui_kits/mindra-app/` | Mobile UI kit — `index.html` (clickable click-through), JSX components, screens. |

---

## Brand Voice & Product Positioning

Mindra is positioned **between a journal and a friend**. Not a medical app. Not a wellness influencer. The product:

- Speaks in **Bahasa Indonesia** by default, with a warm, peer-level register (`kamu`, not `Anda`).
- Frames mental health as ordinary, daily, and approachable — not as illness.
- Acknowledges difficulty without dramatizing it.
- Celebrates small wins (a breath, a journal entry, a check-in) without gamifying suffering.
- Localizes everything: language, references (warung kopi, Jumat sore, ramadan), color, illustration.

---

## CONTENT FUNDAMENTALS

### Language
- **Bahasa Indonesia first.** English copy is for developer-facing surfaces (token names, code comments). User-facing copy is always Indonesian unless the user has switched languages.
- **Address the user as `kamu`** — peer, not authority. Never `Anda` (too formal, feels institutional) and never `lo/gue` (regional, excludes).
- **Refer to the app/voice as "kita"** when speaking collaboratively ("Mari kita mulai dengan satu tarikan napas"), or simply omit the subject in commands ("Ambil napas dalam-dalam").

### Tone & register
- **Warm, soft, grounded.** Like a thoughtful friend, not a coach and not a therapist.
- **Concrete over abstract.** Say "tarik napas selama empat hitungan", not "lakukan teknik pernapasan".
- **Short sentences.** Indonesian benefits from breath-length phrasing. Aim for one idea per line on mobile.
- **No exclamation marks** on regular copy. Reserve `!` for genuine celebration (streaks, milestones) — used once, never twice in a row.
- **No medical jargon.** Avoid "gangguan", "diagnosa", "terapi", "klinis", "patologis". Use plain words: "perasaan berat", "hari yang sulit", "tidak baik-baik saja".
- **Never minimize.** Avoid "Tenang aja", "Pasti bisa kok", "Jangan sedih". Instead acknowledge: "Hari ini terasa berat. Itu valid."
- **Permission, not pressure.** "Kalau kamu mau" / "Boleh dicoba" / "Kapan pun kamu siap" — never "Harus" or "Sekarang juga".

### Casing
- **Sentence case everywhere.** Buttons, labels, titles, nav. Title Case feels corporate.
- App name **Mindra** is always capitalized as a single word, never `MINDRA` or `mindra`.
- Acronyms (e.g. CBT — but avoid mentioning it directly) are written out: "latihan pernapasan", not "CBT exercise".

### Emoji
- **Sparingly, never decoratively.** Allowed in: user-generated journal entries, mood-picker UI (where a glyph IS the content), occasional celebration moments. Forbidden in: nav, headings, buttons, marketing.
- When used in mood pickers, prefer the **custom mood glyphs** in `assets/mood/` over Unicode emoji — they are on-brand.

### Numbers, dates, times
- Indonesian conventions: `21 Mei 2026`, `19.30 WIB`, `Rp 49.000`.
- Day names spelled out, lowercase except at sentence start: "minggu ini", "Jumat sore".
- Streaks use `hari` (`12 hari berturut-turut`), not `days`.

### Example copy (the vibe)

| Surface | Bad ❌ | Good ✅ |
|---|---|---|
| Onboarding hero | "Welcome to Mindra! Take control of your mental health today." | "Halo. Senang kamu di sini. Yuk mulai dengan satu tarikan napas." |
| Streak nudge | "You've broken your streak! Get back on track." | "Kemarin terlewat. Tidak apa-apa. Hari ini kita coba lagi." |
| Crisis card | "Are you having a crisis? Call our helpline." | "Kalau kamu butuh teman bicara sekarang, kami bantu sambungkan." |
| Empty state | "No entries yet." | "Belum ada catatan. Mulai dari satu kalimat, kapan saja." |
| Breath complete | "Great job! Session complete." | "Sudah. Bagaimana rasanya sekarang?" |

---

## VISUAL FOUNDATIONS

### Color philosophy
- **Warm cream canvas, never clinical white.** The default app background is `--neutral-50` (`#F8F7F5`), a soft warm-undertone neutral. White (`#FFFFFF`) appears only on raised cards.
- **Biru tenang (calm blue)** is the primary action color — `#2E6DA4`, a confident but unsaturated dawn blue.
- **Hijau sage (sage green)** is the grounding secondary — `#4A9E8F`. Natural, never hospital-green.
- **Kuning matahari (sun yellow)** is the accent — `#E07B00`. Used for highlights, badges, important nudges. Sparingly.
- **Semantic colors** (success/warning/danger/info) follow a 7-step ramp each. Danger (`#C0392B`) is the only color reserved for errors and crisis moments — it must never be decorative.
- **Mood palette** (7 levels, sangat baik → sangat buruk) is dedicated to mood tracking and illustration. Each level has its own hue (`#FFD700` → `#708090`).
- Black is never `#000`. Deepest ink is `--neutral-900` (`#1A1A2E`).

### Typography
- **Display: Instrument Serif** — warm, modern, slightly literary. Three sizes: **Display XL (40 / 400)**, **Display L (32 / 400)**, **Display M (28 / 500)** — line-height 1.2. Used for hero headings, breath cues, journal prompts.
- **Heading: Plus Jakarta Sans** — H1 24/Bold, H2 20/SemiBold, H3 18/SemiBold, H4 16/Medium · line-height 1.3.
- **Body: Plus Jakarta Sans** — designed by **Tokotype**, an Indonesian foundry. Body L 16, Body M 14, Body S 12 — all Regular at line-height 1.6 for breath.
- **UI: Plus Jakarta Sans** — Button L 16/SemiBold, Button M 14/SemiBold, Label 12/Medium (+0.5px tracking), Overline 11/Bold (+1px tracking, CAPS).
- **Mono: JetBrains Mono** — only for developer-facing surfaces.
- **Pairing rule:** display serif for hero/heading moments, sans for all working UI. Never use the serif for buttons, labels, or form fields.
- See `preview/type-spec-table.html` for the canonical reference and class tokens (`.t-display-xl`, `.t-h1`, `.t-body-l`, etc.).

### Backgrounds
- **Solid warm cream** is the default. No texture, no noise — but the cream itself reads as paper.
- **Subtle radial washes** of `--biru-100` or `--sage-100` are used behind hero sections of meditation/breath screens (~10–15% opacity max).
- **No full-bleed photography by default.** If photography is needed (e.g. blog/marketing), prefer warm, natural-light, soft-focus imagery with humans of varied Indonesian ages and skin tones. No stock-looking corporate scenes. No moody dark gradients.
- **Illustrations** (when present) are flat, soft-edged, in palette. Hand-drawn pebbles, leaves, breath orbs. No 3D, no glassmorphism, no gradients-on-gradients.
- **Full-bleed gradients are forbidden** as the primary aesthetic. We are NOT another purple-gradient wellness app.

### Borders & cards
- **Cards: white surface, generous radius (`--radius-lg` = 20px), soft warm-tinted shadow.** No visible border by default. A 1px `--border-soft` (`#E8EBEE`) appears only on flat lists/forms where shadow would be too heavy.
- **No left-border accent stripes.** Use a leading icon or a small color dot instead.
- **Pill chips and capsule buttons** are everywhere — Mindra leans soft and rounded. Sharp corners are reserved for status bars / system chrome.

### Corner radii
- Buttons: `--radius-pill` (full pill) by default.
- Cards: `--radius-lg` (20px) standard, `--radius-xl` (28px) for hero cards.
- Modals/sheets: `--radius-2xl` (36px) on top corners only.
- Input fields: `--radius-md` (14px).
- Tiny tags: `--radius-sm` (10px).

### Shadows
- Warm-tinted (mixed with deep ink, not pure black) so they sit on cream without looking dirty.
- Tiered: `xs → sm → md → lg → xl`. Most cards use `--shadow-sm`. Floating sheets and the breath orb use `--shadow-lg`.
- **No inner shadows on standard UI.** Inner shadows are reserved for the meditation breath visualization.

### Motion & easing
- **Defaults are slow and soft.** Base duration is **280ms**, easing is `cubic-bezier(0.22, 0.61, 0.36, 1)` (`--ease-out-soft`).
- **Breath animations** use a 4-second cycle with `--ease-breath` (sinusoidal in-out). The orb scales 0.85 → 1.0 on inhale, holds, then exhales.
- **Fade > slide > scale.** Fades feel most calm. Slides only when navigation direction is meaningful. Scale only on press and breath.
- **Press feedback:** 96% scale + ~5% darker color, 120ms in / 240ms out. Always feel "soft press", never click-click.
- **No bounce, no spring overshoot.** Mindra never feels jumpy.
- **Reduced motion:** all decorative animation must respect `prefers-reduced-motion`. Breath visualizations switch to a simple text-pace cue.

### Hover, press, focus
- **Hover:** background tints to `color-mix(currentColor 6%, transparent)`. Never use bright color shifts on hover. Hover is mostly irrelevant on mobile but used on web/marketing.
- **Press:** scale 0.96, color darkens ~5–8%. Returns slowly.
- **Focus:** 6px soft glow ring (`--glow-biru`), no harsh outline. Always visible for keyboard nav.
- **Disabled:** 40% opacity, no shadow, no press response.

### Transparency & blur
- **Used very intentionally.** Top app bar uses a `backdrop-filter: blur(20px) saturate(120%)` over cream when content scrolls behind it.
- Modals dim background with `rgba(30, 42, 51, 0.4)` + 6px blur.
- Never stack multiple translucent surfaces.

### Layout rules
- **Mobile-first.** Default design width 390px (iPhone 14). Min tap target 44×44px.
- **Bottom-anchored primary actions** on mobile screens (thumb reach).
- **Side margins** are 20px (`--space-5`) on mobile, 24px on tablet.
- **Vertical rhythm:** 24px between unrelated blocks, 16px between related, 8px within a card.
- **Max content width** on web/large surfaces: 720px for reading, 1120px for dashboards.
- **Safe areas:** respect iOS notch + bottom home indicator, Android nav gesture bar.

### Imagery vibe (when used)
- **Warm-leaning, natural light, slightly desaturated.** Never cool corporate, never neon, never harsh shadow.
- **Indonesian everyday life:** warung, masjid, gunung, kebun, ruang tamu, halaman belakang. Not "global generic wellness".
- **People of diverse Indonesian ethnicities and ages.** Mental health is for everyone.
- **No grain filter, no b&w treatment, no faux-vintage.**

---

## ICONOGRAPHY

Since no codebase / icon set was provided, Mindra uses **Phosphor Icons** (`duotone` and `regular` weights) as its primary icon system. Phosphor is chosen because:
- Soft, friendly stroke, no sharp endpoints — matches Mindra's warmth.
- Duotone weight lets us tint icons with `--biru-500` (primary) and `--sage-200` (secondary fill) without rebuilding the set.
- MIT-licensed, CDN-available, exhaustive coverage.

> ⚠️ **Flag for the user:** Phosphor is a substitution. If the team has an existing icon set (custom or otherwise), swap it in by replacing the `<i class="ph ph-*">` usages in the UI kit. Document the real set here.

### Loading
```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/duotone/style.css" />
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />
```

### Usage rules
- **Size:** 20px (inline w/ text), 24px (nav, buttons), 32px (feature tiles), 48–64px (hero illustration moments).
- **Stroke weight:** match across a single surface. Don't mix `regular` and `bold` in the same nav.
- **Color:** inherit text color by default. Use `--biru-500` for primary actions, `--fg-3` for neutral nav.
- **Duotone tint:** `--biru-500` foreground over `--biru-100` background fill.
- **Never use icons as decoration.** Every icon is functional — it represents the action or content next to it.

### Custom assets (in `assets/`)
- `logo-mindra.svg` — primary wordmark + symbol lockup.
- `logo-mindra-mark.svg` — symbol only (used at small sizes, app icon).
- `mood/*.svg` — seven custom mood glyphs, hand-drawn pebble style. These are *not* emoji — they are brand iconography.
- `illustration-orb.svg` — breath orb hero illustration.
- `illustration-pebbles.svg` — gentle decorative pebbles.

### Emoji & Unicode
- **Emoji:** allowed only inside user-generated content (journal entries). The system itself never emits emoji.
- **Unicode glyphs** (· • → ←) are used in microcopy and breadcrumbs.

---

## Next steps for the team

The Mindra GitHub repo was empty at design-system creation. To make this system production-grade, the team should:

1. Add actual product code/Figma to `Argy1/Mindra` and re-run this generator so tokens reflect the real source of truth.
2. Confirm font licensing — `Plus Jakarta Sans` and `Instrument Serif` are SIL OFL, free for commercial use, but should be self-hosted in production.
3. Provide the real logo and brand mark — current `assets/logo-mindra.svg` is a generated placeholder.
4. Decide on the icon system — replace Phosphor if a custom set exists.
5. Review tone-of-voice examples with a native Indonesian copywriter, especially mental-health-sensitive phrasing.

Anyone reading this can also explore the source repo at https://github.com/Argy1/Mindra for additional context as it fills in.
