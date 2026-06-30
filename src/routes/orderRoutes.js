import express from 'express'
import {
  placeOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/orderController.js'
import { protect, adminOnly, strictAdminOnly } from '../middleware/auth.js'

const router = express.Router()

// All order routes require login
router.use(protect)

// User routes
router.post('/', placeOrder)
router.get('/my', getMyOrders)
router.get('/:id', getOrder)
router.patch('/:id/cancel', cancelOrder)

// Admin routes
router.get('/admin/all', adminOnly, getAllOrders)
router.patch('/:id/status', adminOnly, updateOrderStatus)
router.delete('/:id', adminOnly, strictAdminOnly, deleteOrder)

export default router
