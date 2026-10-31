/* =====================================================================
   IssueTrack — smart views service (Firestore).
   ---------------------------------------------------------------------
   Exam 4.4 — smart views are persisted AS PART OF THE PROJECT DATA:
       projects/{projectId}/smartViews/{viewId}
   Each document stores the view DEFINITION (finder query + colorisations
   + timestamps) — the same JSON that is exported/imported as a file, so
   a stored view feeds the table the moment the project is opened.
   ===================================================================== */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const PROJECTS = 'projects'
const SMART_VIEWS = 'smartViews'

/* Fallback id for an imported def that carries none. */
function defaultId() {
  return 'view-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

/* Strip `undefined` leaves (Firestore rejects them) and guarantee a
   plain JSON object so the view round-trips through the store losslessly. */
function sanitize(def) {
  return JSON.parse(JSON.stringify(def))
}

/* Firestore document -> plain view definition. */
function toView(snapshot) {
  const data = snapshot.data() || {}
  return {
    id: snapshot.id,
    name: data.name || 'UNNAMED VIEW',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
    finderQuery: data.finderQuery && Array.isArray(data.finderQuery.data)
      ? data.finderQuery
      : { data: [] },
    colorizations: Array.isArray(data.colorizations) ? data.colorizations : [],
  }
}

/* Live feed of the smart views of one project. */
export function subscribeSmartViews(projectId, onChange, onError) {
  if (!projectId) return () => {}
  return onSnapshot(
    collection(db, PROJECTS, projectId, SMART_VIEWS),
    (snapshot) => onChange(snapshot.docs.map(toView)),
    onError,
  )
}

/* One-time read (used when there is no need for a live subscription). */
export async function fetchSmartViews(projectId) {
  const snapshot = await getDocs(collection(db, PROJECTS, projectId, SMART_VIEWS))
  return snapshot.docs.map(toView)
}

/* Create a smart view. The definition's own id becomes the document id so
   an exported view keeps a stable identity across export/import cycles.

   IMPORTANT: `sanitize()` is applied BEFORE the Firestore sentinels are
   attached. `sanitize` does a JSON round-trip that would otherwise turn
   `serverTimestamp()` into the literal `{_methodName:'serverTimestamp'}`
   map and write a string instead of a real server timestamp. */
export async function createSmartView(projectId, def) {
  const viewId = (def && typeof def.id === 'string' && def.id) || defaultId()
  const clean = sanitize({ ...def, id: viewId })
  await setDoc(doc(db, PROJECTS, projectId, SMART_VIEWS, viewId), {
    name: clean.name,
    finderQuery: clean.finderQuery,
    colorizations: clean.colorizations,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: viewId, name: clean.name, finderQuery: clean.finderQuery, colorizations: clean.colorizations }
}

/* Update an existing smart view (the UPDATE button re-captures state).
   Same ordering rule as above: sanitize the payload first, then attach the
   `updatedAt` sentinel so it reaches Firestore uncorrupted. */
export async function updateSmartView(projectId, viewId, def) {
  const clean = sanitize({ ...def })
  await updateDoc(doc(db, PROJECTS, projectId, SMART_VIEWS, viewId), {
    name: clean.name,
    finderQuery: clean.finderQuery,
    colorizations: clean.colorizations,
    updatedAt: serverTimestamp(),
  })
  return { id: viewId, name: clean.name, finderQuery: clean.finderQuery, colorizations: clean.colorizations }
}

export async function deleteSmartView(projectId, viewId) {
  await deleteDoc(doc(db, PROJECTS, projectId, SMART_VIEWS, viewId))
}