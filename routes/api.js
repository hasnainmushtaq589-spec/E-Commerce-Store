const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const OrderSummary = require('../models/OrderSummary');

// Multer Setup for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Admin Key for creating admin accounts (change in production)
const ADMIN_SECRET_KEY = 'dinorah_admin_2024';

// --- PRODUCTS ---

// Get All Products (with filter)
router.get('/products', async (req, res) => {
    try {
        const { category } = req.query;
        let filter = {};
        if (category && category !== 'all') {
            filter.category = category;
        }
        const products = await Product.find(filter).sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Product by ID
router.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Product
router.post('/products', upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category, inStock } = req.body;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : '';

        const newProduct = new Product({
            name,
            description,
            price,
            category,
            inStock: inStock === 'true',
            imagePath
        });

        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Product
router.put('/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category, inStock } = req.body;

        const updateData = {
            name,
            description,
            price,
            category,
            inStock: inStock === 'true' || inStock === true
        };

        // Only update image if new one is provided
        if (req.file) {
            updateData.imagePath = `/uploads/${req.file.filename}`;
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Product
router.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH ---

// Login
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Use bcrypt to compare passwords
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Return user info and a "token" (user ID for simplicity)
        res.json({
            token: user._id,
            user: {
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Signup
router.post('/auth/signup', async (req, res) => {
    try {
        const { username, email, password, adminKey } = req.body;

        // Check if username or email already exists
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'Username or email already exists'
            });
        }

        // Check admin key for admin account creation
        const isAdmin = adminKey === ADMIN_SECRET_KEY;

        const newUser = new User({
            username,
            email,
            password, // Will be hashed by pre-save hook
            isAdmin
        });

        await newUser.save();
        res.status(201).json({
            message: 'Account created successfully',
            isAdmin: isAdmin
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ORDERS ---

// Get All Orders (Admin only - for dashboard)
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customer', 'username email')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Order
router.post('/orders', async (req, res) => {
    try {
        const { items, customerId, guestInfo, notes } = req.body;

        // Calculate total
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (product) {
                totalAmount += product.price * item.quantity;
                orderItems.push({
                    product: product._id,
                    productName: product.name,
                    productPrice: product.price,
                    quantity: item.quantity
                });
            }
        }

        const newOrder = new Order({
            items: orderItems,
            customer: customerId || undefined,
            guestInfo: guestInfo || undefined,
            totalAmount,
            notes
        });

        await newOrder.save();

        // Also save to OrderSummary collection as requested
        const newOrderSummary = new OrderSummary({
            orderNumber: newOrder.orderNumber, // Use same order number for tracking
            productName: orderItems[0]?.productName || 'Multiple Items',
            productPrice: orderItems[0]?.productPrice || totalAmount,
            customerName: guestInfo?.name || 'Registered User',
            email: guestInfo?.email || '',
            phoneNumber: guestInfo?.phone || '',
            homeAddress: guestInfo?.address || '',
            city: guestInfo?.city || '',
            zipCode: guestInfo?.zipCode || '',
            status: 'Pending'
        });

        await newOrderSummary.save();

        res.status(201).json(newOrder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Order Status
router.put('/orders/:id', async (req, res) => {
    try {
        const { status, paymentStatus, notes } = req.body;

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status, paymentStatus, notes, updatedAt: Date.now() },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- STATS ---
router.get('/stats', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ inStock: true });

        // Calculate real sales from confirmed/delivered orders
        const salesAggregation = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        const totalSales = salesAggregation[0]?.totalSales || 0;
        const totalOrders = salesAggregation[0]?.orderCount || 0;

        // Get pending orders count
        const pendingOrders = await Order.countDocuments({ status: 'pending' });

        res.json({
            totalProducts,
            activeProducts,
            totalSales,
            totalOrders,
            pendingOrders
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
