# IssueTrack Design System — "Chokepoint" House Style

> Derived from `reference/chokepoint-watch.jpg` (maritime Chokepoint Watch dashboard).
> This is the default house style for all IssueTrack / TOE exam apps. Generic rules only —
> no maritime copy — so any future app can adopt it verbatim.

---

## 1. Palette

Core idea: **warm paper, technical ink, one loud coral.** Everything else is neutral.
The accent is rationed: it only marks *action, state, and attention*.

### Surfaces

| Token | Hex | Role | Sampled from |
|---|---|---|---|
| `--it-paper` | `#FAFAF7` | Page background. Warm off-white "paper". | panel body `#FAFAFA`, warmed slightly |
| `--it-panel` | `#FFFFFF` | Raised cards, panels, form surfaces. | white card stock |
| `--it-sunk` | `#F1F0EC` | Inset areas: table stripes, disabled fields, code wells. | `#F0F0EC` banding |
| `--it-accent-soft` | `#FBE7DD` | Highlight bars, row hover, selected-row wash (coral at ~12%). | `#F8E8DF` alert-row tint |

### Ink (text & lines)

| Token | Hex | Role | Sampled from |
|---|---|---|---|
| `--it-ink` | `#1B1B19` | Primary text, headings, table values. Near-black, never pure `#000`. | darkest text pixels |
| `--it-ink-soft` | `#3D3D3A` | Secondary text, body copy in tables. | antialiased body text |
| `--it-muted` | `#8C8B85` | Labels, meta, timestamps, placeholders, icon strokes. | gray label rows |
| `--it-hairline` | `#DCDBD5` | All 1px borders, dividers, table rules. | panel hairlines |
| `--it-hairline-strong` | `#B9B8B2` | Emphasized rules, input borders at rest, focus-adjacent lines. | darker separators |

### Accent

| Token | Hex | Role | Sampled from |
|---|---|---|---|
| `--it-accent` | `#F0561E` | Coral/vermilion. Primary buttons, checkboxes, active nav, links-on-hover, critical marks, highlight bars. | `rgb(248,88,32)` cluster |
| `--it-accent-deep` | `#D13F0F` | Accent hover/pressed state. | darkened 10% |
| `--it-accent-ink` | `#FFFFFF` | Text on solid coral fills (buttons, CRIT chips). | white glyphs on coral |

### State colors (status chips, priority, validation)

| Token | Hex | Role |
|---|---|---|
| `--it-state-crit` | `#F0561E` | CRITICAL / OPEN / BLOCKER — same coral as accent (one loud color rule). |
| `--it-state-warn` | `#B26A1B` | WARNING / IN-PROGRESS — burnt amber, low chroma. |
| `--it-state-ok` | `#4A7A4E` | DONE / RESOLVED — muted moss green, used sparingly. |
| `--it-state-info` | `#6E6D67` | INFO / TODO / neutral — warm gray. |
| `--it-state-crit-bg` | `#F0561E` | Solid chip fill for CRIT (with `--it-accent-ink` text). |
| `--it-state-warn-bg` | `#F6E7D2` | Tinted chip background for WARN. |
| `--it-state-ok-bg` | `#E4EEE2` | Tinted chip background for OK. |
| `--it-state-info-bg` | `#ECEBE6` | Tinted chip background for INFO. |

### Texture (optional, subtle)

- **Scanline**: `repeating-linear-gradient(0deg, transparent 0 2px, rgba(27,27,25,0.02) 2px 3px)` on large panels only.
- **Dither**: never a bitmap; a 2–3% ink overlay at most. Texture must be invisible until looked for.

---

## 2. Typography

**Monospace-first, everywhere.** One family, weight + case + letter-spacing do the work.

```
font-family: "IBM Plex Mono", "JetBrains Mono", ui-monospace,
             "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace;
```

| Level | Size | Weight | Case / spacing | Use |
|---|---|---|---|---|
| Display | 28–32px | 600 | normal | Page titles, big stat numbers (e.g. `14`, `+2`) |
| Section header | 13px | 600 | `uppercase`, `letter-spacing: 0.12em` | `[ STRAIT ]`-style bracketed labels |
| Body / value | 13px | 400–500 | normal | Table values, descriptions |
| Label / meta | 11px | 400 | `uppercase`, `letter-spacing: 0.08em`, `--it-muted` | Field labels, timestamps, units |
| Micro | 10px | 500 | `uppercase`, `letter-spacing: 0.1em` | Chip text, footnote |

Rules:
- Line-height: 1.45 for body, 1.2 for headers/stats.
- Numbers in data contexts get `font-variant-numeric: tabular-nums`.
- Section labels are wrapped in literal brackets: `[ ISSUES ]`, `[ PEOPLE ]`, `[ NEW ]` — the brackets are part of the style, typed as characters, not pseudo-elements required.
- Never mix a proportional font into the chrome; if prose needs relief, allow Georgia/serif only inside long-form description blocks.

---

## 3. Spacing, Rounding, Borders

