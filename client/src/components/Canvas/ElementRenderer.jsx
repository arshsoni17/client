import { Line, Rect, Ellipse, Arrow, Text, Group } from 'react-konva'

// Guard — skip elements with missing required props
const isValid = (el) => {
  if (!el || !el.id || !el.type) return false
  if (el.type === 'path') return el.points?.length >= 2
  if (el.type === 'rect') return el.width > 0 && el.height > 0
  if (el.type === 'ellipse') return el.radiusX > 0 && el.radiusY > 0
  if (el.type === 'arrow') return el.points?.length >= 4
  if (el.type === 'text') return !!el.text
  if (el.type === 'sticky') return true
  return false
}

export default function ElementRenderer({
  elements,
  currentElement,
  onElementClick,   // eraser delete
  onSelect,         // select tool — click to select
  onTransformEnd,   // drag/resize end — syncs to Yjs
  onDoubleClick,    // double-click to edit text/sticky
  selectedId,
  tool,
}) {
  const all = currentElement ? [...elements, currentElement] : elements

  return (
    <>
      {all.filter(isValid).map((el) => {
        const isCommitted = elements.some(e => e.id === el.id)
        const isSelectable = isCommitted && tool === 'select'
        const isDraggable = isSelectable // only draggable when select tool active

        const eraserHandlers = isCommitted && onElementClick && tool === 'eraser' ? {
          onClick: (e) => onElementClick(e, el.id),
          onMouseMove: (e) => {
            if (e.evt.buttons === 1) onElementClick(e, el.id)
          },
        } : {}

        const selectHandlers = isSelectable ? {
          onClick: (e) => {
            e.cancelBubble = true
            onSelect?.(el.id)
          },
        } : {}

        const dragHandlers = isDraggable ? {
          draggable: true,
          onDragEnd: (e) => {
            onTransformEnd?.(el.id, {
              x: e.target.x(),
              y: e.target.y(),
            })
          },
        } : { draggable: false }

        const dblClickHandlers = (el.type === 'sticky' || el.type === 'text') && onDoubleClick ? {
          onDblClick: (e) => {
            e.cancelBubble = true
            onDoubleClick(el)
          },
        } : {}

        const handlers = { ...eraserHandlers, ...selectHandlers, ...dragHandlers, ...dblClickHandlers }

        if (el.type === 'path') {
          return (
            <Line
              key={el.id}
              id={el.id}
              points={el.points}
              x={el.x || 0}
              y={el.y || 0}
              stroke={el.color || '#000000'}
              strokeWidth={el.strokeWidth || 3}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
              hitStrokeWidth={12}
              {...handlers}
            />
          )
        }

        if (el.type === 'rect') {
          return (
            <Rect
              key={el.id}
              id={el.id}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              stroke={el.color || '#000000'}
              strokeWidth={el.strokeWidth || 3}
              fill="transparent"
              hitStrokeWidth={12}
              {...handlers}
            />
          )
        }

        if (el.type === 'ellipse') {
          return (
            <Ellipse
              key={el.id}
              id={el.id}
              x={el.x}
              y={el.y}
              radiusX={el.radiusX}
              radiusY={el.radiusY}
              stroke={el.color || '#000000'}
              strokeWidth={el.strokeWidth || 3}
              fill="transparent"
              hitStrokeWidth={12}
              {...handlers}
            />
          )
        }

        if (el.type === 'arrow') {
          return (
            <Arrow
              key={el.id}
              id={el.id}
              points={el.points}
              x={el.x || 0}
              y={el.y || 0}
              stroke={el.color || '#000000'}
              strokeWidth={el.strokeWidth || 3}
              fill={el.color || '#000000'}
              pointerLength={12}
              pointerWidth={10}
              hitStrokeWidth={12}
              {...handlers}
            />
          )
        }

        if (el.type === 'text') {
          return (
            <Text
              key={el.id}
              id={el.id}
              x={el.x}
              y={el.y}
              text={el.text}
              fontSize={el.fontSize || 18}
              fill={el.color || '#000000'}
              {...handlers}
            />
          )
        }

        if (el.type === 'sticky') {
          return (
            <Group
              key={el.id}
              id={el.id}
              x={el.x}
              y={el.y}
              {...handlers}
            >
              <Rect
                width={el.width || 160}
                height={el.height || 120}
                fill={el.bgColor || '#FEF08A'}
                stroke={el.id === selectedId ? '#6366f1' : 'rgba(0,0,0,0.08)'}
                strokeWidth={el.id === selectedId ? 2 : 1}
                cornerRadius={8}
                shadowColor="rgba(0,0,0,0.15)"
                shadowBlur={6}
                shadowOffsetY={3}
              />
              <Text
                text={el.text || ''}
                width={el.width || 160}
                height={el.height || 120}
                padding={12}
                fontSize={14}
                fill="#1a1a1a"
                wrap="word"
              />
            </Group>
          )
        }

        return null
      })}
    </>
  )
}