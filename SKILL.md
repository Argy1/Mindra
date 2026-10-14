# SKILL: Mindra Design System

> A skill manifest the agent reads when designing with the Mindra brand.
> Drop this folder into a project (or reference it cross-project) to apply Mindra consistently.

## What this is

This skill is the **canonical source of design context** for Mindra — a mobile mental-health app for Indonesian audiences. When designing anything for Mindra (a marketing page, a new mobile screen, a deck, an ad, a research artifact), read this skill first.

## Files to read, in order

1. `docs/design-system.md` — brand voice, content rules, visual foundations, iconography. **Read in full.**
2. `colors_and_type.css` — all design tokens. Always `@import` or `<link>` this file. Never invent new tokens; if a token is missing, extend the file with a comment.
3. `preview/*.html` — the visual reference for what tokens look like in context. Open whichever group is relevant.
4. `ui_kits/mindra-app/` — working mobile screens. Use as reference for layout, density, and interaction patterns.

## Hard rules (do not violate)

- **Background:** `--krem-50` (`#FBF8F2`), never pure white as the canvas. White appears only on raised cards.
- **Black:** never `#000`. Deepest ink is `--tinta-900`.
- **Address:** `kamu`, never `Anda`, never `lo/gue`.
- **No exclamation marks** on regular copy. Reserve for genuine celebration, used once.
- **No emoji** in system-generated copy (nav, headings, buttons, marketing). User-generated content is exempt.
- **No medical jargon:** no "gangguan", "diagnosa", "terapi", "klinis".
- **No minimizing comfort:** never "tenang aja", "pasti bisa", "jangan sedih". Acknowledge first.
- **No purple-gradient wellness-app aesthetic.** No full-bleed gradients as primary backgrounds. No glassmorphism stacks. No 3D blobs.
- **Sentence case** for all UI labels, buttons, headings.
- **Typography pairing:** Instrument Serif (display) + Plus Jakarta Sans (body). Never use the serif for buttons.

## Soft rules (default behavior, override only with reason)

- Use **pill-shaped buttons** by default (`--radius-pill`).
- Use **20px (`--radius-lg`) cards** with `--shadow-sm`. Hero cards may use 28px.
- Bottom-anchor primary CTAs on mobile.
- Body line-height is generous (1.5–1.65). Mindra breathes.
- Motion defaults: 280ms, ease-out-soft, no overshoot.
- Animations respect `prefers-reduced-motion` — breath visualizations switch to a text-pace cue.
- Use **custom mood glyphs** (`assets/mood/*.svg`) instead of emoji for mood-related UI.
- Iconography: Phosphor (regular + duotone) until a custom set ships.

## Adding new tokens

If you need a color/spacing/radius value that isn't in `colors_and_type.css`:
1. Check the existing palette first — most needs are covered.
2. If genuinely missing, add a token to `colors_and_type.css` with a comment explaining what it's for.
3. Add a card to `preview/` so the new token is visible in the design system tab.

## Building a new screen / page

1. Link `colors_and_type.css` at the top.
2. Link `ui_kits/mindra-app/screens.css` if you want the app-style atoms (cards, mood picker, breath orb).
3. Compose with existing atoms (`<button class="m-btn primary">`, `.m-card`, `.mood-cell`, etc.) before writing new ones.
4. Open one of the screens in `ui_kits/mindra-app/screens.jsx` as a layout reference.

## Copy review checklist

Before shipping any user-facing string:

- [ ] Bahasa Indonesia, `kamu` register.
- [ ] Sentence case.
- [ ] No medical terms.
- [ ] No exclamation marks (unless this is a genuine celebration moment).
- [ ] No minimizing phrases.
- [ ] Specific over abstract ("tarik napas selama 4 hitungan", not "lakukan teknik pernapasan").
- [ ] Short — one idea per line on mobile.

## Caveats

- **The source GitHub repo (`Argy1/Mindra`) was empty** when this system was generated. Every token, asset, and screen is an agent interpretation of the brand brief. Reconcile with real product code/Figma when it lands.
- **Phosphor Icons is a substitution** for an unknown real icon set. Swap when the production set is available.
- **Logo is a generated placeholder.** Replace `assets/logo-mindra.svg` and `assets/logo-mindra-mark.svg` with the real lockup.
- **Copy tone was not reviewed by a native Indonesian copywriter.** Treat all sample copy as illustrative — review with the team before shipping.
