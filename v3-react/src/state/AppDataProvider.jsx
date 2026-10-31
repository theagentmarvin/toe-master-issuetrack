/* =====================================================================
   IssueTrack — shared app data (React context).
   ---------------------------------------------------------------------
   Owns the live Firestore subscriptions for the two TOP-LEVEL
   collections (`projects` and `people`) and exposes the write helpers.
   Every write happens in TWO places, exactly as Exam 3 asks:
       1. LOCALLY  — the React state is updated immediately (optimistic)
       2. IN FIREBASE — the document is written to Firestore
   The live onSnapshot feed then reconciles both.
   The issues (ToDos) are NOT here: they belong to a single register and
   are owned by <ProjectTasksList>.
   ===================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeProjects, createProject, updateProject, deleteProject } from '../services/projectsService'
import { subscribePeople, createPerson, updatePerson, deletePerson } from '../services/peopleService'
import { ensureSeedData, resetDemoData } from '../services/seed'
import { MIN_NAME_LENGTH } from '../lib/constants'

const AppDataContext = createContext(null)

export function AppDataProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [seeded, setSeeded] = useState(false)

  /* ------------------------------------------------------------------
     Seed once, then subscribe live to Firestore.
     ------------------------------------------------------------------ */
  useEffect(() => {
    let alive = true

    async function start() {
      try {
        await ensureSeedData()
        if (!alive) return
        setSeeded(true)

        const stopProjects = subscribeProjects(
          (incoming) => {
            if (!alive) return
            /* Firestore is the source of truth; optimistic (pending)
               local rows are kept until the server copy shows up. */
            setProjects((previous) => {
              const pending = previous.filter(
                (item) => item._pending && !incoming.some((fresh) => fresh.id === item.id),
              )
              return [...incoming, ...pending]
            })
            setError('')
            setLoading(false)
          },
          (err) => {
            if (!alive) return
            setError('FIRESTORE READ FAILED — ' + err.message)
            setLoading(false)
          },
        )

        const stopPeople = subscribePeople(
          (incoming) => {
            if (!alive) return
            setPeople(incoming)
          },
          (err) => {
            if (!alive) return
            setError('FIRESTORE READ FAILED — ' + err.message)
          },
        )

        return () => {
          stopProjects()
          stopPeople()
        }
      } catch (err) {
        if (!alive) return
        setError('FIRESTORE UNREACHABLE — ' + err.message)
        setLoading(false)
      }
    }

    let stop = null
    start().then((cleanup) => {
      stop = cleanup
    })
    return () => {
      alive = false
      if (stop) stop()
    }
  }, [])

  /* ------------------------------------------------------------------
     Register (project) writes — local state + Firestore.
     ------------------------------------------------------------------ */
  const createProjectLocal = useCallback(async (values) => {
    const name = String(values.name || '').trim()
    if (name.length < MIN_NAME_LENGTH) {
      return { ok: false, error: 'NAME TOO SHORT — MIN ' + MIN_NAME_LENGTH + ' CHARACTERS' }
    }

    const payload = { ...values, name }
    const temporaryId = 'local-' + Date.now()

    /* 1. LOCAL — the new register appears in the list right away. */
    setProjects((previous) => [...previous, { ...payload, id: temporaryId, _pending: true }])

    try {
      /* 2. FIREBASE — the real document is written. */
      const saved = await createProject(payload)
      setProjects((previous) =>
        previous.map((item) => (item.id === temporaryId ? { ...saved, _pending: false } : item)),
      )
      return { ok: true, project: saved }
    } catch (err) {
      setProjects((previous) => previous.filter((item) => item.id !== temporaryId))
      return { ok: false, error: 'SAVE FAILED — ' + err.message }
    }
  }, [])

  const updateProjectLocal = useCallback(async (id, values) => {
    const name = String(values.name || '').trim()
    if (name.length < MIN_NAME_LENGTH) {
      return { ok: false, error: 'NAME TOO SHORT — MIN ' + MIN_NAME_LENGTH + ' CHARACTERS' }
    }

    const payload = { ...values, name }

    /* 1. LOCAL — the list shows the new values immediately. */
    setProjects((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...payload } : item)),
    )

    try {
      /* 2. FIREBASE — the same values are persisted. */
      const saved = await updateProject(id, payload)
      setProjects((previous) =>
        previous.map((item) => (item.id === id ? { ...item, ...saved } : item)),
      )
      return { ok: true, project: saved }
    } catch (err) {
      return { ok: false, error: 'SAVE FAILED — ' + err.message }
    }
  }, [])

  const removeProject = useCallback(async (id) => {
    setProjects((previous) => previous.filter((item) => item.id !== id))
    try {
      await deleteProject(id)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: 'DELETE FAILED — ' + err.message }
    }
  }, [])

  /* ------------------------------------------------------------------
     People writes — local state + Firestore.
     ------------------------------------------------------------------ */
  const createPersonLocal = useCallback(async (values) => {
    const name = String(values.name || '').trim()
    if (name.length < 2) return { ok: false, error: 'NAME TOO SHORT — MIN 2 CHARACTERS' }

    const payload = { ...values, name }
    const temporaryId = 'local-' + Date.now()
    setPeople((previous) => [...previous, { ...payload, id: temporaryId, _pending: true }])

    try {
      const saved = await createPerson(payload)
      setPeople((previous) =>
        previous.map((item) => (item.id === temporaryId ? { ...saved, _pending: false } : item)),
      )
      return { ok: true, person: saved }
    } catch (err) {
      setPeople((previous) => previous.filter((item) => item.id !== temporaryId))
      return { ok: false, error: 'SAVE FAILED — ' + err.message }
    }
  }, [])

  const updatePersonLocal = useCallback(async (id, values) => {
    const payload = { ...values, name: String(values.name || '').trim() }
    setPeople((previous) => previous.map((item) => (item.id === id ? { ...item, ...payload } : item)))
    try {
      const saved = await updatePerson(id, payload)
      setPeople((previous) => previous.map((item) => (item.id === id ? { ...item, ...saved } : item)))
      return { ok: true, person: saved }
    } catch (err) {
      return { ok: false, error: 'SAVE FAILED — ' + err.message }
    }
  }, [])

  const removePerson = useCallback(async (id) => {
    setPeople((previous) => previous.filter((item) => item.id !== id))
    try {
      await deletePerson(id)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: 'DELETE FAILED — ' + err.message }
    }
  }, [])

  const resetDemo = useCallback(async () => {
    const result = await resetDemoData()
    return result
  }, [])

  const value = useMemo(
    () => ({
      projects,
      people,
      loading,
      error,
      seeded,
      createProject: createProjectLocal,
      updateProject: updateProjectLocal,
      deleteProject: removeProject,
      createPerson: createPersonLocal,
      updatePerson: updatePersonLocal,
      deletePerson: removePerson,
      resetDemo,
    }),
    [
      projects,
      people,
      loading,
      error,
      seeded,
      createProjectLocal,
      updateProjectLocal,
      removeProject,
      createPersonLocal,
      updatePersonLocal,
      removePerson,
      resetDemo,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used inside <AppDataProvider>')
  return context
}
