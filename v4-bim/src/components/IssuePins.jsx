/* =====================================================================
   IssueTrack — 3D issue pins overlay (Wave D / D2).
   ---------------------------------------------------------------------
   Renders a DOM (CSS2D-style) pin for every pinned issue of the current
   register, positioned each frame by projecting the stored `worldPosition`
   through the ACTIVE camera (perspective or orthographic). Because the pins
   are plain DOM, they:
     • survive orbit / zoom / camera changes (re-projected every frame)
     • are REAL clickable buttons (accessible to a real CDP mouse click)
     • tear down cleanly on unmount (the rAF loop cancels itself)

   Status colour comes from the `data-status` attribute, backed by the
   house state tokens; the title/status show on hover via `title`.
   ===================================================================== */
import { useEffect, useRef } from 'react'

/* Map an issue status to a house state token (drives the pin colour). */
function statusToken(status) {
  switch (status) {
    case 'blocked':
    case 'open':
      return 'crit'
    case 'in-progress':
      return 'warn'
    case 'done':
      return 'ok'
    default:
      return 'info'
  }
}

export default function IssuePins({ engine, issues = [], onPinClick, focusIssueId }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const overlay = overlayRef.current
      if (!overlay || !engine) return

      const rect = overlay.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const pins = overlay.querySelectorAll('.it-pin')
      pins.forEach((pinEl) => {
        const worldPos = pinEl.dataset.wx
          ? { x: Number(pinEl.dataset.wx), y: Number(pinEl.dataset.wy), z: Number(pinEl.dataset.wz) }
          : null
        const ndc = worldPos ? engine.projectWorldToNDC(worldPos) : null
        if (!ndc || !Number.isFinite(ndc.x) || ndc.z > 1 || ndc.z < -1) {
          pinEl.style.display = 'none'
          return
        }
        const sx = (ndc.x * 0.5 + 0.5) * rect.width
        const sy = (1 - (ndc.y * 0.5 + 0.5)) * rect.height
        /* Keep slightly off-screen pins hidden instead of clamping them onto
           the border (a pin that is not on the model must not mislead). */
        if (sx < -24 || sx > rect.width + 24 || sy < -24 || sy > rect.height + 24) {
          pinEl.style.display = 'none'
          return
        }
        pinEl.style.display = ''
        pinEl.style.left = sx + 'px'
        pinEl.style.top = sy + 'px'
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [engine])

  const pinned = issues.filter(
    (issue) => issue.bimReference && issue.bimReference.worldPosition,
  )

  return (
    <div ref={overlayRef} className="it-bim-pins" aria-label="Pinned issues">
      {pinned.map((issue) => {
        const ref = issue.bimReference
        const token = statusToken(issue.status)
        return (
          <button
            key={issue.id}
            type="button"
            className={'it-pin' + (issue.id === focusIssueId ? ' it-pin-focus' : '')}
            data-status={token}
            data-issue-id={issue.id}
            data-wx={ref.worldPosition.x}
            data-wy={ref.worldPosition.y}
            data-wz={ref.worldPosition.z}
            title={issue.title + ' — ' + issue.status.toUpperCase()}
            onClick={() => onPinClick(issue)}
          >
            <span className="it-pin-glyph">◈</span>
            <span className="it-pin-dot" />
          </button>
        )
      })}
    </div>
  )
}