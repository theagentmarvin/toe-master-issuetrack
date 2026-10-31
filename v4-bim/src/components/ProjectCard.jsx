/* =====================================================================
   IssueTrack — register card (the projects list tile).
   ---------------------------------------------------------------------
   Exam 2.1 — the tile shows the FIRST TWO LETTERS of the register
   name; the uppercasing is done in CSS (.it-tile { text-transform:
   uppercase; }).
   Exam 2.2 — the tile background is a RANDOM house color, stored
   with the register in Firestore.
   ===================================================================== */
import { Link } from 'react-router-dom'
import { iconLetters, formatDate } from '../lib/format'
import { projectState } from '../lib/constants'

export default function ProjectCard({ project, todos = [], lead, onEdit, onDelete }) {
  const open = todos.filter((todo) => todo.status !== 'done').length
  const blocked = todos.filter((todo) => todo.status === 'blocked').length
  const state = projectState(project, todos)

  return (
    <article className="it-card it-project-card" data-project-id={project.id}>
      <div className="it-card-head">
        <span className="it-label">
          {project.code || project.id} / {project.name}
        </span>
        <Link className="it-card-open" to={'/project/' + project.id}>
          ↗ OPEN
        </Link>
      </div>

      <div className="it-project-body">
        {/* Exam 2.1 + 2.2 — first two letters + random house color. */}
        <span className="it-tile" style={{ background: project.color }}>
          {iconLetters(project.name)}
        </span>
        <dl className="it-kv it-kv-grow">
          <dt>Issues</dt>
          <dd className="it-num">
            {open} open / {todos.length}
          </dd>
          <dt>Blocked</dt>
          <dd className="it-num">{blocked}</dd>
          <dt>Lead</dt>
          <dd>{lead ? lead.name : '—'}</dd>
          <dt>Date</dt>
          <dd className="it-num">{formatDate(project.date)}</dd>
        </dl>
        <span className={'it-chip ' + state.chip}>{state.label}</span>
      </div>

      <div className="it-project-actions">
        <button className="it-btn it-btn-mini" type="button" onClick={onEdit}>
          ✎ EDIT
        </button>
        <button className="it-btn it-btn-mini it-btn-danger" type="button" onClick={onDelete}>
          ✕ DELETE
        </button>
      </div>
    </article>
  )
}
