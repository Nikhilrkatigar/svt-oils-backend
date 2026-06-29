import jwt from 'jsonwebtoken'

export const signToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  )
}

export const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  phone: user.phone,
  secondaryPhone: user.secondaryPhone || '',
  gstNumber: user.gstNumber || '',
  address: user.address,
  addressLocation: user.addressLocation,
  isAdmin: user.isAdmin,
  role: user.role,
  orderCount: user.orderCount,
  createdAt: user.createdAt,
})
