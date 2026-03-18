import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware to verify Google reCAPTCHA v2
 * DISABLED IN DEVELOPMENT MODE - Always bypasses verification
 * To enable in production, set ENABLE_RECAPTCHA=true in .env
 */
export const verifyRecaptcha = async (req, res, next) => {
  try {
    // Check if reCAPTCHA is enabled (default: disabled in development)
    const enableRecaptcha = process.env.ENABLE_RECAPTCHA === 'true';
    
    if (!enableRecaptcha) {
      console.log('⚠️  reCAPTCHA disabled (Development mode)');
      next();
      return;
    }

    const recaptchaResponse = req.body.recaptchaToken;

    // Check if reCAPTCHA token is provided
    if (!recaptchaResponse) {
      return res.status(400).json({
        success: false,
        message: 'يرجى التحقق من reCAPTCHA'
      });
    }

    // Verify with Google
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify`;

    const response = await axios.post(verificationURL, null, {
      params: {
        secret: secretKey,
        response: recaptchaResponse
      }
    });

    const { success, score } = response.data;

    // Check if verification was successful
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'فشل التحقق من reCAPTCHA. يرجى المحاولة مرة أخرى.'
      });
    }

    // For reCAPTCHA v3, check score (not needed for v2, but added for future compatibility)
    if (score !== undefined && score < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'فشل التحقق من reCAPTCHA. يرجى المحاولة مرة أخرى.'
      });
    }

    // reCAPTCHA verified successfully, proceed to next middleware
    next();
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من reCAPTCHA'
    });
  }
};

export default verifyRecaptcha;
