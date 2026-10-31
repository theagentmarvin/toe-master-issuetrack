/* =====================================================================
   IssueTrack — people directory (rows, NOT cards).
   ---------------------------------------------------------------------
   Exam 1: the people page must look different from the register cards
   — a flat roster with hairline rows and outline avatars.
   ===================================================================== */
import { initials } from '../lib/format'

export default function PeopleTable({ people, issueCounts, onEdit, onDelete }) {
  if (!people.length) {
    return (
      <div className="it-empty">
        NOBODY IN THE DIRECTORY YET — ADD THE FIRST ONE BELOW
      </div>
    )
  }

  return (
    <table className="it-dir">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Role</th>
          <th scope="col">Email</th>
          <th scope="col">Phone</th>
          <th scope="col" className="it-dir-num">
            Issues
          </th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {people.map((person) => (
          <tr key={person.id}>
            <td>
              <div className="it-person-cell">
                <span className="it-avatar">{initials(person.name)}</span>
                <span className="it-person-name">{person.name}</span>
              </div>
            </td>
            <td>{person.role}</td>
            <td>{person.email || '—'}</td>
            <td>{person.phone || '—'}</td>
            <td className="it-dir-num it-num">{issueCounts[person.id] || 0}</td>
            <td>
              <div className="it-row-actions">
                <button className="it-btn it-btn-mini" type="button" onClick={() => onEdit(person)}>
                  ✎ EDIT
                </button>
                <button
                  className="it-btn it-btn-mini it-btn-danger"
                  type="button"
                  onClick={() => onDelete(person)}
                >
                  ✕ DELETE
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
