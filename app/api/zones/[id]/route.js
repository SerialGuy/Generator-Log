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
    
    // Only admin can update zones
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can update zones' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, location, client_id, assigned_operator_id, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Zone name is required' },
        { status: 400 }
      );
    }

    // Check if zone exists
    const { data: existingZone } = await supabase
      .from('zones')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingZone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    // Update zone
    const { data: updatedZone, error } = await supabase
      .from('zones')
      .update({
        name,
        location: location || null,
        client_id: client_id || null,
        assigned_operator_id: assigned_operator_id || null,
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating zone:', error);
      return NextResponse.json(
        { error: 'Failed to update zone' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedZone);
  } catch (error) {
    console.error('Error updating zone:', error);
    return NextResponse.json(
      { error: 'Failed to update zone' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can delete zones
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete zones' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check if zone exists
    const { data: existingZone } = await supabase
      .from('zones')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!existingZone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Check if zone has generators
    const { data: generators } = await supabase
      .from('generators')
      .select('id')
      .eq('zone_id', id);

    if (generators && generators.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete zone with assigned generators. Please reassign generators first.' },
        { status: 400 }
      );
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    // Delete zone
    const { error } = await supabase
      .from('zones')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting zone:', error);
      return NextResponse.json(
        { error: 'Failed to delete zone' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: `Zone "${existingZone.name}" deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting zone:', error);
    return NextResponse.json(
      { error: 'Failed to delete zone' },
      { status: 500 }
    );
  }
} 