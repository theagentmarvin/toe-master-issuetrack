/* =====================================================================
   IssueTrack — <PersonForm> (assignees).
   ---------------------------------------------------------------------
   Exam 1 behaviour kept: a form to add new people. It also edits an
   existing person, so the same component serves both (add / edit).
   People are stored in the Firestore `people` collection.
   ===================================================================== */
import { useEffect, useState } from 'react'
import { useAppData } from '../state/AppDataProvider'
import { MIN_PERSON_LENGTH } from '../lib/constants'
import StatusBanner from './StatusBanner'

function emptyValues() {
  return { name: '', role: '', email: '', phone: '' }
}

function valuesFromPerson(person) {
  if (!person) return emptyValues()
  return {
    name: person.name || '',
    role: person.role || '',
    email: person.email || '',
    phone: person.phone || '',
  }
}

export default function PersonForm({ person = null, onSaved, onCancel }) {
  const { createPerson, updatePerson } = useAppData()
  const [values, setValues] = useState(() => valuesFromPerson(person))
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [status, setStatus] = useState({ message: '', kind: '' })
  const [busy, setBusy] = useState(false)

  const isEdit = Boolean(person)

  useEffect(() => {
    setValues(valuesFromPerson(person))
    setNameError('')
    setEmailError('')
    setStatus({ message: '', kind: '' })
  }, [person])

  function setField(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }))
    if (field === 'name') setNameError('')
    if (field === 'email') setEmailError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const name = String(values.name || '').trim()
    if (name.length < MIN_PERSON_LENGTH) {
      setNameError('NAME TOO SHORT — MIN ' + MIN_PERSON_LENGTH + ' CHARACTERS')
      setStatus({ message: 'PERSON NOT SAVED — NAME TOO SHORT', kind: 'crit' })
      return
    }
    setNameError('')

    const email = String(values.email || '').trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('EMAIL FORMAT INVALID')
      setStatus({ message: 'PERSON NOT SAVED — EMAIL FORMAT INVALID', kind: 'crit' })
      return
    }
    setEmailError('')

    const payload = {
      name,
      role: values.role.trim() || 'Assignee',
      email,
      phone: values.phone.trim(),
    }

    setBusy(true)
    const result = isEdit ? await updatePerson(person.id, payload) : await createPerson(payload)
    setBusy(false)

    if (!result.ok) {
      setStatus({ message: result.error, kind: 'crit' })
      return
    }

    setValues(emptyValues())
    setStatus({
      message: (isEdit ? 'PERSON UPDATED — ' : 'PERSON ADDED — ') + payload.name.toUpperCase(),
      kind: 'ok',
    })
    if (onSaved) onSaved(result.person)
  }

  return (
    <form className="it-card it-form" onSubmit={handleSubmit} noValidate>
      <div className="it-form-row">
        <div className="it-field">
          <label className="it-label" htmlFor="pe-name">
            Full name *
          </label>
          <input
            id="pe-name"
            className={'it-input' + (nameError ? ' it-invalid' : '')}
            type="text"
            value={values.name}
            placeholder="NAME AND SURNAME"
            autoComplete="off"
            aria-invalid={nameError ? 'true' : 'false'}
            onChange={(event) => setField('name', event.target.value)}
          />
          {nameError ? <div className="it-error">{nameError}</div> : null}
        </div>
        <div className="it-field">
          <label className="it-label" htmlFor="pe-role">
            Role
          </label>
          <input
            id="pe-role"
            className="it-input"
            type="text"
            value={values.role}
            placeholder="BIM LEAD / INSPECTOR"
            autoComplete="off"
            onChange={(event) => setField('role', event.target.value)}
          />
        </div>
      </div>

      <div className="it-form-row">
        <div className="it-field">
          <label className="it-label" htmlFor="pe-email">
            Email
          </label>
          <input
            id="pe-email"
            className={'it-input' + (emailError ? ' it-invalid' : '')}
            type="text"
            value={values.email}
            placeholder="NAME@COMPANY.COM"
            autoComplete="off"
            aria-invalid={emailError ? 'true' : 'false'}
            onChange={(event) => setField('email', event.target.value)}
          />
          {emailError ? <div className="it-error">{emailError}</div> : null}
        </div>
        <div className="it-field">
          <label className="it-label" htmlFor="pe-phone">
            Phone
          </label>
          <input
            id="pe-phone"
            className="it-input"
            type="text"
            value={values.phone}
            placeholder="+56 9 …"
            autoComplete="off"
            onChange={(event) => setField('phone', event.target.value)}
          />
        </div>
      </div>

      <div className="it-form-actions">
        <button className="it-btn it-btn-primary" type="submit" disabled={busy}>
          {isEdit ? '→ SAVE PERSON' : '→ ADD PERSON'}
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
              setEmailError('')
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
