const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    price: {
        type: Number,
        required: true
    },
    category: {
        type: String, // Ring, Necklace, Earring
        required: true,
        enum: ['Ring', 'Necklace', 'Earring']
    },
    inStock: {
        type: Boolean,
        default: true
    },
    imagePath: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', productSchema);
