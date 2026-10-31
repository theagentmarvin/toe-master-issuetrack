/* =====================================================================
   IssueTrack — Items Finder panel (Exam 4.1).
   ---------------------------------------------------------------------
   • pick a property set + (optionally) a property + enter a value
   • FIND → all matching items are highlighted in the viewport
   • DOWNLOAD existing queries → ItemsFinder.export()
   • UPLOAD previously downloaded queries → ItemsFinder.import()
   • list of stored queries, each re-runnable
   ===================================================================== */
import { useState } from 'react'

const ANY = 'ANY'
const ALL = 'ALL'

export default function ItemsFinderPanel({
  propertySets = [],
  propertiesBySet = {},
  allProperties = [],
  queryNames = [],
  resultCount = 0,
  busy = false,
  status = { message: '', kind: '' },
  onFind,
  onRunStored,
  onRemoveStored,
  onExport,
  onImport,
}) {
  const [pset, setPset] = useState(ALL)
  const [prop, setProp] = useState(ANY)
  const [value, setValue] = useState('')
  const [queryName, setQueryName] = useState('')

  const propsForCurrentSet = pset === ALL ? allProperties : propertiesBySet[pset] || []

  function changePset(next) {
    setPset(next)
    setProp(ANY)
  }

  function handleFind(event) {
    event.preventDefault()
    if (!value.trim()) return
    onFind({ queryName: queryName.trim(), pset, prop, value })
  }

  function handleImport(event) {
    const file = event.target.files && event.target.files[0]
    if (file) onImport(file)
    event.target.value = ''
  }

  return (
    <section className="it-card it-bim-panel">
      <div className="it-card-head">
        <span className="it-label">[ ITEMS FINDER ]</span>
      </div>

      <form onSubmit={handleFind} noValidate>
        <div className="it-field">
          <label className="it-label" htmlFor="if-pset">Property set</label>
          <select
            id="if-pset"
            className="it-select"
            style={{ width: '100%' }}
            value={pset}
            onChange={(event) => changePset(event.target.value)}
          >
            <option value={ALL}>ALL PROPERTY SETS</option>
            {propertySets.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="it-field">
          <label className="it-label" htmlFor="if-prop">Property</label>
          <select
            id="if-prop"
            className="it-select"
            style={{ width: '100%' }}
            value={prop}
            onChange={(event) => setProp(event.target.value)}
          >
            <option value={ANY}>ANY PROPERTY IN SET</option>
            {propsForCurrentSet.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="it-field">
          <label className="it-label" htmlFor="if-value">Value</label>
          <input
            id="if-value"
            className="it-input"
            type="text"
            value={value}
            placeholder="e.g. FUNDACION"
            autoComplete="off"
            onChange={(event) => setValue(event.target.value)}
          />
        </div>

        <div className="it-field">
          <label className="it-label" htmlFor="if-name">Query name (optional)</label>
          <input
            id="if-name"
            className="it-input"
            type="text"
            value={queryName}
            placeholder="SAVE AS A NAMED QUERY"
            autoComplete="off"
            onChange={(event) => setQueryName(event.target.value)}
          />
        </div>

        <div className="it-form-actions">
          <button className="it-btn it-btn-primary" type="submit" disabled={busy || !value.trim()}>
            ⌕ FIND MATCHING ITEMS
          </button>
          {resultCount !== null ? (
            <span className={'it-chip ' + (resultCount > 0 ? 'it-chip-crit' : '')}>
              {resultCount} MATCH
            </span>
          ) : null}
        </div>
      </form>

      <div className="it-bim-divider" />

      <div className="it-form-actions">
        <button className="it-btn" type="button" onClick={onExport}>
          ↧ DOWNLOAD QUERIES
        </button>
        <label className="it-btn" htmlFor="if-import">
          ↥ UPLOAD QUERIES
        </label>
        <input
          type="file"
          id="if-import"
          accept="application/json,.json"
          hidden
          onChange={handleImport}
        />
      </div>

      {queryNames.length > 0 ? (
        <div className="it-bim-list">
          <div className="it-label it-bim-list-title">STORED QUERIES</div>
          {queryNames.map((name) => (
            <div className="it-row" key={name}>
              <span className="it-bim-list-name">{name}</span>
              <button className="it-btn it-btn-mini" type="button" onClick={() => onRunStored(name)}>
                ► RUN
              </button>
              <button
                className="it-btn it-btn-mini it-btn-danger"
                type="button"
                onClick={() => onRemoveStored(name)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {status.message ? (
        <div className={'it-status' + (status.kind ? ' is-' + status.kind : '')} role="status">
          {status.message}
        </div>
      ) : null}
    </section>
  )
}