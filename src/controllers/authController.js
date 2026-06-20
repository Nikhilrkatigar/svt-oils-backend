import User from '../models/User.js'
import { signToken, formatUser } from '../utils/token.js'

const isValidPhone = (phone) => /^\d{10}$/.test(phone)
const isValidPassword = (password) => typeof password === 'string' && password.length >= 6

const normalizeLocation = (location) => {
  if (!location) return undefined

  const lat = Number(location.lat)
  const lng = Number(location.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined

  return {
    lat,
    lng,
    source: location.source === 'browser' ? 'browser' : 'manual',
  }
}

const issueAuthResponse = async (user, res, statusCode = 200) => {
  if (user.phone === process.env.ADMIN_PHONE && !user.isAdmin) {
    user.isAdmin = true
    user.role = 'admin'
  }
  user.lastLogin = new Date()
  await user.save()

  const token = signToken(user._id)
  res.status(statusCode).json({ user: formatUser(user), token })
}

// POST /api/auth/login
export const loginHandler = async (req, res, next) => {
  try {
    const { phone, password } = req.body

    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit phone number' })
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required' })
    }

    const user = await User.findOne({
      $or: [{ phone }, { secondaryPhone: phone }]
    }).select('+password')
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid phone number or password' })
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked. Contact support.' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid phone number or password' })
    }

    await issueAuthResponse(user, res)
  } catch (err) { next(err) }
}

// POST /api/auth/register
export const registerHandler = async (req, res, next) => {
  try {
    const { name, phone, secondaryPhone, address, addressLocation, password } = req.body

    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' })
    if (!isValidPhone(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit primary phone number' })
    if (secondaryPhone && !isValidPhone(secondaryPhone)) return res.status(400).json({ message: 'Enter a valid 10-digit secondary phone number' })
    if (!address?.trim()) return res.status(400).json({ message: 'Shop name / Delivery address is required' })
    if (!isValidPassword(password)) return res.status(400).json({ message: 'Password must be at least 6 characters' })

    const phones = [phone]
    if (secondaryPhone) phones.push(secondaryPhone)
    const existing = await User.findOne({
      $or: [
        { phone: { $in: phones } },
        { secondaryPhone: { $in: phones } }
      ]
    })
    if (existing) {
      return res.status(409).json({ message: 'Account with this phone number already exists. Please login.' })
    }

    const user = await User.create({
      name: name.trim(),
      phone,
      secondaryPhone: secondaryPhone || '',
      password,
      address: address.trim(),
      addressLocation: normalizeLocation(addressLocation),
      isAdmin: phone === process.env.ADMIN_PHONE,
      role: phone === process.env.ADMIN_PHONE ? 'admin' : 'customer',
      lastLogin: new Date(),
    })

    const token = signToken(user._id)
    res.status(201).json({ user: formatUser(user), token })
  } catch (err) { next(err) }
}

// GET /api/auth/me
export const getMeHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    res.json({ user: formatUser(user) })
  } catch (err) { next(err) }
}

// PUT /api/auth/profile
export const updateProfileHandler = async (req, res, next) => {
  try {
    const { name, secondaryPhone, address, addressLocation } = req.body
    const updates = {}
    if (name?.trim()) updates.name = name.trim()
    if (secondaryPhone !== undefined) {
      if (secondaryPhone && !isValidPhone(secondaryPhone)) return res.status(400).json({ message: 'Enter a valid 10-digit secondary phone number' })
      if (secondaryPhone) {
        const existing = await User.findOne({
          _id: { $ne: req.user._id },
          $or: [{ phone: secondaryPhone }, { secondaryPhone }]
        })
        if (existing) return res.status(409).json({ message: 'This phone number is already registered to another account' })
      }
      updates.secondaryPhone = secondaryPhone || ''
    }
    if (address !== undefined) updates.address = address.trim()
    if (addressLocation !== undefined) updates.addressLocation = normalizeLocation(addressLocation)

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
    res.json({ user: formatUser(user), message: 'Profile updated' })
  } catch (err) { next(err) }
}
