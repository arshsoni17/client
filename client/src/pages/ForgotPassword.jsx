import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiFetch from '../api/api'

// Step 1 — enter email
function EmailStep({ onNext }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      onNext(email)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 text-2xl">🔐</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Forgot password?</h1>
      <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a reset code</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50
              focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
            hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Sending code...' : 'Send reset code'}
        </button>
      </form>

      <p className="text-xs text-gray-500 text-center mt-5">
        Remember it?{' '}
        <Link to="/login" className="text-gray-900 font-medium hover:underline">Sign in</Link>
      </p>
    </>
  )
}

// Step 2 — enter OTP
function OtpStep({ email, onNext }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef([])

  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((p) => { if (p <= 1) { clearInterval(timer); return 0 } return p - 1 })
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[i] = val.slice(-1)
    setOtp(next)
    setError('')
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
    if (val && i === 5) {
      const full = [...next].join('')
      if (full.length === 6) handleVerify(full)
    }
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...otp]
    pasted.split('').forEach((c, i) => { next[i] = c })
    setOtp(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) handleVerify(pasted)
  }

  const handleVerify = async (code) => {
    const otpValue = code || otp.join('')
    if (otpValue.length < 6) { setError('Please enter all 6 digits'); return }
    setLoading(true)
    setError('')
    try {
      // Just validate OTP exists — actual reset in next step
      onNext(otpValue)
    } catch (err) {
      setError(err.message)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setResendCooldown(60)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 text-2xl">📬</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Check your email</h1>
      <p className="text-sm text-gray-500 mb-6">
        We sent a code to <span className="font-medium text-gray-700">{email}</span>
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5 mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-between mb-6" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i} ref={(el) => (inputRefs.current[i] = el)}
            type="text" inputMode="numeric" maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-12 h-12 text-center text-lg font-semibold border rounded-xl
              focus:outline-none focus:border-gray-900 transition-colors bg-gray-50
              ${digit ? 'border-gray-900 bg-white' : 'border-gray-200'}
              ${error ? 'border-red-300 bg-red-50' : ''}`}
          />
        ))}
      </div>

      <button
        onClick={() => handleVerify()}
        disabled={loading || otp.join('').length < 6}
        className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
          hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Verifying...' : 'Continue'}
      </button>

      <div className="text-center mt-4">
        {resendCooldown > 0 ? (
          <p className="text-xs text-gray-400">Resend in {resendCooldown}s</p>
        ) : (
          <button onClick={handleResend} className="text-xs text-gray-500 hover:text-gray-900">
            Didn't receive it? Resend code
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">Code expires in 1 minute</p>
    </>
  )
}

// Step 3 — enter new password
function NewPasswordStep({ email, otp, onSuccess }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword: password }),
      })
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 text-2xl">🔑</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">New password</h1>
      <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
          <input
            type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters" required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50
              focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password</label>
          <input
            type="password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your password" required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50
              focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
            hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </>
  )
}

// Step 4 — success
function SuccessStep() {
  return (
    <>
      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 text-2xl">✅</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Password reset!</h1>
      <p className="text-sm text-gray-500 mb-6">Your password has been updated successfully.</p>
      <Link
        to="/login"
        className="block w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg
          hover:bg-gray-700 transition-colors text-center"
      >
        Sign in with new password
      </Link>
    </>
  )
}

// Main component — orchestrates all steps
export default function ForgotPassword() {
  const [step, setStep] = useState(1) // 1=email, 2=otp, 3=newpass, 4=success
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')

  return (
    <div className="min-h-[calc(100vh-52px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-9">
        {step === 1 && <EmailStep onNext={(e) => { setEmail(e); setStep(2) }} />}
        {step === 2 && <OtpStep email={email} onNext={(o) => { setOtp(o); setStep(3) }} />}
        {step === 3 && <NewPasswordStep email={email} otp={otp} onSuccess={() => setStep(4)} />}
        {step === 4 && <SuccessStep />}
      </div>
    </div>
  )
}