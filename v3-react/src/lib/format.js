/* =====================================================================
   IssueTrack — tiny formatting helpers (ported from Wave A ui.js).
   ===================================================================== */

function pad2(n) {
  return (n < 10 ? '0' : '') + n
}

/* Local (not UTC) YYYY-MM-DD — used for the default register date. */
export function todayISO() {
  const d = new Date()
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

export function nowISO() {
  return new Date().toISOString()
}

/* 2026-09-18 -> 18/09/2026 */
export function formatDate(iso) {
  if (!iso) return '—'
  const parts = String(iso).split('-')
  if (parts.length !== 3) return String(iso)
  return parts[2] + '/' + parts[1] + '/' + parts[0]
}

/* Exam 2.1 — the first two letters of the project name.
   Deliberately NOT uppercased here: the uppercasing is done in CSS
   (.it-tile { text-transform: uppercase; }). */
export function iconLetters(name) {
  return String(name || '').trim().slice(0, 2)
}

/* Person initials for the directory (differs from the register tile). */
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
}

/* Firestore Timestamp -> ISO string (falls back to the raw value). */
export function toISO(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  return String(value)
}

/* Short human label for a Firestore document id (ISS-4F2A…). */
export function shortId(id) {
  const raw = String(id || '')
  if (!raw) return '—'
  if (/^ISS-|^REG-/.test(raw)) return raw
  return 'ISS-' + raw.slice(0, 4).toUpperCase()
}
