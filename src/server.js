import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import rateLimit from 'express-rate-limit'
import connectDB from '../config/db.js'
import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import locationRoutes from './routes/locationRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'
import { ensureAdminUser } from './utils/ensureAdmin.js'

// ─── Connect DB ───────────────────────────────────────
await connectDB()
await ensureAdminUser()

const app = express()

// ─── Security ─────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173',  // Vite dev
  ],
  credentials: true,
}))

// ─── Rate limiting ────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 200,
  message: { message: 'Too many requests. Please try again later.' },
})
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts. Please try again later.' },
})
app.use('/api', limiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// ─── Body parsing ─────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// ─── Logging (dev only) ───────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// ─── Health check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SVT Oils API',
    version: '1.0.0',
    time: new Date().toISOString(),
  })
})

// ─── API Routes ───────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/location', locationRoutes)
app.use('/api/admin', adminRoutes)

// ─── Error handling ───────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ─── Start ────────────────────────────────────────────
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`\n🫙  SVT Oils API running on port ${PORT}`)
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗  Health: http://localhost:${PORT}/api/health\n`)
})

export default app
