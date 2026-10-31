/* =====================================================================
   IssueTrack — ToDo (issue) service (Firestore).
   ---------------------------------------------------------------------
   Every ToDo lives in the `todos` SUBCOLLECTION of its register:
       projects/{projectId}/todos/{todoId}
   so entering a project retrieves exactly that project's issues and
   Firestore keeps them in sync live (onSnapshot).
   ===================================================================== */
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { toISO } from '../lib/format'
import { isValidStatus, isValidPriority } from '../lib/constants'

const PROJECTS = 'projects'
const TODOS = 'todos'

/* Firestore document -> plain object used by React. */
function toTodo(snapshot) {
  const data = snapshot.data() || {}
  return {
    id: snapshot.id,
    title: data.title || '',
    description: data.description || '',
    /* Exam 2.9 — the status is chosen at creation and editable later. */
    status: isValidStatus(data.status) ? data.status : 'open',
    priority: isValidPriority(data.priority) ? data.priority : 'MEDIUM',
    assigneeId: data.assigneeId || null,
    due: data.due || '',
    createdAt: toISO(data.createdAt),
  }
}

/* Live feed of the issues of one register (Exam 3: retrieved when
   entering a project, live updates preferred). */
export function subscribeTodos(projectId, onChange, onError) {
  if (!projectId) return () => {}
  return onSnapshot(
    collection(db, PROJECTS, projectId, TODOS),
    (snapshot) => onChange(snapshot.docs.map(toTodo)),
    onError,
  )
}

/* One-time read (used by the JSON export). */
export async function fetchTodos(projectId) {
  const snapshot = await getDocs(collection(db, PROJECTS, projectId, TODOS))
  return snapshot.docs.map(toTodo)
}

/* Create an issue (Exam 2.6 + Exam 3: written to Firestore). */
export async function createTodo(projectId, values) {
  const payload = {
    title: String(values.title || '').trim(),
    description: String(values.description || '').trim(),
    status: isValidStatus(values.status) ? values.status : 'open',
    priority: isValidPriority(values.priority) ? values.priority : 'MEDIUM',
    assigneeId: values.assigneeId || null,
    due: String(values.due || '').trim(),
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, PROJECTS, projectId, TODOS), payload)
  return { id: ref.id, ...payload, createdAt: '' }
}

/* Update an issue — the same service call serves the inline status
   switch and the full edit form. */
export async function updateTodo(projectId, todoId, values) {
  const payload = {}
  if (values.title !== undefined) payload.title = String(values.title).trim()
  if (values.description !== undefined) payload.description = String(values.description).trim()
  if (values.status !== undefined && isValidStatus(values.status)) payload.status = values.status
  if (values.priority !== undefined && isValidPriority(values.priority)) {
    payload.priority = values.priority
  }
  if (values.assigneeId !== undefined) payload.assigneeId = values.assigneeId || null
  if (values.due !== undefined) payload.due = String(values.due).trim()
  payload.updatedAt = serverTimestamp()
  await updateDoc(doc(db, PROJECTS, projectId, TODOS, todoId), payload)
  return { id: todoId, ...payload }
}

export async function deleteTodo(projectId, todoId) {
  await deleteDoc(doc(db, PROJECTS, projectId, TODOS, todoId))
}
