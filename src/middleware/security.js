import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';

/**
 * ═══════════════════════════════════════════════════════════
 * ADVANCED SECURITY MIDDLEWARE - ZABBITHA PROTECTION SYSTEM
 * ═══════════════════════════════════════════════════════════
 * Protection against: XSS, CSRF, SQL Injection, Brute Force, DDoS
 */

// ============= HELMET SECURITY HEADERS =============
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// ============= RATE LIMITING =============

// General API rate limit (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin routes strict rate limit (20 requests per 15 minutes)
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'عدد كبير من محاولات الوصول. تم حظر الوصول مؤقتاً.',
    retryAfter: '15 minutes'
  }
});

// Login rate limit (5 attempts per 15 minutes per IP)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'عدد كبير من محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة.',
    retryAfter: '15 minutes'
  }
});

// ============= CSRF PROTECTION (Modern Alternative) =============
const csrfTokens = new Map(); // Store tokens temporarily (use Redis in production)

export const generateCsrfToken = (req, res, next) => {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = req.headers['x-session-id'] || req.ip;
  
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + (60 * 60 * 1000) // 1 hour
  });
  
  // Clean expired tokens
  cleanExpiredTokens();
  
  req.csrfToken = token;
  next();
};

export const verifyCsrfToken = (req, res, next) => {
  // Skip CSRF for GET requests
  if (req.method === 'GET') {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionId = req.headers['x-session-id'] || req.ip;
  
  const storedData = csrfTokens.get(sessionId);
  
  if (!storedData || storedData.token !== token || storedData.expires < Date.now()) {
    return res.status(403).json({
      success: false,
      message: 'رمز الأمان غير صالح. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      code: 'CSRF_INVALID'
    });
  }
  
  next();
};

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < now) {
      csrfTokens.delete(key);
    }
  }
}

// ============= INPUT VALIDATION & SANITIZATION =============

// Sanitize product input
export const validateProduct = [
  body('title').trim().isLength({ min: 3, max: 200 }).escape()
    .withMessage('عنوان المنتج يجب أن يكون بين 3 و 200 حرف'),
  body('description').trim().isLength({ min: 10, max: 2000 }).escape()
    .withMessage('وصف المنتج يجب أن يكون بين 10 و 2000 حرف'),
  body('price').isFloat({ min: 0, max: 1000000 })
    .withMessage('السعر يجب أن يكون رقم موجب'),
  body('category').trim().isIn(['car', 'setup', 'accessory'])
    .withMessage('الفئة غير صالحة'),
  body('stockQuantity').optional().isInt({ min: 0 })
    .withMessage('الكمية يجب أن تكون رقم صحيح موجب'),
];

// Sanitize login input
export const validateLogin = [
  body('email').trim().isEmail().normalizeEmail()
    .withMessage('البريد الإلكتروني غير صالح'),
  body('password').isLength({ min: 6, max: 100 })
    .withMessage('كلمة المرور يجب أن تكون بين 6 و 100 حرف'),
];

// Sanitize review input
export const validateReview = [
  body('rating').isInt({ min: 1, max: 5 })
    .withMessage('التقييم يجب أن يكون بين 1 و 5'),
  body('comment').trim().isLength({ min: 5, max: 1000 }).escape()
    .withMessage('التعليق يجب أن يكون بين 5 و 1000 حرف'),
];

// Middleware to check validation results
export const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'بيانات غير صالحة',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

// ============= IP WHITELISTING (Optional - for admin routes) =============
const ADMIN_WHITELIST = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

export const ipWhitelist = (req, res, next) => {
  // Skip if no whitelist configured
  if (ADMIN_WHITELIST.length === 0 || ADMIN_WHITELIST[0] === '') {
    return next();
  }
  
  const clientIp = req.ip || req.connection.remoteAddress;
  
  if (!ADMIN_WHITELIST.includes(clientIp)) {
    console.warn(`⚠️  Unauthorized admin access attempt from IP: ${clientIp}`);
    return res.status(403).json({
      success: false,
      message: 'الوصول مرفوض من عنوان IP الخاص بك',
      code: 'IP_BLOCKED'
    });
  }
  
  next();
};

// ============= AUDIT LOGGING =============
export const auditLog = (action) => {
  return (req, res, next) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId: req.user?.userId || 'anonymous',
      email: req.user?.email || 'N/A',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.originalUrl,
      body: req.method !== 'GET' ? sanitizeLogBody(req.body) : undefined
    };
    
    // In production, send to logging service (e.g., Winston, LogRocket)
    console.log('🔒 AUDIT LOG:', JSON.stringify(logEntry, null, 2));
    
    next();
  };
};

function sanitizeLogBody(body) {
  const sanitized = { ...body };
  if (sanitized.password) sanitized.password = '[REDACTED]';
  if (sanitized.token) sanitized.token = '[REDACTED]';
  return sanitized;
}

// ============= XSS PROTECTION =============
export const xssProtection = (req, res, next) => {
  // Sanitize query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = escapeHtml(req.query[key]);
    }
  }
  
  // Sanitize body (if not already validated)
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = escapeHtml(req.body[key]);
    }
  }
  
  next();
};

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  };
  return text.replace(/[&<>"'/]/g, (m) => map[m]);
}

// ============= SQL INJECTION PROTECTION =============
// Note: Using Supabase with parameterized queries already protects against SQL injection
// This is an additional layer for extra paranoia
export const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\/\*|\*\/|--|;|'|"|\|\||&&)/g,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    }
    return false;
  };
  
  // Check query parameters
  for (const key in req.query) {
    if (checkValue(req.query[key])) {
      return res.status(400).json({
        success: false,
        message: 'محاولة إدخال رموز غير مسموحة. تم رصد النشاط.',
        code: 'SQL_INJECTION_DETECTED'
      });
    }
  }
  
  // Check body parameters
  for (const key in req.body) {
    if (checkValue(req.body[key])) {
      return res.status(400).json({
        success: false,
        message: 'محاولة إدخال رموز غير مسموحة. تم رصد النشاط.',
        code: 'SQL_INJECTION_DETECTED'
      });
    }
  }
  
  next();
};

export default {
  securityHeaders,
  apiLimiter,
  adminLimiter,
  loginLimiter,
  generateCsrfToken,
  verifyCsrfToken,
  validateProduct,
  validateLogin,
  validateReview,
  checkValidation,
  ipWhitelist,
  auditLog,
  xssProtection,
  sqlInjectionProtection
};
