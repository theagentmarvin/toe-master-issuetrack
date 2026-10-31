/* =====================================================================
   IssueTrack — Assign Issue panel (Wave D / D2).
   ---------------------------------------------------------------------
   The 3D viewer's "ASSIGN ISSUE" action. Fixes from FIX ROUND #1:

   • The form-open state, the draft fields AND the target element are all
     LOCAL to this component — no effect keys on `selection` identity, so a
     Firestore onSnapshot re-render can never close the form or wipe a
     draft (the demo write is shared, so remote writes are frequent).
   • The target (modelId/localId/guid/label/worldPosition) is captured
     the moment the form opens; later selection changes don't re-target it.
   • Title autofocus on open; Escape cancels; draft is mirrored to
     sessionStorage as a belt-and-braces measure.

   All chromed in the Chokepoint house style (.it-* classes / tokens).
   ===================================================================== */
import { useEffect, useRef, useState } from 'react'
import { createTodo } from '../services/todosService'
import { STATUSES, PRIORITIES } from '../lib/constants'
import StatusBanner from './StatusBanner'

const MIN_TITLE = 5

const EMPTY = { title: '', description: '', status: 'open', priority: 'MEDIUM', assigneeId: '' }

/* sessionStorage key for the draft of one element of one register. */
function draftKey(projectId, localId) {
  return 'it-issue-draft:' + projectId + ':' + localId
}

function loadDraft(projectId, localId) {
  try {
    const raw = window.sessionStorage.getItem(draftKey(projectId, localId))
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw)
    return {
      title: String(parsed.title || ''),
      description: String(parsed.description || ''),
      status: STATUSES.some((s) => s.id === parsed.status) ? parsed.status : 'open',
      priority: PRIORITIES.some((p) => p.id === parsed.priority) ? parsed.priority : 'MEDIUM',
      assigneeId: typeof parsed.assigneeId === 'string' ? parsed.assigneeId : '',
    }
  } catch {
    return EMPTY
  }
}

function saveDraft(projectId, localId, values) {
  try {
    if (!values.title && !values.description) {
      window.sessionStorage.removeItem(draftKey(projectId, localId))
      return
    }
    window.sessionStorage.setItem(draftKey(projectId, localId), JSON.stringify(values))
  } catch {
    /* storage may be unavailable — the in-memory draft still works */
  }
}

function clearDraft(projectId, localId) {
  try {
    window.sessionStorage.removeItem(draftKey(projectId, localId))
  } catch {
    /* ignore */
  }
}

export default function AssignIssuePanel({ projectId, selection, people = [], onSaved }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(EMPTY)
  /* The element the form was opened FOR — frozen at open time. */
  const [target, setTarget] = useState(null)
  const [titleError, setTitleError] = useState('')
  const [status, setStatus] = useState({ message: '', kind: '' })
  const [busy, setBusy] = useState(false)
  const titleRef = useRef(null)

  /* Autofocus the title input when the form opens (finding #5 focus). */
  useEffect(() => {
    if (open) titleRef.current?.focus()
  }, [open])

  /* Escape = cancel (mirrors the CANCEL button). */
  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function setField(field, value) {
    setValues((previous) => {
      const next = { ...previous, [field]: value }
      if (target) saveDraft(projectId, target.localId, next)
      return next
    })
    if (field === 'title') setTitleError('')
  }

  function openForm() {
    if (!selection) return
    setTarget({
      modelId: selection.modelId,
      localId: selection.localId,
      guid: selection.guid || null,
      label: selection.label || 'ELEMENT ' + selection.localId,
      worldPosition: selection.worldPosition
        ? { x: selection.worldPosition.x, y: selection.worldPosition.y, z: selection.worldPosition.z }
        : null,
    })
    setValues(loadDraft(projectId, selection.localId))
    setTitleError('')
    setStatus({ message: '', kind: '' })
    setOpen(true)
  }

  function cancel() {
    setOpen(false)
    setValues(EMPTY)
    setTitleError('')
    setStatus({ message: '', kind: '' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!target) return

    const title = String(values.title || '').trim()
    if (title.length < MIN_TITLE) {
      setTitleError('TITLE TOO SHORT — MIN ' + MIN_TITLE + ' CHARACTERS')
      setStatus({ message: 'ISSUE NOT SAVED — TITLE TOO SHORT', kind: 'crit' })
      return
    }
    setTitleError('')

    const bimReference = {
      modelId: target.modelId,
      localId: target.localId,
      guid: target.guid,
      label: target.label,
      worldPosition: target.worldPosition,
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
      clearDraft(projectId, target.localId)
      setStatus({ message: 'ISSUE PINNED — ' + saved.id.toUpperCase(), kind: 'ok' })
      setOpen(false)
      setValues(EMPTY)
      setTarget(null)
      if (onSaved) onSaved(saved)
    } catch (err) {
      setBusy(false)
      setStatus({ message: 'SAVE FAILED — ' + err.message, kind: 'crit' })
    }
  }

  const hasSelection = Boolean(selection)

  return (
    <section className="it-card it-bim-panel it-assign-panel">
      <div className="it-card-head">
        <span className="it-label">[ ASSIGN ISSUE ]</span>
        {target ? <span className="it-chip it-chip-crit">SEL #{target.localId}</span> : null}
      </div>

      {open && target ? (
        <form onSubmit={handleSubmit} noValidate>
          <div className="it-field">
            <label className="it-label" htmlFor="ai-title">Issue title *</label>
            <input
              id="ai-title"
              ref={titleRef}
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
            <button className="it-btn" type="button" onClick={cancel}>
              CANCEL
            </button>
            <StatusBanner message={status.message} kind={status.kind} />
          </div>
        </form>
      ) : hasSelection ? (
        <div className="it-bim-hint" style={{ display: 'grid', gap: 8 }}>
          <div className="it-muted-text it-bim-hint">
            {selection.label ? selection.label.toUpperCase() : 'ELEMENT ' + selection.localId}
            {selection.guid ? ' · ' + String(selection.guid).slice(0, 8) : ''}
          </div>
          <button
            id="btn-assign-issue"
            className="it-btn it-btn-primary"
            type="button"
            onClick={openForm}
          >
            ★ ASSIGN ISSUE
          </button>
        </div>
      ) : (
        <div className="it-muted-text it-bim-hint">SELECT AN ELEMENT TO PIN AN ISSUE ON IT</div>
      )}
    </section>
  )
}