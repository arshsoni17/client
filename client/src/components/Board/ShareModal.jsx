import { useState } from 'react'
import { generateShareLink } from '../../api/boards'

export default function ShareModal({ boardId, onClose }) {
  const [role, setRole] = useState('editor')
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const { shareLink } = await generateShareLink(boardId, role)
      const url = `${window.location.origin}/join/${shareLink}`
      setLink(url)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('Failed to generate link: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Share board</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Generate a link to invite others to this board.
        </p>

        {/* Role picker */}
        <div className="flex gap-2 mb-4">
          {['editor', 'viewer'].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors
                ${role === r
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
            >
              {r === 'editor' ? '✏️ Can edit' : '👁 Can view'}
            </button>
          ))}
        </div>

        {/* Link display */}
        {link && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 truncate flex-1">{link}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs px-2 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
            hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Generating...' : copied ? '✓ Link copied to clipboard!' : 'Generate & copy link'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          Anyone with this link can join as {role}
        </p>
      </div>
    </div>
  )
}