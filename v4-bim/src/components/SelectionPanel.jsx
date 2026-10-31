/* =====================================================================
   IssueTrack — selection data panel (Exam 4.1).
   ---------------------------------------------------------------------
   Shows the property sets + data of the currently selected item. The
   data comes straight from `FragmentsModel.getItemsData()` (nested
   ItemData) but is flattened here for the house-style label:value rows.
   ===================================================================== */
import { displayValue } from '../bim/format'

export default function SelectionPanel({ selection }) {
  if (!selection) {
    return (
      <section className="it-card it-bim-panel">
        <div className="it-card-head">
          <span className="it-label">[ SELECTED ITEM ]</span>
        </div>
        <div className="it-empty">NO ITEM SELECTED — CLICK THE MODEL TO PICK ONE</div>
      </section>
    )
  }

  const data = selection.data || {}
  const category = data._category ? data._category.value : '—'
  const guid = data._guid ? data._guid.value : '—'
  const localId = data._localId ? data._localId.value : selection.localId

  const direct = []
  const psets = []

  for (const [key, raw] of Object.entries(data)) {
    if (key.startsWith('_')) continue
    if (Array.isArray(raw)) {
      for (const target of raw) {
        const psetName = target && target.Name && target.Name.value
        if (!psetName) continue
        const props = []
        for (const [k2, v2] of Object.entries(target)) {
          if (k2.startsWith('_')) continue
          if (!Array.isArray(v2)) continue
          for (const p of v2) {
            const pName = p && p.Name && p.Name.value
            if (pName === null || pName === undefined) continue
            const rawValue = p && p.NominalValue
            const value = rawValue && rawValue.value !== undefined ? rawValue.value : rawValue
            props.push({ name: String(pName), value: displayValue(value) })
          }
        }
        if (props.length) psets.push({ name: String(psetName), props })
      }
    } else {
      const value = raw && raw.value !== undefined ? raw.value : raw
      direct.push({ name: key, value: displayValue(value) })
    }
  }

  return (
    <section className="it-card it-bim-panel">
      <div className="it-card-head">
        <span className="it-label">[ SELECTED ITEM ]</span>
        <span className={'it-chip it-chip-crit'}>{String(category).toUpperCase().slice(0, 20)}</span>
      </div>

      <dl className="it-detail-kv" style={{ marginTop: 0 }}>
        <div>
          <dt>Local id</dt>
          <dd className="it-num">{localId}</dd>
        </div>
        <div>
          <dt>Guid</dt>
          <dd>{guid}</dd>
        </div>
      </dl>

      {direct.length > 0 ? (
        <div className="it-bim-block">
          <div className="it-label it-bim-list-title">ENTITY DATA</div>
          <table className="it-dir">
            <tbody>
              {direct.map((row) => (
                <tr key={row.name}>
                  <th>{row.name}</th>
                  <td className="it-num">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {psets.length > 0 ? (
        <div className="it-bim-block">
          <div className="it-label it-bim-list-title">PROPERTY SETS</div>
          {psets.map((pset) => (
            <div className="it-bim-block" key={pset.name}>
              <div className="it-muted-text">{pset.name}</div>
              <table className="it-dir">
                <tbody>
                  {pset.props.map((prop) => (
                    <tr key={pset.name + ':' + prop.name}>
                      <th>{prop.name}</th>
                      <td className="it-num">{prop.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}