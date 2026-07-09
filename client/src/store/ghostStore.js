import { create } from 'zustand'

const useGhostStore = create((set) => ({
  // Shape/pen previews — { [userId]: element }
  ghosts: {},
  setGhost: (userId, element) =>
    set((state) => ({ ghosts: { ...state.ghosts, [userId]: element } })),
  clearGhost: (userId) =>
    set((state) => {
      const ghosts = { ...state.ghosts }
      delete ghosts[userId]
      return { ghosts }
    }),

  // Text editing indicators — { [userId]: { x, y, userName, userColor } }
  textEditors: {},
  setTextEditor: (userId, data) =>
    set((state) => ({ textEditors: { ...state.textEditors, [userId]: data } })),
  clearTextEditor: (userId) =>
    set((state) => {
      const textEditors = { ...state.textEditors }
      delete textEditors[userId]
      return { textEditors }
    }),

  clearAll: () => set({ ghosts: {}, textEditors: {} }),
}))

export default useGhostStore