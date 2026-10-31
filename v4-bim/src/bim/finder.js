/* =====================================================================
   IssueTrack — items-finder query builder (Wave C / Exam 4).
   ---------------------------------------------------------------------
   Turns a "property set + property + value" selection into the
   relationship query understood by `ItemsFinder` / `getItemsByQuery`:

     element  ──IsDefinedBy──▶  property set  ──HasProperties──▶  property
     (any, geometry)          Name == psetName                Name == propName
                                                             NominalValue == value

   This is the documented ItemsFinder "relational query" pattern (see the
   ItemsFinder tutorial: "columns contained in a specific building storey").
   ===================================================================== */
import { exactMatcher, looseMatcher } from './format'

/* Build the ItemsQueryParams for a finder search. `pset` may be 'ALL'
   (any property set) and `prop` may be 'ANY' (any property in that set),
   mirroring the UI defaults. */
export function buildFinderQuery({ pset, prop, value }) {
  const psetName = String(pset || '').trim()
  const propName = String(prop || '').trim()
  const rawValue = String(value ?? '').trim()

  /* Empty value → an impossible match (never matches a '—' row). */
  const valueMatcher = looseMatcher(rawValue) || /^[^\s\S]$/

  /* --- innermost: the property item --- */
  const propertyQuery = {
    categories: [exactMatcher('IFCPROPERTYSINGLEVALUE')],
  }
  if (propName && propName.toUpperCase() !== 'ANY') {
    propertyQuery.attributes = {
      aggregation: 'exclusive', // every attribute condition must pass
      queries: [
        { name: exactMatcher('Name'), value: exactMatcher(propName) },
        { name: exactMatcher('NominalValue'), value: valueMatcher },
      ],
    }
  } else {
    propertyQuery.attributes = {
      queries: [{ name: exactMatcher('NominalValue'), value: valueMatcher }],
    }
  }

  /* --- middle: the property set --- */
  const psetQuery = {
    categories: [exactMatcher('IFCPROPERTYSET')],
    relation: { name: 'HasProperties', query: propertyQuery },
  }
  if (psetName && psetName.toUpperCase() !== 'ALL') {
    psetQuery.attributes = {
      queries: [{ name: exactMatcher('Name'), value: exactMatcher(psetName) }],
    }
  }

  /* --- outermost: the elements that own such a property set --- */
  return {
    relation: { name: 'IsDefinedBy', query: psetQuery },
  }
}

/* Cache the exact/loose matcher helpers used by the serialization path
   so the panel can build customData for a stored query. */
export const FINDER_QUERY_KIND = 'bim-finder'