import express from 'express';
import {
  getAllProducts,
  getProductsByCategory,
  getProductById,
  createProduct,
  searchProducts
} from '../controllers/productController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/', getAllProducts);
router.get('/category/:category', getProductsByCategory);

// Search route - must be BEFORE /:id to avoid conflicts
router.get('/search', searchProducts);

// Protected route - requires authentication
// User must be logged in to view product details and prices
router.get('/:id', requireAuth, getProductById);

// Admin routes (would need admin middleware)
router.post('/', createProduct);

export default router;
