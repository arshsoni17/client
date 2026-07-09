import { create } from 'zustand'

// Yjs callbacks — set by useYjs hook after connection
// Canvas components call store methods → store calls Yjs → Yjs syncs to server
let yjsAddElement = null
let yjsRemoveElement = null

export const registerYjsCallbacks = (add, remove) => {
  yjsAddElement = add
  yjsRemoveElement = remove
}

const MAX_HISTORY = 50

const useCanvasStore = create((set, get) => ({
  // Tool state
  tool: 'pen',
  color: '#000000',
  strokeWidth: 3,
  stickyColor: '#FEF08A',

  // Canvas elements — synced from Y.Map via useYjs
  elements: [],

  // Undo/redo stacks (local only — Yjs has its own UndoManager for cross-user undo)
  history: [],
  future: [],

  // Viewport
  stagePos: { x: 0, y: 0 },
  stageScale: 1,

  // Active drawing
  isDrawing: false,
  currentElement: null,

  // ── Tool actions ──────────────────────────────────────────
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setStickyColor: (stickyColor) => set({ stickyColor }),

  // ── Viewport ──────────────────────────────────────────────
  setStagePos: (pos) => set({ stagePos: pos }),
  setStageScale: (scale) => set({ stageScale: scale }),

  // ── Drawing state ─────────────────────────────────────────
  setIsDrawing: (val) => set({ isDrawing: val }),
  setCurrentElement: (el) => set({ currentElement: el }),

  // ── Update element (drag/resize) — goes through Yjs ───────
  updateElement: (id, changes) => {
    const { elements } = get()
    const existing = elements.find(el => el.id === id)
    if (!existing) return

    const updated = { ...existing, ...changes }

    if (yjsAddElement) {
      // Yjs Y.Map.set on the same id overwrites — acts as an update
      yjsAddElement(updated)
    } else {
      set({ elements: elements.map(el => el.id === id ? updated : el) })
    }
  },

  // ── Selection state (local only, not synced) ──────────────
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

  // ── Add element — goes through Yjs if connected ───────────
  addElement: (element) => {
    const { elements, history } = get()

    if (yjsAddElement) {
      // Connected: write to Y.Map → Yjs broadcasts → setElements called by observer
      set({
        history: [...history.slice(-MAX_HISTORY), elements],
        future: [],
        currentElement: null,
        isDrawing: false,
      })
      yjsAddElement(element)
    } else {
      // Offline fallback: write to local state only
      set({
        elements: [...elements, element],
        history: [...history.slice(-MAX_HISTORY), elements],
        future: [],
        currentElement: null,
        isDrawing: false,
      })
    }
  },

  // ── Remove element — goes through Yjs if connected ────────
  removeElement: (id) => {
    const { elements, history } = get()

    if (yjsRemoveElement) {
      set({
        history: [...history.slice(-MAX_HISTORY), elements],
        future: [],
      })
      yjsRemoveElement(id)
    } else {
      set({
        elements: elements.filter((el) => el.id !== id),
        history: [...history.slice(-MAX_HISTORY), elements],
        future: [],
      })
    }
  },

  // ── Called by Yjs observer when Y.Map changes ─────────────
  // This is how remote changes (from other users) flow into React
  setElements: (elements) => set({ elements }),

  updateCurrentElement: (element) => set({ currentElement: element }),

  // ── Undo / Redo (local) ───────────────────────────────────
  undo: () => {
    const { history, elements, future } = get()
    if (!history.length) return
    const previous = history[history.length - 1]

    // Sync undo to Yjs
    if (yjsAddElement && yjsRemoveElement) {
      const currentIds = new Set(elements.map(e => e.id))
      const previousIds = new Set(previous.map(e => e.id))

      // Remove elements that were added
      elements.forEach(el => {
        if (!previousIds.has(el.id)) yjsRemoveElement(el.id)
      })
      // Re-add elements that were removed
      previous.forEach(el => {
        if (!currentIds.has(el.id)) yjsAddElement(el)
      })
    }

    set({
      elements: previous,
      history: history.slice(0, -1),
      future: [elements, ...future],
    })
  },

  redo: () => {
    const { future, elements, history } = get()
    if (!future.length) return
    const next = future[0]

    if (yjsAddElement && yjsRemoveElement) {
      const currentIds = new Set(elements.map(e => e.id))
      const nextIds = new Set(next.map(e => e.id))

      next.forEach(el => {
        if (!currentIds.has(el.id)) yjsAddElement(el)
      })
      elements.forEach(el => {
        if (!nextIds.has(el.id)) yjsRemoveElement(el.id)
      })
    }

    set({
      elements: next,
      history: [...history, elements],
      future: future.slice(1),
    })
  },

  clearCanvas: () => {
    const { elements, history } = get()
    if (yjsRemoveElement) {
      elements.forEach(el => yjsRemoveElement(el.id))
    }
    set({
      elements: [],
      history: [...history.slice(-MAX_HISTORY), elements],
      future: [],
    })
  },
}))

export default useCanvasStore