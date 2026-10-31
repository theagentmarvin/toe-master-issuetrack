/* =====================================================================
   IssueTrack — <ProjectTasksList>
   ---------------------------------------------------------------------
   EXAM 3 — the MAIN component that holds the ToDo cards on the
   project details page.
     • it subscribes LIVE to the `todos` subcollection of the register
       (onSnapshot) → the issues are retrieved when entering a project
     • it embeds <SearchBox> → the cards are filtered live
     • it embeds <TodoForm>  → issues are created AND updated
     • it renders <TodoCard> for every issue
   ===================================================================== */
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../state/AppDataProvider'
import { subscribeTodos, deleteTodo, updateTodo } from '../services/todosService'
import { statusInfo, priorityInfo } from '../lib/constants'
import SearchBox from './SearchBox'
import TodoCard from './TodoCard'
import TodoForm from './TodoForm'
import StatusBanner from './StatusBanner'

/* Free-text filter used by the SearchBox: title, description, status,
   priority and assignee all match. */
function matches(todo, query, assigneeName) {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    todo.title,
    todo.description,
    statusInfo(todo.status).label,
    priorityInfo(todo.priority).label,
    assigneeName || '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export default function ProjectTasksList({ projectId, onTodosChange }) {
  const { people } = useAppData()
  const [todos, setTodos] = useState([])
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState({ message: '', kind: '' })
  const [loading, setLoading] = useState(true)

  /* ------------------------------------------------------------------
     EXAM 3 — the issues of this register are retrieved from Firestore
     (live subscription) as soon as the page is opened.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!projectId) return undefined
    setLoading(true)
    setTodos([])
    setQuery('')
    setFormOpen(false)
    setEditing(null)

    const stop = subscribeTodos(
      projectId,
      (incoming) => {
        setTodos(incoming)
        setLoading(false)
        /* Lift the issues to the details page so its state chip can be
           computed from the REAL todo count (defect 5). */
        if (onTodosChange) onTodosChange(incoming)
      },
      (err) => {
        setStatus({ message: 'FIRESTORE READ FAILED — ' + err.message, kind: 'crit' })
        setLoading(false)
      },
    )
    return stop
  }, [projectId, onTodosChange])

  const personById = useMemo(() => {
    const map = {}
    people.forEach((person) => {
      map[person.id] = person
    })
    return map
  }, [people])

  const filtered = useMemo(
    () => todos.filter((todo) => matches(todo, query, personById[todo.assigneeId]?.name)),
    [todos, query, personById],
  )

  const openCount = todos.filter((todo) => todo.status !== 'done').length

  /* Quick status switch straight from the card (Exam 2.9). */
  async function handleStatusChange(todoId, nextStatus) {
    const previous = todos
    setTodos((current) =>
      current.map((todo) => (todo.id === todoId ? { ...todo, status: nextStatus } : todo)),
    )
    try {
      await updateTodo(projectId, todoId, { status: nextStatus })
      setStatus({
        message: 'ISSUE ' + todoId.toUpperCase() + ' — STATUS NOW ' + nextStatus.toUpperCase(),
        kind: 'ok',
      })
    } catch (err) {
      setTodos(previous)
      setStatus({ message: 'UPDATE FAILED — ' + err.message, kind: 'crit' })
    }
  }

  /* Destructive control → coral + confirmation (house rule 12). */
  async function handleDelete(todo) {
    if (!window.confirm('DELETE ISSUE ' + todo.id.toUpperCase() + ' FROM THIS REGISTER?')) return
    try {
      await deleteTodo(projectId, todo.id)
      setTodos((current) => current.filter((item) => item.id !== todo.id))
      setStatus({ message: 'ISSUE ' + todo.id.toUpperCase() + ' DELETED', kind: 'warn' })
    } catch (err) {
      setStatus({ message: 'DELETE FAILED — ' + err.message, kind: 'crit' })
    }
  }

  /* The form wrote to Firestore → refresh the local list right away
     (the live subscription confirms it a moment later). */
  function handleSaved(todo, mode) {
    setTodos((current) => {
      if (mode === 'update') {
        return current.map((item) => (item.id === todo.id ? { ...item, ...todo } : item))
      }
      /* DEFECT 1 — the live subscription usually already delivered the
         new document (the write is local to the Firestore client), so
         appending it again would show the same card twice. */
      if (current.some((item) => item.id === todo.id)) return current
      return [...current, { ...todo, _pending: true }]
    })
    setEditing(null)
    setFormOpen(false)
  }

  function startCreate() {
    setEditing(null)
    setFormOpen(true)
    setStatus({ message: '', kind: '' })
  }

  function startEdit(todo) {
    setEditing(todo)
    setFormOpen(true)
    setStatus({ message: '', kind: '' })
  }

  return (
    <div className="it-tasks">
      <div className="it-tasks-head">
        <button id="btn-new-issue" className="it-btn it-btn-primary" type="button" onClick={startCreate}>
          + NEW ISSUE
        </button>
        <span className="it-num it-muted-text">
          {openCount} OPEN / {todos.length} TOTAL
        </span>
        <StatusBanner message={status.message} kind={status.kind} />
      </div>

      {/* EXAM 3 — the SearchBox lives inside the list and filters the
          ToDo cards live, while the user types. */}
      <SearchBox
        id="search-todos"
        label="Search issues"
        placeholder="TITLE, STATUS, PRIORITY…"
        hint={query ? filtered.length + ' MATCH / ' + todos.length : 'FILTERS THE CARDS BELOW'}
        value={query}
        onChange={setQuery}
      />

      {formOpen ? (
        <TodoForm
          projectId={projectId}
          people={people}
          editingTodo={editing}
          onSaved={handleSaved}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      ) : null}

      {loading ? <div className="it-empty">LOADING ISSUES…</div> : null}

      {!loading && todos.length === 0 ? (
        <div className="it-empty">NO ISSUES LOGGED IN THIS REGISTER YET</div>
      ) : null}

      {!loading && todos.length > 0 && filtered.length === 0 ? (
        <div className="it-empty">NO ISSUE MATCHES “{query}”</div>
      ) : null}

      <div className="it-todo-list">
        {filtered.map((todo) => (
          <TodoCard
            key={todo.id}
            todo={todo}
            assignee={personById[todo.assigneeId]}
            projectId={projectId}
            onEdit={startEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  )
}
