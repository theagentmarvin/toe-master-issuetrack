/* =====================================================================
   IssueTrack — register detail page (route "/project/:id").
   ---------------------------------------------------------------------
   • the register header + its label:value rows
   • <ProjectsForm> in UPDATE mode — the SAME component used on the
     index page                                        (Exam 3, item 1)
   • <ProjectTasksList> — the ToDo cards, the <SearchBox> and the
     <TodoForm>, all reading/writing the `todos` subcollection
                                                       (Exam 3, items 2+3)
   ===================================================================== */
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../state/AppDataProvider'
import { iconLetters, formatDate } from '../lib/format'
import { projectState } from '../lib/constants'
import ProjectsForm from '../components/ProjectsForm'
import ProjectTasksList from '../components/ProjectTasksList'
import StatusBanner from '../components/StatusBanner'

export default function ProjectDetailsPage() {
  const { id } = useParams()
  const { projects, people, loading, error } = useAppData()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState({ message: '', kind: '' })
  /* The issues of this register, lifted from <ProjectTasksList> so the
     state chip below is computed from the REAL todo count. */
  const [todos, setTodos] = useState([])
  const handleTodosChange = useCallback((incoming) => setTodos(incoming), [])

  const project = projects.find((item) => item.id === id)
  const lead = project ? people.find((person) => person.id === project.leadId) : null

  if (!project) {
    return (
      <>
        <Link className="it-breadcrumb" to="/">
          ← ALL REGISTERS
        </Link>
        {loading ? <div className="it-empty">LOADING REGISTER…</div> : null}
        {!loading ? (
          <div className="it-empty">
            {error ? error : 'REGISTER NOT FOUND — ' + id}
          </div>
        ) : null}
      </>
    )
  }

  const state = projectState(project, todos)

  return (
    <>
      <Link className="it-breadcrumb" to="/">
        ← ALL REGISTERS
      </Link>

      <div className="it-detail-head">
        {/* Exam 2.1 + 2.2 — first two letters, random house color. */}
        <span className="it-tile" style={{ background: project.color }}>
          {iconLetters(project.name)}
        </span>
        <div className="it-detail-title-wrap">
          <h1 className="it-detail-title">{project.name}</h1>
          <div className="it-detail-meta">
            <span className={'it-chip ' + state.chip}>{state.label}</span>
            <span className="it-muted-text">{project.code || project.id}</span>
            <span className="it-muted-text it-num">{project.id}</span>
          </div>
        </div>
        <button
          className="it-btn"
          type="button"
          onClick={() => setEditing((value) => !value)}
        >
          ✎ {editing ? 'CLOSE EDIT' : 'EDIT REGISTER INFO'}
        </button>
      </div>

      <dl className="it-detail-kv">
        <div>
          <dt>Register code</dt>
          <dd>{project.code || '—'}</dd>
        </div>
        <div>
          <dt>Site</dt>
          <dd>{project.site || '—'}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd className="it-num">{formatDate(project.date)}</dd>
        </div>
        <div>
          <dt>Lead</dt>
          <dd>{lead ? lead.name : '—'}</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>{(project.status || 'active').toUpperCase()}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{project.description || '—'}</dd>
        </div>
      </dl>

      {/* EXAM 3 — <ProjectsForm> in UPDATE mode, nested on the detail page. */}
      {editing ? (
        <>
          <div className="it-section-label">[ EDIT REGISTER INFO ]</div>
          <ProjectsForm
            mode="edit"
            project={project}
            people={people}
            onSaved={(savedProject) => {
              setSaved({
                message: 'REGISTER UPDATED — ' + savedProject.name.toUpperCase(),
                kind: 'ok',
              })
            }}
            onCancel={() => setEditing(false)}
          />
        </>
      ) : null}

      <div className="it-form-actions">
        <StatusBanner message={saved.message} kind={saved.kind} />
      </div>

      {/* EXAM 3 — <ProjectTasksList>: ToDo cards + <SearchBox> + <TodoForm>. */}
      <div className="it-section-label">[ ISSUES ]</div>
      <ProjectTasksList projectId={project.id} onTodosChange={handleTodosChange} />
    </>
  )
}
