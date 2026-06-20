import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized. Please login.' })
    }

    const token = auth.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select('-__v')
    if (!user) return res.status(401).json({ message: 'User not found. Please login again.' })
    if (user.isBlocked) return res.status(403).json({ message: 'Your account has been blocked. Contact support.' })

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please login again.' })
    }
    return res.status(401).json({ message: 'Invalid token. Please login again.' })
  }
}

export const adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required.' })
  }
  next()
}
