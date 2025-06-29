import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(request, { params }) {
  try {
    const user = authenticateToken(request);
    const { id, action } = params;

    if (!['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const newStatus = action === 'start' ? 'running' : 'offline';

    // Update generator status
    const { data: generator, error: genError } = await supabase
      .from('generators')
      .update({ 
        status: newStatus,
        last_operator_id: user.id
      })
      .eq('id', id)
      .select(`
        *,
        zones (
          id,
          name
        )
      `)
      .single();

    if (genError) {
      console.error('Error updating generator:', genError);
      return NextResponse.json(
        { error: `Failed to ${action} generator` },
        { status: 500 }
      );
    }

    // Create log entry (without location)
    const { error: logError } = await supabase
      .from('logs')
      .insert({
        generator_id: id,
        operator_id: user.id,
        operator_name: user.username,
        action,
        timestamp: new Date().toISOString()
      });

    if (logError) {
      console.error('Error creating log:', logError);
    }

    return NextResponse.json({ 
      message: `Generator ${action}ed successfully`,
      generator
    });
  } catch (error) {
    console.error(`Error ${params.action}ing generator:`, error);
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
      { error: `Failed to ${params.action} generator` },
      { status: 500 }
    );
  }
} 