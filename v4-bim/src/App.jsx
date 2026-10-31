/* =====================================================================
   IssueTrack — Wave B (Exam 3) → extended with Wave C (Exam 4).
   Routes:
     /             → register index  (<ProjectsPage>)
     /project/:id  → register detail (<ProjectDetailsPage>)
     /bim/:id      → BIM viewer     (<BimPage>)
     /people       → people directory (<PeoplePage>)
   ===================================================================== */
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppDataProvider } from './state/AppDataProvider'
import Layout from './components/Layout'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailsPage from './pages/ProjectDetailsPage'
import PeoplePage from './pages/PeoplePage'

/* The BIM route is lazy-loaded so the heavy That Open / three / web-ifc
   bundle is fetched only when a register's 3D viewport is opened — the
   registers / issues / people pages stay fast. */
const BimPage = lazy(() => import('./pages/BimPage'))

function NotFound() {
  return (
    <div className="it-empty">
      PAGE NOT FOUND — <Link to="/">BACK TO THE REGISTER INDEX</Link>
    </div>
  )
}

export default function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/project/:id" element={<ProjectDetailsPage />} />
            <Route
              path="/bim/:id"
              element={
                <Suspense fallback={<div className="it-empty">LOADING BIM VIEWPORT…</div>}>
                  <BimPage />
                </Suspense>
              }
            />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppDataProvider>
  )
}
