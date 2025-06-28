require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing Supabase connection...');
console.log('Environment variables:');
console.log('SUPABASE_PROJECT_URL:', process.env.SUPABASE_PROJECT_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_API_KEY:', process.env.SUPABASE_API_KEY ? '✅ Set' : '❌ Missing');

// Show actual values (truncated for security)
if (process.env.SUPABASE_PROJECT_URL) {
  console.log('  URL value:', process.env.SUPABASE_PROJECT_URL.substring(0, 20) + '...');
}
if (process.env.SUPABASE_API_KEY) {
  console.log('  Key value:', process.env.SUPABASE_API_KEY.substring(0, 10) + '...');
}

const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  console.log('Please create a .env file with:');
  console.log('SUPABASE_PROJECT_URL=your_supabase_project_url');
  console.log('SUPABASE_API_KEY=your_supabase_anon_key');
  console.log('');
  console.log('Current .env file contents:');
  try {
    const fs = require('fs');
    const envContent = fs.readFileSync('.env', 'utf8');
    console.log(envContent);
  } catch (err) {
    console.log('Could not read .env file:', err.message);
  }
  process.exit(1);
}

// Check if values are still placeholders
if (supabaseUrl === 'your_supabase_project_url_here' || supabaseKey === 'your_supabase_anon_key_here') {
  console.error('❌ Environment variables contain placeholder values');
  console.log('Please update your .env file with actual Supabase credentials');
  process.exit(1);
}

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('✅ Supabase client created successfully');
  
  // Test connection by trying to fetch from users table
  console.log('🔍 Testing database connection...');
  
  supabase
    .from('users')
    .select('count')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('Make sure:');
        console.log('1. Your Supabase project is active');
        console.log('2. Your API key is correct');
        console.log('3. The database tables exist (run supabase-schema.sql)');
      } else {
        console.log('✅ Database connection successful');
        console.log('✅ Server is ready to use Supabase!');
      }
    })
    .catch(err => {
      console.error('❌ Unexpected error:', err.message);
    });
    
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error.message);
} 