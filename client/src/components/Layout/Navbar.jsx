import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="flex items-center justify-between px-5 h-13 bg-white border-b border-gray-200 sticky top-0 z-50">
      <Link to="/dashboard" className="text-base font-semibold text-gray-900 tracking-tight no-underline">
        Whiteboard
      </Link>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.name}</span>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}