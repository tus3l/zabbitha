/**
 * 🔐 نظام حماية وإدارة الجلسات المتقدم
 * يحل مشاكل انتهاء الجلسة المفاجئ ويوفر حماية قوية
 */

const AUTH_CONFIG = {
    TOKEN_KEY: 'token',
    USER_KEY: 'user',
    TOKEN_TIMESTAMP_KEY: 'token_timestamp',
    REFRESH_INTERVAL: 30 * 60 * 1000, // تجديد كل 30 دقيقة
    WARNING_TIME: 5 * 60 * 1000, // تحذير قبل 5 دقائق
    MAX_RETRY: 3,
    API_BASE: 'http://localhost:3000/api'
};

class AuthGuard {
    constructor() {
        this.refreshTimer = null;
        this.warningTimer = null;
        this.retryCount = 0;
        this.isRefreshing = false;
        this.init();
    }

    /**
     * تهيئة نظام الحماية
     */
    init() {
        // فحص الجلسة عند تحميل الصفحة
        this.checkSession();
        
        // مراقبة نشاط المستخدم
        this.setupActivityMonitor();
        
        // بدء مؤقت التجديد التلقائي
        this.startAutoRefresh();
        
        // مراقبة تغييرات localStorage من تابات أخرى
        this.setupStorageListener();
    }

    /**
     * فحص صلاحية الجلسة
     */
    checkSession() {
        const token = this.getToken();
        const user = this.getUser();
        const timestamp = localStorage.getItem(AUTH_CONFIG.TOKEN_TIMESTAMP_KEY);

        // لا يوجد token
        if (!token) {
            this.redirectToLogin('لا توجد جلسة نشطة');
            return false;
        }

        // لا يوجد user data
        if (!user || !user.id) {
            this.redirectToLogin('بيانات المستخدم غير موجودة');
            return false;
        }

        // فحص صلاحية الـ JWT
        if (!this.isTokenValid(token)) {
            this.handleExpiredToken();
            return false;
        }

        // فحص العمر الزمني للـ token
        if (timestamp) {
            const tokenAge = Date.now() - parseInt(timestamp);
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 أيام
            
            if (tokenAge > maxAge) {
                this.redirectToLogin('انتهت صلاحية الجلسة');
                return false;
            }
        }

        return true;
    }

    /**
     * فحص صلاحية JWT token
     */
    isTokenValid(token) {
        try {
            // فك تشفير JWT (بدون التحقق من التوقيع - سيتم في السيرفر)
            const payload = this.parseJwt(token);
            
            if (!payload || !payload.exp) {
                return false;
            }

            // فحص وقت الانتهاء
            const expirationTime = payload.exp * 1000; // تحويل إلى milliseconds
            const currentTime = Date.now();
            
            // إضافة buffer 5 دقائق
            return expirationTime > (currentTime + 5 * 60 * 1000);
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    /**
     * فك تشفير JWT token
     */
    parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            return null;
        }
    }

    /**
     * معالجة انتهاء صلاحية الـ token
     */
    async handleExpiredToken() {
        // محاولة تجديد الـ token
        const refreshed = await this.refreshToken();
        
        if (!refreshed) {
            this.redirectToLogin('انتهت صلاحية الجلسة');
        }
    }

