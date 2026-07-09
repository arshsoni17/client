import { Layer, Line, Rect, Ellipse, Arrow } from 'react-konva'
import useGhostStore from '../../store/ghostStore'

export default function GhostLayer() {
  const { ghosts } = useGhostStore()

  return (
    <Layer listening={false}>
      {Object.entries(ghosts).map(([userId, el]) => {
        if (!el) return null

        const common = {
          key: userId,
          stroke: el.color || '#6366f1',
          strokeWidth: el.strokeWidth || 3,
          opacity: 0.7,
          listening: false,
        }

        if (el.type === 'path') {
          if (!el.points || el.points.length < 2) return null
          return (
            <Line
              {...common}
              points={el.points}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
            />
          )
        }

        if (el.type === 'rect') {
          if (!el.width || !el.height) return null
          return (
            <Rect
              {...common}
              x={el.x} y={el.y}
              width={el.width} height={el.height}
              fill="transparent"
            />
          )
        }

        if (el.type === 'ellipse') {
          if (!el.radiusX || !el.radiusY) return null
          return (
            <Ellipse
              {...common}
              x={el.x} y={el.y}
              radiusX={el.radiusX} radiusY={el.radiusY}
              fill="transparent"
            />
          )
        }

        if (el.type === 'arrow') {
          if (!el.points || el.points.length < 4) return null
          return (
            <Arrow
              {...common}
              points={el.points}
              fill={el.color || '#6366f1'}
              pointerLength={12}
              pointerWidth={10}
            />
          )
        }

        return null
      })}
    </Layer>
  )
}