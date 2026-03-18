import express from 'express';
import { syncCart, cleanupAbandonedOrders } from '../controllers/cartController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Cart Routes
 * Base path: /api/cart
 */

// POST /api/cart/sync - Sync cart with database prices and availability (public)
router.post('/sync', syncCart);

// DELETE /api/cart/cleanup - Clean up abandoned orders (admin only)
router.delete('/cleanup', requireAdmin, cleanupAbandonedOrders);

export default router;
