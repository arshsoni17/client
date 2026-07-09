import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-[calc(100vh-52px)] flex flex-col items-center justify-center text-center px-6 bg-gray-50">
      <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-3">
        Realtime Whiteboard
      </h1>
      <p className="text-base text-gray-500 max-w-sm mb-8">
        Collaborate with your team in real time. Draw, brainstorm, and build together.
      </p>
      <div className="flex gap-3">
        {user ? (
          <Link
            to="/dashboard"
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/register"
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Get started
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}