import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { renameBoard, deleteBoard, updateCollaborator, removeCollaborator } from '../../api/boards'
import { useAuth } from '../../context/AuthContext'

export default function SettingsPanel({ board, onClose, onTitleChange, onBoardUpdate, socket }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isOwner = board.owner === user._id || board.role === 'owner'

  const [title, setTitle] = useState(board.title)
  const [collaborators, setCollaborators] = useState(
    // Filter out owner from collaborators list — they show separately as "owner"
    (board.collaborators || []).filter((c) => {
      const cId = c.user?._id || c.user
      const ownerId = board.owner?._id || board.owner
      return cId !== ownerId
    })
  )
  const [saving, setSaving] = useState(false)

  const handleRename = async () => {
    if (title === board.title) return
    setSaving(true)
    try {
      await renameBoard(board._id, title)
      onTitleChange(title)
    } catch (err) {
      alert('Failed to rename: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateCollaborator(board._id, userId, newRole)
      const updated = collaborators.map((c) => {
        const cId = c.user?._id || c.user
        return cId === userId ? { ...c, role: newRole } : c
      })
      setCollaborators(updated)
      onBoardUpdate?.({ collaborators: updated })
      socket?.emit('role-changed', { targetUserId: userId, role: newRole })
    } catch (err) {
      alert('Failed to update role: ' + err.message)
    }
  }

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this collaborator?')) return
    try {
      await removeCollaborator(board._id, userId)
      const updated = collaborators.filter((c) => {
        const cId = c.user?._id || c.user
        return cId !== userId
      })
      setCollaborators(updated)
      onBoardUpdate?.({ collaborators: updated })
      socket?.emit('role-changed', { targetUserId: userId, role: null })
    } catch (err) {
      alert('Failed to remove: ' + err.message)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this board permanently? This cannot be undone.')) return
    try {
      await deleteBoard(board._id)
      navigate('/dashboard')
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    }
  }

  return (
    <div className="absolute top-0 right-0 h-full w-72 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Board settings</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Rename */}
        {isOwner && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Board name</label>
            <div className="flex gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 bg-gray-50"
              />
              <button
                onClick={handleRename}
                disabled={saving || title === board.title}
                className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg disabled:opacity-40 hover:bg-gray-700"
              >
                {saving ? '...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Collaborators */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">People with access</p>
          <div className="space-y-2">

            {/* Owner */}
            <div className="flex items-center gap-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {board.ownerName?.[0]?.toUpperCase() || 'O'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{board.ownerName || 'Owner'}</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">owner</span>
            </div>

            {/* Collaborators */}
            {collaborators.map((c) => {
              const userId = c.user?._id || c.user
              const userName = c.user?.name || 'Unknown'
              return (
              <div key={userId} className="flex items-center gap-2 py-1.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ background: '#6366f1' }}
                >
                  {userName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{userName}</p>
                </div>
                {isOwner ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={c.role}
                      onChange={(e) => handleRoleChange(userId, e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white focus:outline-none"
                    >
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemove(userId)}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-400 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                    {c.role}
                  </span>
                )}
              </div>
            )})}

            {collaborators.length === 0 && (
              <p className="text-xs text-gray-400 py-2">No collaborators yet. Share a link to invite people.</p>
            )}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      {isOwner && (
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-2">Danger zone</p>
          <button
            onClick={handleDelete}
            className="w-full py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete this board
          </button>
        </div>
      )}
    </div>
  )
}