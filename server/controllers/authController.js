import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import { sendOtpEmail } from '../utils/sendEmail.js'

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

const generateOtp = () =>
  crypto.randomInt(100000, 999999).toString() // 6-digit OTP

// POST /api/auth/register
// Creates unverified user and sends OTP — does NOT return token yet
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' })

    const exists = await User.findOne({ email })

    if (exists) {
      // If already registered but not verified — resend OTP
      if (!exists.isVerified) {
        const otp = generateOtp()
        exists.otp = otp
        exists.otpExpiry = new Date(Date.now() + 1 * 60 * 1000) // 1 min
        await exists.save()
        await sendOtpEmail(email, otp, exists.name)
        return res.status(200).json({
          message: 'OTP resent to your email',
          email,
          requiresVerification: true,
        })
      }
      return res.status(400).json({ message: 'Email already registered' })
    }

    const otp = generateOtp()
    const otpExpiry = new Date(Date.now() + 1 * 60 * 1000) // 1 min

    const user = await User.create({
      name,
      email,
      password,
      otp,
      otpExpiry,
      isVerified: false,
    })

    await sendOtpEmail(email, otp, name)

    res.status(201).json({
      message: 'OTP sent to your email. Please verify to continue.',
      email,
      requiresVerification: true,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/auth/verify-otp
// Verifies OTP and returns JWT token — this completes registration
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp)
      return res.status(400).json({ message: 'Email and OTP are required' })

    const user = await User.findOne({ email })

    if (!user)
      return res.status(404).json({ message: 'User not found' })

    if (user.isVerified)
      return res.status(400).json({ message: 'Email already verified' })

    if (!user.otp || !user.otpExpiry)
      return res.status(400).json({ message: 'No OTP found. Please register again.' })

    if (new Date() > user.otpExpiry)
      return res.status(400).json({ message: 'OTP has expired. Please register again to get a new one.' })

    if (user.otp !== otp.toString())
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' })

    // OTP correct — mark verified and clear OTP
    user.isVerified = true
    user.otp = null
    user.otpExpiry = null
    await user.save()

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/auth/resend-otp
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })

    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' })

    const otp = generateOtp()
    user.otp = otp
    user.otpExpiry = new Date(Date.now() + 1 * 60 * 1000) // 1 min
    await user.save()

    await sendOtpEmail(email, otp, user.name)
    res.json({ message: 'OTP resent successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' })

    const user = await User.findOne({ email })

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' })

    // Block unverified users
    if (!user.isVerified)
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      })

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const user = await User.findOne({ email })
    // Always return success even if email not found — prevents email enumeration
    if (!user) return res.json({ message: 'If that email exists, a code has been sent.' })

    const otp = generateOtp()
    user.otp = otp
    user.otpExpiry = new Date(Date.now() + 1 * 60 * 1000)
    await user.save()

    await sendOtpEmail(email, otp, user.name, 'reset')
    res.json({ message: 'OTP sent', email })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: 'All fields are required' })

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' })

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (!user.otp || !user.otpExpiry)
      return res.status(400).json({ message: 'No OTP found. Please request a new one.' })

    if (new Date() > user.otpExpiry)
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' })

    if (user.otp !== otp.toString())
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' })

    user.password = newPassword
    user.otp = null
    user.otpExpiry = null
    user.isVerified = true // auto-verify if they reset password via email
    await user.save()

    res.json({ message: 'Password reset successful. You can now log in.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
  })
}