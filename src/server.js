import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

// Import Supabase config
import { testSupabaseConnection } from './config/supabase.js';

// Import security middleware
import {
  securityHeaders,
  apiLimiter,
  loginLimiter,
  generateCsrfToken,
  xssProtection,
  sqlInjectionProtection
} from './middleware/security.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import secureAdminRoutes from './routes/secureAdminRoutes.js'; // NEW SECURE ROUTES
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import promoRoutes from './routes/promoRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';

// Import cleanup function
import { cleanupAbandonedOrders } from './controllers/cartController.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma Client
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE (Apply BEFORE other middleware)
// ═══════════════════════════════════════════════════════════
app.use(securityHeaders); // Security headers (helmet)
app.use(xssProtection); // XSS protection
app.use(sqlInjectionProtection); // SQL injection protection

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip}`);
  next();
});

// CSRF token generation for authenticated routes
app.use('/api', generateCsrfToken);

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Zabbitha API is running',
    version: '2.0.0 - Enterprise Security Edition',
    timestamp: new Date().toISOString(),
    security: 'ENABLED'
  });
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken
  });
});

// ═══════════════════════════════════════════════════════════
// API ROUTES WITH RATE LIMITING
// ═══════════════════════════════════════════════════════════

// Auth routes with special login rate limit
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

// General API rate limiter
app.use('/api', apiLimiter);

// Public routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/wishlist', wishlistRoutes);

// ═══════════════════════════════════════════════════════════
// OBFUSCATED ADMIN ROUTES (Hidden URLs for Security)
// ═══════════════════════════════════════════════════════════
// Route: /api/core-sys-v2 (instead of /api/admin)
// Additional Security: Rate limiting, IP whitelist, CSRF, Audit logging
app.use('/api/core-sys-v2', secureAdminRoutes);

// Keep old admin route for backward compatibility (will be removed later)
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
app.listen(PORT, async () => {
  console.log('='.repeat(50));
  console.log(`🚀 Zabbitha API Server is running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
  
  // Test Supabase connection
  console.log('\n🔍 Testing Supabase connection...');
  await testSupabaseConnection();
  
  // Start cron job for abandoned cart cleanup (runs every 15 minutes)
  console.log('\n⏰ Starting background cron job for abandoned cart cleanup...');
  cron.schedule('*/15 * * * *', async () => {
    console.log(`\n🧹 [${new Date().toISOString()}] Running abandoned cart cleanup...`);
    try {
      // Create mock request/response objects for the controller
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          if (data.success) {
            console.log(`✅ Cleanup completed: ${data.data?.deletedCount || 0} orders removed`);
          } else {
            console.error(`❌ Cleanup failed: ${data.message}`);
          }
        },
        status: (code) => ({
          json: (data) => {
            console.error(`❌ Cleanup error (${code}): ${data.message}`);
          }
        })
      };
      
      await cleanupAbandonedOrders(mockReq, mockRes);
    } catch (error) {
      console.error('❌ Cron job error:', error);
    }
  });
  console.log('✅ Cron job scheduled: Runs every 15 minutes');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
