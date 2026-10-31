/* =====================================================================
   IssueTrack — projects service (Firestore).
   ---------------------------------------------------------------------
   Firestore layout (Exam 3):
     projects/{projectId}                → name, code, site, description,
                                           date, leadId, color, status
     projects/{projectId}/todos/{todoId} → id, title, description, status,
                                           priority, createdAt (+ assigneeId, due)
   Every function is a thin, readable wrapper around the modular SDK.
   ===================================================================== */
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { todayISO, toISO } from '../lib/format'
import { pickIconColor } from '../lib/constants'
import { fetchPeople } from './peopleService'

const PROJECTS = 'projects'

/* Firestore document -> plain object used by React. */
function toProject(snapshot) {
  const data = snapshot.data() || {}
  return {
    id: snapshot.id,
    name: data.name || '',
    code: data.code || '',
    site: data.site || '',
    description: data.description || '',
    /* Exam 2.4 — an empty date always falls back to today. */
    date: data.date || todayISO(),
    leadId: data.leadId || null,
    /* Exam 2.2 — the random house color is stored with the register. */
    color: data.color || pickIconColor(),
    status: data.status || 'active',
    createdAt: toISO(data.createdAt),
  }
}

/* -------------------------------------------------------------------
   Live reads — onSnapshot keeps React in sync with Firestore.
   ------------------------------------------------------------------- */
export function subscribeProjects(onChange, onError) {
  return onSnapshot(
    collection(db, PROJECTS),
    (snapshot) => onChange(snapshot.docs.map(toProject)),
    onError,
  )
}

/* -------------------------------------------------------------------
   Writes — create / update / delete a register.
   ------------------------------------------------------------------- */
export async function createProject(values) {
  const payload = {
    name: String(values.name || '').trim(),
    code: String(values.code || '').trim(),
    site: String(values.site || '').trim(),
    description: String(values.description || '').trim(),
    date: String(values.date || '').trim() || todayISO(),
    leadId: values.leadId || null,
    color: values.color || pickIconColor(),
    status: values.status || 'active',
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, PROJECTS), payload)
  return { id: ref.id, ...payload, createdAt: '' }
}

export async function updateProject(id, values) {
  const payload = {
    name: String(values.name || '').trim(),
    code: String(values.code || '').trim(),
    site: String(values.site || '').trim(),
    description: String(values.description || '').trim(),
    date: String(values.date || '').trim() || todayISO(),
    leadId: values.leadId || null,
    color: values.color || pickIconColor(),
    status: values.status || 'active',
  }
  await updateDoc(doc(db, PROJECTS, id), payload)
  return { id, ...payload }
}

export async function deleteProject(id) {
  await deleteDoc(doc(db, PROJECTS, id))
}

/* One register (used by the details page before the live feed lands). */
export async function fetchProject(id) {
  const snapshot = await getDoc(doc(db, PROJECTS, id))
  if (!snapshot.exists()) return null
  return toProject(snapshot)
}

/* -------------------------------------------------------------------
   Exam 2.7 — JSON export. The ToDos are nested inside each register,
   so the export always carries the issues with their register.
   ------------------------------------------------------------------- */
export async function exportProjects() {
  const projectsSnapshot = await getDocs(collection(db, PROJECTS))
  const projects = []

  for (const projectDoc of projectsSnapshot.docs) {
    const todos = await subscribeTodosOnce(projectDoc.id)
    projects.push({ ...toProject(projectDoc), todos })
  }

  const people = await fetchPeople()

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'IssueTrack',
    projects,
    people,
  }
}

/* One-time read of a todos subcollection (export helper). */
function subscribeTodosOnce(projectId) {
  return getDocs(collection(db, PROJECTS, projectId, 'todos')).then((snapshot) =>
    snapshot.docs.map((todoDoc) => ({ id: todoDoc.id, ...(todoDoc.data() || {}) })),
  )
}

/* -------------------------------------------------------------------
   Exam 2.8 — JSON import: a register whose id already exists is
   UPDATED (never duplicated). New registers are written with the
   imported id so re-importing the same file stays idempotent.
   ------------------------------------------------------------------- */
export async function importProjects(payload) {
  const incoming = Array.isArray(payload)
    ? payload
    : payload && Array.isArray(payload.projects)
      ? payload.projects
      : null

  if (!incoming) return { ok: false, error: 'NO PROJECTS FOUND IN FILE', added: 0, updated: 0 }

  let added = 0
  let updated = 0
  let skipped = 0
  const rejected = []

  for (const raw of incoming) {
    if (!raw || !raw.id) {
      skipped += 1
      continue
    }

    const name = String(raw.name === undefined || raw.name === null ? '' : raw.name).trim()
    /* Exam 2.3 also applies to imported registers. */
    if (name.length < 5) {
      skipped += 1
      rejected.push(raw.id + ' (NAME TOO SHORT)')
      continue
    }

    const projectRef = doc(db, PROJECTS, raw.id)
    const existing = await getDoc(projectRef)

    const projectPayload = {
      name,
      code: String(raw.code || '').trim(),
      site: String(raw.site || '').trim(),
      description: String(raw.description || '').trim(),
      date: String(raw.date || '').trim() || todayISO(),
      leadId: raw.leadId || null,
      color: raw.color || pickIconColor(),
      status: raw.status || 'active',
      updatedAt: serverTimestamp(),
    }

    if (existing.exists()) {
      await updateDoc(projectRef, projectPayload)
      updated += 1
    } else {
      await setDoc(projectRef, { ...projectPayload, createdAt: serverTimestamp() })
      added += 1
    }

    /* The issues carried by the payload are authoritative for that
       register: known ids are updated, unknown ids are created. */
    if (Array.isArray(raw.todos)) {
      for (const rawTodo of raw.todos) {
        if (!rawTodo || !rawTodo.title) continue
        const todoPayload = {
          title: String(rawTodo.title).trim(),
          description: String(rawTodo.description || '').trim(),
          status: rawTodo.status || 'open',
          priority: rawTodo.priority || 'MEDIUM',
          assigneeId: rawTodo.assigneeId || null,
          due: String(rawTodo.due || '').trim(),
          createdAt: rawTodo.createdAt || serverTimestamp(),
        }
        if (rawTodo.id) {
          await setDoc(doc(db, PROJECTS, raw.id, 'todos', rawTodo.id), todoPayload, { merge: true })
        } else {
          await addDoc(collection(db, PROJECTS, raw.id, 'todos'), todoPayload)
        }
      }
    }
  }

  return { ok: true, added, updated, skipped, rejected }
}
