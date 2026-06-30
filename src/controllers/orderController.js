import Order from '../models/Order.js'
import User from '../models/User.js'

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

// POST /api/orders  (user)
export const placeOrder = async (req, res, next) => {
  try {
    const { items, deliveryAddress, deliveryLocation, phone, note, total, hasNegotiable, idempotencyKey } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' })
    }
    if (!deliveryAddress?.trim()) {
      return res.status(400).json({ message: 'Delivery address is required' })
    }
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Valid phone number is required' })
    }
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ user: req.user._id, idempotencyKey })
        .populate('user', 'name phone secondaryPhone gstNumber pinCode')
      if (existingOrder) {
        return res.status(200).json({
          order: existingOrder,
          message: 'Order already placed',
          duplicate: true,
        })
      }
    }

    const order = await Order.create({
      user: req.user._id,
      idempotencyKey: idempotencyKey || '',
      items,
      total: total || 0,
      hasNegotiable: hasNegotiable || false,
      deliveryAddress: deliveryAddress.trim(),
      deliveryLocation: normalizeLocation(deliveryLocation),
      phone,
      note: note?.trim() || '',
      status: 'pending',
      statusHistory: [{ status: 'pending', updatedAt: new Date() }],
    })

    // Increment user order count
    await User.findByIdAndUpdate(req.user._id, { $inc: { orderCount: 1 } })

    // Populate user for response
    await order.populate('user', 'name phone secondaryPhone gstNumber pinCode')

    res.status(201).json({ order, message: 'Order placed successfully!' })
  } catch (err) {
    if (err.code === 11000 && req.body?.idempotencyKey) {
      const existingOrder = await Order.findOne({
        user: req.user._id,
        idempotencyKey: req.body.idempotencyKey,
      }).populate('user', 'name phone secondaryPhone gstNumber pinCode')
      if (existingOrder) {
        return res.status(200).json({
          order: existingOrder,
          message: 'Order already placed',
          duplicate: true,
        })
      }
    }
    next(err)
  }
}

// GET /api/orders/my  (user)
export const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const filter = { user: req.user._id }
    if (status) filter.status = status

    const total = await Order.countDocuments(filter)
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))

    res.json({ orders, total, page: Number(page) })
  } catch (err) { next(err) }
}

// GET /api/orders/:id  (user — own orders only)
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name phone secondaryPhone gstNumber pinCode')
    if (!order) return res.status(404).json({ message: 'Order not found' })

    // Users can only see their own orders; admins can see all
    if (!req.user.isAdmin && String(order.user._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    res.json({ order })
  } catch (err) { next(err) }
}

// PATCH /api/orders/:id/cancel  (user — only pending/confirmed)
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    if (String(order.user) !== String(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel order in "${order.status}" status` })
    }

    order.status = 'cancelled'
    order.cancelReason = req.body.reason || 'Cancelled by customer'
    order.statusHistory.push({ status: 'cancelled', updatedAt: new Date(), updatedBy: req.user._id })
    await order.save()

    res.json({ order, message: 'Order cancelled' })
  } catch (err) { next(err) }
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────

// GET /api/orders/admin/all  (admin)
export const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query
    const filter = {}
    if (status && status !== 'all') filter.status = status

    let orders = await Order.find(filter)
      .populate('user', 'name phone address secondaryPhone gstNumber pinCode')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))

    // Client-side search on user name/phone if search param given
    if (search) {
      const s = search.toLowerCase()
      orders = orders.filter(o =>
        o.user?.name?.toLowerCase().includes(s) ||
        o.user?.phone?.includes(s) ||
        o.orderId?.toLowerCase().includes(s)
      )
    }

    const total = await Order.countDocuments(filter)
    res.json({ orders, total, page: Number(page) })
  } catch (err) { next(err) }
}

// PATCH /api/orders/:id/status  (admin)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    order.status = status
    order.statusHistory.push({ status, updatedAt: new Date(), updatedBy: req.user._id })
    await order.save()

    res.json({ order, message: `Order status updated to ${status}` })
  } catch (err) { next(err) }
}

// DELETE /api/orders/:id  (admin)
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    await Order.findByIdAndDelete(req.params.id)

    res.json({ message: 'Order deleted successfully' })
  } catch (err) { next(err) }
}
