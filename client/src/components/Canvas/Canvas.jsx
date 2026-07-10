import { useEffect, useRef, useCallback } from 'react'
import { Stage, Layer } from 'react-konva'
import useCanvasStore from '../../store/canvasStore'
import useDrawing from '../../hooks/useDrawing'
import ElementRenderer from './ElementRenderer'
import GhostLayer from './GhostLayer'
import TextEditingIndicator from './TextEditingIndicator'
import SelectionBox from './SelectionBox'

const MIN_SCALE = 0.1
const MAX_SCALE = 5
const SCALE_STEP = 1.08
const TOOLBAR_HEIGHT = 56

export default function Canvas({ updateCursor, socket, userColor, readOnly, stageRef: externalRef }) {
  const internalRef = useRef(null)
  const stageRef = externalRef || internalRef
  const isPanning = useRef(false)
  const lastPos = useRef(null)
  const lastCursorEmit = useRef(0)
  const lastTouchDist = useRef(null) // for pinch zoom

  const {
    tool, color, stickyColor, elements, currentElement,
    stagePos, stageScale,
    setStagePos, setStageScale,
    undo, redo, setTool,
    addElement, removeElement, updateElement,
    selectedId, setSelectedId,
  } = useCanvasStore()

  const { handleMouseDown, handleMouseMove, handleMouseUp } = useDrawing({
    socket,
    userColor,
  })

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault(); redo()
      }
      if (e.key === 'p') setTool('pen')
      if (e.key === 'e') setTool('eraser')
      if (e.key === 'r') setTool('rect')
      if (e.key === 'o') setTool('ellipse')
      if (e.key === 'a') setTool('arrow')
      if (e.key === 't') setTool('text')
      if (e.key === 'n') setTool('sticky')
      if (e.key === 's') setTool('select')
      if (e.key === 'Escape') {
        socket?.emit('stroke-cancel')
        setSelectedId(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        removeElement(selectedId)
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, setTool, socket, selectedId, removeElement, setSelectedId])

  // ── Zoom (mouse wheel) ────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
      oldScale * (direction > 0 ? SCALE_STEP : 1 / SCALE_STEP)
    ))
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    setStageScale(newScale)
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }, [setStageScale, setStagePos])

  // ── Eraser ────────────────────────────────────────────────
  const handleElementClick = useCallback((e, id) => {
    if (tool !== 'eraser') return
    e.cancelBubble = true
    removeElement(id)
  }, [tool, removeElement])

  // ── Select ────────────────────────────────────────────────
  const handleSelect = useCallback((id) => {
    setSelectedId(id)
  }, [setSelectedId])

  // ── Drag / resize → sync via Yjs ─────────────────────────
  const handleTransformEnd = useCallback((id, changes) => {
    updateElement(id, changes)
  }, [updateElement])

  // ── Click on empty canvas ─────────────────────────────────
  const handleStageClick = useCallback((e) => {
    if (readOnly) return
    const clickedOnEmpty = e.target === e.target.getStage()

    if (tool === 'select' && clickedOnEmpty) {
      setSelectedId(null)
      return
    }

    if (tool === 'text' && clickedOnEmpty) {
      const stage = stageRef.current
      const scale = stage.scaleX()
      const pos = {
        x: (stage.getPointerPosition().x - stage.x()) / scale,
        y: (stage.getPointerPosition().y - stage.y()) / scale,
      }
      openTextInput(pos)
      return
    }

    if (tool === 'sticky' && clickedOnEmpty) {
      const stage = stageRef.current
      const scale = stage.scaleX()
      const pos = {
        x: (stage.getPointerPosition().x - stage.x()) / scale,
        y: (stage.getPointerPosition().y - stage.y()) / scale,
      }
      const newSticky = {
        id: crypto.randomUUID(),
        type: 'sticky',
        x: pos.x, y: pos.y,
        width: 160, height: 120,
        text: '', bgColor: stickyColor,
      }
      addElement(newSticky)
      openStickyEdit(newSticky)
      return
    }
  }, [tool, stickyColor, addElement, setSelectedId])

  // ── Text input ────────────────────────────────────────────
  const openTextInput = useCallback((pos, existingEl = null) => {
    const stage = stageRef.current
    const scale = stage.scaleX()
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    const stageBox = stage.container().getBoundingClientRect()
    if (existingEl) textarea.value = existingEl.text || ''
    textarea.style.cssText = `
      position: fixed;
      top: ${stageBox.top + pos.y * scale + stage.y()}px;
      left: ${stageBox.left + pos.x * scale + stage.x()}px;
      font-size: ${18 * scale}px;
      font-family: sans-serif;
      border: 2px solid #6366f1;
      border-radius: 4px;
      padding: 4px 8px;
      min-width: 120px;
      background: white;
      color: black;
      resize: none;
      outline: none;
      z-index: 9999;
      line-height: 1.4;
    `
    textarea.focus()
    if (existingEl) textarea.select()
    socket?.emit('text-editing', { x: pos.x, y: pos.y })

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      const text = textarea.value.trim()
      if (existingEl) {
        if (text) updateElement(existingEl.id, { text })
        else removeElement(existingEl.id)
      } else if (text) {
        addElement({
          id: crypto.randomUUID(),
          type: 'text',
          x: pos.x, y: pos.y,
          text, fontSize: 18,
          color: useCanvasStore.getState().color,
        })
      }
      textarea.removeEventListener('blur', finish)
      if (textarea.parentNode) textarea.parentNode.removeChild(textarea)
      socket?.emit('text-done')
    }
    const cancel = () => {
      if (finished) return
      finished = true
      textarea.removeEventListener('blur', finish)
      if (textarea.parentNode) textarea.parentNode.removeChild(textarea)
      socket?.emit('text-done')
    }
    textarea.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); finish() }
      if (ev.key === 'Escape') cancel()
    })
    textarea.addEventListener('blur', finish)
  }, [addElement, updateElement, removeElement, socket])

  // ── Sticky edit ───────────────────────────────────────────
  const openStickyEdit = useCallback((el) => {
    const stage = stageRef.current
    const scale = stage.scaleX()
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    const stageBox = stage.container().getBoundingClientRect()
    const width = el.width || 160
    const height = el.height || 120
    textarea.value = el.text || ''
    textarea.style.cssText = `
      position: fixed;
      top: ${stageBox.top + el.y * scale + stage.y() + 8 * scale}px;
      left: ${stageBox.left + el.x * scale + stage.x() + 8 * scale}px;
      width: ${(width - 16) * scale}px;
      height: ${(height - 16) * scale}px;
      font-size: ${14 * scale}px;
      font-family: sans-serif;
      border: 2px solid #6366f1;
      border-radius: 4px;
      padding: 4px;
      background: transparent;
      color: #1a1a1a;
      resize: none;
      outline: none;
      z-index: 9999;
      line-height: 1.4;
    `
    textarea.focus()
    textarea.select()
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      updateElement(el.id, { text: textarea.value.trim() })
      if (textarea.parentNode) textarea.parentNode.removeChild(textarea)
    }
    textarea.addEventListener('blur', finish)
    textarea.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        finished = true
        if (textarea.parentNode) textarea.parentNode.removeChild(textarea)
      }
    })
  }, [updateElement])

  // ── Double-click to edit ──────────────────────────────────
  const handleDoubleClick = useCallback((el) => {
    if (el.type === 'sticky') openStickyEdit(el)
    if (el.type === 'text') openTextInput({ x: el.x, y: el.y }, el)
  }, [openStickyEdit, openTextInput])

  // ── Mouse down ────────────────────────────────────────────
  const handleStageMouseDown = useCallback((e) => {
    const clickedOnEmpty = e.target === e.target.getStage()
    if (e.evt.button === 1) {
      isPanning.current = true
      lastPos.current = { x: e.evt.clientX, y: e.evt.clientY }
      return
    }
    if (readOnly) {
      if (clickedOnEmpty) {
        isPanning.current = true
        lastPos.current = { x: e.evt.clientX, y: e.evt.clientY }
      }
      return
    }
    if (tool === 'select' && clickedOnEmpty) {
      isPanning.current = true
      lastPos.current = { x: e.evt.clientX, y: e.evt.clientY }
      return
    }
    if (tool === 'select' || tool === 'text' || tool === 'sticky') return
    handleMouseDown(e)
  }, [tool, handleMouseDown, readOnly])

  const handleStageMouseMove = useCallback((e) => {
    if (stageRef.current && updateCursor) {
      const now = Date.now()
      if (now - lastCursorEmit.current > 16) {
        const stage = stageRef.current
        const scale = stage.scaleX()
        const pointer = stage.getPointerPosition()
        if (pointer) {
          updateCursor({
            x: (pointer.x - stage.x()) / scale,
            y: (pointer.y - stage.y()) / scale,
          })
          lastCursorEmit.current = now
        }
      }
    }
    if (isPanning.current && lastPos.current) {
      const dx = e.evt.clientX - lastPos.current.x
      const dy = e.evt.clientY - lastPos.current.y
      setStagePos({ x: stagePos.x + dx, y: stagePos.y + dy })
      lastPos.current = { x: e.evt.clientX, y: e.evt.clientY }
      return
    }
    handleMouseMove(e)
  }, [stagePos, setStagePos, handleMouseMove, updateCursor])

  const handleStageMouseUp = useCallback((e) => {
    if (isPanning.current) {
      isPanning.current = false
      lastPos.current = null
      return
    }
    handleMouseUp(e)
  }, [handleMouseUp])

  // ── Touch handlers ────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    e.evt.preventDefault()
    const touches = e.evt.touches

    if (touches.length === 2) {
      // Two fingers — prepare for pinch zoom, cancel drawing
      isPanning.current = false
      lastTouchDist.current = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      )
      socket?.emit('stroke-cancel')
      return
    }

    // Single finger — treat like mouse down
    const touch = touches[0]
    handleStageMouseDown({
      ...e,
      evt: {
        ...e.evt,
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        buttons: 1,
      },
      target: e.target,
    })
  }, [handleStageMouseDown, socket])

  const handleTouchMove = useCallback((e) => {
    e.evt.preventDefault()
    const touches = e.evt.touches

    if (touches.length === 2 && lastTouchDist.current !== null) {
      // Pinch zoom
      const stage = stageRef.current
      const newDist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      )
      const oldScale = stage.scaleX()
      const scaleBy = newDist / lastTouchDist.current
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * scaleBy))

      // Zoom toward midpoint of two fingers
      const midX = (touches[0].clientX + touches[1].clientX) / 2
      const midY = (touches[0].clientY + touches[1].clientY) / 2
      const mousePointTo = {
        x: (midX - stage.x()) / oldScale,
        y: (midY - stage.y()) / oldScale,
      }
      setStageScale(newScale)
      setStagePos({
        x: midX - mousePointTo.x * newScale,
        y: midY - mousePointTo.y * newScale,
      })
      lastTouchDist.current = newDist
      return
    }

    if (touches.length === 1) {
      const touch = touches[0]
      handleStageMouseMove({
        ...e,
        evt: {
          ...e.evt,
          clientX: touch.clientX,
          clientY: touch.clientY,
          buttons: 1,
        },
        target: e.target,
      })
    }
  }, [handleStageMouseMove, setStageScale, setStagePos])

  const handleTouchEnd = useCallback((e) => {
    e.evt.preventDefault()
    lastTouchDist.current = null
    handleStageMouseUp(e)
  }, [handleStageMouseUp])

  const cursorMap = {
    eraser: 'cell',
    select: 'grab',
    text: 'text',
    sticky: 'copy',
  }
  const cursor = cursorMap[tool] || 'crosshair'

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ cursor, touchAction: 'none' }}>
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight - TOOLBAR_HEIGHT}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ background: '#fafaf8', touchAction: 'none' }}
      >
        <Layer>
          <ElementRenderer
            elements={elements}
            currentElement={currentElement}
            onElementClick={handleElementClick}
            onSelect={handleSelect}
            onTransformEnd={handleTransformEnd}
            onDoubleClick={handleDoubleClick}
            selectedId={selectedId}
            tool={tool}
          />
          <SelectionBox
            selectedId={tool === 'select' ? selectedId : null}
            stageRef={stageRef}
            onTransformEnd={handleTransformEnd}
          />
        </Layer>
        <GhostLayer />
      </Stage>
      <TextEditingIndicator stagePos={stagePos} stageScale={stageScale} />
    </div>
  )
}