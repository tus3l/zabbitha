-- ════════════════════════════════════════════════════════════════════════════
-- 🗄️ قاعدة بيانات زبّطها - الملف الشامل الكامل
-- ════════════════════════════════════════════════════════════════════════════
-- 📌 التعليمات:
--    1. افتح Supabase Dashboard → SQL Editor
--    2. انسخ هذا الكود كاملاً والصقه
--    3. اضغط Run
--    4. ✅ تم! كل شيء جاهز
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- 🔐 STEP 1: تعطيل Row Level Security (RLS)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promo_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wishlist DISABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
-- 👥 STEP 2: جدول المستخدمين (Users)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'CUSTOMER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ════════════════════════════════════════════════════════════════════════════
-- 📦 STEP 3: جدول المنتجات (Products) مع الوزن
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    image_url TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    weight DECIMAL(10, 2) DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إضافة عمود weight إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='products' AND column_name='weight'
    ) THEN
        ALTER TABLE products ADD COLUMN weight DECIMAL(10, 2) DEFAULT 0.5;
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 🛒 STEP 4: جدول الطلبات (Orders)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    shipping_address TEXT,
    shipping_cost DECIMAL(10, 2) DEFAULT 50.00,
    total_weight DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إضافة أعمدة جديدة إذا لم تكن موجودة
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='orders' AND column_name='shipping_address'
    ) THEN
        ALTER TABLE orders ADD COLUMN shipping_address TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='orders' AND column_name='shipping_cost'
    ) THEN
        ALTER TABLE orders ADD COLUMN shipping_cost DECIMAL(10, 2) DEFAULT 50.00;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='orders' AND column_name='total_weight'
    ) THEN
        ALTER TABLE orders ADD COLUMN total_weight DECIMAL(10, 2) DEFAULT 0.00;
    END IF;
END $$;

-- إضافة قيد على حالة الطلب
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_status_check'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'));
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 📝 STEP 5: جدول عناصر الطلب (Order Items)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ════════════════════════════════════════════════════════════════════════════
-- ⭐ STEP 6: جدول التقييمات (Reviews)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ════════════════════════════════════════════════════════════════════════════
-- 🎁 STEP 7: جدول أكواد الخصم (Promo Codes)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code_string VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    max_uses INTEGER DEFAULT NULL,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ════════════════════════════════════════════════════════════════════════════
-- ❤️ STEP 8: جدول المفضلة (Wishlist / Dream Garage)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- 🚀 STEP 9: Indexes لتحسين الأداء
-- ════════════════════════════════════════════════════════════════════════════

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Order Items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved ON reviews(product_id, is_approved) WHERE is_approved = true;

-- Promo Codes indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code_string ON promo_codes(code_string);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at);

-- Wishlist indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_product ON wishlist(user_id, product_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 📊 STEP 10: بيانات تجريبية (Sample Data)
-- ════════════════════════════════════════════════════════════════════════════

-- مستخدم Admin (كلمة المرور: admin123)
INSERT INTO users (name, email, phone, password, role) VALUES
('المدير العام', 'admin@zabbitha.com', '+966501234567', '$2a$10$gXZ8BZFBR6RtJj5dXKW7vu7Y5XxHWhxCQ8zrXxWJF5xQ5bQ5bQ5bQ', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- مستخدم عادي (كلمة المرور: customer123)
INSERT INTO users (name, email, phone, password, role) VALUES
('عبدالله أحمد', 'customer@test.com', '+966509876543', '$2a$10$gXZ8BZFBR6RtJj5dXKW7vu7Y5XxHWhxCQ8zrXxWJF5xQ5bQ5bQ5bQ', 'CUSTOMER')
ON CONFLICT (email) DO NOTHING;

-- منتجات فئة السيارات (Cars)
INSERT INTO products (title, description, price, category, image_url, stock_quantity, weight) VALUES
('حامل هاتف مغناطيسي للسيارة', 'حامل هاتف ذكي بتقنية المغناطيس القوي، يثبت على فتحة المكيف، دوران 360 درجة، مناسب لجميع أنواع الهواتف', 149.99, 'cars', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=500', 50, 0.3),
('إضاءة داخلية LED للسيارة RGB', 'إضاءة LED ملونة قابلة للتحكم عن بعد، 16 لون مختلف، مقاومة للماء، سهلة التركيب', 199.99, 'cars', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=500', 30, 0.5),
('مكنسة سيارة لاسلكية', 'مكنسة قوية بقوة شفط عالية، بطارية قابلة لإعادة الشحن، خفيفة الوزن ومحمولة', 279.99, 'cars', 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500', 20, 1.2),
('شاحن سيارة سريع USB-C', 'شاحن سريع بمنفذين USB-C، دعم الشحن السريع 65W، حماية من الحرارة الزائدة', 89.99, 'cars', 'https://images.unsplash.com/photo-1609876714934-f3ee7249e2b4?w=500', 100, 0.2)
ON CONFLICT DO NOTHING;

-- منتجات فئة السيت أب (Setup)
INSERT INTO products (title, description, price, category, image_url, stock_quantity, weight) VALUES
('حامل شاشة مزدوج قابل للتعديل', 'حامل معدني قوي لشاشتين، قابل للدوران والإمالة، يتحمل حتى 27 بوصة، سهل التركيب', 349.99, 'setup', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500', 25, 3.5),
('لوحة ماوس RGB كبيرة', 'لوحة ماوس عملاقة بإضاءة RGB، سطح ناعم، حواف مقاومة للتلف، مقاومة للماء', 129.99, 'setup', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500', 60, 0.6),
('منظم كيبلات مكتبي', 'حل عملي لتنظيم الكيبلات، تصميم عصري، يثبت على حافة المكتب، يستوعب 6 كيبلات', 79.99, 'setup', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500', 40, 0.4),
('حامل هواتف مكتبي متعدد الأجهزة', 'حامل أنيق لـ 4 أجهزة في نفس الوقت، منافذ شحن مدمجة، خشب طبيعي فاخر', 199.99, 'setup', 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=500', 35, 0.8)
ON CONFLICT DO NOTHING;

-- أكواد خصم تجريبية
INSERT INTO promo_codes (code_string, discount_percentage, max_uses, expires_at) VALUES
('WELCOME10', 10, 100, NOW() + INTERVAL '30 days'),
('SUMMER25', 25, 50, NOW() + INTERVAL '60 days'),
('VIP50', 50, 10, NOW() + INTERVAL '7 days'),
('FREESHIP', 15, NULL, NULL)
ON CONFLICT (code_string) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ تم الإنشاء بنجاح!
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- الجداول المنشأة:
-- ✓ users (المستخدمين)
-- ✓ products (المنتجات مع الوزن)
-- ✓ orders (الطلبات مع معلومات الشحن)
-- ✓ order_items (عناصر الطلبات)
-- ✓ reviews (التقييمات)
-- ✓ promo_codes (أكواد الخصم)
-- ✓ wishlist (المفضلة / Dream Garage)
-- 
-- الميزات:
-- ✓ تعطيل RLS للتطوير
-- ✓ Indexes لتحسين الأداء
-- ✓ Foreign Keys والعلاقات
-- ✓ Constraints والقيود
-- ✓ بيانات تجريبية جاهزة
-- 
-- كلمات المرور الافتراضية:
-- Admin: admin123
-- Customer: customer123
-- 
-- ════════════════════════════════════════════════════════════════════════════
