import express from 'express';
import { 
  validatePromoCode, 
  usePromoCode, 
  getAllPromoCodes 
} from '../controllers/promoController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public route - validate promo code
router.post('/validate', validatePromoCode);

// Protected route - increment promo usage (called after successful order)
router.post('/use/:id', requireAuth, usePromoCode);

// Admin route - get all promo codes
router.get('/all', requireAuth, requireAdmin, getAllPromoCodes);

export default router;
