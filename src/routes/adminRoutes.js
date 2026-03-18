import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { 
  createProduct, 
  updateProduct, 
  deleteProduct
} from '../controllers/productController.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Admin Routes
 * All routes require authentication and admin role
 */

// Get all products with full details (for admin panel)
router.get('/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to camelCase
    const formattedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      category: p.category,
      imageUrl: p.image_url,
      stockQuantity: p.stock_quantity,
      createdAt: p.created_at
    }));

    res.status(200).json({
      success: true,
      count: formattedProducts.length,
      data: formattedProducts
    });
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
});

// Create new product (Admin only)
router.post('/products', requireAuth, requireAdmin, createProduct);

// Update product (Admin only)
router.put('/products/:id', requireAuth, requireAdmin, updateProduct);

// Delete product (Admin only)
router.delete('/products/:id', requireAuth, requireAdmin, deleteProduct);

export default router;
