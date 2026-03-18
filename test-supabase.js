// Test Supabase Connection
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection...\n');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Anon Key: ${supabaseAnonKey?.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test 1: Check connection
console.log('Test 1: Checking connection...');
try {
  const { data, error } = await supabase.from('users').select('count');
  if (error) {
    console.log('❌ Connection test failed:', error.message);
  } else {
    console.log('✅ Connected to Supabase successfully!');
  }
} catch (err) {
  console.log('❌ Error:', err.message);
}

// Test 2: Check tables
console.log('\nTest 2: Checking available tables...');
try {
  const { data: users } = await supabase.from('users').select('*').limit(1);
  const { data: products } = await supabase.from('products').select('*').limit(1);
  const { data: orders } = await supabase.from('orders').select('*').limit(1);
  
  console.log('✅ users table:', users ? 'exists' : 'not found');
  console.log('✅ products table:', products ? 'exists' : 'not found');
  console.log('✅ orders table:', orders ? 'exists' : 'not found');
} catch (err) {
  console.log('⚠️  Tables might not exist yet. Run SQL in Supabase Dashboard.');
  console.log('Error:', err.message);
}

// Test 3: Test Prisma connection
console.log('\nTest 3: Testing Prisma connection...');
try {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  await prisma.$connect();
  console.log('✅ Prisma connected to PostgreSQL!');
  
  // Try to query
  const userCount = await prisma.user.count();
  console.log(`📊 Users in database: ${userCount}`);
  
  await prisma.$disconnect();
} catch (err) {
  console.log('❌ Prisma connection failed:', err.message);
  console.log('💡 Run: npx prisma migrate dev --name init');
}

console.log('\n' + '='.repeat(50));
console.log('Test completed!');
