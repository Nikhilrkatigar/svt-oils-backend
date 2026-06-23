import Product from '../models/Product.js'
import Order from '../models/Order.js'

const normalizePrice = (value) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return Number(value)
}

const normalizeVariants = (variants = []) => {
  if (!Array.isArray(variants)) return []
  return variants
    .filter(v => v?.weight?.trim())
    .map(v => {
      const price = normalizePrice(v.price) ?? null
      const discountPrice = normalizePrice(v.discountPrice) ?? null
      return {
        weight: v.weight.trim(),
        price,
        discountPrice,
        isNegotiable: price === null ? true : Boolean(v.isNegotiable),
        inStock: v.inStock !== false,
      }
    })
}

// GET /api/products  (public)
export const getProducts = async (req, res, next) => {
  try {
    const { category, search, inStock, limit = 100, page = 1 } = req.query
    const filter = {}

    if (category && category !== 'all') {
      filter.category = { $regex: category, $options: 'i' }
    }
    if (inStock === 'true') filter.inStock = true
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await Product.countDocuments(filter)
    const products = await Product.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))

    res.json({ products, total, page: Number(page) })
  } catch (err) { next(err) }
}

// GET /api/products/categories  (public)
export const getCategories = async (req, res, next) => {
  try {
    const cats = await Product.distinct('category')
    res.json({ categories: cats })
  } catch (err) { next(err) }
}

// GET /api/products/suggested  (protected)
export const getSuggestedProducts = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
    if (!orders || orders.length === 0) {
      return res.json({ products: [] })
    }

    const productCounts = {}
    orders.forEach(order => {
      order.items?.forEach(item => {
        if (item.product) {
          const pId = item.product.toString()
          productCounts[pId] = (productCounts[pId] || 0) + (item.qty || 1)
        }
      })
    })

    const sortedProductIds = Object.keys(productCounts).sort((a, b) => productCounts[b] - productCounts[a])
    const topIds = sortedProductIds.slice(0, 4)

    if (topIds.length === 0) {
      return res.json({ products: [] })
    }

    const products = await Product.find({ _id: { $in: topIds } })
    const sortedProducts = topIds.map(id => products.find(p => p._id.toString() === id)).filter(Boolean)

    res.json({ products: sortedProducts })
  } catch (err) { next(err) }
}

// GET /api/products/:id  (public)
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ product })
  } catch (err) { next(err) }
}

// POST /api/products  (admin)
export const createProduct = async (req, res, next) => {
  try {
    const {
      name, brand, category, weight, price, discountPrice,
      isNegotiable, description, imageUrl, emoji, isNew, inStock, variants, sortOrder
    } = req.body

    const normalizedPrice = normalizePrice(price) ?? null
    const normalizedDiscountPrice = normalizePrice(discountPrice) ?? null
    const normalizedVariants = normalizeVariants(variants)

    const product = await Product.create({
      name, brand, category, weight,
      price: normalizedPrice,
      discountPrice: normalizedDiscountPrice,
      isNegotiable: normalizedPrice === null ? true : Boolean(isNegotiable),
      description, imageUrl: imageUrl?.trim() || '', emoji, isNew: isNew || false,
      inStock: inStock !== false,
      variants: normalizedVariants,
      sortOrder: sortOrder == null ? 999 : sortOrder,
    })

    res.status(201).json({ product, message: 'Product created' })
  } catch (err) { next(err) }
}

// PUT /api/products/:id  (admin)
export const updateProduct = async (req, res, next) => {
  try {
    const {
      name, brand, category, weight, price, discountPrice,
      isNegotiable, description, imageUrl, emoji, isNew, inStock, variants, sortOrder
    } = req.body

    const normalizedPrice = normalizePrice(price)
    const normalizedDiscountPrice = normalizePrice(discountPrice)
    const normalizedVariants = variants === undefined ? undefined : normalizeVariants(variants)

    const normalizedNegotiable = normalizedPrice === null
      ? true
      : isNegotiable !== undefined
        ? Boolean(isNegotiable)
        : undefined

    const updates = {
      name, brand, category, weight,
      price: normalizedPrice,
      discountPrice: normalizedDiscountPrice,
      isNegotiable: normalizedNegotiable,
      description, imageUrl: imageUrl?.trim(),
      emoji,
      isNew: isNew || false,
      inStock: inStock !== false,
      variants: normalizedVariants,
      sortOrder: sortOrder == null ? 999 : sortOrder,
    }
    // Remove undefined keys
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k])

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ product, message: 'Product updated' })
  } catch (err) { next(err) }
}

