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
      
      // Get logs from generators in assigned zones
      const { data: logs, error } = await supabase
        .from('logs')
        .select(`
          id,
          action,
          timestamp,
          operator_name,
          generators (
            name,
            zones (
              name
            )
          )
        `)
        .in('generators.zones.id', zoneIds)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching logs:', error);
        return NextResponse.json(
          { error: 'Failed to fetch logs' },
          { status: 500 }
        );
      }

      return NextResponse.json(logs);
    } else {
      // Admin can see all logs
      const { data: logs, error } = await supabase
        .from('logs')
        .select(`
          id,
          action,
          timestamp,
          operator_name,
          generators (
            name,
            zones (
              name
            )
          )
        `)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching logs:', error);
        return NextResponse.json(
          { error: 'Failed to fetch logs' },
          { status: 500 }
        );
      }

      return NextResponse.json(logs);
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
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
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
} 