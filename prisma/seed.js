import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Existing data cleared\n');

  // Create demo users
  console.log('👥 Creating demo users...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@zabbitha.com',
      phone: '0501234567',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });

  const customerUser = await prisma.user.create({
    data: {
      name: 'محمد أحمد',
      email: 'customer@example.com',
      phone: '0509876543',
      password: hashedPassword,
      role: 'CUSTOMER'
    }
  });

  console.log(`✅ Created admin: ${adminUser.email}`);
  console.log(`✅ Created customer: ${customerUser.email}\n`);

  // Create Car Accessories Products
  console.log('🚗 Creating Car Accessories products...');
  
  const carProduct1 = await prisma.product.create({
    data: {
      title: 'إضاءة داخلية LED للسيارة - RGB',
      description: 'إضاءة داخلية LED متعددة الألوان مع تحكم عن بعد. تعمل مع جميع أنواع السيارات. إضاءة RGB قابلة للتخصيص بألوان متعددة وأنماط مختلفة. سهلة التركيب وتعمل عبر USB.',
      price: 149.99,
      category: 'CARS',
      imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800',
      stockQuantity: 25
    }
  });

  const carProduct2 = await prisma.product.create({
    data: {
      title: 'حامل هاتف مغناطيسي للسيارة',
      description: 'حامل هاتف مغناطيسي قوي يثبت على فتحة المكيف. يدعم جميع أحجام الهواتف الذكية. تصميم أنيق وعصري. سهل التركيب والاستخدام. دوران 360 درجة للحصول على أفضل زاوية رؤية.',
      price: 79.99,
      category: 'CARS',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
      stockQuantity: 50
    }
  });

  console.log(`✅ Created: ${carProduct1.title}`);
  console.log(`✅ Created: ${carProduct2.title}\n`);

  // Create Setup Accessories Products
  console.log('🎮 Creating Setup Accessories products...');
  
  const setupProduct1 = await prisma.product.create({
    data: {
      title: 'كيبورد ميكانيكي RGB للألعاب',
      description: 'لوحة مفاتيح ميكانيكية احترافية مع إضاءة RGB كاملة. مفاتيح ميكانيكية عالية الجودة. برمجيات مخصصة للتحكم بالإضاءة والماكرو. تصميم مريح لساعات اللعب الطويلة. كيبل USB قابل للفصل.',
      price: 399.99,
      category: 'SETUP',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
      stockQuantity: 15
    }
  });

  const setupProduct2 = await prisma.product.create({
    data: {
      title: 'ماوس قيمنق بإضاءة RGB - 16000 DPI',
      description: 'ماوس ألعاب احترافي بدقة عالية تصل إلى 16000 DPI. إضاءة RGB قابلة للتخصيص. 8 أزرار قابلة للبرمجة. تصميم مريح للاستخدام الطويل. سنسور بصري عالي الدقة. متوافق مع جميع الأنظمة.',
      price: 249.99,
      category: 'SETUP',
      imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
      stockQuantity: 30
    }
  });

  console.log(`✅ Created: ${setupProduct1.title}`);
  console.log(`✅ Created: ${setupProduct2.title}\n`);

  // Create a sample order
  console.log('📦 Creating sample order...');
  
  const order = await prisma.order.create({
    data: {
      userId: customerUser.id,
      totalAmount: 449.98,
      status: 'PENDING',
      items: {
        create: [
          {
            productId: carProduct1.id,
            quantity: 2,
            price: carProduct1.price
          },
          {
            productId: carProduct2.id,
            quantity: 1,
            price: carProduct2.price
          }
        ]
      }
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  console.log(`✅ Created order #${order.id}\n`);

  // Summary
  console.log('='.repeat(60));
  console.log('✅ Seeding completed successfully!');
  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`   👥 Users: 2 (1 admin, 1 customer)`);
  console.log(`   🚗 Car Products: 2`);
  console.log(`   🎮 Setup Products: 2`);
  console.log(`   📦 Orders: 1`);
  console.log('\n🔐 Test Credentials:');
  console.log(`   Admin: admin@zabbitha.com / password123`);
  console.log(`   Customer: customer@example.com / password123`);
  console.log('\n' + '='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
