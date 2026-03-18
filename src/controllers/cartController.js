import supabase from '../config/supabase.js';

/**
 * Sync cart - Compare frontend cart with database prices and availability
 * GET /api/cart/sync
 * Body: { productIds: [1, 2, 3] }
 */
export const syncCart = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs are required'
      });
    }

    // Fetch current prices and stock from database
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, price, stock_quantity, category, image_url')
      .in('id', productIds);

    if (error) {
      console.error('Error fetching products for sync:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to sync cart',
        error: error.message
      });
    }

    // Build response with current data
    const syncedProducts = products.map(product => ({
      id: product.id,
      title: product.title,
      price: product.price,
      stockQuantity: product.stock_quantity,
      category: product.category,
      imageUrl: product.image_url,
      isAvailable: product.stock_quantity > 0
    }));

    res.json({
      success: true,
      data: {
        products: syncedProducts,
        syncedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in syncCart:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Clean up abandoned orders (for cron job)
 * DELETE /api/cart/cleanup
 * Admin only - removes orders older than 1 hour with status PENDING
 */
export const cleanupAbandonedOrders = async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Find abandoned PENDING orders older than 1 hour
    const { data: abandonedOrders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        order_items (
          id,
          product_id,
          quantity
        )
      `)
      .eq('status', 'PENDING')
      .lt('created_at', oneHourAgo);

    if (fetchError) {
      console.error('Error fetching abandoned orders:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch abandoned orders',
        error: fetchError.message
      });
    }

    if (!abandonedOrders || abandonedOrders.length === 0) {
      return res.json({
        success: true,
        message: 'No abandoned orders found',
        data: {
          deletedCount: 0
        }
      });
    }

    // Restore stock for each abandoned order
    const stockRestorePromises = [];
    
    for (const order of abandonedOrders) {
      for (const item of order.order_items) {
        stockRestorePromises.push(
          supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single()
            .then(({ data: product }) => {
              if (product) {
                return supabase
                  .from('products')
                  .update({ 
                    stock_quantity: product.stock_quantity + item.quantity 
                  })
                  .eq('id', item.product_id);
              }
            })
        );
      }
    }

    await Promise.all(stockRestorePromises);

    // Delete abandoned orders (cascade will delete order_items)
    const orderIds = abandonedOrders.map(order => order.id);
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .in('id', orderIds);

    if (deleteError) {
      console.error('Error deleting abandoned orders:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete abandoned orders',
        error: deleteError.message
      });
    }

    res.json({
      success: true,
      message: `Cleaned up ${abandonedOrders.length} abandoned orders`,
      data: {
        deletedCount: abandonedOrders.length,
        restoredProducts: stockRestorePromises.length
      }
    });

  } catch (error) {
    console.error('Error in cleanupAbandonedOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
