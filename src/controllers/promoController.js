import supabase from '../config/supabase.js';

/**
 * Validate and apply promo code
 * POST /api/promo/validate
 */
export const validatePromoCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'كود الخصم مطلوب'
      });
    }

    const codeUpper = code.trim().toUpperCase();

    // Fetch promo code from database
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code_string', codeUpper)
      .single();

    if (error || !promoCode) {
      return res.status(404).json({
        success: false,
        message: 'كود الخصم غير صحيح'
      });
    }

    // Validation checks
    const now = new Date();

    // Check if active
    if (!promoCode.is_active) {
      return res.status(400).json({
        success: false,
        message: 'كود الخصم غير متوفر'
      });
    }

    // Check expiration
    if (promoCode.expires_at && new Date(promoCode.expires_at) < now) {
      return res.status(400).json({
        success: false,
        message: 'كود الخصم منتهي الصلاحية'
      });
    }

    // Check max uses
    if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
      return res.status(400).json({
        success: false,
        message: 'تم استخدام هذا الكود بالكامل'
      });
    }

    // Promo code is valid
    res.json({
      success: true,
      message: 'تم تطبيق كود الخصم بنجاح',
      data: {
        code: promoCode.code_string,
        discountPercentage: promoCode.discount_percentage,
        id: promoCode.id
      }
    });

  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من كود الخصم'
    });
  }
};

/**
 * Increment promo code usage
 * POST /api/promo/use/:id
 */
export const usePromoCode = async (req, res) => {
  try {
    const { id } = req.params;

    // Increment current_uses
    const { data, error } = await supabase
      .from('promo_codes')
      .update({ 
        current_uses: supabase.raw('current_uses + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error incrementing promo code usage:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update promo code usage'
      });
    }

    res.json({
      success: true,
      data: {
        currentUses: data.current_uses
      }
    });

  } catch (error) {
    console.error('Error using promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get all promo codes (admin only)
 * GET /api/promo/all
 */
export const getAllPromoCodes = async (req, res) => {
  try {
    const { data: promoCodes, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promo codes:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch promo codes'
      });
    }

    res.json({
      success: true,
      data: {
        promoCodes,
        count: promoCodes.length
      }
    });

  } catch (error) {
    console.error('Error in getAllPromoCodes:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
