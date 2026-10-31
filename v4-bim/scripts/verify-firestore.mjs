/* =====================================================================
   IssueTrack — Firestore round-trip check (Wave B / Exam 3).
   ---------------------------------------------------------------------
   Run with:  node scripts/verify-firestore.mjs
   It exercises the real Firebase project used by the app:
     1. seeds the demo data when the collection is empty
     2. creates a register (project)      → Firestore `projects`
     3. creates an issue (ToDo)           → Firestore `projects/{id}/todos`
     4. reads the issues back             (the "retrieved when entering
                                          a project" requirement)
     5. updates the issue status + the register fields
     6. deletes the test register and leaves the demo data untouched
   ===================================================================== */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../src/lib/firebase.js'
import { ensureSeedData } from '../src/services/seed.js'
import { createTodo, updateTodo, fetchTodos } from '../src/services/todosService.js'
import { createProject, updateProject, exportProjects } from '../src/services/projectsService.js'

const checks = []
function check(label, ok, detail = '') {
  checks.push({ label, ok, detail })
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail ? ' — ' + detail : ''))
}

const TEST_ID = 'VERIFY-TMP'

async function main() {
  /* 1. seed ------------------------------------------------------------ */
  const seeded = await ensureSeedData()
  check('seed helper ran', true, JSON.stringify(seeded))

  const projectsSnapshot = await getDocs(collection(db, 'projects'))
  const projects = projectsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  check(
    'registers stored in Firestore `projects`',
    projects.length > 0,
    projects.map((item) => item.name).join(' | '),
  )

  const seededProject = projects.find((item) => item.id === 'REG-001')
  check('demo register REG-001 present', Boolean(seededProject), seededProject?.name || '')

  const todos = await fetchTodos('REG-001')
  check(
    'issues stored in the `todos` subcollection and read back',
    todos.length > 0,
    todos.map((todo) => todo.title).join(' | '),
  )

  const peopleSnapshot = await getDocs(collection(db, 'people'))
  check('assignees stored in Firestore `people`', peopleSnapshot.size > 0, peopleSnapshot.size + ' people')

  /* 2. create a register ------------------------------------------------ */
  const created = await createProject({
    name: 'Verification Register',
    code: 'V-001',
    site: 'Test site',
    description: 'Temporary register created by the verification script.',
    date: '2026-10-31',
    leadId: null,
    color: '#FBE7DD',
    status: 'active',
  })
  check('register created', Boolean(created.id), created.id)

  /* 3. create an issue -------------------------------------------------- */
  const todo = await createTodo(created.id, {
    title: 'Verification issue',
    description: 'Written by the verification script.',
    status: 'open',
    priority: 'HIGH',
    assigneeId: null,
    due: '2026-11-01',
  })
  check('issue created in projects/{id}/todos', Boolean(todo.id), todo.id)

  /* 4. read the issues back --------------------------------------------- */
  const readBack = await fetchTodos(created.id)
  check('issue retrieved when entering the project', readBack.length === 1, readBack.length + ' issue(s)')

  /* 5. update ------------------------------------------------------------ */
  await updateTodo(created.id, todo.id, { status: 'blocked', priority: 'CRITICAL' })
  const updatedTodo = (await fetchTodos(created.id))[0]
  check(
    'issue updated (status + priority)',
    updatedTodo.status === 'blocked' && updatedTodo.priority === 'CRITICAL',
    updatedTodo.status + ' / ' + updatedTodo.priority,
  )

  await updateProject(created.id, { ...created, name: 'Verification Register Edited' })
  const updatedProject = await getDoc(doc(db, 'projects', created.id))
  check(
    'register updated',
    updatedProject.exists() && updatedProject.data().name === 'Verification Register Edited',
    updatedProject.data()?.name || '',
  )

  /* 6. export includes the nested issues --------------------------------- */
  const exported = await exportProjects()
  const exportedRegister = exported.projects.find((item) => item.id === created.id)
  check(
    'JSON export carries the nested issues',
    Array.isArray(exportedRegister?.todos) && exportedRegister.todos.length === 1,
    (exportedRegister?.todos || []).length + ' issue(s)',
  )

  /* 7. clean up ---------------------------------------------------------- */
  const todoDocs = await getDocs(collection(db, 'projects', created.id, 'todos'))
  for (const item of todoDocs.docs) await deleteDoc(item.ref)
  await deleteDoc(doc(db, 'projects', created.id))
  const gone = await getDoc(doc(db, 'projects', created.id))
  check('temporary register removed', !gone.exists())

  const failed = checks.filter((item) => !item.ok)
  console.log('\n' + (checks.length - failed.length) + '/' + checks.length + ' checks passed')
  if (failed.length) process.exitCode = 1
}

main().catch((err) => {
  console.error('FIRESTORE CHECK FAILED:', err)
  process.exitCode = 1
})
