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

    // If user is operator, first get their assigned zones
    if (user.role === 'operator') {
      const { data: assignedZones } = await supabase
        .from('zones')
        .select('id')
        .eq('assigned_operator_id', user.id);
      
      if (!assignedZones || assignedZones.length === 0) {
        return NextResponse.json([]);
      }

      const zoneIds = assignedZones.map(zone => zone.id);
      
      // Get generators only from assigned zones
      const { data: generators, error } = await supabase
        .from('generators')
        .select(`
          *,
          zones (
            id,
            name,
            location,
            assigned_operator_id
          )
        `)
        .in('zone_id', zoneIds);

      if (error) {
        console.error('Error fetching generators:', error);
        return NextResponse.json(
          { error: 'Failed to fetch generators' },
          { status: 500 }
        );
      }

      return NextResponse.json(generators);
    } else {
      // Admin can see all generators
      const { data: generators, error } = await supabase
        .from('generators')
        .select(`
          *,
          zones (
            id,
            name,
            location,
            assigned_operator_id
          )
        `);

      if (error) {
        console.error('Error fetching generators:', error);
        return NextResponse.json(
          { error: 'Failed to fetch generators' },
          { status: 500 }
        );
      }

      return NextResponse.json(generators);
    }
  } catch (error) {
    console.error('Error fetching generators:', error);
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
      { error: 'Failed to fetch generators' },
      { status: 500 }
    );
  }
} 