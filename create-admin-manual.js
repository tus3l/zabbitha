import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminManual() {
  try {
    console.log('🔐 Generating bcrypt hash for Admin@123...\n');

    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('✅ Hash generated successfully!\n');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📋 Copy this SQL and run it in Supabase SQL Editor:');
    console.log('════════════════════════════════════════════════════════════════\n');

    console.log(`INSERT INTO users (name, email, password, phone, role)
VALUES (
  'Admin',
  'admin@zabbitha.com',
  '${hashedPassword}',
  '0500000000',
  'ADMIN'
);`);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('\n📝 Steps:');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste the SQL above');
    console.log('5. Click "Run"');
    console.log('\n🔑 Admin Login Credentials:');
    console.log('   Email: admin@zabbitha.com');
    console.log('   Password: Admin@123\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAdminManual();
