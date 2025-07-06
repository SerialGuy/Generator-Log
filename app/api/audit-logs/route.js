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
    
    // Only admin can view audit logs
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can view audit logs' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const zoneId = searchParams.get('zoneId');
    const limit = searchParams.get('limit') || 100;
    const offset = searchParams.get('offset') || 0;

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        users (
          id,
          name,
          username,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (tableName) {
      query = query.eq('table_name', tableName);
    }
    if (action) {
      query = query.eq('action', action);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (zoneId) {
      // For zone-related records, filter by zone_id in the record data
      query = query.or(`new_values->>'zone_id'.eq.${zoneId},old_values->>'zone_id'.eq.${zoneId}`);
    }

    const { data: auditLogs, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }

    return NextResponse.json(auditLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
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
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
} 