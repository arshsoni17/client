import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import VerifyOtp from './VerifyOtp'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingVerification, setPendingVerification] = useState(null)

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      navigate(redirect || '/dashboard')
    } catch (err) {
      if (err.message?.includes('verify your email')) {
        setPendingVerification(form.email)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (pendingVerification) {
    return <VerifyOtp email={pendingVerification} />
  }

  return (
    <div className="min-h-[calc(100vh-52px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-9">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your boards</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              value={form.email} onChange={handleChange}
              placeholder="you@example.com" required
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50
                focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              value={form.password} onChange={handleChange}
              placeholder="••••••••" required
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50
                focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
              hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <div className="flex justify-end mt-1">
            <Link
              to="/forgot-password"
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-5">
          No account?{' '}
          <Link to="/register" className="text-gray-900 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}