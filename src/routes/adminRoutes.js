import express from 'express'
import {
  getDashboard,
  createUser,
  getUsers,
  getUserDetail,
  updateUser,
  toggleBlockUser,
} from '../controllers/adminController.js'
import { protect, adminOnly } from '../middleware/auth.js'

const router = express.Router()

router.use(protect, adminOnly)

router.get('/dashboard', getDashboard)
router.get('/users', getUsers)
router.post('/users', createUser)
router.get('/users/:id', getUserDetail)
router.put('/users/:id', updateUser)
router.patch('/users/:id/block', toggleBlockUser)

export default router
