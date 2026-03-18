import express from 'express';
import { getMyOrders, getOrderById, createOrder } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All order routes require authentication
router.use(requireAuth);

// GET /api/orders/me - Get all orders for the authenticated user
router.get('/me', getMyOrders);

// GET /api/orders/:id - Get a specific order by ID
router.get('/:id', getOrderById);

// POST /api/orders - Create a new order
router.post('/', createOrder);

export default router;
