const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    id: { type: String, required: true },
    local_id: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    seller_id:{type:String,required:true},
    isVerified: { type: Boolean, required: true },
    createdAt: { type: Date, default: Date.now }
  }
});

const cartSchema = new mongoose.Schema({
  buyer_id: { type: String, required: true },
  cart_items: [cartItemSchema]
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
