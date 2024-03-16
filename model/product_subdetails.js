const mongoose = require('mongoose');

// Define the schema for the product collection
const productSchema = new mongoose.Schema({
  local_id:{type:String,required:true},
  image: { type: String, required: true }, // Base64 representation of the image
  description: { type: String, required: true } // Description of the product
});

// Create a model for the product collection
const Product_sub = mongoose.model('Product_sub', productSchema);

module.exports = Product_sub;