const mongoose = require('mongoose');

const localGraphSchema = new mongoose.Schema({
    seller_id: {
        type: String,
        required: true // Ensures seller_id is required
    },
    products: {
        type: [
            {
                product_name: {
                    type: String,
                    required: true // Ensures each product's name is required
                },
                count: {
                    type: Number,
                    required: true,
                    default: 0 // Default count to 0 if not specified
                }
            }
        ],
        default: [] // Default products to an empty array
    }
});


const GraphData = mongoose.model('GraphData', localGraphSchema);

module.exports = GraphData;
