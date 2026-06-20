import express from 'express'
import {
  loginHandler,
  registerHandler,
  getMeHandler,
  updateProfileHandler,
} from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.post('/login', loginHandler)
router.post('/register', registerHandler)
router.get('/me', protect, getMeHandler)
router.put('/profile', protect, updateProfileHandler)

export default router
