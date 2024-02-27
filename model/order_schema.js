const mongoose = require('mongoose');

const order_Schema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  cartItems: [{
    product: {
      id: { type: String, required: true },
      local_id: { type: String, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      category: { type: String, required: true },
      price: { type: Number, required: true },
      seller_id:{type:String,required: true},
      isVerified: { type: Boolean, required: true },
      status : {type:String,default:"Processing"}
    }
  }],
  billingDetails: {
    name: { type: String, required: true },
    location: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    courierCharge: { type: Number, required: true }
  },
  total_amount:{
    type: Number,
    require:true
  },
  paymentStatus: {
    type: String,
    default: 'Paid', // Or 'Paid', 'Failed'
  },
  orderStatus: {
    type: String,
    default: 'Processing' // Or 'Shipped', 'Delivered', 'Cancelled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', order_Schema);