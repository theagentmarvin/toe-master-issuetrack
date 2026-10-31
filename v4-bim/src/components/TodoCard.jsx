/* =====================================================================
   IssueTrack — ToDo card (an issue).
   ---------------------------------------------------------------------
   EXAM 3 — the card shows the STATUS *and* the PRIORITY, each with
   its OWN distinct colour:
     • background tint  → the STATUS (Exam 2.9 behaviour, kept)
     • left rail (2 segments) → status colour (top) + priority colour
     • chips            → status chip + priority chip
   ===================================================================== */
import { Link } from 'react-router-dom'
import { STATUSES, statusInfo, priorityInfo } from '../lib/constants'
import { formatDate, shortId } from '../lib/format'

export default function TodoCard({ todo, assignee, projectId, onEdit, onDelete, onStatusChange }) {
  const status = statusInfo(todo.status)
  const priority = priorityInfo(todo.priority)

  return (
    <article className="it-todo" data-status={todo.status} data-priority={todo.priority}>
      {/* Left rail: status colour on top, priority colour underneath. */}
      <span className="it-todo-rail" aria-hidden="true">
        <span className="it-todo-rail-status" />
        <span className="it-todo-rail-priority" />
      </span>

      <div className="it-todo-body">
        <div className="it-todo-head">
          <span className="it-todo-title">{todo.title}</span>
          <span className="it-todo-chips">
            {/* Wave D — a BIM badge on pinned issues, deep-linking to the
                3D viewer focused on the pin. */}
            {todo.bimReference ? (
              <Link
                className="it-chip it-bim-badge"
                to={'/bim/' + projectId + '?issue=' + todo.id}
                title="Pinned in the 3D viewport"
              >
                ◈ BIM
              </Link>
            ) : null}
            <span className={'it-chip ' + priority.chip}>{priority.label}</span>
            <span className={'it-chip ' + status.chip}>{status.label}</span>
          </span>
        </div>

        {todo.description ? <p className="it-todo-desc">{todo.description}</p> : null}

        <div className="it-todo-meta">
          <span>Priority {priority.label}</span>
          <span>Assignee {assignee ? assignee.name : '—'}</span>
          <span>Due {formatDate(todo.due)}</span>
          <span className="it-num">{shortId(todo.id)}</span>
        </div>

        <div className="it-todo-controls">
          <label className="it-label" htmlFor={'status-' + todo.id}>
            Status
          </label>
          <select
            id={'status-' + todo.id}
            className="it-select"
            value={todo.status}
            onChange={(event) => onStatusChange(todo.id, event.target.value)}
          >
            {STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button className="it-btn it-btn-mini" type="button" onClick={() => onEdit(todo)}>
            ✎ EDIT
          </button>
          <button
            className="it-btn it-btn-mini it-btn-danger"
            type="button"
            onClick={() => onDelete(todo)}
          >
            ✕ DELETE
          </button>
        </div>
      </div>
    </article>
  )
}
