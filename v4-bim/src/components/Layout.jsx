/* =====================================================================
   IssueTrack — app shell (top bar + side navigation).
   ---------------------------------------------------------------------
   The shell is shared by the three routes:
     /            → register index
     /project/:id → register detail
     /people      → people directory
   The primary action of the top bar follows the current route and is
   driven by plain DOM ids (no extra state library).
   ===================================================================== */
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAppData } from '../state/AppDataProvider'
import { todayISO } from '../lib/format'

/* Primary action per route: [ label, id of the button to trigger ].
   BIM routes return a link target instead of a dead coral CTA. */
function actionFor(pathname) {
  if (pathname === '/bim/demo') {
    return { label: '↩ LANDING PAGE', target: '', to: '/', link: true, section: 'BIM' }
  }
  if (pathname.startsWith('/bim/')) {
    const segments = pathname.split('/')
    const registerId = segments[2] || ''
    return {
      label: '↩ REGISTER VIEW',
      target: '',
      to: registerId ? '/project/' + registerId : '/',
      link: true,
      section: 'BIM',
    }
  }
  if (pathname.startsWith('/project/')) {
    return { label: '+ NEW ISSUE', target: 'btn-new-issue', section: 'REGISTER DETAIL' }
  }
  if (pathname.startsWith('/people')) {
    return { label: '+ NEW PERSON', target: 'btn-new-person', section: 'PEOPLE' }
  }
  return { label: '+ NEW REGISTER', target: 'btn-new-register', section: 'REGISTER INDEX' }
}

export default function Layout({ children }) {
  const { projects, people } = useAppData()
  const location = useLocation()
  const action = actionFor(location.pathname)
  /* Wave D layout round — the BIM page is full-bleed (no left nav). */
  const isBim = location.pathname.startsWith('/bim/')

  function runPrimaryAction() {
    const target = document.getElementById(action.target)
    if (target) {
      target.click()
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <>
      <header className="it-topbar">
        <span className="it-title">ISSUETRACK</span>
        <span className="it-muted-text">/ {action.section}</span>
        <span className="it-meta it-num">
          {todayISO()} &nbsp;·&nbsp; {projects.length} REGISTERS &nbsp;·&nbsp; {people.length} PEOPLE
        </span>
        {action.link ? (
          <Link className="it-btn" to={action.to}>
            {action.label}
          </Link>
        ) : (
          <button
            className="it-btn it-btn-primary"
            type="button"
            onClick={runPrimaryAction}
            disabled={!action.target}
          >
            {action.label}
          </button>
        )}
      </header>

      {isBim ? (
        /* Full-bleed: the viewer owns the whole window below the topbar. */
        <main className="it-bim-full">{children}</main>
      ) : (
        <div className="it-layout">
          <aside className="it-side">
          <div className="it-section-label" style={{ marginTop: 0 }}>
            [ NAV ]
          </div>
          <nav className="it-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'it-active' : '')}>
              ▸ Registers
            </NavLink>
            <NavLink to="/people" className={({ isActive }) => (isActive ? 'it-active' : '')}>
              ▸ People
            </NavLink>
            {/* Wave D — public BIM demo, no account needed. */}
            <NavLink to="/bim/demo" className={({ isActive }) => (isActive ? 'it-active' : '')}>
              ◈ BIM Demo
            </NavLink>
          </nav>

          <div className="it-section-label">[ REGISTERS ]</div>
          <div className="it-side-list">
            {projects.length === 0 ? (
              <div className="it-muted-text">NO REGISTERS</div>
            ) : (
              projects.map((project) => (
                <Link className="it-side-link" key={project.id} to={'/project/' + project.id}>
                  <span>
                    {project.code || project.id} · {project.name}
                  </span>
                </Link>
              ))
            )}
          </div>

          <div className="it-section-label">[ ABOUT ]</div>
          <p className="it-muted-text it-note">
            React + Firebase build.
            <br />
            Registers live in Firestore; every register owns its issues.
          </p>
        </aside>

        <main className="it-main">{children}</main>
      </div>
      )}
    </>
  )
}
