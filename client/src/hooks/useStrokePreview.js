import { useEffect } from 'react'
import useGhostStore from '../store/ghostStore'

export default function useStrokePreview(previewSocket) {
  const { setGhost, clearGhost, setTextEditor, clearTextEditor, clearAll } = useGhostStore()

  useEffect(() => {
    if (!previewSocket) return

    const onStrokePreview = ({ userId, element }) => {
      if (!userId || !element) return
      setGhost(userId, element)
    }
    const onStrokeCancel = ({ userId }) => clearGhost(userId)

    const onTextEditing = ({ userId, userName, userColor, x, y }) => {
      setTextEditor(userId, { userName, userColor, x, y })
    }
    const onTextDone = ({ userId }) => clearTextEditor(userId)

    const onUserLeft = ({ userId }) => {
      clearGhost(userId)
      clearTextEditor(userId)
    }

    previewSocket.on('stroke-preview', onStrokePreview)
    previewSocket.on('stroke-cancel', onStrokeCancel)
    previewSocket.on('text-editing', onTextEditing)
    previewSocket.on('text-done', onTextDone)
    previewSocket.on('user-left', onUserLeft)

    return () => {
      previewSocket.off('stroke-preview', onStrokePreview)
      previewSocket.off('stroke-cancel', onStrokeCancel)
      previewSocket.off('text-editing', onTextEditing)
      previewSocket.off('text-done', onTextDone)
      previewSocket.off('user-left', onUserLeft)
      clearAll()
    }
  }, [previewSocket])
}