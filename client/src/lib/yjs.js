import * as Y from 'yjs'
import { SocketIOProvider } from 'y-socket.io'
import { io } from 'socket.io-client'

let provider = null
let ydoc = null
let previewSocket = null  // separate socket for stroke previews

export const initYjs = ({ boardId, userId, userName, userColor, role }) => {
  if (provider) { provider.destroy(); provider = null }
  if (ydoc) { ydoc.destroy(); ydoc = null }
  if (previewSocket) { previewSocket.disconnect(); previewSocket = null }

  ydoc = new Y.Doc()

  provider = new SocketIOProvider(
    import.meta.env.VITE_API_URL,
    boardId,
    ydoc,
    {
      autoConnect: true,
      auth: { boardId, userId, userName, userColor },
    }
  )

  provider.awareness.setLocalState({
    userId,
    userName,
    userColor,
    role: role || 'editor',
    cursor: null,
  })

  // Separate plain socket for stroke previews + cursor on main namespace
  previewSocket = io(import.meta.env.VITE_API_URL, {
    auth: { boardId, userId, userName, userColor },
    transports: ['websocket'],
  })

  return { ydoc, provider, previewSocket }
}

export const getYElements = (ydoc) => ydoc.getMap('elements')

export const destroyYjs = () => {
  if (provider) { provider.destroy(); provider = null }
  if (ydoc) { ydoc.destroy(); ydoc = null }
  if (previewSocket) { previewSocket.disconnect(); previewSocket = null }
}