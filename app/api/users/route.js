import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'generator-log-secret-key-2024';

// Authentication middleware
const authenticateToken = (request) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid token');
  }
};

export async function GET(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can view all users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can view all users' },
        { status: 403 }
      );
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, username, email, role, is_active, created_at')
      .order('name');

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    if (error.message === 'Access token required') {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }
    if (error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can create users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can create users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      username, 
      email, 
      password, 
      role, 
      phone 
    } = body;

    if (!name || !username || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, username, email, password, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['ADMIN', 'CLIENT', 'OPERATOR'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, CLIENT, or OPERATOR' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        name,
        username,
        email,
        password: hashedPassword,
        role,
        phone: phone || null,
        is_active: true
      }])
      .select('id, name, username, email, role, phone, is_active, created_at')
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    return NextResponse.json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 