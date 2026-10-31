/* =====================================================================
   IssueTrack — Smart Views panel (Exam 4.4).
   ---------------------------------------------------------------------
   Smart views capture the CURRENT finder query + colourisations into a
   named definition. The table provides APPLY and UPDATE per view:
     • APPLY  → restore the view in the viewport + Finder panel
     • UPDATE → re-capture the view from the current state
   DEFINITIONS (JSON) can be exported/imported as files, and every view
   is persisted in Firestore as part of the project (subcollection
   `projects/{id}/smartViews`), so opening the project repopulates the
   table.
   ===================================================================== */
import { useState } from 'react'

export default function SmartViewsPanel({
  views = [],
  currentFinderCount = 0,
  currentColorCount = 0,
  busy = false,
  onCapture,
  onApply,
  onUpdate,
  onDelete,
  onExport,
  onImport,
}) {
  const [name, setName] = useState('')

  function handleCapture(event) {
    event.preventDefault()
    onCapture(name.trim() || '')
    setName('')
  }

  function handleImport(event) {
    const file = event.target.files && event.target.files[0]
    if (file) onImport(file)
    event.target.value = ''
  }

  return (
    <section className="it-card it-bim-panel">
      <div className="it-card-head">
        <span className="it-label">[ SMART VIEWS ]</span>
        <span className="it-muted-text">
          {currentFinderCount} QUERY · {currentColorCount} COLOUR
        </span>
      </div>

      <form onSubmit={handleCapture} noValidate>
        <div className="it-field">
          <label className="it-label" htmlFor="sv-name">New view name</label>
          <input
            id="sv-name"
            className="it-input"
            type="text"
            value={name}
            placeholder="e.g. FUNDACIONES EN PROCESO"
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="it-form-actions">
          <button className="it-btn it-btn-primary" type="submit" disabled={busy}>
            ⊕ CAPTURE CURRENT VIEW
          </button>
        </div>
      </form>

      <div className="it-bim-divider" />

      {views.length === 0 ? (
        <div className="it-muted-text it-bim-hint">NO STORED VIEWS YET</div>
      ) : (
        <div className="it-bim-list">
          <div className="it-label it-bim-list-title">STORED VIEWS ({views.length})</div>
          {views.map((view) => (
            <div className="it-row" key={view.id}>
              <div className="it-bim-view-cell">
                <span className="it-bim-list-name">{view.name}</span>
                <span className="it-muted-text it-num">
                  {view.colorizations.length} COLOUR · {view.finderQuery?.data?.length || 0} QUERY
                </span>
              </div>
              <button className="it-btn it-btn-mini" type="button" onClick={() => onApply(view)}>
                ► APPLY
              </button>
              <button className="it-btn it-btn-mini" type="button" onClick={() => onUpdate(view)}>
                ↻ UPDATE
              </button>
              <button className="it-btn it-btn-mini" type="button" onClick={() => onExport(view)}>
                ↧
              </button>
              <button
                className="it-btn it-btn-mini it-btn-danger"
                type="button"
                onClick={() => onDelete(view)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="it-form-actions">
        <label className="it-btn" htmlFor="sv-import">
          ↥ IMPORT VIEW
        </label>
        <input
          type="file"
          id="sv-import"
          accept="application/json,.json"
          hidden
          onChange={handleImport}
        />
      </div>

      <div className="it-muted-text it-bim-hint">
        DEFINITIONS, NOT IMAGES — AN IMPORTED VIEW RE-CREATES IN-SESSION
      </div>
    </section>
  )
}