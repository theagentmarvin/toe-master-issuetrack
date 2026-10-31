/* =====================================================================
   IssueTrack — <TodoForm>
   ---------------------------------------------------------------------
   EXAM 3 — ONE form that CREATES AND UPDATES the ToDos (issues):
     • no `editingTodo` → CREATE a new issue
     • `editingTodo`     → UPDATE that issue
   Both write to the `todos` subcollection of the register in Firestore
   and then notify <ProjectTasksList> (which also listens live with
   onSnapshot), so the list is refreshed right after the write.
   ===================================================================== */
import { useEffect, useState } from 'react'
import { createTodo, updateTodo } from '../services/todosService'
import { STATUSES, PRIORITIES } from '../lib/constants'
import StatusBanner from './StatusBanner'

function emptyValues() {
  return {
    title: '',
    description: '',
    /* Exam 2.9 — the status is already chosen when the issue is created. */
    status: 'open',
    priority: 'MEDIUM',
    assigneeId: '',
    due: '',
  }
}

function valuesFromTodo(todo) {
  if (!todo) return emptyValues()
  return {
    title: todo.title || '',
    description: todo.description || '',
    status: todo.status || 'open',
    priority: todo.priority || 'MEDIUM',
    assigneeId: todo.assigneeId || '',
    due: todo.due || '',
  }
}

export default function TodoForm({ projectId, people = [], editingTodo = null, onSaved, onCancel }) {
  const [values, setValues] = useState(() => valuesFromTodo(editingTodo))
  const [titleError, setTitleError] = useState('')
  const [status, setStatus] = useState({ message: '', kind: '' })
  const [busy, setBusy] = useState(false)

  const isEdit = Boolean(editingTodo)

  /* Switching between "new issue" and "edit issue" refills the form. */
  useEffect(() => {
    setValues(valuesFromTodo(editingTodo))
    setTitleError('')
    setStatus({ message: '', kind: '' })
  }, [editingTodo])

  function setField(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field === 'title') setTitleError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const title = String(values.title || '').trim()
    if (!title) {
      setTitleError('ISSUE TITLE REQUIRED')
      setStatus({ message: 'ISSUE NOT SAVED — TITLE REQUIRED', kind: 'crit' })
      return
    }
    setTitleError('')

    const payload = {
      title,
      description: values.description.trim(),
      status: values.status,
      priority: values.priority,
      assigneeId: values.assigneeId || null,
      due: values.due,
    }

    setBusy(true)
    try {
      /* CREATE or UPDATE — same form, one line apart. */
      const saved = isEdit
        ? await updateTodo(projectId, editingTodo.id, payload)
        : await createTodo(projectId, payload)
      setBusy(false)
      setStatus({
        message: (isEdit ? 'ISSUE UPDATED — ' : 'ISSUE LOGGED — ') + saved.id.toUpperCase(),
        kind: 'ok',
      })
      if (!isEdit) setValues(emptyValues())
      if (onSaved) onSaved(saved, isEdit ? 'update' : 'create')
    } catch (err) {
      setBusy(false)
      setStatus({ message: 'SAVE FAILED — ' + err.message, kind: 'crit' })
    }
  }

  return (
    <form className="it-card it-form" onSubmit={handleSubmit} noValidate>
      <div className="it-field">
        <label className="it-label" htmlFor="tf-title">
          Issue title *
        </label>
        <input
          id="tf-title"
          className={'it-input' + (titleError ? ' it-invalid' : '')}
          type="text"
          value={values.title}
          placeholder="SHORT PROBLEM SUMMARY"
          autoComplete="off"
          aria-invalid={titleError ? 'true' : 'false'}
          onChange={(event) => setField('title', event.target.value)}
        />
        {titleError ? <div className="it-error">{titleError}</div> : null}
      </div>

      <div className="it-field">
        <label className="it-label" htmlFor="tf-description">
          Description
        </label>
        <input
          id="tf-description"
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
          <label className="it-label" htmlFor="tf-status">
            Status
          </label>
          <select
            id="tf-status"
            className="it-select it-input"
            value={values.status}
            onChange={(event) => setField('status', event.target.value)}
          >
            {STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="it-field">
          <label className="it-label" htmlFor="tf-priority">
            Priority
          </label>
          <select
            id="tf-priority"
            className="it-select it-input"
            value={values.priority}
            onChange={(event) => setField('priority', event.target.value)}
          >
            {PRIORITIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="it-form-row">
        <div className="it-field">
          <label className="it-label" htmlFor="tf-assignee">
            Assignee
          </label>
          <select
            id="tf-assignee"
            className="it-select it-input"
            value={values.assigneeId}
            onChange={(event) => setField('assigneeId', event.target.value)}
          >
            <option value="">— UNASSIGNED —</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
        <div className="it-field">
          <label className="it-label" htmlFor="tf-due">
            Due date
          </label>
          <input
            id="tf-due"
            className="it-input"
            type="date"
            value={values.due}
            onChange={(event) => setField('due', event.target.value)}
          />
        </div>
      </div>

      <div className="it-form-actions">
        <button className="it-btn it-btn-primary" type="submit" disabled={busy}>
          {isEdit ? '→ SAVE ISSUE' : '→ CREATE ISSUE'}
        </button>
        {onCancel ? (
          <button className="it-btn" type="button" onClick={onCancel}>
            CANCEL
          </button>
        ) : null}
        <StatusBanner message={status.message} kind={status.kind} />
      </div>
    </form>
  )
}
