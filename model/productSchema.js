const mongoose = require('mongoose');

// Define the Product Schema
const productSchema = new mongoose.Schema({
  local_id:{
     type:String,
     required:true
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    enum: ['Grains', 'Vegetables', 'Fruits', 'Dairy', 'Others'],
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  seller_id:{
    type:String,
    required:true
  }
});

// Define the Product Model
const Product = mongoose.model('Product', productSchema);

module.exports = Product;