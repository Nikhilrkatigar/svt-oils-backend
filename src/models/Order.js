import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  name: { type: String, required: true },
  brand: { type: String, default: '' },
  weight: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  emoji: { type: String, default: '🫙' },
  price: { type: Number, default: 0 },   // price at time of order
  qty: { type: Number, required: true, min: 1 },
  isNegotiable: { type: Boolean, default: false },
}, { _id: false })

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
  },
  idempotencyKey: {
    type: String,
    default: '',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [orderItemSchema],
  total: {
    type: Number,
    default: 0,
  },
  hasNegotiable: {
    type: Boolean,
    default: false,
  },
  deliveryAddress: {
    type: String,
    required: [true, 'Delivery address is required'],
  },
  deliveryLocation: {
    lat: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },
    lng: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },
    source: {
      type: String,
      enum: ['browser', 'manual', ''],
      default: '',
    },
  },
  phone: {
    type: String,
    required: true,
  },
  note: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  statusHistory: [{
    status: String,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  cancelReason: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
})

// Auto-generate order ID like ORD100001
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderId) {
    const count = await mongoose.model('Order').countDocuments()
    this.orderId = `ORD${String(100001 + count).padStart(6, '0')}`
  }
  next()
})

// Indexes
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ status: 1 })
orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string', $gt: '' } } }
)

export default mongoose.model('Order', orderSchema)
