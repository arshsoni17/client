import { useCallback, useRef } from 'react'
import useCanvasStore from '../store/canvasStore'

const getPos = (stage) => {
  const pos = stage.getPointerPosition()
  const scale = stage.scaleX()
  return {
    x: (pos.x - stage.x()) / scale,
    y: (pos.y - stage.y()) / scale,
  }
}

export default function useDrawing({ socket, userColor } = {}) {
  const {
    tool, color, strokeWidth,
    isDrawing, currentElement,
    setIsDrawing, setCurrentElement, addElement,
  } = useCanvasStore()

  const lastEmit = useRef(0)
  const strokeIdRef = useRef(null)

  // Emit current element state as preview to other users (throttled 60fps)
  const emitPreview = useCallback((element) => {
    if (!socket) return
    const now = Date.now()
    if (now - lastEmit.current < 16) return
    lastEmit.current = now
    socket.emit('stroke-preview', {
      strokeId: element.id,
      element,           // send full element so receiver can render any shape
      color,
      strokeWidth,
    })
  }, [socket, color, strokeWidth])

  const handleMouseDown = useCallback((e) => {
    if (tool === 'select' || tool === 'eraser' || tool === 'text') return

    const stage = e.target.getStage()
    const pos = getPos(stage)
    strokeIdRef.current = crypto.randomUUID()
    setIsDrawing(true)

    if (tool === 'pen') {
      setCurrentElement({
        id: strokeIdRef.current,
        type: 'path',
        tool: 'pen',
        points: [pos.x, pos.y],
        color, strokeWidth,
      })
      return
    }

    if (tool === 'rect') {
      setCurrentElement({
        id: strokeIdRef.current,
        type: 'rect',
        x: pos.x, y: pos.y,
        width: 0, height: 0,
        color, strokeWidth,
        fill: 'transparent',
        originX: pos.x, originY: pos.y,
      })
      return
    }

    if (tool === 'ellipse') {
      setCurrentElement({
        id: strokeIdRef.current,
        type: 'ellipse',
        x: pos.x, y: pos.y,
        radiusX: 0, radiusY: 0,
        color, strokeWidth,
        fill: 'transparent',
        originX: pos.x, originY: pos.y,
      })
      return
    }

    if (tool === 'arrow') {
      setCurrentElement({
        id: strokeIdRef.current,
        type: 'arrow',
        points: [pos.x, pos.y, pos.x, pos.y],
        color, strokeWidth,
      })
      return
    }
  }, [tool, color, strokeWidth, setIsDrawing, setCurrentElement])

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !currentElement) return
    const stage = e.target.getStage()
    const pos = getPos(stage)
    let updated = null

    if (currentElement.type === 'path') {
      updated = {
        ...currentElement,
        points: [...currentElement.points, pos.x, pos.y],
      }
    }

    if (currentElement.type === 'rect') {
      const { originX, originY } = currentElement
      updated = {
        ...currentElement,
        x: Math.min(pos.x, originX),
        y: Math.min(pos.y, originY),
        width: Math.abs(pos.x - originX),
        height: Math.abs(pos.y - originY),
      }
    }

    if (currentElement.type === 'ellipse') {
      const { originX, originY } = currentElement
      updated = {
        ...currentElement,
        x: (pos.x + originX) / 2,
        y: (pos.y + originY) / 2,
        radiusX: Math.abs(pos.x - originX) / 2,
        radiusY: Math.abs(pos.y - originY) / 2,
      }
    }

    if (currentElement.type === 'arrow') {
      updated = {
        ...currentElement,
        points: [currentElement.points[0], currentElement.points[1], pos.x, pos.y],
      }
    }

    if (updated) {
      setCurrentElement(updated)
      emitPreview(updated) // ← emit for ALL shape types
    }
  }, [isDrawing, currentElement, setCurrentElement, emitPreview])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentElement) return

    const tooSmall =
      (currentElement.type === 'path' && currentElement.points.length < 4) ||
      (currentElement.type === 'rect' && currentElement.width < 2) ||
      (currentElement.type === 'ellipse' && currentElement.radiusX < 2) 

    if (tooSmall) {
      setIsDrawing(false)
      setCurrentElement(null)
      socket?.emit('stroke-cancel')
      return
    }

    addElement(currentElement)
    socket?.emit('stroke-cancel') // tell others to clear the ghost
  }, [isDrawing, currentElement, addElement, setIsDrawing, setCurrentElement, socket])

  return { handleMouseDown, handleMouseMove, handleMouseUp }
}