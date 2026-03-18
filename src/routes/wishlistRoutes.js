import express from 'express';
import { 
  addToWishlist, 
  removeFromWishlist, 
  getWishlist, 
  checkWishlistStatus 
} from '../controllers/wishlistController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All wishlist routes require authentication

// Add product to wishlist
router.post('/', requireAuth, addToWishlist);

// Remove product from wishlist
router.delete('/:productId', requireAuth, removeFromWishlist);

// Get user's wishlist
router.get('/', requireAuth, getWishlist);

// Check if product is in wishlist
router.get('/check/:productId', requireAuth, checkWishlistStatus);

export default router;
