/* =====================================================================
   IssueTrack — Pinned Issues panel (Wave D / D2).
   ---------------------------------------------------------------------
   Shows every issue pinned to the CURRENT element (not just the newest)
   as a switchable list. Each row focuses its pin in the viewport:
   selects the element, flies the camera and highlights that pin.

   Fixes UX finding #4 ("only the newest pinned issue is reachable"):
   the panel now lists ALL issues on the clicked/pinned element, newest
   first, each with a FOCUS action.
   ===================================================================== */
import { Link } from 'react-router-dom'
import { statusInfo, priorityInfo } from '../lib/constants'

export default function PinnedIssuesPanel({ issues = [], activeIssueId, registerId, onFocus }) {
  if (!issues.length) return null

  const plural = issues.length > 1

  return (
    <section className="it-card it-bim-panel" data-testid="pinned-issue">
      <div className="it-card-head">
        <span className="it-label">[ PINNED {plural ? 'ISSUES' : 'ISSUE'} ]</span>
        <span className="it-num it-muted-text">{issues.length}</span>
      </div>

      <div className="it-pinned-list">
        {issues.map((issue) => {
          const status = statusInfo(issue.status)
          const priority = priorityInfo(issue.priority)
          const active = issue.id === activeIssueId
          return (
            <div
              key={issue.id}
              className={'it-pinned-row' + (active ? ' it-pinned-row-active' : '')}
              data-testid="pinned-issue-row"
              data-issue-id={issue.id}
              role="button"
              tabIndex={0}
              onClick={() => onFocus(issue)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onFocus(issue)
                }
              }}
            >
              <div className="it-pinned-row-head">
                <span className="it-pinned-row-title">{issue.title}</span>
                <button
                  className="it-btn it-btn-mini"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onFocus(issue)
                  }}
                >
                  ↖ FOCUS
                </button>
              </div>
              {issue.description ? (
                <p className="it-todo-desc it-pinned-row-desc">{issue.description}</p>
              ) : null}
              <div className="it-todo-chips">
                <span className={'it-chip ' + priority.chip}>{priority.label}</span>
                <span className={'it-chip ' + status.chip}>{status.label}</span>
                <span className="it-num it-muted-text">{issue.id}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="it-form-actions">
        <Link className="it-btn" to={'/project/' + registerId}>
          → OPEN IN REGISTER
        </Link>
      </div>
    </section>
  )
}