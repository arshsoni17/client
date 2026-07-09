import apiFetch from './api'

export const createBoard = (title) =>
  apiFetch('/api/boards', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })

export const getMyBoards = () => apiFetch('/api/boards')

export const getBoard = (id) => apiFetch(`/api/boards/${id}`)

export const renameBoard = (id, title) =>
  apiFetch(`/api/boards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })

export const deleteBoard = (id) =>
  apiFetch(`/api/boards/${id}`, { method: 'DELETE' })

export const generateShareLink = (id, role) =>
  apiFetch(`/api/boards/${id}/share`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  })

export const joinViaShareLink = (token) =>
  apiFetch(`/api/boards/join/${token}`, { method: 'POST' })

export const updateCollaborator = (boardId, userId, role) =>
  apiFetch(`/api/boards/${boardId}/collaborators/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })

export const removeCollaborator = (boardId, userId) =>
  apiFetch(`/api/boards/${boardId}/collaborators/${userId}`, {
    method: 'DELETE',
  })

export const saveThumbnail = (boardId, thumbnail) =>
  apiFetch(`/api/boards/${boardId}`, {
    method: 'PATCH',
    body: JSON.stringify({ thumbnail }),
  })