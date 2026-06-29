import User from '../models/User.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'

const isValidPhone = (phone) => /^\d{10}$/.test(phone)
const isPrivilegedRole = (role) => ['staff', 'admin'].includes(role)
const withoutPassword = (user) => {
  const data = user.toObject ? user.toObject() : user
  delete data.password
  return data
}

// GET /api/admin/dashboard
export const getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      pendingOrders,
      revenueResult,
      recentOrders,
      ordersByStatus,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.find()
        .populate('user', 'name phone secondaryPhone gstNumber')
        .sort({ createdAt: -1 })
        .limit(5),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ])

    const revenue = revenueResult[0]?.total || 0
    const statusMap = {}
    ordersByStatus.forEach(s => { statusMap[s._id] = s.count })

    res.json({
      users: totalUsers,
      orders: totalOrders,
      products: totalProducts,
      pending: pendingOrders,
      revenue,
      recentOrders,
      ordersByStatus: statusMap,
    })
  } catch (err) { next(err) }
}

// GET /api/admin/users
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, search } = req.query
    const filter = {}
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await User.countDocuments(filter)
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))

    res.json({ users, total, page: Number(page) })
  } catch (err) { next(err) }
}

// POST /api/admin/users
export const createUser = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      secondaryPhone,
      gstNumber,
      password,
      address = '',
      role = 'customer',
      isBlocked = false,
    } = req.body

    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' })
    if (!isValidPhone(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit primary phone number' })
    if (secondaryPhone && !isValidPhone(secondaryPhone)) return res.status(400).json({ message: 'Enter a valid 10-digit secondary phone number' })
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })
    if (!['customer', 'staff', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' })

    const phones = [phone]
    if (secondaryPhone) phones.push(secondaryPhone)
    const existing = await User.findOne({
      $or: [
        { phone: { $in: phones } },
        { secondaryPhone: { $in: phones } }
      ]
    })
    if (existing) return res.status(409).json({ message: 'A user with one of these phone numbers already exists' })

    const user = await User.create({
      name: name.trim(),
      phone,
      secondaryPhone: secondaryPhone || '',
      gstNumber: gstNumber?.trim() || '',
      password,
      address: address.trim(),
      role,
      isAdmin: isPrivilegedRole(role),
      isBlocked: Boolean(isBlocked),
    })

    res.status(201).json({ user: withoutPassword(user), message: 'User created' })
  } catch (err) { next(err) }
}

// GET /api/admin/users/:id
export const getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(10)
    res.json({ user, orders })
  } catch (err) { next(err) }
}

// PUT /api/admin/users/:id
export const updateUser = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      secondaryPhone,
      gstNumber,
      password,
      address,
      role,
      isBlocked,
    } = req.body

    const user = await User.findById(req.params.id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (phone !== undefined) {
      if (!isValidPhone(phone)) return res.status(400).json({ message: 'Enter a valid 10-digit primary phone number' })
      const existing = await User.findOne({
        _id: { $ne: user._id },
        $or: [{ phone }, { secondaryPhone: phone }]
      })
      if (existing) return res.status(409).json({ message: 'Another user already uses this primary phone number' })
      user.phone = phone
    }
    if (secondaryPhone !== undefined) {
      if (secondaryPhone && !isValidPhone(secondaryPhone)) return res.status(400).json({ message: 'Enter a valid 10-digit secondary phone number' })
      if (secondaryPhone) {
        const existing = await User.findOne({
          _id: { $ne: user._id },
          $or: [{ phone: secondaryPhone }, { secondaryPhone }]
        })
        if (existing) return res.status(409).json({ message: 'Another user already uses this secondary phone number' })
      }
      user.secondaryPhone = secondaryPhone || ''
    }
    if (gstNumber !== undefined) {
      user.gstNumber = gstNumber?.trim() || ''
    }
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Name is required' })
      user.name = name.trim()
    }
    if (address !== undefined) user.address = address.trim()
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })
      user.password = password
    }
    if (role !== undefined) {
      if (!['customer', 'staff', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' })
      user.role = role
      user.isAdmin = isPrivilegedRole(role)
    }
    if (isBlocked !== undefined) user.isBlocked = Boolean(isBlocked)

    if (user.phone === process.env.ADMIN_PHONE) {
      user.role = 'admin'
      user.isAdmin = true
      user.isBlocked = false
    }

    await user.save()
    res.json({ user: withoutPassword(user), message: 'User updated' })
  } catch (err) { next(err) }
}

// PATCH /api/admin/users/:id/block
export const toggleBlockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.isAdmin) return res.status(400).json({ message: 'Cannot block an admin' })

    user.isBlocked = !user.isBlocked
    await user.save()
    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, user })
  } catch (err) { next(err) }
}

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (user.isAdmin || user.phone === process.env.ADMIN_PHONE) {
      return res.status(400).json({ message: 'Cannot delete admin users' })
    }

    await User.findByIdAndDelete(req.params.id)
    res.json({ message: 'User deleted successfully' })
  } catch (err) { next(err) }
}
