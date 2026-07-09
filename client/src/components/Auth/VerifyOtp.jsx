import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import apiFetch from '../../api/api'

export default function VerifyOtp({ email }) {
  const { login: setUser } = useAuth()
  const navigate = useNavigate()

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef([])

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // take last char in case of paste
    setOtp(newOtp)
    setError('')

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits filled
    if (value && index === 5) {
      const fullOtp = [...newOtp].join('')
      if (fullOtp.length === 6) handleVerify(fullOtp)
    }
  }

  const handleKeyDown = (index, e) => {
    // Backspace on empty input — go to previous
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newOtp = [...otp]
    pasted.split('').forEach((char, i) => { newOtp[i] = char })
    setOtp(newOtp)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) handleVerify(pasted)
  }

  const handleVerify = async (otpValue) => {
    const code = otpValue || otp.join('')
    if (code.length < 6) {
      setError('Please enter all 6 digits')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp: code }),
      })
      // Store token and update auth context
      localStorage.setItem('token', data.token)
      // Trigger AuthContext to re-fetch user
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.message)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      await apiFetch('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setResendCooldown(60) // 60s cooldown
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-52px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-9">

        {/* Icon */}
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 text-2xl">
          📬
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-1">Check your email</h1>
        <p className="text-sm text-gray-500 mb-6">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-gray-700">{email}</span>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5 mb-4">
            {error}
          </div>
        )}

        {/* OTP inputs */}
        <div className="flex gap-2 justify-between mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
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
            hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Verifying...' : 'Verify email'}
        </button>

        {/* Resend */}
        <div className="text-center mt-4">
          {resendCooldown > 0 ? (
            <p className="text-xs text-gray-400">Resend in {resendCooldown}s</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              {resending ? 'Sending...' : "Didn't receive it? Resend code"}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-2">
          Code expires in 1 minute
        </p>
      </div>
    </div>
  )
}