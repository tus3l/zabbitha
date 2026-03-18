import { supabase } from '../config/supabase.js';
import { generateToken, verifyToken } from '../utils/jwt.js';

/**
 * 🔄 تجديد JWT Token
 * يسمح بتجديد الـ token قبل انتهاء صلاحيته
 */
export const refreshToken = async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'لم يتم توفير token'
      });
    }

    const oldToken = authHeader.split(' ')[1];
    
    // Verify old token (even if expired, we can still decode it)
    let decoded;
    try {
      decoded = verifyToken(oldToken);
    } catch (error) {
      // إذا كان الـ token منتهي الصلاحية، حاول فك تشفيره بدون التحقق
      try {
        const base64Url = oldToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        decoded = JSON.parse(jsonPayload);
      } catch (decodeError) {
        return res.status(401).json({
          success: false,
          message: 'Token غير صالح'
        });
      }
    }

    // Get user ID from request body or decoded token
    const userId = req.body.userId || decoded.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب'
      });
    }

    // Fetch user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Generate new token
    const newToken = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'تم تجديد الجلسة بنجاح',
      data: {
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في تجديد الجلسة',
      error: error.message
    });
  }
};

/**
 * 🔍 التحقق من صلاحية Token
 * يتحقق من صلاحية الـ token ويرجع بيانات المستخدم
 */
export const verifyCurrentToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'لم يتم توفير token'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Fetch user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'الجلسة نشطة',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        expiresIn: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token غير صالح أو منتهي الصلاحية',
      error: error.message
    });
  }
};
