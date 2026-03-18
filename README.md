# 🛍️ Zabbitha | زبّطها

منصة تجارة إلكترونية متكاملة لبيع إكسسوارات السيارات والسيت أب

## 🌟 المميزات

### للعملاء
- 🚗 **قسمين رئيسيين**: إكسسوارات السيارات و إكسسوارات السيت أب
- 🔍 **بحث ذكي**: محرك بحث متقدم للمنتجات
- 🛒 **سلة تسوق**: إدارة المشتريات بسهولة
- ❤️ **قائمة الأمنيات**: حفظ المنتجات المفضلة
- 👤 **حساب شخصي**: إدارة الملف الشخصي والطلبات
- 📦 **تتبع الطلبات**: متابعة حالة الطلبات

### للإدارة
- 🔐 **لوحة تحكم آمنة**: لوحة تحكم محمية بمسار مخفي
- 📊 **تحليلات متقدمة**: إحصائيات المبيعات والمنتجات
- ✏️ **إدارة المنتجات**: إضافة، تعديل، وحذف المنتجات
- 👥 **إدارة المستخدمين**: عرض وإدارة المستخدمين
- 📋 **إدارة الطلبات**: متابعة ومعالجة الطلبات
- ⭐ **إدارة التقييمات**: الموافقة على التقييمات

## 🔒 الأمان

- ✅ JWT Authentication مع انتهاء صلاحية
- ✅ CSRF Protection
- ✅ Rate Limiting
- ✅ Input Validation & Sanitization
- ✅ منع الوصول للصفحات المحمية بعد تسجيل الخروج
- ✅ منع Duplicate Email/Phone
- ✅ Password Hashing (bcrypt)
- ✅ Audit Logging لعمليات الإدارة

## 🛠️ التقنيات المستخدمة

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Responsive Design
- RTL Support (دعم العربية)
- Modern UI/UX

### Backend
- Node.js + Express.js
- Supabase (PostgreSQL)
- JWT Authentication
- RESTful API

### الأمان
- bcryptjs
- express-rate-limit
- express-validator
- helmet
- cors

## 📋 المتطلبات

- Node.js (v14 أو أحدث)
- Supabase Account
- npm أو yarn

## 🚀 التثبيت والتشغيل

### 1. استنساخ المشروع
```bash
git clone https://github.com/tus3l/zabbitha.git
cd zabbitha
```

### 2. تثبيت المكتبات
```bash
npm install
```

### 3. إعداد البيئة
أنشئ ملف `.env` وأضف:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Secret
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Server Port
PORT=3000

# reCAPTCHA (Optional)
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
```

### 4. إعداد قاعدة البيانات
نفّذ السكريبت `database-complete.sql` في Supabase SQL Editor

### 5. تشغيل الخادم
```bash
# Development
npm start

# في terminal آخر، شغل Frontend server
npx http-server -p 5500
```

### 6. الوصول للموقع
- **الموقع الرئيسي**: http://localhost:5500/index.html
- **تسجيل الدخول**: http://localhost:5500/login.html
- **لوحة التحكم**: http://localhost:5500/sys-mgmt-3x7k9p.html

## 👨‍💼 إنشاء حساب Admin

```bash
node create-admin.js
```

أو يدوياً عبر Supabase:
```sql
UPDATE users 
SET role = 'ADMIN' 
WHERE email = 'your@email.com';
```

## 📁 هيكل المشروع

```
zabbitha/
├── src/
│   ├── controllers/     # Business Logic
│   ├── routes/          # API Routes
│   ├── middleware/      # Auth, Security, Validation
│   ├── config/          # Configurations
│   └── utils/           # Helper Functions
├── js/                  # Frontend JavaScript
├── img/                 # Images & Media
├── *.html              # Frontend Pages
└── styles.css          # Global Styles
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول
- `GET /api/auth/me` - بيانات المستخدم الحالي

### Products
- `GET /api/products` - جميع المنتجات
- `GET /api/products/:id` - منتج محدد
- `POST /api/core-sys-v2/products` - إضافة منتج (Admin)
- `PUT /api/core-sys-v2/products/:id` - تعديل منتج (Admin)
- `DELETE /api/core-sys-v2/products/:id` - حذف منتج (Admin)

### Orders
- `GET /api/orders` - طلبات المستخدم
- `POST /api/orders` - إنشاء طلب جديد
- `GET /api/core-sys-v2/orders` - جميع الطلبات (Admin)

### Admin
- `GET /api/core-sys-v2/analytics` - إحصائيات Dashboard
- `GET /api/core-sys-v2/users` - جميع المستخدمين

## 🎨 الصفحات

- `index.html` - الصفحة الرئيسية
- `login.html` - تسجيل الدخول / التسجيل
- `cars.html` - إكسسوارات السيارات
- `setup.html` - إكسسوارات السيت أب
- `cart.html` - سلة التسوق
- `profile.html` - الملف الشخصي
- `orders.html` - الطلبات
- `sys-mgmt-3x7k9p.html` - لوحة التحكم (Admin)

## 🐛 استكشاف الأخطاء

### خطأ في الاتصال بـ Supabase
تأكد من صحة `SUPABASE_URL` و `SUPABASE_ANON_KEY` في `.env`

### خطأ Port in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac  
lsof -ti:3000 | xargs kill -9
```

### مشاكل في التوكن
امسح Local Storage من Dev Tools → Application → Local Storage

## 📝 الترخيص

MIT License

## 👨‍💻 المطور

Developed with ❤️ for Zabbitha

## 🤝 المساهمة

المساهمات مرحب بها! يرجى فتح Issue أو Pull Request.

---

⭐ إذا أعجبك المشروع، لا تنسى النجمة!
