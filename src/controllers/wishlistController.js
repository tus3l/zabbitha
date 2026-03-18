import supabase from '../config/supabase.js';

/**
 * Add product to wishlist
 * POST /api/wishlist
 */
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المنتج مطلوب'
      });
    }

    // Check if already in wishlist
    const { data: existing } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'المنتج موجود بالفعل في المفضلة'
      });
    }

    // Add to wishlist
    const { data, error } = await supabase
      .from('wishlist')
      .insert({
        user_id: userId,
        product_id: productId
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding to wishlist:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل إضافة المنتج للمفضلة'
      });
    }

    res.status(201).json({
      success: true,
      message: 'تمت الإضافة للمفضلة بنجاح',
      data: {
        wishlistId: data.id
      }
    });

  } catch (error) {
    console.error('Error in addToWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ غير متوقع'
    });
  }
};

/**
 * Remove product from wishlist
 * DELETE /api/wishlist/:productId
 */
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing from wishlist:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل إزالة المنتج من المفضلة'
      });
    }

    res.json({
      success: true,
      message: 'تمت الإزالة من المفضلة'
    });

  } catch (error) {
    console.error('Error in removeFromWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ غير متوقع'
    });
  }
};

/**
 * Get user's wishlist
 * GET /api/wishlist
 */
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: wishlistItems, error } = await supabase
      .from('wishlist')
      .select(`
        id,
        product_id,
        created_at,
        products (
          id,
          title,
          price,
          image_url,
          category,
          stock_quantity
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wishlist:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل تحميل المفضلة'
      });
    }

    res.json({
      success: true,
      data: {
        wishlist: wishlistItems,
        count: wishlistItems.length
      }
    });

  } catch (error) {
    console.error('Error in getWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ غير متوقع'
    });
  }
};

/**
 * Check if product is in wishlist
 * GET /api/wishlist/check/:productId
 */
export const checkWishlistStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const { data } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    res.json({
      success: true,
      data: {
        inWishlist: !!data
      }
    });

  } catch (error) {
    res.json({
      success: true,
      data: {
        inWishlist: false
      }
    });
  }
};