- **Spacing scale (4px base):** 4 / 8 / 12 / 16 / 24 / 32 / 48. Panels pad 16–20px; cards pad 16px; table rows pad 8px vertical.
- **Rounding:** minimal. `2px` for chips/inputs/buttons, `3px` for cards. Nothing pill-round except chips, which are *near*-pill (`2px` rect OR full-round for status chips — pick rect; the reference uses small rounded rects).
- **Borders:** 1px `--it-hairline` on everything structural. Double-rule effect for section separators: 1px hairline + 8px gap + content. No shadows except one flat option: `0 1px 0 rgba(27,27,25,0.04)`.
- **Grid feel:** dense, aligned columns; label:value pairs in two columns with the label right-locked in muted small-caps and the value in ink.

---

## 4. Component Recipes

### Card (`.it-card`)
`--it-panel` background, 1px `--it-hairline`, radius 3px, padding 16px. Optional top-right `+`/tools glyph in `--it-muted`. Header row: 11px uppercase label + hairline underneath. Hover: border to `--it-hairline-strong`, background wash `--it-accent-soft` on the left 3px accent bar if selected.

### List row (`.it-row`)
Full-width, 8–10px vertical padding, bottom 1px `--it-hairline`. Left: 3px status bar in the state color (the reference's orange highlight bar). Middle: label:value pairs. Right: chip + timestamp in muted 10px. Hover: `--it-sunk`.

### Form input (`.it-input`)
`--it-panel` (or `--it-sunk`), 1px `--it-hairline-strong`, radius 2px, 13px ink text, 11px uppercase muted label above. Focus: 1px `--it-accent` border (no glow rings). Error: coral border + 10px coral uppercase message below.

### Button (`.it-btn`)
- **Primary**: solid `--it-accent`, white 11px uppercase letter-spaced label, radius 2px, padding 8px 14px. Hover → `--it-accent-deep`.
- **Ghost/secondary**: transparent, 1px `--it-hairline-strong`, ink label. Hover → ink border.
- Buttons carry a tiny leading glyph (`+`, `→`, `↻`) in the same color as the label.

### Checkbox (`.it-check`)
14px square, 1.5px `--it-hairline-strong`, radius 2px, empty when off. Checked: solid `--it-accent` fill with white ✓ (the reference's coral checkboxes). Label: 11px uppercase, letter-spacing 0.08em, ink.

### Status chip (`.it-chip`)
10px uppercase 500-weight, letter-spacing 0.1em, padding 2px 8px, radius 2px, 1px border. Variants: `crit` = solid coral/white text; `warn`/`ok`/`info` = tinted background + matching darker text + 1px border of the text color at 40% alpha.

### Section header (`.it-section-label`)
`[ LABEL ]` in 11px/600/uppercase/0.12em, ink; followed by a full-width 1px hairline. A small coral corner mark (▸ or ) may sit at the far right of the header row.

### Nav (`.it-nav`)
Vertical list, 12px uppercase entries, `--it-muted` at rest, `--it-ink` when active with a coral 3px left bar or coral ▸ marker. Group titles (`LAYERS`-equivalent) in 10px muted. Top bar: app title left in ink, clock/meta right in muted, primary action button far right in solid coral.

---

## 5. Accessibility Notes

- **Coral `#F0561E` on paper `#FAFAF7` ≈ 3.5:1** — acceptable only for large/bold text (≥18.6px bold or 24px) and UI borders. Do NOT use coral for small body text on paper; use `--it-ink` and reserve coral for fills, bars, and bold labels.
- **White on coral ≈ 3.5:1** — OK for chips (bold, letter-spaced) and buttons (≥11px bold uppercase is borderline; keep button labels ≥12px/600). For small text needs, darken to `--it-accent-deep` (≈4.7:1).
- `--it-muted #8C8B85` on paper ≈ 3.2:1 — labels only, never body copy; body uses `--it-ink-soft` (≈10:1) or `--it-ink` (≈16:1).
- State must never be conveyed by color alone: pair chips with text (CRIT/WARN), rows with the left bar + label, errors with a message.
- Focus is always visible: 1px coral border + 2px offset outline for keyboard users.
- Texture overlays stay ≤3% opacity and never sit behind text.

---

## 6. House Rules (imperative — follow in every app)

1. **Use the monospace stack for all chrome and data; never introduce a second font family without an explicit need.**
2. **Keep the page background warm paper (`#FAFAF7`) and put content on white panels separated by 1px hairlines — never use drop shadows to create hierarchy.**
3. **Reserve coral (`#F0561E`) for exactly four things: primary actions, active/selected state, critical status, and highlight bars. If a screen has more than a few coral elements, remove some.**
4. **Set every label, chip, section header, and button caption in UPPERCASE with letter-spacing ≥ 0.08em; keep values and prose in sentence case.**
5. **Wrap section headers in literal brackets — `[ ISSUES ]` — and follow them with a full-width 1px rule.**
6. **Render structure as dense label:value rows with tabular numerals; align columns, never center data.**
7. **Use 1px borders at radius 2–3px for all interactive elements; no rounding above 4px anywhere.**
8. **Encode status with a left highlight bar plus a text chip; never color alone.**
9. **Make inputs flat: hairline border, no inner shadow, coral border on focus only.**
10. **Keep texture under 3% opacity and never behind body text; when in doubt, omit it.**
11. **Let whitespace and hairlines do the grouping; do not draw boxes inside boxes more than one level deep.**
12. **Every destructive or critical control gets coral treatment and a confirmation step; secondary actions stay ghost-style.**

---

*Implementation tokens: see `tokens.css`. Visual reference: `preview.html`.*
