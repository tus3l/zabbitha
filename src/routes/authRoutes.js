import express from 'express';
import { register, login, getCurrentUser } from '../controllers/authController.js';
import { refreshToken, verifyCurrentToken } from '../controllers/authRefreshController.js';
import { requireAuth } from '../middleware/auth.js';
import { verifyRecaptcha } from '../middleware/recaptcha.js';

const router = express.Router();

// Public routes (with reCAPTCHA verification)
router.post('/register', verifyRecaptcha, register);
router.post('/login', verifyRecaptcha, login);

// Protected routes
router.get('/me', requireAuth, getCurrentUser);

// Token management routes (لتجديد والتحقق من الـ token)
router.post('/refresh', refreshToken); // تجديد الـ token
router.get('/verify', verifyCurrentToken); // التحقق من صلاحية الـ token

export default router;
