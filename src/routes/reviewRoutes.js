import express from 'express';
import {
  createReview,
  getProductReviews,
  checkReviewEligibility,
  getAllReviews,
  updateReviewStatus,
  deleteReview
} from '../controllers/reviewController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public route - Get approved reviews for a product
router.get('/products/:productId', getProductReviews);

// Protected routes - Require authentication
router.post('/', requireAuth, createReview);
router.get('/eligibility/:productId', requireAuth, checkReviewEligibility);

// Admin routes - Require admin privileges
router.get('/admin/all', requireAdmin, getAllReviews);
router.patch('/admin/:id', requireAdmin, updateReviewStatus);
router.delete('/admin/:id', requireAdmin, deleteReview);

export default router;
