import express from 'express'
import multer from 'multer'
import {
  getProducts,
  getCategories,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  seedProducts,
  getSuggestedProducts,
} from '../controllers/productController.js'
import { protect, adminOnly, strictAdminOnly } from '../middleware/auth.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'))
      return
    }
    cb(null, true)
  },
})

const uploadProductImage = (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    if (!req.file) return res.status(400).json({ message: 'Image file is required' })

    const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    res.status(201).json({
      imageUrl,
      message: 'Image uploaded. Save the product to store it in MongoDB.',
    })
  })
}

// Public/Protected
router.get('/', getProducts)
router.get('/categories', getCategories)
router.get('/suggested', protect, getSuggestedProducts) // Must be before /:id
router.get('/:id', getProduct)

// Admin only
router.post('/', protect, adminOnly, createProduct)
router.post('/upload-image', protect, adminOnly, uploadProductImage)
router.put('/:id', protect, adminOnly, updateProduct)
router.delete('/:id', protect, adminOnly, strictAdminOnly, deleteProduct)
router.post('/admin/seed', protect, adminOnly, seedProducts)

export default router
