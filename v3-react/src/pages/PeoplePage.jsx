/* =====================================================================
   IssueTrack — people page (route "/people").
   ---------------------------------------------------------------------
   Exam 1 behaviour kept: a directory of the assignees (rows, NOT the
   register cards) + a form to add new people. The people live in the
   Firestore `people` collection.
   ===================================================================== */
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../state/AppDataProvider'
import { fetchTodos } from '../services/todosService'
import PeopleTable from '../components/PeopleTable'
import PersonForm from '../components/PersonForm'
import StatsStrip from '../components/StatsStrip'
import StatusBanner from '../components/StatusBanner'

export default function PeoplePage() {
  const { projects, people, loading, error, deletePerson } = useAppData()
  const [editing, setEditing] = useState(null)
  const [issueCounts, setIssueCounts] = useState({})
  const [status, setStatus] = useState({ message: '', kind: '' })

  /* How many issues each person carries (across every register). */
  const projectKey = projects.map((project) => project.id).join('|')

  useEffect(() => {
    let alive = true
    async function countIssues() {
      const counts = {}
      for (const project of projects) {
        const todos = await fetchTodos(project.id)
        todos.forEach((todo) => {
          if (!todo.assigneeId) return
          counts[todo.assigneeId] = (counts[todo.assigneeId] || 0) + 1
        })
      }
      if (!alive) return
      setIssueCounts(counts)
    }
    if (projects.length) countIssues()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey])

  const stats = useMemo(() => {
    const roles = new Set(people.map((person) => person.role).filter(Boolean))
    const assigned = Object.values(issueCounts).reduce((total, value) => total + value, 0)
    return { people: people.length, roles: roles.size, assigned }
  }, [people, issueCounts])

  async function handleDelete(person) {
    if (!window.confirm('DELETE PERSON ' + person.name.toUpperCase() + ' FROM THE DIRECTORY?')) return
    const result = await deletePerson(person.id)
    setStatus(
      result.ok
        ? { message: 'PERSON DELETED', kind: 'warn' }
        : { message: result.error, kind: 'crit' },
    )
  }

  return (
    <>
      <h1 className="it-page-title">PEOPLE</h1>
      <p className="it-page-sub">
        Directory of the people issues can be assigned to. Rows, not cards — the register index
        uses tiles, this page reads like a roster. Everyone is stored in the Firestore{' '}
        <span className="it-code-inline">people</span> collection.
      </p>

      {error ? (
        <div className="it-form-actions">
          <StatusBanner message={error} kind="crit" />
        </div>
      ) : null}

      <StatsStrip
        items={[
          { label: 'People', value: stats.people },
          { label: 'Roles', value: stats.roles },
          { label: 'Assigned issues', value: stats.assigned },
        ]}
      />

      <div className="it-section-label">
        [ DIRECTORY ] <span className="it-muted-text">{people.length} PEOPLE</span>
      </div>

      {loading ? <div className="it-empty">LOADING DIRECTORY…</div> : null}
      {!loading ? (
        <PeopleTable
          people={people}
          issueCounts={issueCounts}
          onEdit={(person) => setEditing(person)}
          onDelete={handleDelete}
        />
      ) : null}

      {/* EXAM 1 — the form to add new users (and to edit them). */}
      <div className="it-section-label">
        [ NEW PERSON ]
        <button
          id="btn-new-person"
          className="it-btn it-btn-mini it-section-action"
          type="button"
          onClick={() => {
            setEditing(null)
            document.getElementById('pe-name')?.focus()
          }}
        >
          + NEW PERSON
        </button>
      </div>
      <PersonForm
        person={editing}
        onSaved={() => setEditing(null)}
        onCancel={editing ? () => setEditing(null) : undefined}
      />

      <div className="it-form-actions">
        <StatusBanner message={status.message} kind={status.kind} />
      </div>
    </>
  )
}
