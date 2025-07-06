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

export async function POST(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can assign generators
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can assign generators' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { generator_ids, zone_id } = body;

    if (!generator_ids || !Array.isArray(generator_ids) || generator_ids.length === 0) {
      return NextResponse.json(
        { error: 'Generator IDs array is required' },
        { status: 400 }
      );
    }

    if (!zone_id) {
      return NextResponse.json(
        { error: 'Zone ID is required' },
        { status: 400 }
      );
    }

    // Check if zone exists
    const { data: zone } = await supabase
      .from('zones')
      .select('id, name')
      .eq('id', zone_id)
      .single();

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    // Update generators to assign them to the zone
    const { error } = await supabase
      .from('generators')
      .update({ zone_id })
      .in('id', generator_ids);

    if (error) {
      console.error('Error assigning generators:', error);
      return NextResponse.json(
        { error: 'Failed to assign generators' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: `${generator_ids.length} generator(s) assigned to zone "${zone.name}" successfully` 
    });
  } catch (error) {
    console.error('Error assigning generators:', error);
    return NextResponse.json(
      { error: 'Failed to assign generators' },
      { status: 500 }
    );
  }
} 