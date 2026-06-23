import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const products = await Product.find().sort({ sortOrder: 1, createdAt: -1 }).select('name brand sortOrder createdAt').lean();
  console.table(products.map(p => ({
    name: p.name,
    brand: p.brand,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt
  })).slice(0, 10));
  mongoose.disconnect();
}).catch(console.error);
