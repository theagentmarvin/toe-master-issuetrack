/* =====================================================================
   IssueTrack — Smart Views (custom component).
   ---------------------------------------------------------------------
   Exam 4.4 — a CUSTOM That Open component that serialises view
   DEFINITIONS (finder query + colourisations), so an exported view can
   be imported and recreated AS IF made in the current session. Views are
   JSON documents — never images.

   A view definition:
     {
       id, name, createdAt, updatedAt,
       finderQuery:   ItemsFinder.export() output (serialised queries),
       colorizations: [{ modelId, localId, color }]
     }
   ===================================================================== */
import * as OBC from '@thatopen/components'
import { uid } from './format'

export class SmartViews extends OBC.Component {
  static uuid = '4c6f2a1b-8d2e-4e4a-a3e3-d9f8e15c9b41'

  enabled = true

  constructor(components) {
    super(components)
    components.add(SmartViews.uuid, this)
  }

  /* ------------------------------------------------------------------
     Capture a fresh view definition from the CURRENT session state.
     `finderQuery` is the raw ItemsFinder.export() object; `colours` is
     the current colourisation list; `name` is optional.
     ------------------------------------------------------------------ */
  capture({ id, name, createdAt, finderQuery, colorizations } = {}) {
    const now = new Date().toISOString()
    return this.deserialize({
      id: id || uid(),
      name: String(name || '').trim() || 'VIEW ' + now.slice(11, 16),
      createdAt: createdAt || now,
      updatedAt: now,
      finderQuery: finderQuery || { data: [] },
      colorizations: normalizeColorizations(colorizations),
    })
  }

  /* ------------------------------------------------------------------
     Serialise a view definition to a JSON-safe object. This is the
     EXPORT path: clone so the returned object never aliases live state.
     ------------------------------------------------------------------ */
  export(def) {
    return this.deserialize(def)
  }

  /* ------------------------------------------------------------------
     Import / deserialise a definition, filling every missing field with
     safe defaults, so an imported view is always reconstructible.
     ------------------------------------------------------------------ */
  import(data) {
    if (!data || typeof data !== 'object') return null
    return this.deserialize(data)
  }

  deserialize(data) {
    const now = new Date().toISOString()
    return {
      id: typeof data.id === 'string' && data.id ? data.id : uid(),
      name: typeof data.name === 'string' && data.name ? data.name : 'UNNAMED VIEW',
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : now,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : now,
      finderQuery:
        data.finderQuery && Array.isArray(data.finderQuery.data)
          ? { data: data.finderQuery.data }
          : { data: [] },
      colorizations: normalizeColorizations(data.colorizations),
    }
  }
}

/* Colourisations travel as plain arrays; reject malformed entries. */
function normalizeColorizations(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((entry) => entry && entry.localId !== undefined && entry.color)
    .map((entry) => ({
      modelId: typeof entry.modelId === 'string' ? entry.modelId : '',
      localId: Number(entry.localId),
      color: String(entry.color),
    }))
}