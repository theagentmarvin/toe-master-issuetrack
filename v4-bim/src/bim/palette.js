/* =====================================================================
   IssueTrack — colour palette for the colorize-selection action.
   ---------------------------------------------------------------------
   Exam 4.2 — the colorize button gets a palette of PREDEFINED colours
   so an item can be recoloured in one click (no free colour picker).

   The palette is drawn from the "Chokepoint" house tokens (DESIGN.md):
   one loud coral + the four state colours + ink, extended with three
   LOW-CHROMA technical tints (steel / violet / teal) so several items
   can stay distinguishable on the warm-paper background without ever
   competing with the coral accent. Every entry stays a muted,
   BIM-appropriate tint — no neon.
   ===================================================================== */

export const COLOR_PALETTE = [
  { id: 'crit', label: 'CRITICAL', color: '#F0561E' }, // --it-accent (coral)
  { id: 'warn', label: 'WARNING', color: '#B26A1B' }, // --it-state-warn (amber)
  { id: 'ok', label: 'DONE', color: '#4A7A4E' }, // --it-state-ok (moss)
  { id: 'info', label: 'NEUTRAL', color: '#6E6D67' }, // --it-state-info (grey)
  { id: 'ink', label: 'INK', color: '#1B1B19' }, // --it-ink (near black)
  { id: 'steel', label: 'STEEL', color: '#3D6087' },
  { id: 'violet', label: 'VIOLET', color: '#6B5B95' },
  { id: 'teal', label: 'TEAL', color: '#2F6E6B' },
]

/* Colour used to mark the SINGLE selected item in the viewport. */
export const SELECT_COLOR = '#F0561E'

/* Colour used to mark the current finder / enhancer result set. */
export const FOUND_COLOR = '#B26A1B'

/* Look up a palette entry by id (falls back to the first entry). */
export function paletteEntry(id) {
  return COLOR_PALETTE.find((entry) => entry.id === id) || COLOR_PALETTE[0]
}