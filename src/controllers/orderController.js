import supabase from '../config/supabase.js';

// Get current user's orders
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch orders for the authenticated user
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        total_price,
        status,
        shipping_address,
        shipping_cost,
        total_weight,
        created_at,
        order_items (
          id,
          product_id,
          quantity,
          price,
          products (
            id,
            title,
            image_url,
            category
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching orders:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: error.message
      });
    }

    // Format the response
    const formattedOrders = orders.map(order => ({
      id: order.id,
      userId: order.user_id,
      totalPrice: order.total_price,
      status: order.status,
      shippingCost: order.shipping_cost || 50,
      totalWeight: order.total_weight,
      subtotal: order.total_price - (order.shipping_cost || 50),
      shippingAddress: typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address,
      createdAt: order.created_at,
      items: order.order_items.map(item => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        price: item.price,
        product: {
          id: item.products.id,
          title: item.products.title,
          imageUrl: item.products.image_url,
          category: item.products.category
        }
      }))
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        count: formattedOrders.length
      }
    });

  } catch (error) {
    console.error('Error in getMyOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get a specific order by ID (only if it belongs to the user)
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        total_price,
        status,
        shipping_address,
        shipping_cost,
        total_weight,
        created_at,
        order_items (
          id,
          product_id,
          quantity,
          price,
          products (
            id,
            title,
            image_url,
            category
          )
        )
      `)
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Format the response
    const formattedOrder = {
      id: order.id,
      userId: order.user_id,
      totalPrice: order.total_price,
      status: order.status,
      shippingCost: order.shipping_cost || 50,
      totalWeight: order.total_weight,
      subtotal: order.total_price - (order.shipping_cost || 50),
      shippingAddress: typeof order.shipping_address === 'string' 
        ? JSON.parse(order.shipping_address) 
        : order.shipping_address,
      createdAt: order.created_at,
      items: order.order_items.map(item => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        price: item.price,
        product: {
          id: item.products.id,
          title: item.products.title,
          imageUrl: item.products.image_url,
          category: item.products.category
        }
      }))
    };

    res.json({
      success: true,
      data: {
        order: formattedOrder
      }
    });

  } catch (error) {
    console.error('Error in getOrderById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Create a new order (from checkout)
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, shippingAddress, totalPrice, shippingCost, totalWeight } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is incomplete'
      });
    }

    if (!totalPrice || totalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid total price'
      });
    }

    // ==================== CRITICAL: SECURITY & RACE CONDITION PREVENTION ====================
    // Step 1: Extract all product IDs from cart
    const productIds = items.map(item => item.productId);

    // Step 2: Query current stock_quantity AND PRICE for all products (NEVER TRUST FRONTEND PRICES)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, stock_quantity, price, category')
      .in('id', productIds);

    if (productsError) {
      console.error('Error fetching product stock:', productsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify product availability',
        error: productsError.message
      });
    }

    // Step 3: Build product map and verify prices from database
    const stockMap = {};
    let serverCalculatedSubtotal = 0;
    
    products.forEach(product => {
      stockMap[product.id] = {
        title: product.title,
        currentStock: product.stock_quantity,
        authenticPrice: product.price, // Real price from database
        category: product.category
      };
    });

    // CRITICAL SECURITY: Calculate total based on DATABASE prices, not frontend payload
    for (const item of items) {
      const product = stockMap[item.productId];
      if (product) {
        serverCalculatedSubtotal += product.authenticPrice * item.quantity;
      }
    }

    const serverCalculatedTotal = serverCalculatedSubtotal + (shippingCost || 50);

    // Security check: Verify frontend total matches server calculation (allow 1 SAR tolerance for rounding)
    if (Math.abs(totalPrice - serverCalculatedTotal) > 1) {
      console.error(`Price tampering detected! Frontend: ${totalPrice}, Server: ${serverCalculatedTotal}`);
      return res.status(400).json({
        success: false,
        message: 'خطأ في حساب الإجمالي. الرجاء إعادة تحديث السلة.',
        priceMismatch: true,
        expectedTotal: serverCalculatedTotal
      });
    }

    // Validate stock for each item in the cart
    for (const item of items) {
      const product = stockMap[item.productId];
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `المنتج غير موجود`,
          outOfStockProduct: { id: item.productId }
        });
      }

      if (product.currentStock < item.quantity) {
        // Out of stock - return 409 Conflict
        return res.status(409).json({
          success: false,
          message: `عذراً، المنتج "${product.title}" نفدت كميته للتو من قبل عميل آخر.`,
          outOfStockProduct: {
            id: item.productId,
            title: product.title,
            requestedQuantity: item.quantity,
            availableStock: product.currentStock
          }
        });
      }
    }

    // Step 4: Atomically decrement stock_quantity for all products
    // Using atomic UPDATE with WHERE condition to prevent overselling
    const stockUpdatePromises = items.map(async (item) => {
      const product = stockMap[item.productId];
      const newStock = product.currentStock - item.quantity;

      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStock
        })
        .eq('id', item.productId)
        .eq('stock_quantity', product.currentStock) // Optimistic locking: only update if stock hasn't changed
        .select('id, stock_quantity');

      if (updateError) {
        throw new Error(`Failed to update stock for product ${item.productId}: ${updateError.message}`);
      }

      // If no rows were updated, it means stock was changed by another transaction (race condition)
      if (!updatedProduct || updatedProduct.length === 0) {
        throw new Error(`RACE_CONDITION:${product.title}`);
      }

      return updatedProduct;
    });

    try {
      await Promise.all(stockUpdatePromises);
    } catch (stockError) {
      // Race condition detected - another customer bought the last items
      if (stockError.message.startsWith('RACE_CONDITION:')) {
        const productTitle = stockError.message.split(':')[1];
        return res.status(409).json({
          success: false,
          message: `عذراً، المنتج "${productTitle}" نفدت كميته للتو من قبل عميل آخر.`,
          raceConditionDetected: true
        });
      }
      
      // Other stock update errors
      console.error('Error updating stock:', stockError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product inventory',
        error: stockError.message
      });
    }

    // Step 5: Create the order (stock has been successfully decremented)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total_price: serverCalculatedTotal, // Use server-calculated total
        status: 'PENDING',
        shipping_address: JSON.stringify(shippingAddress),
        shipping_cost: shippingCost || 50,
        total_weight: totalWeight || 0
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      
      // Rollback: Restore stock quantities
      const rollbackPromises = items.map(async (item) => {
        // Fetch current stock after decrement
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single();
        
        if (currentProduct) {
          // Add back the quantity
          return supabase
            .from('products')
            .update({ 
              stock_quantity: currentProduct.stock_quantity + item.quantity
            })
            .eq('id', item.productId);
        }
      });
      await Promise.all(rollbackPromises);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: orderError.message
      });
    }

    // Step 6: Create order items (USE DATABASE PRICES, NOT FRONTEND PRICES)
    const orderItems = items.map(item => {
      const product = stockMap[item.productId];
      return {
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: product.authenticPrice // Use authentic price from database
      };
    });

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      
      // Rollback: Delete the order and restore stock
      await supabase.from('orders').delete().eq('id', order.id);
      
      const rollbackPromises = items.map(async (item) => {
        // Fetch current stock after decrement
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single();
        
        if (currentProduct) {
          // Add back the quantity
          return supabase
            .from('products')
            .update({ 
              stock_quantity: currentProduct.stock_quantity + item.quantity
            })
            .eq('id', item.productId);
        }
      });
      await Promise.all(rollbackPromises);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create order items',
        error: itemsError.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.id,
        totalPrice: order.total_price,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
