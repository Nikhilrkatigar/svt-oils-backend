import User from '../models/User.js'

export const ensureAdminUser = async () => {
  const phone = process.env.ADMIN_PHONE
  const password = process.env.ADMIN_PASSWORD

  if (!phone || !password) return
  if (!/^\d{10}$/.test(phone)) {
    console.warn('ADMIN_PHONE must be a valid 10-digit phone number. Skipping admin setup.')
    return
  }
  if (password.length < 6) {
    console.warn('ADMIN_PASSWORD must be at least 6 characters. Skipping admin setup.')
    return
  }

  const user = await User.findOne({ phone }).select('+password')
  if (user) {
    user.name = user.name || 'SVT Oils Admin'
    user.address = user.address || 'Admin'
    user.password = password
    user.role = 'admin'
    user.isAdmin = true
    user.isBlocked = false
    user.pinCode = user.pinCode || '570001'
    await user.save()
    console.log(`Admin account ready: ${phone}`)
    return
  }

  await User.create({
    name: 'SVT Oils Admin',
    phone,
    password,
    address: 'Admin',
    pinCode: '570001',
    role: 'admin',
    isAdmin: true,
  })
  console.log(`Admin account created: ${phone}`)
}
