/* =====================================================================
   IssueTrack — SearchBox (general purpose search component).
   ---------------------------------------------------------------------
   Exam 3: a reusable search input. It owns NO state of its own — the
   value is controlled by the parent, so the same component can filter
   ToDos, people, registers… anywhere in the app.
   ===================================================================== */
export default function SearchBox({
  value,
  onChange,
  label = 'Search',
  placeholder = 'TYPE TO FILTER…',
  id = 'search-box',
  hint = '',
}) {
  return (
    <div className="it-search">
      <label className="it-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="it-input"
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <div className="it-muted-text it-search-hint">{hint}</div> : null}
    </div>
  )
}
