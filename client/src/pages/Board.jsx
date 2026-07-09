import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Canvas from '../components/Canvas/Canvas'
import Toolbar from '../components/Canvas/Toolbar'
import Cursors from '../components/Canvas/Cursors'
import Minimap from '../components/Canvas/Minimap'
import ShareModal from '../components/Board/ShareModal'
import SettingsPanel from '../components/Board/SettingsPanel'
import useYjs from '../hooks/useYjs'
import useStrokePreview from '../hooks/useStrokePreview'
import useCanvasStore, { registerYjsCallbacks } from '../store/canvasStore'
import { useAuth } from '../context/AuthContext'
import { getBoard, saveThumbnail } from '../api/boards'

export default function Board() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stagePos, stageScale } = useCanvasStore()
  const stageRef = useRef(null)

  const [boardMeta, setBoardMeta] = useState(null)
  const [boardTitle, setBoardTitle] = useState('')
  const [accessError, setAccessError] = useState(null)
  const [showShare, setShowShare] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [exporting, setExporting] = useState(false) // 'png' | 'pdf' | false

  useEffect(() => {
    getBoard(boardId)
      .then((data) => {
        setBoardMeta(data)
        setBoardTitle(data.title)
      })
      .catch((err) => setAccessError(err.message))
  }, [boardId])

  const {
    addElement, removeElement, updateCursor,
    peers, synced, userColor, previewSocket,
  } = useYjs({ boardId: boardMeta ? boardId : null, user, role: boardMeta?.role })

  useEffect(() => {
    registerYjsCallbacks(addElement, removeElement)
    return () => registerYjsCallbacks(null, null)
  }, [addElement, removeElement])

  useStrokePreview(previewSocket)

  const editorPeers = Object.fromEntries(
    Object.entries(peers).filter(([, peer]) => peer.role !== 'viewer')
  )

  useEffect(() => {
    if (!previewSocket || !user) return
    const onRoleChanged = ({ targetUserId, role }) => {
      if (targetUserId === user._id) {
        if (role === null) {
          navigate('/dashboard')
        } else {
          setBoardMeta((prev) => prev ? { ...prev, role } : prev)
        }
      }
    }
    previewSocket.on('role-changed', onRoleChanged)
    return () => previewSocket.off('role-changed', onRoleChanged)
  }, [previewSocket, user, navigate])

  // ── Export PNG / PDF ─────────────────────────────────────────
  const handleExport = useCallback(async (format = 'png') => {
    const stage = stageRef.current
    if (!stage) { alert('Canvas not ready'); return }

    setExporting(format)

    // Save current transform
    const oldX = stage.x()
    const oldY = stage.y()
    const oldScale = stage.scaleX()

    // Reset stage to origin for clean export
    stage.x(0)
    stage.y(0)
    stage.scaleX(1)
    stage.scaleY(1)
    stage.batchDraw()

    await new Promise(r => setTimeout(r, 100))

    // Find bounding box of all valid elements
    const allElements = stage.find('Line, Rect, Ellipse, Arrow, Text, Group')
    let minX = 0, minY = 0, maxX = window.innerWidth, maxY = window.innerHeight

    if (allElements.length > 0) {
      const boxes = allElements
        .map(el => el.getClientRect({ relativeTo: stage }))
        .filter(b =>
          isFinite(b.x) && isFinite(b.y) &&
          isFinite(b.width) && isFinite(b.height) &&
          Math.abs(b.x) < 100000 && Math.abs(b.y) < 100000 &&
          b.width > 0 && b.height > 0 && b.width < 50000 && b.height < 50000
        )

      if (boxes.length > 0) {
        minX = Math.min(...boxes.map(b => b.x)) - 40
        minY = Math.min(...boxes.map(b => b.y)) - 40
        maxX = Math.max(...boxes.map(b => b.x + b.width)) + 40
        maxY = Math.max(...boxes.map(b => b.y + b.height)) + 40
      }
    }

    const uri = stage.toDataURL({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      pixelRatio: 2,
    })

    // Restore original transform
    stage.x(oldX)
    stage.y(oldY)
    stage.scaleX(oldScale)
    stage.scaleY(oldScale)
    stage.batchDraw()

    // Composite onto white background
    const offscreen = document.createElement('canvas')
    const ctx = offscreen.getContext('2d')
    const img = new Image()

    img.onload = async () => {
      offscreen.width = img.width
      offscreen.height = img.height
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, offscreen.width, offscreen.height)
      ctx.drawImage(img, 0, 0)

      if (format === 'png') {
        const link = document.createElement('a')
        link.download = `${boardTitle || 'whiteboard'}.png`
        link.href = offscreen.toDataURL('image/png')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setExporting(false)
      }

      if (format === 'pdf') {
        try {
          const { jsPDF } = await import('jspdf')
          const pdfW = offscreen.width / 2
          const pdfH = offscreen.height / 2
          const pdf = new jsPDF({
            orientation: pdfW > pdfH ? 'landscape' : 'portrait',
            unit: 'px',
            format: [pdfW, pdfH],
          })
          pdf.addImage(offscreen.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH)
          pdf.save(`${boardTitle || 'whiteboard'}.pdf`)
          setExporting(false)
        } catch (err) {
          setExporting(false)
          alert('PDF export failed: ' + err.message)
        }
      }
    }

    img.onerror = () => {
      setExporting(false)
      alert('Export failed — please try again')
    }

    img.src = uri
  }, [boardTitle])

  // ── Save thumbnail on leave ─────────────────────────────────
  const saveBoardThumbnail = useCallback(async () => {
    const stage = stageRef.current
    if (!stage || !boardId) return
    try {
      const thumbnail = stage.toDataURL({ pixelRatio: 0.15 })
      await saveThumbnail(boardId, thumbnail)
    } catch (e) {
      // silent fail
    }
  }, [boardId])

  useEffect(() => {
    return () => { saveBoardThumbnail() }
  }, [saveBoardThumbnail])

  if (accessError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-gray-500">{accessError}</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg">
          Back to dashboard
        </button>
      </div>
    )
  }

  if (!boardMeta) {
    return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Loading board...</div>
  }

  const isReadOnly = boardMeta.role === 'viewer'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#fafaf8]">

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-50 pointer-events-none">

        {/* Left — back + title */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => { saveBoardThumbnail(); navigate('/dashboard') }}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors px-1"
          >
            ←
          </button>
          <span className="text-sm font-medium text-gray-700 max-w-40 truncate">
            {boardTitle}
          </span>
          {isReadOnly && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              View only
            </span>
          )}
        </div>

        {/* Center — peer avatars */}
        {Object.keys(editorPeers).length > 0 && (
          <div className="flex items-center gap-1 pointer-events-auto">
            {Object.entries(editorPeers).map(([uid, peer]) => (
              <div
                key={uid}
                title={peer.userName}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm ring-2 ring-white"
                style={{ background: peer.userColor }}
              >
                {peer.userName?.[0]?.toUpperCase()}
              </div>
            ))}
          </div>
        )}

        {/* Right — sync + export + share + settings */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${synced ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
            <span className="text-xs text-gray-400">{synced ? 'Live' : 'Connecting...'}</span>
          </div>

          {!isReadOnly && (
            <>
              {/* Export buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExport('png')}
                  disabled={!!exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting === 'png' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>⬇ PNG</>
                  )}
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={!!exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting === 'pdf' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>⬇ PDF</>
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowShare(true)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Share
              </button>
            </>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 transition-colors
              ${showSettings ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-14">
        <Toolbar readOnly={isReadOnly} />
      </div>

      {/* Canvas area */}
      <div className="relative flex-1 overflow-hidden">
        <Canvas
          updateCursor={updateCursor}
          socket={previewSocket}
          userColor={userColor}
          readOnly={isReadOnly}
          stageRef={stageRef}
        />
        <Cursors peers={editorPeers} stagePos={stagePos} stageScale={stageScale} />
        <Minimap stageRef={stageRef} />

        {showSettings && (
          <SettingsPanel
            board={{ ...boardMeta, ownerName: boardMeta.ownerName || user?.name }}
            onClose={() => setShowSettings(false)}
            onTitleChange={setBoardTitle}
            onBoardUpdate={(changes) => setBoardMeta((prev) => ({ ...prev, ...changes }))}
            socket={previewSocket}
          />
        )}
      </div>

      {showShare && (
        <ShareModal
          boardId={boardId}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}