    /**
     * تجديد الـ token
     */
    async refreshToken() {
        // تجنب محاولات التجديد المتزامنة
        if (this.isRefreshing) {
            return false;
        }

        this.isRefreshing = true;

        try {
            const token = this.getToken();
            const user = this.getUser();

            if (!token || !user) {
                return false;
            }

            const response = await fetch(`${AUTH_CONFIG.API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.id })
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.data.token) {
                    this.setToken(data.data.token);
                    this.retryCount = 0;
                    console.log('✅ تم تجديد الجلسة بنجاح');
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('خطأ في تجديد الجلسة:', error);
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * بدء التجديد التلقائي
     */
    startAutoRefresh() {
        // إلغاء أي مؤقت سابق
        this.stopAutoRefresh();

        // تجديد تلقائي كل 30 دقيقة
        this.refreshTimer = setInterval(() => {
            if (this.checkSession()) {
                this.refreshToken();
            }
        }, AUTH_CONFIG.REFRESH_INTERVAL);
    }

    /**
     * إيقاف التجديد التلقائي
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * مراقبة نشاط المستخدم
     */
    setupActivityMonitor() {
        let activityTimeout;
        const resetActivity = () => {
            clearTimeout(activityTimeout);
            
            // تجديد timestamp
            localStorage.setItem('last_activity', Date.now().toString());
            
            // إعادة تعيين مؤقت الخمول (60 دقيقة)
            activityTimeout = setTimeout(() => {
                this.showIdleWarning();
            }, 60 * 60 * 1000);
        };

        // رصد النشاط
        ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetActivity, true);
        });

        resetActivity();
    }

    /**
     * عرض تحذير الخمول
     */
    showIdleWarning() {
        const shouldContinue = confirm('⏰ جلستك خاملة منذ فترة. هل تريد الاستمرار؟');
        
        if (shouldContinue) {
            this.refreshToken();
        } else {
            this.logout();
        }
    }

    /**
     * مراقبة تغييرات localStorage (للتزامن بين التابات)
     */
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === AUTH_CONFIG.TOKEN_KEY && !e.newValue) {
                // تم حذف الـ token من تاب آخر
                window.location.href = 'login.html';
            }
        });
    }

    /**
     * إضافة interceptor لجميع الطلبات
     */
    async fetchWithAuth(url, options = {}) {
        // التحقق من الجلسة قبل كل طلب
        if (!this.checkSession()) {
            throw new Error('جلسة غير صالحة');
        }

        const token = this.getToken();
        
        // إضافة Authorization header
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        try {
            const response = await fetch(url, { ...options, headers });

            // معالجة 401 (Unauthorized)
            if (response.status === 401) {
                // محاولة تجديد الـ token
                const refreshed = await this.refreshToken();
                
                if (refreshed) {
                    // إعادة المحاولة بعد التجديد
                    const newToken = this.getToken();
                    headers['Authorization'] = `Bearer ${newToken}`;
                    return await fetch(url, { ...options, headers });
                } else {
                    this.redirectToLogin('انتهت صلاحية الجلسة');
                    throw new Error('Session expired');
                }
            }

            return response;
        } catch (error) {
            // معالجة أخطاء الشبكة
            if (this.retryCount < AUTH_CONFIG.MAX_RETRY) {
                this.retryCount++;
                console.log(`🔄 إعادة المحاولة ${this.retryCount}/${AUTH_CONFIG.MAX_RETRY}`);
                await this.delay(1000 * this.retryCount);
                return this.fetchWithAuth(url, options);
            }
            
            throw error;
        }
    }

    /**
     * التحقق من صلاحيات الأدمن
     */
    requireAdmin() {
        if (!this.checkSession()) {
            return false;
        }

        const user = this.getUser();
        
        if (user.role !== 'ADMIN') {
            alert('⛔ ليس لديك صلاحية للوصول إلى هذه الصفحة');
            window.location.href = 'index.html';
            return false;
        }

        return true;
    }

    /**
     * الحصول على الـ token
     */
    getToken() {
        return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    }

    /**
     * حفظ الـ token
     */
    setToken(token) {
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
        localStorage.setItem(AUTH_CONFIG.TOKEN_TIMESTAMP_KEY, Date.now().toString());
    }

    /**
     * الحصول على بيانات المستخدم
     */
    getUser() {
        try {
            const userStr = localStorage.getItem(AUTH_CONFIG.USER_KEY);
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }

    /**
     * تسجيل الخروج
     */
    logout() {
        this.stopAutoRefresh();
        localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
        localStorage.removeItem(AUTH_CONFIG.USER_KEY);
        localStorage.removeItem(AUTH_CONFIG.TOKEN_TIMESTAMP_KEY);
        localStorage.removeItem('last_activity');
        window.location.href = 'login.html';
    }

    /**
     * إعادة التوجيه لصفحة تسجيل الدخول
     */
    redirectToLogin(message = '') {
        this.stopAutoRefresh();
        localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
        localStorage.removeItem(AUTH_CONFIG.USER_KEY);
        localStorage.removeItem(AUTH_CONFIG.TOKEN_TIMESTAMP_KEY);
        
        if (message) {
            sessionStorage.setItem('login_message', message);
        }
        
        window.location.href = 'login.html';
    }

    /**
     * تأخير (utility)
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// إنشاء instance واحد
const authGuard = new AuthGuard();

// تصدير للاستخدام العام
window.authGuard = authGuard;
