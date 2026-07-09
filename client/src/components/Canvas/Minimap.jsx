import { useEffect, useRef, useCallback } from 'react'
import useCanvasStore from '../../store/canvasStore'

const MINIMAP_W = 200
const MINIMAP_H = 120

export default function Minimap({ stageRef }) {
  const canvasRef = useRef(null)
  const { stagePos, stageScale, setStagePos, elements } = useCanvasStore()

  const draw = useCallback(() => {
    const miniCtx = canvasRef.current?.getContext('2d')
    const stage = stageRef.current
    if (!miniCtx || !stage) return

    // Clear
    miniCtx.clearRect(0, 0, MINIMAP_W, MINIMAP_H)
    miniCtx.fillStyle = '#fafaf8'
    miniCtx.fillRect(0, 0, MINIMAP_W, MINIMAP_H)

    // Get a low-res snapshot of the stage
    try {
      const stageCanvas = stage.toCanvas({ pixelRatio: 0.08 })
      miniCtx.drawImage(stageCanvas, 0, 0, MINIMAP_W, MINIMAP_H)
    } catch (e) {
      // Stage not ready yet
      return
    }

    // Draw viewport rectangle
    const stageW = stage.width()
    const stageH = stage.height()

    // World dimensions visible in viewport
    const viewW = stageW / stageScale
    const viewH = stageH / stageScale

    // World offset (top-left corner of viewport in world coords)
    const worldX = -stagePos.x / stageScale
    const worldY = -stagePos.y / stageScale

    // Total world size we're mapping to minimap
    // Use a fixed "world window" of 4000x2400 so the minimap is stable
    const WORLD_W = 4000
    const WORLD_H = 2400

    const scaleX = MINIMAP_W / WORLD_W
    const scaleY = MINIMAP_H / WORLD_H

    const rectX = worldX * scaleX
    const rectY = worldY * scaleY
    const rectW = viewW * scaleX
    const rectH = viewH * scaleY

    miniCtx.strokeStyle = '#6366f1'
    miniCtx.lineWidth = 1.5
    miniCtx.strokeRect(
      Math.max(0, rectX),
      Math.max(0, rectY),
      Math.min(MINIMAP_W - rectX, rectW),
      Math.min(MINIMAP_H - rectY, rectH),
    )

    // Semi-transparent overlay inside viewport rect
    miniCtx.fillStyle = 'rgba(99, 102, 241, 0.06)'
    miniCtx.fillRect(
      Math.max(0, rectX),
      Math.max(0, rectY),
      Math.min(MINIMAP_W - rectX, rectW),
      Math.min(MINIMAP_H - rectY, rectH),
    )
  }, [stagePos, stageScale, stageRef])

  // Redraw when viewport or elements change
  useEffect(() => {
    const timer = setTimeout(draw, 100) // slight delay for Konva to finish rendering
    return () => clearTimeout(timer)
  }, [draw, elements])

  // Click to jump viewport
  const handleClick = useCallback((e) => {
    const stage = stageRef.current
    if (!stage) return

    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const WORLD_W = 4000
    const WORLD_H = 2400
    const scaleX = MINIMAP_W / WORLD_W
    const scaleY = MINIMAP_H / WORLD_H

    // Convert minimap click to world coords, then to stage pos
    const worldX = mx / scaleX
    const worldY = my / scaleY

    setStagePos({
      x: -(worldX * stageScale) + stage.width() / 2,
      y: -(worldY * stageScale) + stage.height() / 2,
    })
  }, [stageRef, stageScale, setStagePos])

  return (
    <div className="absolute bottom-4 right-4 z-30 rounded-xl overflow-hidden shadow-lg border border-gray-200 cursor-crosshair"
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
    >
      <canvas
        ref={canvasRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        onClick={handleClick}
        className="block"
      />
      <div className="absolute bottom-1 left-1 text-[9px] text-gray-300 pointer-events-none select-none">
        minimap
      </div>
    </div>
  )
}