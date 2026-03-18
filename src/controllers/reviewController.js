import supabase from '../config/supabase.js';

// Create a new review (with purchase verification)
export const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, rating, comment } = req.body;

    // Validate input
    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, rating, and comment are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be at least 10 characters long'
      });
    }

    // CRITICAL: Verify that user has purchased and received this product
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        order_items!inner (
          product_id
        )
      `)
      .eq('user_id', userId)
      .eq('order_items.product_id', productId)
      .eq('status', 'DELIVERED');

    if (orderError) {
      console.error('Error checking purchase history:', orderError);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify purchase history',
        error: orderError.message
      });
    }

    if (!orders || orders.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must purchase and receive this product before reviewing it.'
      });
    }

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: userId,
        product_id: productId,
        rating: parseInt(rating),
        comment: comment.trim(),
        is_approved: false // Requires admin approval
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Error creating review:', reviewError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create review',
        error: reviewError.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be published after moderation.',
      data: {
        reviewId: review.id
      }
    });

  } catch (error) {
    console.error('Error in createReview:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get approved reviews for a specific product
export const getProductReviews = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Fetch approved reviews with user information
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        users (
          id,
          name,
          email
        )
      `)
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reviews',
        error: error.message
      });
    }

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : 0;

    // Format reviews
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
      user: {
        id: review.users.id,
        name: review.users.name,
        // Hide email for privacy
        email: review.users.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      }
    }));

    res.json({
      success: true,
      data: {
        reviews: formattedReviews,
        averageRating: parseFloat(averageRating),
        totalReviews: reviews.length
      }
    });

  } catch (error) {
    console.error('Error in getProductReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Check if user can review a product
export const checkReviewEligibility = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    // Check if user has purchased and received this product
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        order_items!inner (
          product_id
        )
      `)
      .eq('user_id', userId)
      .eq('order_items.product_id', productId)
      .eq('status', 'DELIVERED');

    const hasPurchased = orders && orders.length > 0;

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    const hasReviewed = !!existingReview;

    res.json({
      success: true,
      data: {
        canReview: hasPurchased && !hasReviewed,
        hasPurchased,
        hasReviewed
      }
    });

  } catch (error) {
    console.error('Error in checkReviewEligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Get all reviews (including pending ones)
export const getAllReviews = async (req, res) => {
  try {
    const { status } = req.query; // 'pending', 'approved', or 'all'

    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        is_approved,
        created_at,
        users (
          id,
          name,
          email
        ),
        products (
          id,
          title,
          image_url
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by approval status
    if (status === 'pending') {
      query = query.eq('is_approved', false);
    } else if (status === 'approved') {
      query = query.eq('is_approved', true);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Error fetching all reviews:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reviews',
        error: error.message
      });
    }

    // Format reviews
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      isApproved: review.is_approved,
      createdAt: review.created_at,
      user: {
        id: review.users.id,
        name: review.users.name,
        email: review.users.email
      },
      product: {
        id: review.products.id,
        title: review.products.title,
        imageUrl: review.products.image_url
      }
    }));

    res.json({
      success: true,
      data: {
        reviews: formattedReviews,
        count: formattedReviews.length
      }
    });

  } catch (error) {
    console.error('Error in getAllReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Approve or reject a review
export const updateReviewStatus = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { isApproved } = req.body;

    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isApproved must be a boolean value'
      });
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .update({ is_approved: isApproved })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) {
      console.error('Error updating review status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update review status',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: `Review ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: {
        reviewId: review.id,
        isApproved: review.is_approved
      }
    });

  } catch (error) {
    console.error('Error in updateReviewStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Delete a review
export const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      console.error('Error deleting review:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete review',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteReview:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
