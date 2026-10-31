/* =====================================================================
   IssueTrack — status banner (house style: 10px uppercase, hairline).
   ===================================================================== */
export default function StatusBanner({ message, kind = '', className = '' }) {
  if (!message) return null
  return (
    <span className={'it-status' + (kind ? ' is-' + kind : '') + ' ' + className} role="status">
      {message}
    </span>
  )
}
