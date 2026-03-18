import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...\n');

    // Admin credentials
    const adminData = {
      name: 'Admin',
      email: 'admin@zabbitha.com',
      password: 'Admin@123',
      phone: '0500000000',
      role: 'ADMIN'
    };

    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminData.email }
    });

    if (existingUser) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email:', adminData.email);
      console.log('🔑 Password: Admin@123 (default)');
      console.log('\nℹ️  If you forgot the password, delete this user and run this script again.\n');
      await prisma.$disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Create admin user
    const newUser = await prisma.user.create({
      data: {
        name: adminData.name,
        email: adminData.email,
        password: hashedPassword,
        phone: adminData.phone,
        role: adminData.role
      }
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('════════════════════════════════════════');
    console.log('🔐 Admin Login Credentials:');
    console.log('════════════════════════════════════════');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('👤 Name:', newUser.name);
    console.log('🎯 Role:', newUser.role);
    console.log('════════════════════════════════════════');
    console.log('\n📝 Next Steps:');
    console.log('1. Open http://localhost:5500/login.html');
    console.log('2. Login with the credentials above');
    console.log('3. Navigate to http://localhost:5500/admin.html');
    console.log('4. Start managing your products!\n');

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('\nPossible issues:');
    console.error('- Database connection not configured');
    console.error('- Tables not created (run supabase-schema.sql first)');
    console.error('- Invalid credentials in .env file\n');
    await prisma.$disconnect();
  }
}

createAdminUser();
