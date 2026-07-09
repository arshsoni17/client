import nodemailer from 'nodemailer'

export const sendOtpEmail = async (to, otp, name, mode = 'verify') => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  })

  const isReset = mode === 'reset'
  const subject = isReset ? 'Reset your password' : 'Your verification code'
  const heading = isReset ? 'Reset your password' : 'Verify your email'
  const subtext = isReset
    ? `Hi ${name}, use this code to reset your password:`
    : `Hi ${name}, use this code to complete your registration:`

  await transporter.sendMail({
    from: `"Whiteboard App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">${heading}</h2>
        <p style="color: #6b7280; margin-bottom: 32px;">${subtext}</p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
          <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #1a1a1a;">${otp}</span>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">This code expires in 1 minute. If you didn't request this, ignore this email.</p>
      </div>
    `,
  })
}