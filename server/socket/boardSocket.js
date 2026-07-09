import * as Y from 'yjs'
import { YSocketIO } from 'y-socket.io/dist/server'
import Board from '../models/Board.js'

const activeDocs = new Map()        // boardId -> Y.Doc
const activeUsers = new Map()       // boardId -> Set of userIds
const autosaveIntervals = new Map() // boardId -> interval handle
const docLoaded = new Map()         // boardId -> boolean (state loaded from DB)

const AUTOSAVE_INTERVAL = 30000

// ── Save Y.Doc state to MongoDB ─────────────────────────────
const saveBoardState = async (boardId) => {
  const ydoc = activeDocs.get(boardId)
  if (!ydoc) return
  try {
    const state = Y.encodeStateAsUpdate(ydoc)
    await Board.findByIdAndUpdate(boardId, { yjsState: Buffer.from(state) })
    console.log(`Saved board ${boardId} (${state.byteLength} bytes)`)
  } catch (err) {
    console.error(`Failed to save board ${boardId}:`, err.message)
  }
}

// ── Load saved state into a Y.Doc ────────────────────────────
const loadBoardState = async (boardId, ydoc) => {
  if (docLoaded.get(boardId)) return // already loaded
  docLoaded.set(boardId, true)
  try {
    const board = await Board.findById(boardId).select('yjsState')
    if (board?.yjsState && board.yjsState.length > 0) {
      Y.applyUpdate(ydoc, new Uint8Array(board.yjsState))
      console.log(`Loaded board ${boardId} from DB`)
    } else {
      console.log(`Board ${boardId} has no saved state — starting fresh`)
    }
  } catch (err) {
    console.error(`Failed to load board ${boardId}:`, err.message)
  }
}

export const registerBoardSocket = (io) => {
  const ysocketio = new YSocketIO(io)

  // When Yjs creates a doc for a room, store it and load saved state
  ysocketio.on('document-loaded', async (doc) => {
    const boardId = doc.name
    if (!activeDocs.has(boardId)) {
      activeDocs.set(boardId, doc)
    }
    await loadBoardState(boardId, doc)
  })

  ysocketio.initialize()

  io.on('connection', (socket) => {
    const { boardId, userId, userName, userColor } = socket.handshake.auth

    // Only track preview socket connections (they have boardId + userId)
    // Yjs provider sockets connect to a different namespace — they won't have userName
    if (!boardId || !userName) return

    socket.join(boardId)
    console.log(`${userName} joined board ${boardId}`)

    // Track unique users per board (not raw connection count)
    if (!activeUsers.has(boardId)) activeUsers.set(boardId, new Set())
    activeUsers.get(boardId).add(userId)

    // Start autosave loop if not already running
    if (!autosaveIntervals.has(boardId)) {
      const interval = setInterval(() => saveBoardState(boardId), AUTOSAVE_INTERVAL)
      autosaveIntervals.set(boardId, interval)
    }

    // ── Stroke/shape preview relay ───────────────────────────
    socket.on('stroke-preview', (data) => {
      socket.to(boardId).emit('stroke-preview', {
        userId, userColor, element: data.element,
      })
    })
    socket.on('stroke-cancel', () => {
      socket.to(boardId).emit('stroke-cancel', { userId })
    })

    // ── Role changed — notify the affected user ───────────────
    socket.on('role-changed', ({ targetUserId, role }) => {
      socket.to(boardId).emit('role-changed', { targetUserId, role })
    })
    socket.on('text-editing', ({ x, y }) => {
      socket.to(boardId).emit('text-editing', { userId, userName, userColor, x, y })
    })
    socket.on('text-done', () => {
      socket.to(boardId).emit('text-done', { userId })
    })

    // ── Disconnect ────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`${userName} left board ${boardId}`)
      socket.to(boardId).emit('stroke-cancel', { userId })
      socket.to(boardId).emit('text-done', { userId })
      socket.to(boardId).emit('user-left', { userId })

      const users = activeUsers.get(boardId)
      if (users) {
        users.delete(userId)

        // Last unique user left — save and clean up
        if (users.size === 0) {
          console.log(`Last user left board ${boardId} — saving state`)
          await saveBoardState(boardId)

          clearInterval(autosaveIntervals.get(boardId))
          autosaveIntervals.delete(boardId)
          activeDocs.delete(boardId)
          activeUsers.delete(boardId)
          docLoaded.delete(boardId)
        }
      }
    })
  })
}