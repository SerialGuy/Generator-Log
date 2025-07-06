import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
  try {
    // Test database connection
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, name, email, role')
      .limit(5);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      users: users || [],
      totalUsers: users ? users.length : 0
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'API error',
      error: error.message
    }, { status: 500 });
  }
} 