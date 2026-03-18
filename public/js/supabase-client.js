// ملف إعداد Supabase للـ Frontend (Vanilla JavaScript)
// استخدم هذا الملف في صفحات HTML الخاصة بك

// تأكد من تحميل مكتبة Supabase أولاً:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// إعداد Supabase Client
const supabaseUrl = 'https://xxgegredhoqgtiybgyfh.supabase.co';
const supabaseAnonKey = 'sb_publishable_IcQTs9kbWYTirz_CXYrfZg_rPM_mv1v';

// إنشاء Supabase client
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// مثال: دالة لجلب المنتجات
async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) {
    console.error('Error fetching products:', error);
    return null;
  }
  
  return data;
}

// مثال: دالة لتسجيل دخول المستخدم
async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Login error:', error);
    return null;
  }
  
  return data;
}

// مثال: دالة للحصول على المستخدم الحالي
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// مثال: دالة لتسجيل الخروج
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Logout error:', error);
  }
}

// تصدير للاستخدام
window.supabaseClient = supabase;
window.supabaseFunctions = {
  getProducts,
  signInWithEmail,
  getCurrentUser,
  signOut
};

console.log('✅ Supabase Frontend Client initialized');
