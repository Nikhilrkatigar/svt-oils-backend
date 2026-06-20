import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100,
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    unique: true,
    match: [/^\d{10}$/, 'Enter a valid 10-digit number'],
  },
  secondaryPhone: {
    type: String,
    match: [/^\d{10}$/, 'Enter a valid 10-digit number'],
    default: '',
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  address: {
    type: String,
    default: '',
    maxlength: 500,
  },
  addressLocation: {
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
  isAdmin: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['customer', 'staff', 'admin'],
    default: 'customer',
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  orderCount: {
    type: Number,
    default: 0,
  },
  lastLogin: Date,
}, {
  timestamps: true,
})

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Virtual for initials
userSchema.virtual('initials').get(function () {
  return this.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
})

userSchema.set('toJSON', { virtuals: true })

export default mongoose.model('User', userSchema)
