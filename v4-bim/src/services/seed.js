/* =====================================================================
   IssueTrack — demo seed helper.
   ---------------------------------------------------------------------
   Writes the demo registers, issues and assignees the first time the
   app talks to an empty Firestore. Safe to call on every load: it only
   writes when the collection has no IssueTrack data yet.
   ===================================================================== */
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { ICON_COLORS } from '../lib/constants'

const PROJECTS = 'projects'
const PEOPLE = 'people'

/* The demo registers (same content as the Wave A vanilla app). */
const DEMO_PROJECTS = [
  {
    id: 'REG-001',
    name: 'Tower North',
    code: 'P-001',
    site: 'Quilpue / Torre Norte',
    description: 'Residential tower — structural package and facade handover.',
    date: '2026-09-18',
    leadId: 'PEO-001',
    color: ICON_COLORS[0],
    status: 'active',
    todos: [
      {
        id: 'ISS-001',
        title: 'Facade panel gap over 18 mm at level 3',
        description: 'Panel joints exceed tolerance, rework requested on zone 3.',
        status: 'blocked',
        priority: 'CRITICAL',
        assigneeId: 'PEO-002',
        due: '2026-11-04',
        createdAt: '2026-09-20T09:00:00.000Z',
      },
      {
        id: 'ISS-002',
        title: 'Rebar inspection overdue on core B',
        description: 'Inspection request logged three days before the pour date.',
        status: 'in-progress',
        priority: 'HIGH',
        assigneeId: 'PEO-003',
        due: '2026-11-01',
        createdAt: '2026-09-24T12:30:00.000Z',
      },
      {
        id: 'ISS-003',
        title: 'Pour schedule drift on level 4',
        description: 'Cure window shortened by 2 hours, closed after re-planning.',
        status: 'done',
        priority: 'MEDIUM',
        assigneeId: 'PEO-001',
        due: '2026-10-02',
        createdAt: '2026-09-28T08:15:00.000Z',
      },
    ],
  },
  {
    id: 'REG-002',
    name: 'Depot West',
    code: 'P-002',
    site: 'Valparaiso / Bodega Oeste',
    description: 'Logistics depot — foundations, steel frame and roof deck.',
    date: '2026-08-27',
    leadId: 'PEO-002',
    color: ICON_COLORS[1],
    status: 'active',
    todos: [
      {
        id: 'ISS-004',
        title: 'Anchor bolts misaligned on grid 4',
        description: 'Hold point reached, template re-check requested.',
        status: 'in-progress',
        priority: 'HIGH',
        assigneeId: 'PEO-002',
        due: '2026-10-30',
        createdAt: '2026-09-02T10:00:00.000Z',
      },
      {
        id: 'ISS-005',
        title: 'Dock leveller clearance below spec',
        description: '20 mm short of the drawn clearance, supplier notified.',
        status: 'open',
        priority: 'LOW',
        assigneeId: 'PEO-003',
        due: '2026-11-12',
        createdAt: '2026-09-05T15:45:00.000Z',
      },
    ],
  },
  {
    id: 'REG-003',
    name: 'Pier Annex',
    code: 'P-003',
    site: 'Viña del Mar / Anexo Muelle',
    description: 'Annex pier — service trenches, drainage and finishes.',
    date: '2026-10-02',
    leadId: 'PEO-003',
    color: ICON_COLORS[2],
    status: 'active',
    todos: [
      {
        id: 'ISS-006',
        title: 'Drainage falls below 1:80 on the east run',
        description: 'Survey confirms 1:96, redesign of the last two gullies.',
        status: 'blocked',
        priority: 'CRITICAL',
        assigneeId: 'PEO-001',
        due: '2026-10-28',
        createdAt: '2026-10-04T09:20:00.000Z',
      },
      {
        id: 'ISS-007',
        title: 'Finish samples not approved',
        description: 'Waiting on the client sign-off of the palette.',
        status: 'open',
        priority: 'MEDIUM',
        assigneeId: 'PEO-002',
        due: '2026-11-20',
        createdAt: '2026-10-06T11:05:00.000Z',
      },
    ],
  },
]

/* The demo assignees. */
const DEMO_PEOPLE = [
  {
    id: 'PEO-001',
    name: 'Ricardo Marvin',
    role: 'BIM Lead',
    email: 'ricardo.marvin@example.com',
    phone: '+56 9 5011 2244',
  },
  {
    id: 'PEO-002',
    name: 'Ana Fuentes',
    role: 'Site Architect',
    email: 'ana.fuentes@example.com',
    phone: '+56 9 6622 8831',
  },
  {
    id: 'PEO-003',
    name: 'Tomas Ivanez',
    role: 'QA Inspector',
    email: 'tomas.ivanez@example.com',
    phone: '+56 9 7733 4502',
  },
]

/* -------------------------------------------------------------------
   Seed when the Firestore has no IssueTrack data yet.
   ------------------------------------------------------------------- */
export async function ensureSeedData() {
  const result = { projects: 0, todos: 0, people: 0 }

  /* --- registers + their issues --- */
  const projectsSnapshot = await getDocs(collection(db, PROJECTS))
  const hasIssueTrackProjects = projectsSnapshot.docs.some((item) => 'code' in item.data())

  if (!hasIssueTrackProjects) {
    /* Placeholder documents left by an earlier test (a document without
       the IssueTrack fields) are cleared so the demo list stays clean. */
    for (const item of projectsSnapshot.docs) {
      if (!('code' in item.data())) await deleteDoc(item.ref)
    }

    for (const project of DEMO_PROJECTS) {
      const { todos, ...projectFields } = project
      await setDoc(doc(db, PROJECTS, project.id), {
        ...projectFields,
        createdAt: serverTimestamp(),
      })
      result.projects += 1

      for (const todo of todos) {
        await setDoc(doc(db, PROJECTS, project.id, 'todos', todo.id), {
          ...todo,
          createdAt: todo.createdAt || serverTimestamp(),
        })
        result.todos += 1
      }
    }
  }

  /* --- assignees --- */
  const peopleSnapshot = await getDocs(collection(db, PEOPLE))
  if (peopleSnapshot.empty) {
    for (const person of DEMO_PEOPLE) {
      const { id, ...fields } = person
      await setDoc(doc(db, PEOPLE, id), { ...fields, createdAt: serverTimestamp() })
      result.people += 1
    }
  }

  return result
}

/* Wipe the demo data and write it again (the "reset demo data" button). */
export async function resetDemoData() {
  const projectsSnapshot = await getDocs(collection(db, PROJECTS))
  for (const item of projectsSnapshot.docs) {
    const todosSnapshot = await getDocs(collection(db, PROJECTS, item.id, 'todos'))
    for (const todo of todosSnapshot.docs) await deleteDoc(todo.ref)
    await deleteDoc(item.ref)
  }
  const peopleSnapshot = await getDocs(collection(db, PEOPLE))
  for (const item of peopleSnapshot.docs) await deleteDoc(item.ref)
  return ensureSeedData()
}
