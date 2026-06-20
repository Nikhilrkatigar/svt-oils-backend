import express from 'express'
import { reverseGeocode } from '../controllers/locationController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/reverse', protect, reverseGeocode)

export default router
