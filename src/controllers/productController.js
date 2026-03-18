import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Get all products (Public - No auth required)
 * GET /api/products
 * Query params: ?category=CARS or ?category=SETUP
 */
export const getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('products')
      .select('id, title, category, image_url, weight, created_at')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category.toUpperCase());
    }

    const { data: products, error } = await query;

    if (error) throw error;

    // Map to camelCase
    const formattedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      imageUrl: p.image_url,
      weight: p.weight,
      createdAt: p.created_at
    }));

    res.status(200).json({
      success: true,
      count: formattedProducts.length,
      data: { products: formattedProducts }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

/**
 * Get products by category (Public - No auth required)
 * GET /api/products/category/:category
 */
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, category, image_url, weight, created_at')
      .eq('category', category.toUpperCase())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to camelCase
    const formattedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      imageUrl: p.image_url,
      weight: p.weight,
      createdAt: p.created_at
    }));

    res.status(200).json({
      success: true,
      count: formattedProducts.length,
      data: { products: formattedProducts }
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

/**
 * Get single product details (PROTECTED - Auth required)
 * GET /api/products/:id
 * This route requires authentication via requireAuth middleware
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Map to camelCase
    const formattedProduct = {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      imageUrl: product.image_url,
      stockQuantity: product.stock_quantity,
      createdAt: product.created_at
    };

    res.status(200).json({
      success: true,
      data: { product: formattedProduct }
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product details',
      error: error.message
    });
  }
};

/**
 * Create a new product (Admin only)
 * POST /api/products
 */
export const createProduct = async (req, res) => {
  try {
    const { title, description, price, category, imageUrl, stockQuantity, weight } = req.body;

    // Validate input
    if (!title || !description || !price || !category || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال جميع الحقول المطلوبة'
      });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        title,
        description,
        price: parseFloat(price),
        category: category.toUpperCase(),
        image_url: imageUrl,
        stock_quantity: stockQuantity || 0,
        weight: weight ? parseFloat(weight) : 1.0
      }])
      .select()
      .single();

    if (error) throw error;

    // Map to camelCase
    const formattedProduct = {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      imageUrl: product.image_url,
      stockQuantity: product.stock_quantity,
      weight: product.weight,
      createdAt: product.created_at
    };

    res.status(201).json({
      success: true,
      message: 'تم إضافة المنتج بنجاح',
      data: { product: formattedProduct }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

/**
 * Update a product (Admin only)
 * PUT /api/products/:id
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, category, imageUrl, stockQuantity } = req.body;

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Prepare update data
    const updateData = {
      title: title || existingProduct.title,
      description: description || existingProduct.description,
      price: price ? parseFloat(price) : existingProduct.price,
      category: category ? category.toUpperCase() : existingProduct.category,
      image_url: imageUrl || existingProduct.image_url,
      stock_quantity: stockQuantity !== undefined ? parseInt(stockQuantity) : existingProduct.stock_quantity
    };

    // Update product
    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Map to camelCase
    const formattedProduct = {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      imageUrl: product.image_url,
      stockQuantity: product.stock_quantity,
      createdAt: product.created_at
    };

    res.status(200).json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      data: { product: formattedProduct }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

/**
 * Delete a product (Admin only)
 * DELETE /api/products/:id
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'تم حذف المنتج بنجاح'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

/**
 * Search products by title or category
 * GET /api/products/search?q=query
 */
export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال حرفين على الأقل للبحث'
      });
    }

    const searchQuery = q.trim();

    // Search in title and category using ILIKE (case-insensitive)
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, price, image_url, category, stock_quantity')
      .or(`title.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
      .limit(8);

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    // Format response
    const formattedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      imageUrl: p.image_url,
      category: p.category,
      stockQuantity: p.stock_quantity,
      isAvailable: p.stock_quantity > 0
    }));

    res.json({
      success: true,
      data: {
        products: formattedProducts,
        count: formattedProducts.length
      }
    });

  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء البحث'
    });
  }
};
