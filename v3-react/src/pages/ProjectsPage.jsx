/* =====================================================================
   IssueTrack — register index page (route "/").
   ---------------------------------------------------------------------
   • card tiles: first two letters of the name (CSS uppercase) with a
     random house color                                  (Exam 2.1/2.2)
   • <ProjectsForm> in CREATE mode                       (Exam 3)
   • <ProjectsForm> in UPDATE mode (the same component, loaded from a
     card's EDIT button)                                  (Exam 3)
   • JSON export (issues included) / JSON import that UPDATES an
     existing register instead of duplicating it          (Exam 2.7/2.8)
   ===================================================================== */
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../state/AppDataProvider'
import { exportProjects, importProjects } from '../services/projectsService'
import { fetchTodos } from '../services/todosService'
import ProjectsForm from '../components/ProjectsForm'
import ProjectCard from '../components/ProjectCard'
import StatsStrip from '../components/StatsStrip'
import StatusBanner from '../components/StatusBanner'

export default function ProjectsPage() {
  const { projects, people, loading, error, deleteProject, resetDemo } = useAppData()
  const [todoMap, setTodoMap] = useState({})
  const [editing, setEditing] = useState(null)
  const [dataStatus, setDataStatus] = useState({ message: '', kind: '' })
  const [readError, setReadError] = useState('')
  const [importText, setImportText] = useState('')
  const [exportPreview, setExportPreview] = useState('')

  /* The issue counters of every register (one small read per register). */
  const projectKey = projects.map((project) => project.id).join('|')

  useEffect(() => {
    let alive = true

    async function loadTodos() {
      /* DEFECT 4 — every read is guarded: one denied/failed
         subcollection must not reject the whole batch. The results that
         did arrive are kept and the failure is reported to the user. */
      const entries = await Promise.all(
        projects.map(async (project) => {
          try {
            const todos = await fetchTodos(project.id)
            return { id: project.id, todos, error: '' }
          } catch (err) {
            return { id: project.id, todos: [], error: err.message }
          }
        }),
      )
      if (!alive) return

      setTodoMap(Object.fromEntries(entries.map((entry) => [entry.id, entry.todos])))

      const failed = entries.filter((entry) => entry.error)
      if (failed.length) {
        setReadError(
          'ISSUE COUNTS PARTIAL — ' + failed.length + ' REGISTER(S) COULD NOT BE READ (' + failed[0].error + ')',
        )
      } else {
        setReadError('')
      }
    }

    if (projects.length) loadTodos()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey])

  const stats = useMemo(() => {
    const allTodos = Object.values(todoMap).flat()
    return {
      registers: projects.length,
      issues: allTodos.length,
      open: allTodos.filter((todo) => todo.status !== 'done').length,
      blocked: allTodos.filter((todo) => todo.status === 'blocked').length,
      people: people.length,
    }
  }, [projects, people, todoMap])

  const personById = useMemo(() => {
    const map = {}
    people.forEach((person) => {
      map[person.id] = person
    })
    return map
  }, [people])

  async function handleDelete(project) {
    if (!window.confirm('DELETE REGISTER ' + project.name.toUpperCase() + ' AND ALL ITS ISSUES?')) {
      return
    }
    const result = await deleteProject(project.id)
    setDataStatus(
      result.ok
        ? { message: 'REGISTER DELETED', kind: 'warn' }
        : { message: result.error, kind: 'crit' },
    )
  }

  /* Exam 2.7 — export the registers WITH their issues. */
  async function handleExport() {
    try {
      const payload = await exportProjects()
      const json = JSON.stringify(payload, null, 2)
      setExportPreview(json)

      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'issuetrack-' + payload.exportedAt.slice(0, 10) + '.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setDataStatus({
        message:
          'EXPORTED ' + payload.projects.length + ' REGISTERS · ' + stats.issues + ' ISSUES',
        kind: 'ok',
      })
    } catch (err) {
      setDataStatus({ message: 'EXPORT FAILED — ' + err.message, kind: 'crit' })
    }
  }

  /* Exam 2.8 — import: a register whose id already exists is UPDATED. */
  async function applyImport(payload) {
    const result = await importProjects(payload)
    if (!result.ok) {
      setDataStatus({ message: 'IMPORT FAILED — ' + result.error, kind: 'crit' })
      return
    }
    let message = 'IMPORT COMPLETE — ' + result.added + ' ADDED · ' + result.updated + ' UPDATED'
    if (result.skipped) message += ' · ' + result.skipped + ' REJECTED'
    setDataStatus({ message, kind: result.skipped ? 'crit' : 'ok' })
  }

  function handleImportFile(event) {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        applyImport(JSON.parse(reader.result))
      } catch (err) {
        setDataStatus({ message: 'IMPORT FAILED — INVALID JSON', kind: 'crit' })
      }
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function handleImportText() {
    const raw = importText.trim()
    if (!raw) {
      setDataStatus({ message: 'IMPORT FAILED — NO JSON PASTED', kind: 'crit' })
      return
    }
    try {
      applyImport(JSON.parse(raw))
    } catch (err) {
      setDataStatus({ message: 'IMPORT FAILED — INVALID JSON', kind: 'crit' })
    }
  }

  async function handleReset() {
    if (!window.confirm('RESET ALL REGISTERS, ISSUES AND PEOPLE BACK TO THE DEMO DATA?')) return
    await resetDemo()
    setDataStatus({ message: 'DEMO DATA RESTORED', kind: 'warn' })
  }

  return (
    <>
      <h1 className="it-page-title">ISSUE REGISTERS</h1>
      <p className="it-page-sub">
        One register per construction project. Open a register to log issues, assign them to
        people and export the whole set as JSON. Registers and issues are stored in Firestore
        and update live.
      </p>

      {error ? (
        <div className="it-form-actions">
          <StatusBanner message={error} kind="crit" />
        </div>
      ) : null}

      {readError ? (
        <div className="it-form-actions">
          <StatusBanner message={readError} kind="crit" />
        </div>
      ) : null}

      <StatsStrip
        items={[
          { label: 'Registers', value: stats.registers },
          { label: 'Issues logged', value: stats.issues },
          { label: 'Open issues', value: stats.open },
          { label: 'Blocked', value: stats.blocked, crit: stats.blocked > 0 },
          { label: 'People', value: stats.people },
        ]}
      />

      <div className="it-section-label">
        [ REGISTER ] <span className="it-muted-text">{projects.length} REGISTER(S)</span>
      </div>

      {loading ? <div className="it-empty">LOADING REGISTERS…</div> : null}

      {!loading && projects.length === 0 ? (
        <div className="it-empty">NO REGISTERS YET — CREATE ONE BELOW</div>
      ) : null}

      <div className="it-grid">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            todos={todoMap[project.id] || []}
            lead={personById[project.leadId]}
            onEdit={() => setEditing(project)}
            onDelete={() => handleDelete(project)}
          />
        ))}
      </div>

      {/* EXAM 3 — <ProjectsForm> in CREATE mode lives on this page. */}
      <div className="it-section-label">
        [ NEW REGISTER ]
        <button
          id="btn-new-register"
          className="it-btn it-btn-mini it-section-action"
          type="button"
          onClick={() => document.getElementById('pf-name')?.focus()}
        >
          + NEW REGISTER
        </button>
      </div>
      <ProjectsForm mode="create" people={people} />

      {/* EXAM 3 — the SAME <ProjectsForm> component in UPDATE mode. */}
      {editing ? (
        <>
          <div className="it-section-label">[ EDIT REGISTER ]</div>
          <ProjectsForm
            mode="edit"
            project={editing}
            people={people}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </>
      ) : null}

      <div className="it-section-label">[ DATA ]</div>
      <div className="it-card">
        <p className="it-page-sub" style={{ marginBottom: 16 }}>
          Export writes every register — including the issues nested inside it — to a JSON file.
          Importing a file whose register ids already exist updates those registers instead of
          duplicating them.
        </p>
        <div className="it-form-actions" style={{ marginTop: 0 }}>
          <button className="it-btn it-btn-primary" type="button" onClick={handleExport}>
            ↧ EXPORT JSON
          </button>
          <label className="it-btn" htmlFor="import-file">
            ↥ IMPORT JSON
          </label>
          <input type="file" id="import-file" accept="application/json,.json" hidden onChange={handleImportFile} />
          <button className="it-btn it-btn-danger" type="button" onClick={handleReset}>
            ↺ RESET DEMO DATA
          </button>
          <StatusBanner message={dataStatus.message} kind={dataStatus.kind} />
        </div>

        <hr className="it-hr" />

        <label className="it-preview-toggle" htmlFor="import-text">
          ▸ IMPORT FROM TEXT (PASTE JSON)
        </label>
        <div className="it-field">
          <textarea
            className="it-input it-code"
            id="import-text"
            rows={5}
            placeholder='{"projects": [ ... ]}'
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
        </div>
        <div className="it-form-actions" style={{ marginTop: 0 }}>
          <button className="it-btn" type="button" onClick={handleImportText}>
            ↥ IMPORT FROM TEXT
          </button>
        </div>

        <hr className="it-hr" />

        <details className="it-preview" open={Boolean(exportPreview)}>
          <summary className="it-preview-toggle">▸ EXPORT PREVIEW</summary>
          <pre className="it-code">{exportPreview || '—'}</pre>
        </details>
      </div>
    </>
  )
}
