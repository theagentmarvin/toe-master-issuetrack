/* =====================================================================
   IssueTrack — 3D issue pins overlay (Wave D / D2).
   ---------------------------------------------------------------------
   Renders a DOM (CSS2D-style) pin for every pinned issue of the current
   register, positioned each frame by projecting the stored `worldPosition`
   through the ACTIVE camera (perspective or orthographic). Fixes from
   FIX ROUND #1:

   • CO-LOCATED pins spread out: pins sharing the same element anchor
     (modelId:localId — identical worldPosition) are fanned out in a
     deterministic radial pattern, so every pin gets its own clickable
     pixel and no issue becomes unreachable.
   • Pins are real <button aria-label="…"> controls (keyboard + CDP
     clickable); the concrete issue is kept on data-issue-id.

   Status colour lives on the status dot (house rule 6/8), with the glyph
   in ink on a paper halo (pin contrast fix) in tokens.css/app.css.
   ===================================================================== */
import { useEffect, useRef } from 'react'

/* Map an issue status to a house state token (drives the dot colour). */
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

/* Stable element anchor for co-location grouping. */
function anchorOf(reference) {
  return reference.modelId + ':' + reference.localId
}

export default function IssuePins({ engine, issues = [], onPinClick, focusIssueId }) {
  const overlayRef = useRef(null)

  /* Pre-compute each pinned issue's element anchor + group membership so the
     per-frame projection can apply a deterministic fan-out offset. */
  const pinned = issues.filter(
    (issue) =>
      issue.bimReference &&
      issue.bimReference.worldPosition
  )

  const groups = {}
  const order = []
  for (const issue of pinned) {
    const k = anchorOf(issue.bimReference)
    if (!groups[k]) {
      groups[k] = []
      order.push(k)
    }
    groups[k].push(issue.id)
  }
  const groupIndexByIssueId = {}
  const groupSizeByIssueId = {}
  for (const k of order) {
    groups[k].forEach((issueId, index) => {
      groupIndexByIssueId[issueId] = index
      groupSizeByIssueId[issueId] = groups[k].length
    })
  }

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
        if (sx < -24 || sx > rect.width + 24 || sy < -24 || sy > rect.height + 24) {
          pinEl.style.display = 'none'
          return
        }

        /* Deterministic radial fan-out for co-located pins. */
        const n = Number(pinEl.dataset.groupSize || 1)
        const idx = Number(pinEl.dataset.groupIndex || 0)
        let ox = 0
        let oy = 0
        if (n > 1) {
          const radius = Math.max(16, n * 6)
          const angle = (idx / n) * Math.PI * 2 - Math.PI / 2
          ox = Math.cos(angle) * radius
          oy = Math.sin(angle) * radius
        }

        pinEl.style.display = ''
        pinEl.style.left = sx + ox + 'px'
        pinEl.style.top = sy + oy + 'px'
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [engine])

  return (
    <div ref={overlayRef} className="it-bim-pins" aria-label="Pinned issues">
      {pinned.map((issue) => {
        const ref = issue.bimReference
        const token = statusToken(issue.status)
        const label = 'Issue ' + issue.id.toUpperCase() + ': ' + issue.title + ' — ' + issue.status.toUpperCase()
        return (
          <button
            key={issue.id}
            type="button"
            className={'it-pin' + (issue.id === focusIssueId ? ' it-pin-focus' : '')}
            data-status={token}
            data-issue-id={issue.id}
            data-group-size={groupSizeByIssueId[issue.id] || 1}
            data-group-index={groupIndexByIssueId[issue.id] || 0}
            data-wx={ref.worldPosition.x}
            data-wy={ref.worldPosition.y}
            data-wz={ref.worldPosition.z}
            aria-label={label}
            title={issue.title + ' — ' + issue.status.toUpperCase()}
            onClick={() => onPinClick(issue)}
          >
            <span className="it-pin-glyph" aria-hidden="true">◈</span>
            <span className="it-pin-dot" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}