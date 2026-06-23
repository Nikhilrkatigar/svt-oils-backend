import mongoose from 'mongoose'

const variantSchema = new mongoose.Schema({
  weight: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    default: null,
  },
  discountPrice: {
    type: Number,
    default: null,
  },
  isNegotiable: {
    type: Boolean,
    default: false,
  },
  inStock: {
    type: Boolean,
    default: true,
  },
}, { _id: true })

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['sunflower', 'vegetable', 'palm', 'groundnut', 'safflower', 'coconut', 'mustard', 'soybean', 'lamp', 'other'],
    default: 'vegetable',
  },
  weight: {
    type: String,   // e.g. "1 Ltr", "5 Kg", "750 Gm"
    default: '',
  },
  price: {
    type: Number,   // price per case (as per your wholesale price list)
    default: null,
  },
  discountPrice: {
    type: Number,   // set to trigger the scratch animation
    default: null,
  },
  isNegotiable: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  imageUrl: {
    type: String,
    default: '',
    trim: true,
  },
  emoji: {
    type: String,
    default: '',
  },
  isNew: {
    type: Boolean,
    default: false,
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  variants: {
    type: [variantSchema],
    default: [],
  },
  sortOrder: {
    type: Number,
    default: 999,
  },
}, {
  timestamps: true,
})

// Text index for search
productSchema.index({ name: 'text', brand: 'text', category: 'text' })

export default mongoose.model('Product', productSchema)
