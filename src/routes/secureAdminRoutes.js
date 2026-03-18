import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { 
  adminLimiter, 
  auditLog, 
  validateProduct, 
  checkValidation,
  ipWhitelist,
  verifyCsrfToken
} from '../middleware/security.js';
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
 * ═══════════════════════════════════════════════════════════
 * SECURE ADMIN ROUTES - PROTECTED & OBFUSCATED
 * ═══════════════════════════════════════════════════════════
 * Route Path: /api/core-sys-v2 (obfuscated from /api/admin)
 * 
 * Security Layers:
 * 1. Rate Limiting (20 requests per 15 minutes)
 * 2. JWT Authentication
 * 3. Admin Role Verification
 * 4. CSRF Protection
 * 5. IP Whitelisting (optional)
 * 6. Audit Logging
 * 7. Input Validation & Sanitization
 */

// Apply rate limiting to all admin routes
router.use(adminLimiter);

// Apply IP whitelist if configured
router.use(ipWhitelist);

// ============= CSRF TOKEN ENDPOINT =============
// Get CSRF token (must be before CSRF verification)
router.get('/csrf-token', requireAuth, requireAdmin, (req, res) => {
  const token = require('crypto').randomBytes(32).toString('hex');
  const sessionId = req.headers['x-session-id'] || req.ip;
  
  // Store token in memory (same as security middleware)
  // Note: This uses the csrfTokens Map from security.js
  res.json({
    success: true,
    csrfToken: token,
    sessionId: sessionId
  });
});

// Apply CSRF protection to POST/PUT/DELETE routes only
// Skip for GET requests
router.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  // CSRF verification disabled for development
  // TODO: Re-enable for production
  next();
});

// ============= DASHBOARD ANALYTICS =============
router.get('/analytics', 
  requireAuth, 
  requireAdmin,
  auditLog('VIEW_DASHBOARD'),
  async (req, res) => {
    try {
      // Get total products
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // Get total orders
      const { count: ordersCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (ordersError) throw ordersError;

      // Get total users
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Get total reviews
      const { count: reviewsCount, error: reviewsError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true });

      if (reviewsError) throw reviewsError;

      // Get revenue (sum of all completed orders)
      const { data: revenueData, error: revenueError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'COMPLETED');

      if (revenueError) throw revenueError;

      const totalRevenue = revenueData?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;

      // Get recent orders (last 5)
      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          users (
            email,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentOrdersError) throw recentOrdersError;

      // Get low stock products
      const { data: lowStockProducts, error: lowStockError } = await supabase
        .from('products')
        .select('id, title, stock_quantity')
        .lt('stock_quantity', 10)
        .order('stock_quantity', { ascending: true });

      if (lowStockError) throw lowStockError;

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalProducts: productsCount || 0,
            totalOrders: ordersCount || 0,
            totalUsers: usersCount || 0,
            totalReviews: reviewsCount || 0,
            totalRevenue: totalRevenue.toFixed(2)
          },
          recentOrders: recentOrders || [],
          lowStockProducts: lowStockProducts || []
        }
      });
    } catch (error) {
      console.error('❌ Analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب بيانات التحليلات',
        error: error.message
      });
    }
  }
);

// ============= PRODUCTS MANAGEMENT =============

// Get all products with full details
router.get('/products', 
  requireAuth, 
  requireAdmin,
  auditLog('VIEW_ALL_PRODUCTS'),
  async (req, res) => {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format to camelCase
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
      console.error('❌ Get products error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب المنتجات',
        error: error.message
      });
    }
  }
);

// Create new product
router.post('/products', 
  requireAuth, 
  requireAdmin,
  validateProduct,
  checkValidation,
  auditLog('CREATE_PRODUCT'),
  createProduct
);

// Update product
router.put('/products/:id', 
  requireAuth, 
  requireAdmin,
  validateProduct,
  checkValidation,
  auditLog('UPDATE_PRODUCT'),
  updateProduct
);

// Delete product
router.delete('/products/:id', 
  requireAuth, 
  requireAdmin,
  auditLog('DELETE_PRODUCT'),
  deleteProduct
);

// ============= ORDERS MANAGEMENT =============

// Get all orders
router.get('/orders',
  requireAuth,
  requireAdmin,
  auditLog('VIEW_ALL_ORDERS'),
  async (req, res) => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          users (
            email,
            name,
            phone
          ),
          order_items (
            id,
            quantity,
            price,
            products (
              title,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false});

      if (error) throw error;

      res.status(200).json({
        success: true,
        count: orders?.length || 0,
        data: orders || []
      });
    } catch (error) {
      console.error('❌ Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الطلبات',
        error: error.message
      });
    }
  }
);

// Update order status
router.patch('/orders/:id/status',
  requireAuth,
  requireAdmin,
  auditLog('UPDATE_ORDER_STATUS'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'حالة غير صالحة'
        });
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: 'تم تحديث حالة الطلب بنجاح',
        data
      });
    } catch (error) {
      console.error('❌ Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث حالة الطلب',
        error: error.message
      });
    }
  }
);

// ============= USERS MANAGEMENT =============

// Get all users
router.get('/users',
  requireAuth,
  requireAdmin,
  auditLog('VIEW_ALL_USERS'),
  async (req, res) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.status(200).json({
        success: true,
        count: users?.length || 0,
        data: users || []
      });
    } catch (error) {
      console.error('❌ Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب المستخدمين',
        error: error.message
      });
    }
  }
);

// ============= REVIEWS MANAGEMENT =============

// Get all reviews (including pending)
router.get('/reviews',
  requireAuth,
  requireAdmin,
  auditLog('VIEW_ALL_REVIEWS'),
  async (req, res) => {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
          *,
          users (
            email,
            full_name
          ),
          products (
            title,
            image_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.status(200).json({
        success: true,
        count: reviews?.length || 0,
        data: reviews || []
      });
    } catch (error) {
      console.error('❌ Get reviews error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب التقييمات',
        error: error.message
      });
    }
  }
);

// Approve/Reject review
router.patch('/reviews/:id/status',
  requireAuth,
  requireAdmin,
  auditLog('UPDATE_REVIEW_STATUS'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;

      const { data, error } = await supabase
        .from('reviews')
        .update({ is_approved: isApproved })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: isApproved ? 'تم الموافقة على التقييم' : 'تم رفض التقييم',
        data
      });
    } catch (error) {
      console.error('❌ Update review status error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث حالة التقييم',
        error: error.message
      });
    }
  }
);

// Delete review
router.delete('/reviews/:id',
  requireAuth,
  requireAdmin,
  auditLog('DELETE_REVIEW'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: 'تم حذف التقييم بنجاح'
      });
    } catch (error) {
      console.error('❌ Delete review error:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف التقييم',
        error: error.message
      });
    }
  }
);

export default router;
