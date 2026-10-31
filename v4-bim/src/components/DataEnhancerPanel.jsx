/* =====================================================================
   IssueTrack — Data Enhancer panel (Exam 4.3).
   ---------------------------------------------------------------------
   The custom DataEnhancer component is the ENGINE behind this panel.
   Given the currently selected item, the panel lets the user pick WHICH
   property represents "the same information" (or AUTO for the best
   guess) and then highlights every item carrying the same value.
   ===================================================================== */
import { useMemo, useState } from 'react'
import { attrValue } from '../bim/format'

const AUTO = 'AUTO'

/* Property names reachable from the selected item's nested data. */
function propertyNamesOf(data) {
  const names = new Set()
  for (const [key, val] of Object.entries(data || {})) {
    if (key.startsWith('_')) continue
    if (!Array.isArray(val)) continue
    for (const target of val) {
      const rel = target && target.HasProperties
      if (Array.isArray(rel)) {
        for (const p of rel) {
          const name = attrValue(p && p.Name)
          if (name !== null && name !== undefined) names.add(String(name))
        }
      }
    }
  }
  return Array.from(names).sort()
}

export default function DataEnhancerPanel({
  selection,
  resultCount = null,
  busy = false,
  onEnhance,
}) {
  const [prop, setProp] = useState(AUTO)
  const names = useMemo(() => (selection ? propertyNamesOf(selection.data) : []), [selection])

  return (
    <section className="it-card it-bim-panel">
      <div className="it-card-head">
        <span className="it-label">[ DATA ENHANCER ]</span>
      </div>

      <div className="it-label it-bim-hint">
        {selection
          ? 'FIND EVERY ITEM SHARING THE SAME INFORMATION AS THE SELECTION'
          : 'SELECT AN ITEM FIRST'}
      </div>

      <div className="it-field">
        <label className="it-label" htmlFor="de-prop">Shared property</label>
        <select
          id="de-prop"
          className="it-select"
          style={{ width: '100%' }}
          value={prop}
          onChange={(event) => setProp(event.target.value)}
        >
          <option value={AUTO}>AUTO (BEST GUESS)</option>
          {names.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="it-form-actions">
        <button
          className="it-btn it-btn-primary"
          type="button"
          disabled={busy || !selection}
          onClick={() => onEnhance(prop)}
        >
          ⊕ FIND SAME INFO
        </button>
        {resultCount !== null ? (
          <span className={'it-chip ' + (resultCount > 0 ? 'it-chip-crit' : '')}>
            {resultCount} SHARING
          </span>
        ) : null}
      </div>
    </section>
  )
}