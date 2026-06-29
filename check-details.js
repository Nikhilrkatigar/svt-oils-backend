import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const products = await Product.find().lean();
  console.log(JSON.stringify(products, null, 2));
  mongoose.disconnect();
}).catch(console.error);
