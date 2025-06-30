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
          generator_id,
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
          generator_id,
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

export async function POST(request) {
  try {
    const user = authenticateToken(request);
    if (user.role !== 'administrator') {
      return NextResponse.json({ error: 'Only admin can add logs manually' }, { status: 403 });
    }
    const body = await request.json();
    const { generator_id, operator_id, action, timestamp } = body;
    if (!generator_id || !operator_id || !action || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Get operator name
    const { data: operator } = await supabase.from('users').select('name').eq('id', operator_id).single();
    // Insert log
    const { data, error } = await supabase.from('logs').insert([
      {
        generator_id,
        operator_id,
        operator_name: operator?.name || '',
        action,
        timestamp
      }
    ]).select('*').single();
    if (error) {
      return NextResponse.json({ error: 'Failed to add log' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add log' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = authenticateToken(request);
    if (user.role !== 'administrator') {
      return NextResponse.json({ error: 'Only admin can delete logs' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing log id' }, { status: 400 });
    }
    const { error } = await supabase.from('logs').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = authenticateToken(request);
    if (user.role !== 'administrator') {
      return NextResponse.json({ error: 'Only admin can update logs' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing log id' }, { status: 400 });
    }
    const body = await request.json();
    const { error } = await supabase.from('logs').update(body).eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
  }
} 