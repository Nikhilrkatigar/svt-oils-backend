import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  await Product.updateMany({}, { $set: { sortOrder: 999 } });
  console.log('Updated all products to sortOrder 999');
  mongoose.disconnect();
}).catch(console.error);
