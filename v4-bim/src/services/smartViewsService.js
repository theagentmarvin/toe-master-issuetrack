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
   an exported view keeps a stable identity across export/import cycles. */
export async function createSmartView(projectId, def) {
  const viewId = (def && typeof def.id === 'string' && def.id) || defaultId()
  const payload = sanitize({
    ...def,
    id: viewId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await setDoc(doc(db, PROJECTS, projectId, SMART_VIEWS, viewId), {
    name: payload.name,
    finderQuery: payload.finderQuery,
    colorizations: payload.colorizations,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  })
  return { id: viewId, ...payload }
}

/* Update an existing smart view (the UPDATE button re-captures state). */
export async function updateSmartView(projectId, viewId, def) {
  const payload = sanitize({ ...def, updatedAt: serverTimestamp() })
  await updateDoc(doc(db, PROJECTS, projectId, SMART_VIEWS, viewId), {
    name: payload.name,
    finderQuery: payload.finderQuery,
    colorizations: payload.colorizations,
    updatedAt: payload.updatedAt,
  })
  return { id: viewId, ...payload }
}

export async function deleteSmartView(projectId, viewId) {
  await deleteDoc(doc(db, PROJECTS, projectId, SMART_VIEWS, viewId))
}