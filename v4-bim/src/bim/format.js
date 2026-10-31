/* =====================================================================
   IssueTrack — BIM helpers (Wave C / Exam 4).
   Pure functions shared by the engine, the finder and the enhancer.
   ===================================================================== */

/* ---------------------------------------------------------------------
   The item data returned by `FragmentsModel.getItemsData()` is a record
   of `name -> ItemAttribute` (a leaf, `{ value, type }`) OR `name ->
   ItemData[]` (a relation, an array of nested item records).

   These helpers normalise that shape without ever touching the DOM.
   --------------------------------------------------------------------- */

/* Extract the raw value from an attribute leaf `{ value, type }`, or
   return the value as-is when it is already a primitive. */
export function attrValue(attr) {
  if (attr === null || attr === undefined) return undefined
  if (typeof attr === 'object' && 'value' in attr) return attr.value
  return attr
}

/* Extract the type name from an attribute leaf, coerced to string. */
export function attrType(attr) {
  if (!attr || typeof attr !== 'object') return ''
  return typeof attr.type === 'string' ? attr.type : String(attr.type ?? '')
}

/* True when an item-data value is a relation: an array of nested item
   records (as opposed to a leaf `{ value, type }`). */
export function isRelation(value) {
  return Array.isArray(value)
}

/* Escape a string so it can be embedded into a RegExp safely. */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/* Build a case-insensitive substring RegExp from a raw value, or null
   when the value is empty. Used by the finder to turn user input into
   an items query without tripping on reserved regex characters. */
export function looseMatcher(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  return new RegExp(escapeRegex(raw), 'i')
}

/* Build an exact-match RegExp (anchored, case-insensitive). */
export function exactMatcher(value) {
  return new RegExp('^' + escapeRegex(value) + '$', 'i')
}

/* A value that is safe to show inside a data panel row. Booleans and
   numbers keep their type; objects/arrays are JSON-stringified. */
export function displayValue(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

/* Small unique id — crypto.randomUUID with a plain fallback (older
   browsers / non-secure contexts). Used for view + query ids. */
export function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}