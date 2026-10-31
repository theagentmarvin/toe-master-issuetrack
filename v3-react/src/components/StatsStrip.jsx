/* =====================================================================
   IssueTrack — stats strip (dense numbers, tabular figures).
   ===================================================================== */
export default function StatsStrip({ items }) {
  return (
    <div className="it-stats">
      {items.map((item) => (
        <div className={'it-stat' + (item.crit ? ' is-crit' : '')} key={item.label}>
          <b className="it-num">{item.value}</b>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
