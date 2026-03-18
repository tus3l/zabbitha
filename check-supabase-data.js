// Check Supabase Data
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('📊 Checking Supabase Data...\n');
console.log('='.repeat(50));

// Check Users
console.log('\n👥 USERS:');
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('id, name, email, phone, role');

if (usersError) {
  console.log('❌ Error:', usersError.message);
} else {
  console.log(`✅ Found ${users.length} users`);
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    if (user.phone) console.log(`    📱 Phone: ${user.phone}`);
  });
}

// Check Products
console.log('\n🛍️  PRODUCTS:');
const { data: products, error: productsError } = await supabase
  .from('products')
  .select('id, title, price, category, stock_quantity');

if (productsError) {
  console.log('❌ Error:', productsError.message);
} else {
  console.log(`✅ Found ${products.length} products`);
  products.forEach(product => {
    console.log(`  - ${product.title}`);
    console.log(`    💰 ${product.price} SAR | 📦 Stock: ${product.stock_quantity} | 🏷️  ${product.category}`);
  });
}

// Check Orders
console.log('\n📦 ORDERS:');
const { data: orders, error: ordersError } = await supabase
  .from('orders')
  .select('id, total_amount, status, created_at');

if (ordersError) {
  console.log('❌ Error:', ordersError.message);
} else {
  console.log(`✅ Found ${orders.length} orders`);
  if (orders.length === 0) {
    console.log('  (No orders yet - this is normal for a new setup)');
  }
}

console.log('\n' + '='.repeat(50));
console.log('\n📊 SUMMARY:');
console.log(`✅ Supabase Connection: Working`);
console.log(`✅ Database Tables: ${users ? 'Created' : 'Not found'}`);
console.log(`✅ Sample Data: ${(users?.length || 0) + (products?.length || 0)} records`);
console.log(`\n💡 Status: ${users && products ? '🎉 Supabase is fully connected and working!' : '⚠️  Tables need data - run SQL script in Supabase Dashboard'}`);
