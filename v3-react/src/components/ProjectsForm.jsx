/* =====================================================================
   IssueTrack — <ProjectsForm>
   ---------------------------------------------------------------------
   EXAM 3 — the dedicated component that CREATES AND UPDATES the
   registers (projects). It is used in BOTH places:
     • <ProjectsPage>      → create mode  ("NEW REGISTER")
     • <ProjectDetailsPage>→ update mode  ("EDIT REGISTER INFO")
   The same component serves both jobs, which is exactly what the exam
   asks for (one component, two responsibilities fixed by props).

   The form writes LOCALLY (React state, through the app context) and IN
   FIREBASE (the `projects` collection) — see AppDataProvider.
   ===================================================================== */
import { useEffect, useState } from 'react'
import { useAppData } from '../state/AppDataProvider'
import { MIN_NAME_LENGTH, PROJECT_STATUSES, pickIconColor } from '../lib/constants'
import { todayISO } from '../lib/format'
import StatusBanner from './StatusBanner'

/* Empty form values (create mode). */
function emptyValues() {
  return {
    name: '',
    code: '',
    site: '',
    description: '',
    date: '',
    leadId: '',
    status: 'active',
  }
}

/* Form values taken from an existing register (update mode). */
function valuesFromProject(project) {
  if (!project) return emptyValues()
  return {
    name: project.name || '',
    code: project.code || '',
    site: project.site || '',
    description: project.description || '',
    date: project.date || '',
    leadId: project.leadId || '',
    status: project.status || 'active',
  }
}

export default function ProjectsForm({
  mode = 'create',
  project = null,
  people = [],
  onSaved,
  onCancel,
}) {
  const { createProject, updateProject } = useAppData()
  const [values, setValues] = useState(() => valuesFromProject(project))
  const [nameError, setNameError] = useState('')
  const [status, setStatus] = useState({ message: '', kind: '' })
  const [busy, setBusy] = useState(false)

  const isEdit = mode === 'edit' && project

  /* Re-fill the form when the register being edited changes. */
  useEffect(() => {
    setValues(valuesFromProject(project))
    setNameError('')
    setStatus({ message: '', kind: '' })
  }, [project])

  function setField(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field === 'name') setNameError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const name = String(values.name || '').trim()

    /* Exam 2.3 — a register name shorter than 5 characters is refused. */
    if (name.length < MIN_NAME_LENGTH) {
      setNameError('NAME TOO SHORT — MIN ' + MIN_NAME_LENGTH + ' CHARACTERS')
      setStatus({ message: 'REGISTER NOT SAVED — NAME TOO SHORT', kind: 'crit' })
      return
    }
    setNameError('')

    const payload = {
      name,
      code: values.code.trim(),
      site: values.site.trim(),
      description: values.description.trim(),
      /* Exam 2.4 — an empty date falls back to today. */
      date: values.date || todayISO(),
      leadId: values.leadId || null,
      /* Exam 2.2 — a new register gets a random house color. */
      color: project?.color || pickIconColor(),
      status: values.status || project?.status || 'active',
    }

    setBusy(true)
    const result = isEdit ? await updateProject(project.id, payload) : await createProject(payload)
    setBusy(false)

    if (!result.ok) {
      setStatus({ message: result.error, kind: 'crit' })
      return
    }

    if (isEdit) {
      setStatus({ message: 'REGISTER UPDATED — ' + payload.name.toUpperCase(), kind: 'ok' })
    } else {
      setValues(emptyValues())
      setStatus({ message: 'REGISTER CREATED — ' + payload.name.toUpperCase(), kind: 'ok' })
    }
    if (onSaved) onSaved(result.project)
  }

  return (
    <form className="it-card it-form" onSubmit={handleSubmit} noValidate>
      <div className="it-field">
        <label className="it-label" htmlFor="pf-name">
          Register name *
        </label>
        <input
          id="pf-name"
          className={'it-input' + (nameError ? ' it-invalid' : '')}
          type="text"
          value={values.name}
          placeholder="MIN 5 CHARACTERS"
          autoComplete="off"
          aria-invalid={nameError ? 'true' : 'false'}
          onChange={(event) => setField('name', event.target.value)}
        />
        {nameError ? <div className="it-error">{nameError}</div> : null}
      </div>

      <div className="it-form-row">
        <div className="it-field">
          <label className="it-label" htmlFor="pf-code">
            Register code
          </label>
          <input
            id="pf-code"
            className="it-input"
            type="text"
            value={values.code}
            placeholder="AUTO"
            autoComplete="off"
            onChange={(event) => setField('code', event.target.value)}
          />
        </div>
        <div className="it-field">
          <label className="it-label" htmlFor="pf-site">
            Site / location
          </label>
          <input
            id="pf-site"
            className="it-input"
            type="text"
            value={values.site}
            placeholder="CITY / SECTOR"
            autoComplete="off"
            onChange={(event) => setField('site', event.target.value)}
          />
        </div>
      </div>

      <div className="it-field">
        <label className="it-label" htmlFor="pf-description">
          Description
        </label>
        <input
          id="pf-description"
          className="it-input"
          type="text"
          value={values.description}
          placeholder="SHORT SCOPE SUMMARY"
          autoComplete="off"
          onChange={(event) => setField('description', event.target.value)}
        />
      </div>

      <div className="it-form-row">
        <div className="it-field">
          <label className="it-label" htmlFor="pf-date">
            Register date
          </label>
          <input
            id="pf-date"
            className="it-input"
            type="date"
            value={values.date}
            onChange={(event) => setField('date', event.target.value)}
          />
          <div className="it-muted-text it-field-hint">LEFT EMPTY = TODAY</div>
        </div>
        <div className="it-field">
          <label className="it-label" htmlFor="pf-lead">
            Lead assignee
          </label>
          <select
            id="pf-lead"
            className="it-select it-input"
            value={values.leadId}
            onChange={(event) => setField('leadId', event.target.value)}
          >
            <option value="">— UNASSIGNED —</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isEdit ? (
        <div className="it-field">
          <label className="it-label" htmlFor="pf-status">
            Register state
          </label>
          <select
            id="pf-status"
            className="it-select it-input"
            value={values.status || 'active'}
            onChange={(event) => setField('status', event.target.value)}
          >
            {PROJECT_STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="it-form-actions">
        <button className="it-btn it-btn-primary" type="submit" disabled={busy}>
          {isEdit ? '→ SAVE CHANGES' : '→ CREATE REGISTER'}
        </button>
        {onCancel ? (
          <button className="it-btn" type="button" onClick={onCancel}>
            CANCEL
          </button>
        ) : (
          <button
            className="it-btn"
            type="button"
            onClick={() => {
              setValues(emptyValues())
              setNameError('')
              setStatus({ message: '', kind: '' })
            }}
          >
            CLEAR
          </button>
        )}
        <StatusBanner message={status.message} kind={status.kind} />
      </div>
    </form>
  )
}
