import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { joinViaShareLink } from '../api/boards'

export default function JoinBoard() {
  const { token } = useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [joining, setJoining] = useState(false)
  const joinedRef = useRef(false) // guard against StrictMode double-invoke

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate(`/login?redirect=/join/${token}`)
      return
    }

    // Prevent double API call in React StrictMode
    if (joinedRef.current) return
    joinedRef.current = true

    const join = async () => {
      setJoining(true)
      try {
        const { boardId } = await joinViaShareLink(token)
        navigate(`/board/${boardId}`)
      } catch (err) {
        setError(err.message)
        setJoining(false)
        joinedRef.current = false // allow retry on error
      }
    }

    join()
  }, [token, user, loading, navigate])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-gray-500">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg"
        >
          Go to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">{joining ? 'Joining board...' : 'Loading...'}</p>
      </div>
    </div>
  )
}