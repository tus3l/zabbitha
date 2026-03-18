import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware to require authentication
 * Protects routes from unauthenticated users
 * Redirects to login page if no valid token is present
 */
export const requireAuth = (req, res, next) => {
  try {
    // Get token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to view product details and prices.',
        redirectTo: '/login'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user info to request object
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to view product details and prices.',
      redirectTo: '/login',
      error: error.message
    });
  }
};

/**
 * Optional auth middleware - doesn't block if not authenticated
 * Just attaches user info if token is valid
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without user info
    next();
  }
};

/**
 * Middleware to require admin role
 * Protects routes from non-admin users
 * Must be used after requireAuth middleware
 */
export const requireAdmin = (req, res, next) => {
  try {
    // Check if user exists (should be set by requireAuth)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
        redirectTo: '/login'
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        redirectTo: '/index.html'
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying admin access',
      error: error.message
    });
  }
};
