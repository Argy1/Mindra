# Fonts

Mindra uses two webfonts, both loaded via Google Fonts at runtime:

| Role | Family | Source | License |
|---|---|---|---|
| Display | **Instrument Serif** | Google Fonts | SIL OFL 1.1 |
| Body / UI | **Plus Jakarta Sans** | Google Fonts (designed by **Tokotype**, Indonesia) | SIL OFL 1.1 |
| Mono | JetBrains Mono | Google Fonts | SIL OFL 1.1 |

## Why these fonts

- **Plus Jakarta Sans** is designed by Tokotype, an Indonesian type foundry. Using it is a small, meaningful local nod and pairs well with Bahasa Indonesia diacritics-free orthography.
- **Instrument Serif** is a modern transitional serif — warm, slightly literary, and feels like a thoughtful handwritten card rather than a clinical heading.

## Substitution flag for the user

These are agent-chosen defaults. If the brand team has commissioned a custom typeface or licensed something specific, replace by:

1. Adding `.woff2` files to this folder.
2. Removing the `@import` line at the top of `colors_and_type.css`.
3. Adding `@font-face` declarations pointing to the local files.

## Production hosting

In production, self-host with `font-display: swap` and only the weights actually used:

- Plus Jakarta Sans: 400, 500, 600, 700
- Instrument Serif: 400, 400 italic
