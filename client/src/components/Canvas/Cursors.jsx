import { useEffect, useRef } from 'react'

// Linear interpolation — smooths cursor movement between updates
const lerp = (start, end, t) => start + (end - start) * t

// Single cursor with lerp animation
function RemoteCursor({ peer, stagePos, stageScale }) {
  const posRef = useRef({ x: 0, y: 0 })       // current rendered position
  const targetRef = useRef({ x: 0, y: 0 })     // target position from network
  const rafRef = useRef(null)
  const elRef = useRef(null)

  // Update target when peer data changes
  useEffect(() => {
    if (!peer.cursor) return
    targetRef.current = peer.cursor
  }, [peer.cursor])

  // Lerp animation loop
  useEffect(() => {
    const animate = () => {
      posRef.current = {
        x: lerp(posRef.current.x, targetRef.current.x, 0.15),
        y: lerp(posRef.current.y, targetRef.current.y, 0.15),
      }

      // Convert canvas coords → screen coords
      // Top bar (56px) + Toolbar (56px) = 112px total offset before canvas starts
      const OFFSET_Y = 112
      if (elRef.current) {
        const screenX = posRef.current.x * stageScale + stagePos.x
        const screenY = posRef.current.y * stageScale + stagePos.y + OFFSET_Y
        elRef.current.style.transform = `translate(${screenX}px, ${screenY}px)`
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [stagePos, stageScale])

  if (!peer.cursor) return null

  return (
    <div
      ref={elRef}
      className="pointer-events-none fixed top-0 left-0 z-50"
      style={{ willChange: 'transform' }}
    >
      {/* Cursor arrow */}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M4 2L16 10L10 11L7 17L4 2Z"
          fill={peer.userColor}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      {/* Name tag */}
      <div
        className="absolute left-4 top-0 px-2 py-0.5 rounded-full text-white text-xs font-medium whitespace-nowrap shadow-sm"
        style={{ background: peer.userColor }}
      >
        {peer.userName}
      </div>
    </div>
  )
}

export default function Cursors({ peers, stagePos, stageScale }) {
  return (
    <>
      {Object.entries(peers).map(([userId, peer]) => (
        <RemoteCursor
          key={userId}
          peer={peer}
          stagePos={stagePos}
          stageScale={stageScale}
        />
      ))}
    </>
  )
}