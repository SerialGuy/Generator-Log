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

export async function PUT(request, { params }) {
  try {
    const user = authenticateToken(request);
    const { id } = params;
    const { name, generatorsByType, operatorId } = await request.json();

    // Update zone
    const { error: zoneError } = await supabase
      .from('zones')
      .update({
        name,
        assigned_operator_id: operatorId || null
      })
      .eq('id', id);

    if (zoneError) {
      console.error('Error updating zone:', zoneError);
      return NextResponse.json(
        { error: 'Failed to update zone' },
        { status: 500 }
      );
    }

    // Update generators if provided
    if (generatorsByType) {
      // Delete existing generators
      await supabase
        .from('generators')
        .delete()
        .eq('zone_id', id);

      // Create new generators
      for (const [kva, count] of Object.entries(generatorsByType)) {
        for (let i = 1; i <= count; i++) {
          const { error: genError } = await supabase
            .from('generators')
            .insert({
              name: `${kva}kVA #${i}`,
              zone_id: id,
              status: 'offline',
              kva: parseInt(kva)
            });

          if (genError) {
            console.error(`Error creating generator ${kva}kVA #${i}:`, genError);
          }
        }
      }
    }

    return NextResponse.json({ message: 'Zone updated successfully' });
  } catch (error) {
    console.error('Error updating zone:', error);
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
      { error: 'Failed to update zone' },
      { status: 500 }
    );
  }
} 