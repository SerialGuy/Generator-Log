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
    const { zoneName, generatorsByType, operatorId } = await request.json();

    if (!zoneName) {
      return NextResponse.json(
        { error: 'Zone name is required' },
        { status: 400 }
      );
    }

    // Create zone
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .insert({
        name: zoneName,
        location: 'Location to be updated',
        assigned_operator_id: operatorId || null
      })
      .select()
      .single();

    if (zoneError) {
      console.error('Error creating zone:', zoneError);
      return NextResponse.json(
        { error: 'Failed to create zone' },
        { status: 500 }
      );
    }

    // Create generators
    for (const [kva, count] of Object.entries(generatorsByType)) {
      for (let i = 1; i <= count; i++) {
        const { error: genError } = await supabase
          .from('generators')
          .insert({
            name: `${kva}kVA #${i}`,
            zone_id: zone.id,
            status: 'offline',
            kva: parseInt(kva)
          });

        if (genError) {
          console.error(`Error creating generator ${kva}kVA #${i}:`, genError);
        }
      }
    }

    return NextResponse.json(
      { message: 'Zone created successfully', zone },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating zone:', error);
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
      { error: 'Failed to create zone' },
      { status: 500 }
    );
  }
} 