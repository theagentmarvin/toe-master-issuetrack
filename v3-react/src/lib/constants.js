/* =====================================================================
   IssueTrack — shared constants (Wave B / Exam 3).
   House vocabulary + the rules that survived from Wave A (Exam 1+2).
   ===================================================================== */

/* Exam 2.3 — a register (project) name shorter than this is refused. */
export const MIN_NAME_LENGTH = 5

/* People names need at least this many characters (Exam 1). */
export const MIN_PERSON_LENGTH = 2

/* -------------------------------------------------------------------
   Exam 2.2 — icon tile colors.
   6 colors taken from the house palette (design/DESIGN.md) so the
   random pick never leaves the Chokepoint look.
   ------------------------------------------------------------------- */
export const ICON_COLORS = [
  '#FBE7DD', /* coral wash  (--it-accent-soft) */
  '#F6E7D2', /* amber wash  (--it-state-warn-bg) */
  '#E4EEE2', /* moss wash   (--it-state-ok-bg)   */
  '#ECEBE6', /* warm grey   (--it-state-info-bg) */
  '#F1F0EC', /* sunk        (--it-sunk)           */
  '#FAFAF7', /* paper       (--it-paper)          */
]

/* -------------------------------------------------------------------
   Issue states — 4 states, one per state color of the token set.
   `token` drives the card background + the left status rail.
   `chip`   is the house status-chip class.
   ------------------------------------------------------------------- */
export const STATUSES = [
  { id: 'open', label: 'OPEN', token: 'info', chip: 'it-chip' },
  { id: 'in-progress', label: 'IN PROGRESS', token: 'warn', chip: 'it-chip it-chip-warn' },
  { id: 'done', label: 'DONE', token: 'ok', chip: 'it-chip it-chip-ok' },
  { id: 'blocked', label: 'BLOCKED', token: 'crit', chip: 'it-chip it-chip-crit' },
]

/* -------------------------------------------------------------------
   Priorities — 4 priorities, each with its OWN distinct color so the
   ToDo card can encode priority next to the status (Exam 3).
   CRITICAL = coral, HIGH = amber, MEDIUM = warm grey, LOW = solid ink.
   ------------------------------------------------------------------- */
export const PRIORITIES = [
  { id: 'CRITICAL', label: 'CRITICAL', token: 'crit', chip: 'it-chip it-chip-prio-critical' },
  { id: 'HIGH', label: 'HIGH', token: 'warn', chip: 'it-chip it-chip-prio-high' },
  { id: 'MEDIUM', label: 'MEDIUM', token: 'info', chip: 'it-chip it-chip-prio-medium' },
  { id: 'LOW', label: 'LOW', token: 'ink', chip: 'it-chip it-chip-prio-low' },
]

/* Project (register) lifecycle — kept from Wave A. */
export const PROJECT_STATUSES = [
  { id: 'active', label: 'ACTIVE' },
  { id: 'on-hold', label: 'ON HOLD' },
  { id: 'closed', label: 'CLOSED' },
]

/* Exam 2.2 — pick one of the 6 house icon colors at random. */
export function pickIconColor() {
  return ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)]
}

/* Status descriptor, falls back to the first (OPEN) status. */
export function statusInfo(status) {
  return STATUSES.find((item) => item.id === status) || STATUSES[0]
}

/* Priority descriptor, falls back to MEDIUM. */
export function priorityInfo(priority) {
  return PRIORITIES.find((item) => item.id === priority) || PRIORITIES[2]
}

/* True when the value is one of the 4 known statuses. */
export function isValidStatus(status) {
  return STATUSES.some((item) => item.id === status)
}

/* True when the value is one of the 4 known priorities. */
export function isValidPriority(priority) {
  return PRIORITIES.some((item) => item.id === priority)
}

/* Overall state of a register, shown as a chip on the cards. */
export function projectState(project, todoCount = 0) {
  const todos = Array.isArray(project.todos) ? project.todos : []
  const total = todoCount || todos.length
  const blocked = todos.filter((todo) => todo.status === 'blocked').length
  const open = todos.filter((todo) => todo.status !== 'done').length
  if (blocked > 0) return { label: 'BLOCKED', chip: 'it-chip it-chip-crit' }
  if (open > 0) return { label: 'ACTIVE', chip: 'it-chip it-chip-warn' }
  if (total > 0) return { label: 'SETTLED', chip: 'it-chip it-chip-ok' }
  return { label: 'NEW', chip: 'it-chip' }
}
