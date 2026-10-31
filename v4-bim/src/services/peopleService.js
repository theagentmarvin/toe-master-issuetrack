/* =====================================================================
   IssueTrack — people service (Firestore).
   ---------------------------------------------------------------------
   Assignees live in their own top-level collection: `people`.
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

const PEOPLE = 'people'

function toPerson(snapshot) {
  const data = snapshot.data() || {}
  return {
    id: snapshot.id,
    name: data.name || '',
    role: data.role || 'Assignee',
    email: data.email || '',
    phone: data.phone || '',
    createdAt: toISO(data.createdAt),
  }
}

/* Live directory feed. */
export function subscribePeople(onChange, onError) {
  return onSnapshot(
    collection(db, PEOPLE),
    (snapshot) => onChange(snapshot.docs.map(toPerson)),
    onError,
  )
}

/* One-time read (JSON export). */
export async function fetchPeople() {
  const snapshot = await getDocs(collection(db, PEOPLE))
  return snapshot.docs.map(toPerson)
}

/* Create an assignee (Exam 1: form to add new users). */
export async function createPerson(values) {
  const payload = {
    name: String(values.name || '').trim(),
    role: String(values.role || '').trim() || 'Assignee',
    email: String(values.email || '').trim(),
    phone: String(values.phone || '').trim(),
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, PEOPLE), payload)
  return { id: ref.id, ...payload, createdAt: '' }
}

/* Update an assignee. */
export async function updatePerson(id, values) {
  const payload = {
    name: String(values.name || '').trim(),
    role: String(values.role || '').trim() || 'Assignee',
    email: String(values.email || '').trim(),
    phone: String(values.phone || '').trim(),
  }
  await updateDoc(doc(db, PEOPLE, id), payload)
  return { id, ...payload }
}

export async function deletePerson(id) {
  await deleteDoc(doc(db, PEOPLE, id))
}
