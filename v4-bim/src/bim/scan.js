/* =====================================================================
   IssueTrack — model scan (BIM).
   ---------------------------------------------------------------------
   One bulk call to `FragmentsModel.getItemsData()` (with relations
   enabled for "IsDefinedBy" → property sets and "HasProperties" →
   properties) yields everything the finder + enhancer panels need:

     • categories    — the IFC entity types of the geometry items
     • propertySets  — pset name → Set<property name>
     • properties    — every property name seen anywhere
     • entries       — flat [ localId, category, pset, prop, value, type ]

   The flat `entries` table is the reverse index used to answer
   "find all items whose property X has value V".
   ===================================================================== */
import { attrValue, attrType, isRelation } from './format'

/* The relations config that makes getItemsData return the nested
   property sets instead of flat attributes only. */
export const SCAN_CONFIG = {
  attributesDefault: true,
  relationsDefault: { attributes: false, relations: false },
  relations: {
    IsDefinedBy: { attributes: true, relations: true },
    HasProperties: { attributes: true, relations: false },
  },
}

/* Property names we NEVER consider "shared documentation" for the data
   enhancer — they describe the entity itself, not its discipline data. */
export const GENERIC_PROPERTIES = new Set([
  'Name',
  'Description',
  'ObjectType',
  'Tag',
  'LongName',
  'PredefinedType',
  'GlobalId',
  'expressID',
  'NominalValue',
])

/* Scan a loaded model and return the parsed structure described above.
   Cached by the caller; the function itself is side-effect free. */
export async function scanModelData(model) {
  const localIds = await model.getItemsIdsWithGeometry()
  const data = await model.getItemsData(localIds, SCAN_CONFIG)

  const categories = new Set()
  const propertySets = new Map() // psetName -> Set<propName>
  const properties = new Set()
  const entries = [] // { localId, category, pset, prop, value, type }

  for (let i = 0; i < data.length; i += 1) {
    const item = data[i]
    const localId = localIds[i]
    if (localId === null || localId === undefined) continue

    const category = attrValue(item._category)
    if (category) categories.add(category)

    /* --- direct entity attributes (flat leaves, not relations) --- */
    for (const [key, raw] of Object.entries(item)) {
      if (key.startsWith('_')) continue
      if (isRelation(raw)) continue
      const value = attrValue(raw)
      if (value === null || value === undefined) continue
      properties.add(key)
      entries.push({
        localId,
        category: category || '',
        pset: '__entity__',
        prop: key,
        value,
        type: attrType(raw),
      })
    }

    /* --- property sets reachable through the "IsDefinedBy" relation --- */
    const psetList = item.IsDefinedBy
    if (!isRelation(psetList)) continue

    for (const pset of psetList) {
      const psetName = attrValue(pset.Name)
      if (!psetName) continue

      const propList = pset.HasProperties
      if (!isRelation(propList)) continue

      if (!propertySets.has(psetName)) propertySets.set(psetName, new Set())

      for (const propItem of propList) {
        const propName = attrValue(propItem.Name)
        const value = attrValue(propItem.NominalValue)
        if (propName === null || propName === undefined) continue
        if (value === null || value === undefined) continue

        properties.add(propName)
        propertySets.get(psetName).add(propName)
        entries.push({
          localId,
          category: category || '',
          pset: psetName,
          prop: propName,
          value,
          type: attrType(propItem.NominalValue),
        })
      }
    }
  }

  return { localIds, categories, propertySets, properties, entries }
}