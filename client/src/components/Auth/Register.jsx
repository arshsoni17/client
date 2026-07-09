import { useState } from 'react'
import { Link } from 'react-router-dom'
import VerifyOtp from './VerifyOtp'
import apiFetch from '../../api/api'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState(null)

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (data.requiresVerification) {
        setPendingEmail(data.email)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (pendingEmail) {
    return <VerifyOtp email={pendingEmail} />
  }

  return (
    <div className="min-h-[calc(100vh-52px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-9">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">We'll send a verification code to your email</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: 'name',     label: 'Name',     type: 'text',     placeholder: 'Your name' },
            { id: 'email',    label: 'Email',    type: 'email',    placeholder: 'you@example.com' },
            { id: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' },
          ].map(({ id, label, type, placeholder }) => (
            <div key={id}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor={id}>
                {label}
              </label>
              <input
                id={id} name={id} type={type}
                value={form[id]} onChange={handleChange}
                placeholder={placeholder} required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50
                  focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
              />
            </div>
          ))}

          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
              hover:bg-gray-700 disabled:opacity-50 transition-colors mt-1"
          >
            {loading ? 'Sending code...' : 'Send verification code'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-900 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}