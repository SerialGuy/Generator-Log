import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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
    
    // Only admin and client users can view fuel prices
    if (!['ADMIN', 'CLIENT'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { data: fuelPrices, error } = await supabase
      .from('fuel_prices')
      .select('*')
      .order('effective_date', { ascending: false });

    if (error) {
      console.error('Error fetching fuel prices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fuel prices' },
        { status: 500 }
      );
    }

    return NextResponse.json(fuelPrices);
  } catch (error) {
    console.error('Error fetching fuel prices:', error);
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
      { error: 'Failed to fetch fuel prices' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can create fuel prices
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can create fuel prices' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { price_per_liter, effective_date, end_date } = body;

    if (!price_per_liter || !effective_date) {
      return NextResponse.json(
        { error: 'Price per liter and effective date are required' },
        { status: 400 }
      );
    }

    // Deactivate current active price
    await supabase
      .from('fuel_prices')
      .update({ is_active: false, end_date: effective_date })
      .eq('is_active', true);

    // Create new fuel price
    const { data, error } = await supabase
      .from('fuel_prices')
      .insert([{
        price_per_liter,
        effective_date,
        end_date,
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating fuel price:', error);
      return NextResponse.json(
        { error: 'Failed to create fuel price' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating fuel price:', error);
    return NextResponse.json(
      { error: 'Failed to create fuel price' },
      { status: 500 }
    );
  }
} 