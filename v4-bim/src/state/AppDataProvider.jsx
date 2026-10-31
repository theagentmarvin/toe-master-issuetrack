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
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { subscribeProjects, createProject, updateProject, deleteProject } from '../services/projectsService'
import { subscribePeople, createPerson, updatePerson, deletePerson } from '../services/peopleService'
import { ensureSeedData, resetDemoData } from '../services/seed'
import { MIN_NAME_LENGTH } from '../lib/constants'

const AppDataContext = createContext(null)

/* Keeps the first row of every id — the list must never show the same
   register twice (DEFECT 2: the optimistic row and the server row
   could otherwise live side by side). */
function dedupeById(list) {
  const seen = new Set()
  return list.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function AppDataProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [seeded, setSeeded] = useState(false)

  /* Previous rows, kept for the rollback of a failed write (DEFECT 7). */
  const projectsRef = useRef([])
  const peopleRef = useRef([])
  /* temporaryId -> serverId, so the optimistic row can be dropped as
     soon as the real document arrives (DEFECT 2). */
  const tempMapRef = useRef(new Map())

  useEffect(() => {
    projectsRef.current = projects
  }, [projects])

  useEffect(() => {
    peopleRef.current = people
  }, [people])

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
            /* Firestore is the source of truth. Optimistic (pending)
               rows are only kept while their server document has NOT
               arrived yet, and the result is always unique by id. */
            setProjects((previous) => {
              const incomingIds = new Set(incoming.map((item) => item.id))
              const optimistic = previous.filter((item) => {
                if (!item._pending) return false
                const serverId = tempMapRef.current.get(item.id)
                return !(serverId && incomingIds.has(serverId))
              })
              return dedupeById([...incoming, ...optimistic])
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
            setPeople((previous) => {
              const incomingIds = new Set(incoming.map((item) => item.id))
              const optimistic = previous.filter((item) => {
                if (!item._pending) return false
                const serverId = tempMapRef.current.get(item.id)
                return !(serverId && incomingIds.has(serverId))
              })
              return dedupeById([...incoming, ...optimistic])
            })
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

      /* The server document now owns this row: remember the mapping and
         drop the temporary one (DEFECT 2 — no temp + server duplicate). */
      tempMapRef.current.set(temporaryId, saved.id)
      setProjects((previous) => {
        const withoutTemp = previous.filter((item) => item.id !== temporaryId)
        /* the snapshot may already carry the server row → do not add it twice */
        if (withoutTemp.some((item) => item.id === saved.id)) return withoutTemp
        return [...withoutTemp, saved]
      })
      return { ok: true, project: saved }
    } catch (err) {
      tempMapRef.current.delete(temporaryId)
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

    /* The row as it was BEFORE the write — restored if the write fails. */
    const previousRow = projectsRef.current.find((item) => item.id === id)

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
      /* DEFECT 7 — restore the previous values, otherwise the form would
         look saved while Firestore still holds the old ones. */
      if (previousRow) {
        setProjects((previous) =>
          previous.map((item) => (item.id === id ? previousRow : item)),
        )
      }
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
      /* Same rule as the registers: the temporary row is replaced by the
         server row, never duplicated next to it (DEFECT 2). */
      tempMapRef.current.set(temporaryId, saved.id)
      setPeople((previous) => {
        const withoutTemp = previous.filter((item) => item.id !== temporaryId)
        if (withoutTemp.some((item) => item.id === saved.id)) return withoutTemp
        return [...withoutTemp, saved]
      })
      return { ok: true, person: saved }
    } catch (err) {
      tempMapRef.current.delete(temporaryId)
      setPeople((previous) => previous.filter((item) => item.id !== temporaryId))
      return { ok: false, error: 'SAVE FAILED — ' + err.message }
    }
  }, [])

  const updatePersonLocal = useCallback(async (id, values) => {
    const payload = { ...values, name: String(values.name || '').trim() }
    /* The row as it was BEFORE the write — restored if the write fails. */
    const previousRow = peopleRef.current.find((item) => item.id === id)
    setPeople((previous) => previous.map((item) => (item.id === id ? { ...item, ...payload } : item)))
    try {
      const saved = await updatePerson(id, payload)
      setPeople((previous) => previous.map((item) => (item.id === id ? { ...item, ...saved } : item)))
      return { ok: true, person: saved }
    } catch (err) {
      /* DEFECT 7 — mirror of the register path: restore the old row. */
      if (previousRow) {
        setPeople((previous) => previous.map((item) => (item.id === id ? previousRow : item)))
      }
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
