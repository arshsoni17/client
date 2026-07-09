import { useEffect, useRef } from 'react'
import { Transformer } from 'react-konva'

// Wraps Konva's Transformer to show resize handles around the selected node
export default function SelectionBox({ selectedId, stageRef, onTransformEnd }) {
  const trRef = useRef(null)

  useEffect(() => {
    if (!trRef.current || !stageRef.current) return

    if (!selectedId) {
      trRef.current.nodes([])
      trRef.current.getLayer()?.batchDraw()
      return
    }

    const node = stageRef.current.findOne(`#${selectedId}`)
    if (node) {
      trRef.current.nodes([node])
      trRef.current.getLayer()?.batchDraw()
    } else {
      trRef.current.nodes([])
    }
  }, [selectedId, stageRef])

  const handleTransformEnd = () => {
    const node = trRef.current?.nodes()[0]
    if (!node) return

    console.log('transform end — node className:', node.className)
    console.log('scaleX:', node.scaleX(), 'scaleY:', node.scaleY())

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    node.scaleX(1)
    node.scaleY(1)

    const updates = {
      x: node.x(),
      y: node.y(),
    }

    if (typeof node.width === 'function' && node.className !== 'Group') {
      updates.width = Math.max(20, node.width() * scaleX)
      updates.height = Math.max(20, node.height() * scaleY)
      console.log('Rect/Ellipse path — new width/height:', updates.width, updates.height)
    } else if (node.className === 'Group') {
      const bgRect = node.findOne('Rect')
      console.log('Group path — bgRect found:', !!bgRect, 'bgRect width:', bgRect?.width())
      if (bgRect) {
        updates.width = Math.max(60, bgRect.width() * scaleX)
        updates.height = Math.max(60, bgRect.height() * scaleY)
        console.log('Group path — new width/height:', updates.width, updates.height)
      }
    }

    if (typeof node.radiusX === 'function') {
      updates.radiusX = Math.max(10, node.radiusX() * scaleX)
      updates.radiusY = Math.max(10, node.radiusY() * scaleY)
    }

    console.log('final updates being sent:', updates)
    onTransformEnd?.(selectedId, updates)
  }

  return (
    <Transformer
      ref={trRef}
      onTransformEnd={handleTransformEnd}
      rotateEnabled={false}
      flipEnabled={false}
      borderStroke="#6366f1"
      borderStrokeWidth={1.5}
      anchorStroke="#6366f1"
      anchorFill="#ffffff"
      anchorSize={8}
      anchorCornerRadius={4}
      boundBoxFunc={(oldBox, newBox) => {
        // Prevent resizing to negative/zero
        if (newBox.width < 10 || newBox.height < 10) return oldBox
        return newBox
      }}
    />
  )
}