import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function makeAdmin() {
  try {
    // Get the email from command line argument, or use the latest user
    const email = process.argv[2];
    
    let result;
    
    if (email) {
      // Update specific email
      console.log(`\n🔄 جاري تحويل ${email} إلى ADMIN...\n`);
      
      result = await supabase
        .from('users')
        .update({ role: 'ADMIN' })
        .eq('email', email)
        .select();
    } else {
      // Update the most recent user
      console.log('\n🔄 جاري تحويل آخر مستخدم مسجل إلى ADMIN...\n');
      
      // Get the most recent user
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!users || users.length === 0) {
        console.log('❌ لا يوجد مستخدمين في قاعدة البيانات\n');
        return;
      }
      
      const latestUser = users[0];
      
      result = await supabase
        .from('users')
        .update({ role: 'ADMIN' })
        .eq('id', latestUser.id)
        .select();
    }

    if (result.error) {
      throw result.error;
    }

    if (result.data && result.data.length > 0) {
      const admin = result.data[0];
      console.log('✅ تم التحويل بنجاح!\n');
      console.log('📋 معلومات الأدمن:');
      console.log(`   الاسم: ${admin.name}`);
      console.log(`   الإيميل: ${admin.email}`);
      console.log(`   الصلاحية: ${admin.role}`);
      console.log('\n🎉 يمكنك الآن تسجيل الدخول والوصول إلى لوحة التحكم!\n');
    } else {
      console.log('❌ لم يتم العثور على المستخدم\n');
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

makeAdmin();
