/* =====================================================================
   IssueTrack — Assign Issue panel (Wave D / D2).
   ---------------------------------------------------------------------
   The 3D viewer's "ASSIGN ISSUE" action: from a SELECTED element, open a
   compact form (title >= 5 chars, description, status, priority,
   assignee) and persist the issue into the register's `todos` with a
   `bimReference` — the exact link back to the 3D geometry.

   All chromed in the Chokepoint house style (.it-* classes / tokens).
   ===================================================================== */
import { useEffect, useState } from 'react'
import { createTodo } from '../services/todosService'
import { STATUSES, PRIORITIES } from '../lib/constants'
import StatusBanner from './StatusBanner'

const MIN_TITLE = 5

const EMPTY = { title: '', description: '', status: 'open', priority: 'MEDIUM', assigneeId: '' }

export default function AssignIssuePanel({ projectId, selection, people = [], onSaved }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(EMPTY)
  const [titleError, setTitleError] = useState('')
  const [status, setStatus] = useState({ message: '', kind: '' })
  const [busy, setBusy] = useState(false)

  /* A new selection closes the form and resets it (the previous element's
     draft must never leak onto the next element). */
  useEffect(() => {
    setOpen(false)
    setValues(EMPTY)
    setTitleError('')
    setStatus({ message: '', kind: '' })
  }, [selection ? selection.modelId + ':' + selection.localId : ''])

  if (!selection) {
    return (
      <section className="it-card it-bim-panel">
        <div className="it-card-head">
          <span className="it-label">[ ASSIGN ISSUE ]</span>
        </div>
        <div className="it-muted-text it-bim-hint">
          SELECT AN ELEMENT TO PIN AN ISSUE ON IT
        </div>
      </section>
    )
  }

  function setField(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field === 'title') setTitleError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const title = String(values.title || '').trim()
    if (title.length < MIN_TITLE) {
      setTitleError('TITLE TOO SHORT — MIN ' + MIN_TITLE + ' CHARACTERS')
      setStatus({ message: 'ISSUE NOT SAVED — TITLE TOO SHORT', kind: 'crit' })
      return
    }
    setTitleError('')

    const worldPosition = selection.worldPosition
      ? { x: selection.worldPosition.x, y: selection.worldPosition.y, z: selection.worldPosition.z }
      : null

    const bimReference = {
      modelId: selection.modelId,
      localId: selection.localId,
      guid: selection.guid || null,
      label: selection.label || 'ELEMENT ' + selection.localId,
      worldPosition,
    }

    setBusy(true)
    try {
      const saved = await createTodo(projectId, {
        title,
        description: values.description.trim(),
        status: values.status,
        priority: values.priority,
        assigneeId: values.assigneeId || null,
        due: '',
        bimReference,
      })
      setBusy(false)
      setStatus({ message: 'ISSUE PINNED — ' + saved.id.toUpperCase(), kind: 'ok' })
      setOpen(false)
      setValues(EMPTY)
      if (onSaved) onSaved(saved)
    } catch (err) {
      setBusy(false)
      setStatus({ message: 'SAVE FAILED — ' + err.message, kind: 'crit' })
    }
  }

  return (
    <section className="it-card it-bim-panel">
      <div className="it-card-head">
        <span className="it-label">[ ASSIGN ISSUE ]</span>
        <span className="it-chip it-chip-crit">SEL #{selection.localId}</span>
      </div>

      {!open ? (
        <div className="it-bim-hint" style={{ display: 'grid', gap: 8 }}>
          <div className="it-muted-text it-bim-hint">
            {selection.label ? selection.label.toUpperCase() : 'ELEMENT ' + selection.localId}
            {selection.guid ? ' · ' + String(selection.guid).slice(0, 8) : ''}
          </div>
          <button
            id="btn-assign-issue"
            className="it-btn it-btn-primary"
            type="button"
            onClick={() => {
              setOpen(true)
              setTitleError('')
              setStatus({ message: '', kind: '' })
            }}
          >
            ★ ASSIGN ISSUE
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="it-field">
            <label className="it-label" htmlFor="ai-title">Issue title *</label>
            <input
              id="ai-title"
              className={'it-input' + (titleError ? ' it-invalid' : '')}
              type="text"
              value={values.title}
              placeholder="MIN 5 CHARACTERS"
              autoComplete="off"
              aria-invalid={titleError ? 'true' : 'false'}
              onChange={(event) => setField('title', event.target.value)}
            />
            {titleError ? <div className="it-error">{titleError}</div> : null}
          </div>

          <div className="it-field">
            <label className="it-label" htmlFor="ai-description">Description</label>
            <input
              id="ai-description"
              className="it-input"
              type="text"
              value={values.description}
              placeholder="DETAILS…"
              autoComplete="off"
              onChange={(event) => setField('description', event.target.value)}
            />
          </div>

          <div className="it-form-row">
            <div className="it-field">
              <label className="it-label" htmlFor="ai-status">Status</label>
              <select
                id="ai-status"
                className="it-select it-input"
                value={values.status}
                onChange={(event) => setField('status', event.target.value)}
              >
                {STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="it-field">
              <label className="it-label" htmlFor="ai-priority">Priority</label>
              <select
                id="ai-priority"
                className="it-select it-input"
                value={values.priority}
                onChange={(event) => setField('priority', event.target.value)}
              >
                {PRIORITIES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="it-field">
            <label className="it-label" htmlFor="ai-assignee">Assignee</label>
            <select
              id="ai-assignee"
              className="it-select it-input"
              value={values.assigneeId}
              onChange={(event) => setField('assigneeId', event.target.value)}
            >
              <option value="">— UNASSIGNED —</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>

          <div className="it-form-actions">
            <button id="ai-save" className="it-btn it-btn-primary" type="submit" disabled={busy}>
              → PIN ISSUE
            </button>
            <button className="it-btn" type="button" onClick={() => setOpen(false)}>
              CANCEL
            </button>
            <StatusBanner message={status.message} kind={status.kind} />
          </div>
        </form>
      )}
    </section>
  )
}