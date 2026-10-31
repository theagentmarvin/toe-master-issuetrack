/* =====================================================================
   IssueTrack — Colours Palette panel (Exam 4.2).
   ---------------------------------------------------------------------
   The colorize-selection action exposes a palette of PREDEFINED
   house-style colours. Pick one → the selected item is recoloured in a
   single click. Also shows which items have been coloured and lets the
   user clear the selection colour or all colourisations.
   ===================================================================== */
import { COLOR_PALETTE } from '../bim/palette'

export default function ColorsPalette({
  hasSelection,
  selectedColor,
  colorizations = [],
  onColorize,
  onClearSelection,
  onClearAll,
}) {
  return (
    <section className="it-card it-bim-panel">
      <div className="it-card-head">
        <span className="it-label">[ COLOURS PALETTE ]</span>
      </div>

      <div className="it-label it-bim-hint">
        {hasSelection ? 'SELECT AN ITEM, THEN PICK A COLOUR' : 'SELECT AN ITEM FIRST'}
      </div>

      <div className="it-palette">
        {COLOR_PALETTE.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={'it-swatch' + (selectedColor === entry.color ? ' is-active' : '')}
            style={{ background: entry.color }}
            title={entry.label}
            aria-label={'COLOUR ITEM ' + entry.label}
            disabled={!hasSelection}
            onClick={() => onColorize(entry.color)}
          />
        ))}
      </div>

      <div className="it-form-actions">
        <button
          className="it-btn it-btn-mini"
          type="button"
          disabled={!hasSelection}
          onClick={onClearSelection}
        >
          ✕ CLEAR SELECTION COLOUR
        </button>
        <button
          className="it-btn it-btn-mini it-btn-danger"
          type="button"
          disabled={colorizations.length === 0}
          onClick={onClearAll}
        >
          ↺ RESET ALL COLOURS
        </button>
      </div>

      <div className="it-muted-text it-bim-hint">
        {colorizations.length} ITEM(S) COLOURED
      </div>
    </section>
  )
}