// DELETE /api/products/:id  (admin)
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ message: 'Product deleted' })
  } catch (err) { next(err) }
}

// POST /api/products/seed  (admin) — seed all products from the price lists
export const seedProducts = async (req, res, next) => {
  try {
    const seedData = [
      { name: 'SVT Gold Veg Oil', brand: 'SVT GOLD', category: 'vegetable', weight: '1 Ltr', price: 1675, emoji: '🫙', isNew: true },
      { name: 'SVT Gold Veg Oil', brand: 'SVT GOLD', category: 'vegetable', weight: '2 Ltr', price: 1685, emoji: '🫙' },
      { name: 'SVT Gold Veg Oil', brand: 'SVT GOLD', category: 'vegetable', weight: '5 Ltr', price: 1695, emoji: '🫙' },
      { name: 'SVT Gold Veg Oil (Pouch 2303)', brand: 'SVT GOLD', category: 'vegetable', weight: '2303 box', price: 2303, emoji: '🫙' },
      { name: 'SVT Gold Veg Oil (Pouch 2517)', brand: 'SVT GOLD', category: 'vegetable', weight: '2517 box', price: 2517, emoji: '🫙' },
      { name: 'SVT Gold HD Jar', brand: 'SVT GOLD', category: 'vegetable', weight: '15 Kg', price: 2200, emoji: '🏺' },
      { name: 'SVT 10Rs Pouch Box', brand: 'SVT GOLD', category: 'vegetable', weight: '7.4g × 140pc', price: 1040, emoji: '🫙', description: '140 pouches per box at 7.4g each' },
      { name: 'Sun Shudh Sunflower Oil', brand: 'SUNSHUDH', category: 'sunflower', weight: '800 Gm', price: 1459, emoji: '🌻' },
      { name: 'Sun Shudh Sunflower Oil', brand: 'SUNSHUDH', category: 'sunflower', weight: '850 Gm', price: 1547, emoji: '🌻' },
      { name: 'Sun Shudh Sunflower Oil', brand: 'SUNSHUDH', category: 'sunflower', weight: '1 Ltr', price: 1652, emoji: '🌻' },
      { name: 'Sun Shudh Sunflower Oil', brand: 'SUNSHUDH', category: 'sunflower', weight: '5 Ltr', price: 860, emoji: '🌻' },
      { name: 'Sun Shudh Sunflower Oil', brand: 'SUNSHUDH', category: 'sunflower', weight: '13 Kg', price: 2418, emoji: '🌻' },
      { name: 'Sun Shudh Sunflower Oil', brand: 'SUNSHUDH', category: 'sunflower', weight: '15 Ltr', price: 2528, emoji: '🌻' },
      { name: 'Sun Shudh Sunflower Oil', brand: 'SUNSHUDH', category: 'sunflower', weight: '15 Kg', price: 2759, emoji: '🌻' },
      { name: 'Sun Vijay Sunflower Oil', brand: 'SUN VIJAY', category: 'sunflower', weight: '750 Gm', price: 1293, emoji: '🌻' },
      { name: 'Sun Vijay Sunflower Oil', brand: 'SUN VIJAY', category: 'sunflower', weight: '800 Gm', price: 1376, emoji: '🌻' },
      { name: 'Sun Vijay Sunflower Oil', brand: 'SUN VIJAY', category: 'sunflower', weight: '13 Kg', price: 2290, emoji: '🌻' },
      { name: 'Sun Vijay Sunflower Oil', brand: 'SUN VIJAY', category: 'sunflower', weight: '15 Kg', price: 2621, emoji: '🌻' },
      { name: 'Geo Gold Palm Oil', brand: 'GEO GOLD', category: 'palm', weight: '750 Gm', price: 1221, emoji: '🌴' },
      { name: 'Geo Gold Palm Oil', brand: 'GEO GOLD', category: 'palm', weight: '790 Gm', price: 1283, emoji: '🌴' },
      { name: 'Geo Gold Palm Oil (15 Ltr / 13 Kg)', brand: 'GEO GOLD', category: 'palm', weight: '15 Ltr/13 Kg', price: 2178, emoji: '🌴' },
      { name: 'Geo Gold Palm Oil (15 Kg)', brand: 'GEO GOLD', category: 'palm', weight: '15 Kg', price: 2491, emoji: '🌴' },
      { name: 'Nutri Choice Oil', brand: 'NUTRI CHOICE', category: 'vegetable', weight: '1 Kg', price: 1665, emoji: '🍀' },
      { name: 'Nutri Choice Oil', brand: 'NUTRI CHOICE', category: 'vegetable', weight: '500 Gm', price: 1675, emoji: '🍀' },
      { name: 'Nutri Choice Oil', brand: 'NUTRI CHOICE', category: 'vegetable', weight: '250 Gm', price: 1685, emoji: '🍀' },
      { name: 'Nutri Choice Oil', brand: 'NUTRI CHOICE', category: 'vegetable', weight: '200 Gm', price: 1415, emoji: '🍀' },
      { name: 'Nutri Choice Oil', brand: 'NUTRI CHOICE', category: 'vegetable', weight: '175 Gm', price: 1300, emoji: '🍀' },
      { name: 'Nutri Choice Oil', brand: 'NUTRI CHOICE', category: 'vegetable', weight: '4 Kg', price: 2797, emoji: '🍀' },
      { name: 'IRAAA Oil Pouch', brand: 'IRAAA', category: 'vegetable', weight: '700 Gm', price: 1161, emoji: '🫙' },
      { name: 'IRAAA Oil Pouch', brand: 'IRAAA', category: 'vegetable', weight: '750 Gm', price: 1237, emoji: '🫙' },
      { name: 'IRAAA Oil Pouch', brand: 'IRAAA', category: 'vegetable', weight: '790 Gm', price: 1300, emoji: '🫙' },
      { name: 'IRAAA Oil Pouch', brand: 'IRAAA', category: 'vegetable', weight: '800 Gm', price: 1316, emoji: '🫙' },
      { name: 'IRAAA Oil Pouch', brand: 'IRAAA', category: 'vegetable', weight: '900 Gm', price: 1474, emoji: '🫙' },
      { name: 'NC Plus Veg Oil SO Pouch', brand: 'NC PLUS', category: 'vegetable', weight: '700 Gm', price: 1167, emoji: '🍀' },
      { name: 'NC Plus Veg Oil SO Pouch', brand: 'NC PLUS', category: 'vegetable', weight: '750 Gm', price: 1241, emoji: '🍀' },
      { name: 'NC Plus Veg Oil SO Pouch', brand: 'NC PLUS', category: 'vegetable', weight: '790 Gm', price: 1305, emoji: '🍀' },
      { name: 'NC Plus Veg Oil SO Pouch', brand: 'NC PLUS', category: 'vegetable', weight: '800 Gm', price: 1320, emoji: '🍀' },
      { name: 'NC Plus Veg Oil SO Pouch', brand: 'NC PLUS', category: 'vegetable', weight: '900 Gm', price: 1479, emoji: '🍀' },
      { name: 'NC Plus Veg Oil SO Pouch', brand: 'NC PLUS', category: 'vegetable', weight: '1 Kg × 10pc', price: 1640, emoji: '🍀' },
      { name: 'Groundnut Oil', brand: 'PREMIUM', category: 'groundnut', weight: '1 Ltr', price: 330, emoji: '🥜' },
      { name: 'Safflower Oil', brand: 'PREMIUM', category: 'safflower', weight: '1 Ltr', price: 334, emoji: '🌸' },
      { name: 'Safflower Oil', brand: 'PREMIUM', category: 'safflower', weight: '5 Ltr', price: 1660, emoji: '🌸' },
      { name: 'Deepam Lamp Oil (Pet Bottle)', brand: 'DEEPAM', category: 'lamp', weight: '1 Ltr Pet Bottle', price: null, isNegotiable: true, emoji: '🪔', description: 'Pet bottle lamp oil — price on request' },
      { name: 'Deepam Lamp Oil', brand: 'DEEPAM', category: 'lamp', weight: '1 Ltr', price: 163, emoji: '🪔' },
    ]

    await Product.deleteMany({})
    const inserted = await Product.insertMany(seedData.map((p) => ({ ...p, sortOrder: 999, inStock: true })))
    res.json({ message: `✅ Seeded ${inserted.length} products`, count: inserted.length })
  } catch (err) { next(err) }
}
