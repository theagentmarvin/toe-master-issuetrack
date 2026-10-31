/* =====================================================================
   IssueTrack — Wave B (Exam 3) — React + Firebase.
   Routes:
     /             → register index  (<ProjectsPage>)
     /project/:id  → register detail (<ProjectDetailsPage>)
     /people       → people directory (<PeoplePage>)
   ===================================================================== */
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AppDataProvider } from './state/AppDataProvider'
import Layout from './components/Layout'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailsPage from './pages/ProjectDetailsPage'
import PeoplePage from './pages/PeoplePage'

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
            <Route path="/people" element={<PeoplePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppDataProvider>
  )
}
