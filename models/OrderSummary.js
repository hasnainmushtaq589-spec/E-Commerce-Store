const mongoose = require('mongoose');

const orderSummarySchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true
    },
    productName: String,
    productPrice: Number,
    customerName: String,
    email: String,
    phoneNumber: String,
    homeAddress: String,
    city: String,
    zipCode: String,
    status: {
        type: String,
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate order number
orderSummarySchema.pre('save', async function () {
    if (!this.orderNumber) {
        const count = await mongoose.model('OrderSummary').countDocuments();
        this.orderNumber = `ORD-VAL-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('OrderSummary', orderSummarySchema);
