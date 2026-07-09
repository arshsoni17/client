import { useEffect, useRef, useState } from 'react'
import { initYjs, getYElements, destroyYjs } from '../lib/yjs'
import useCanvasStore from '../store/canvasStore'

const randomColor = () => {
  const colors = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899']
  return colors[Math.floor(Math.random() * colors.length)]
}

export default function useYjs({ boardId, user, role }) {
  const ydocRef = useRef(null)
  const providerRef = useRef(null)
  const previewSocketRef = useRef(null)
  const yElementsRef = useRef(null)
  const userColor = useRef(randomColor())

  const [peers, setPeers] = useState({})
  const [synced, setSynced] = useState(false)
  const [previewSocket, setPreviewSocket] = useState(null)

  const { setElements } = useCanvasStore()

  useEffect(() => {
    if (!boardId || !user) return

    const { ydoc, provider, previewSocket } = initYjs({
      boardId,
      userId: user._id,
      userName: user.name,
      userColor: userColor.current,
      role: role || 'editor',
    })

    ydocRef.current = ydoc
    providerRef.current = provider
    previewSocketRef.current = previewSocket
    setPreviewSocket(previewSocket)

    const yElements = getYElements(ydoc)
    yElementsRef.current = yElements

    const onYMapChange = () => {
      const elements = []
      yElements.forEach((value) => elements.push(value))
      setElements(elements)
    }
    yElements.observe(onYMapChange)

    const onAwarenessChange = () => {
      const states = {}
      provider.awareness.getStates().forEach((state, clientId) => {
        if (clientId === ydoc.clientID) return
        if (state?.userId) {
          states[state.userId] = {
            userName: state.userName,
            userColor: state.userColor,
            role: state.role || 'editor',
            cursor: state.cursor,
          }
        }
      })
      setPeers(states)
    }
    provider.awareness.on('change', onAwarenessChange)
    provider.on('synced', () => setSynced(true))

    return () => {
      yElements.unobserve(onYMapChange)
      provider.awareness.off('change', onAwarenessChange)
      destroyYjs()
      setSynced(false)
      setPeers({})
      setPreviewSocket(null)
    }
  }, [boardId, user])

  const addElement = (element) => {
    yElementsRef.current?.set(element.id, element)
  }

  const removeElement = (id) => {
    yElementsRef.current?.delete(id)
  }

  const updateCursor = (pos) => {
    providerRef.current?.awareness.setLocalStateField('cursor', pos)
  }

  return {
    addElement,
    removeElement,
    updateCursor,
    peers,
    synced,
    userColor: userColor.current,
    previewSocket, // plain socket.io socket on main namespace
  }
}