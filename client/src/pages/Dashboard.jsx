import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyBoards, createBoard, deleteBoard, renameBoard } from '../api/boards'

function BoardCard({ board, onDelete, onRename, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-gray-400 transition-colors bg-white"
    >
      {/* Thumbnail */}
      <div className="h-32 bg-gray-50 flex items-center justify-center overflow-hidden">
        {board.thumbnail ? (
          <img src={board.thumbnail} alt={board.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl opacity-20">🖊️</span>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{board.title}</p>
          <p className="text-xs text-gray-400">
            {new Date(board.updatedAt).toLocaleDateString()}
          </p>
        </div>
        {/* Actions — only show for owner */}
        {(onRename || onDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {onRename && (
              <button
                onClick={(e) => { e.stopPropagation(); onRename() }}
                title="Rename"
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                title="Delete"
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                🗑
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message, action }) {
  return (
    <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
      <p className="text-sm text-gray-400 mb-3">{message}</p>
      {action}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadBoards = async () => {
    try {
      const data = await getMyBoards()
      setBoards(data)
    } catch (err) {
      console.error('Failed to load boards:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBoards() }, [])

  // Split into owned vs joined
  const myBoards = boards.filter(b => b.owner === user?._id || b.owner?._id === user?._id)
  const joinedBoards = boards.filter(b => b.owner !== user?._id && b.owner?._id !== user?._id)

  const handleNewBoard = async () => {
    setCreating(true)
    try {
      const board = await createBoard('Untitled Board')
      navigate(`/board/${board._id}`)
    } catch (err) {
      alert('Failed to create board: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this board? This cannot be undone.')) return
    try {
      await deleteBoard(id)
      setBoards(prev => prev.filter(b => b._id !== id))
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    }
  }

  const handleRename = async (id, currentTitle) => {
    const newTitle = window.prompt('Rename board:', currentTitle)
    if (!newTitle || newTitle === currentTitle) return
    try {
      await renameBoard(id, newTitle)
      setBoards(prev => prev.map(b => b._id === id ? { ...b, title: newTitle } : b))
    } catch (err) {
      alert('Failed to rename: ' + err.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Your workspace</h1>
        <button
          onClick={handleNewBoard}
          disabled={creating}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {creating ? 'Creating...' : '+ New board'}
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-8">Welcome, {user?.name}</p>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading boards...</div>
      ) : (
        <>
          {/* My Boards */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-gray-700">My boards</h2>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {myBoards.length}
              </span>
            </div>

            {myBoards.length === 0 ? (
              <EmptyState
                message="You haven't created any boards yet"
                action={
                  <button
                    onClick={handleNewBoard}
                    className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Create your first board
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {myBoards.map(board => (
                  <BoardCard
                    key={board._id}
                    board={board}
                    onClick={() => navigate(`/board/${board._id}`)}
                    onRename={() => handleRename(board._id, board.title)}
                    onDelete={() => handleDelete(board._id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Joined Boards */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Joined boards</h2>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {joinedBoards.length}
              </span>
            </div>

            {joinedBoards.length === 0 ? (
              <EmptyState
                message="You haven't joined any boards yet — ask someone to share a link with you"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {joinedBoards.map(board => (
                  <BoardCard
                    key={board._id}
                    board={board}
                    onClick={() => navigate(`/board/${board._id}`)}
                    // No rename/delete for joined boards
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}