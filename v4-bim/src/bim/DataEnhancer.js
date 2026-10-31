/* =====================================================================
   IssueTrack — Data Enhancer (custom component).
   ---------------------------------------------------------------------
   Exam 4.3 — a CUSTOM That Open component exposing a method that, given
   the selected item's data, finds ALL items sharing the same
   information (e.g. the same value inside a shared property set —
   "same technical documentation").

   `enhance()` prefers property-set data over the entity's own direct
   attributes, because that is where discipline / documentation values
   live (e.g. "05-Tipo de Elemento", "00-Nivel Constructivo", "Reference").
   ===================================================================== */
import * as OBC from '@thatopen/components'
import { scanModelData, GENERIC_PROPERTIES } from './scan'
import { attrValue } from './format'

export class DataEnhancer extends OBC.Component {
  /* Unique registration id inside the Components system. */
  static uuid = '8de71a3c-2a4b-4f6e-9c1a-6e60f0b1b7d2'

  enabled = true

  constructor(components) {
    super(components)
    components.add(DataEnhancer.uuid, this)
  }

  /* Lazily scan a model once and cache the result under the model id. */
  _scans = new Map()

  async _scan(model) {
    if (!this._scans.has(model.modelId)) {
      this._scans.set(model.modelId, await scanModelData(model))
    }
    return this._scans.get(model.modelId)
  }

  /* ------------------------------------------------------------------
     Exam 4.3 — from the SOURCE item's data, find every other item that
     shares the same information.

     source: { modelId, localId, data }  (data = nested ItemData)
     opts.extract(model, source) -> array of { pset, prop, value }
   ------------------------------------------------------------------ */
  async enhance(model, source, opts = {}) {
    const scan = await this._scan(model)

    /* The source item's own "shared documentation" candidate values,
       preferring property-set data over direct entity attributes. */
    const matchingPairs = opts.match
      ? opts.match
      : [this._pickSignature(scan, source.localId)]

    const matches = new Set()
    for (const pair of matchingPairs) {
      if (!pair || pair.value === null || pair.value === undefined) continue
      for (const entry of scan.entries) {
        if (sameValue(entry, pair)) matches.add(entry.localId)
      }
    }

    return matches
  }

  /* Pick the single most representative property of the source item to
     use as its "signature". Preference order:
       1. an explicit documentation property (VDC-style ids)
       2. any property-set property that is NOT generic
       3. the entity's ObjectType / Tag
       4. the entity category (type) itself                                  */
  _pickSignature(scan, sourceLocalId) {
    const own = scan.entries.filter((entry) => entry.localId === sourceLocalId)

    const prefer = [
      '06-ID Constructivo',
      '05-Tipo de Elemento',
      '00-Nivel Constructivo',
      '01-Ciclo Constructivo',
      'Reference',
      '03-Fecha Planificada',
      '04-Fecha Ejecutada',
    ]

    for (const name of prefer) {
      const found = own.find((entry) => entry.prop === name)
      if (found) return { pset: found.pset, prop: found.prop, value: found.value }
    }

    /* Any property-set property that is NOT generic. */
    for (const entry of own) {
      if (entry.pset !== '__entity__' && !GENERIC_PROPERTIES.has(entry.prop)) {
        return { pset: entry.pset, prop: entry.prop, value: entry.value }
      }
    }

    /* ObjectType / Tag are still meaningful discipline hints. */
    for (const name of ['ObjectType', 'Tag']) {
      const found = own.find((entry) => entry.prop === name)
      if (found) return { pset: found.pset, prop: found.prop, value: found.value }
    }

    return own[0] || null
  }

  /* Reset the cached scans (called when a model is disposed/reloaded). */
  clearCache() {
    this._scans.clear()
  }
}

/* Value equality tolerant of string/number/boolean types. */
function sameValue(entry, pair) {
  if (entry.prop !== pair.prop) return false
  const a = entry.value
  const b = pair.value
  if (typeof a === 'boolean' || typeof b === 'boolean') return a === b
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b)
  return String(a).toLowerCase() === String(b).toLowerCase()
}

/* A view of the selected item's data for the panel (unused by the
   enhancer itself but kept here so the "same documentation" rule has a
   single owner). */
export function flattenItemData(item) {
  const rows = []
  for (const [key, raw] of Object.entries(item || {})) {
    if (key.startsWith('_')) continue
    if (Array.isArray(raw)) continue
    rows.push({ name: key, value: attrValue(raw) })
  }
  return rows
}