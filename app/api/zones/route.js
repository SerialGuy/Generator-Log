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

    let query = supabase
      .from('zones')
      .select('*')
      .order('name');

    // If user is operator, only show zones assigned to them
    if (user.role === 'operator') {
      query = query.eq('assigned_operator_id', user.id);
    }

    const { data: zones, error } = await query;

    if (error) {
      console.error('Error fetching zones:', error);
      return NextResponse.json(
        { error: 'Failed to fetch zones' },
        { status: 500 }
      );
    }

    return NextResponse.json(zones);
  } catch (error) {
    console.error('Error fetching zones:', error);
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
      { error: 'Failed to fetch zones' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can create zones
    if (user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Only administrators can create zones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      location, 
      client_id, 
      assigned_operator_id,
      description 
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Zone name is required' },
        { status: 400 }
      );
    }

    // If client_id is provided, verify client exists
    if (client_id) {
      const { data: client } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', client_id)
        .eq('role', 'client')
        .single();

      if (!client) {
        return NextResponse.json(
          { error: 'Client not found or invalid client role' },
          { status: 404 }
        );
      }
    }

    // If assigned_operator_id is provided, verify operator exists
    if (assigned_operator_id) {
      const { data: operator } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', assigned_operator_id)
        .eq('role', 'operator')
        .single();

      if (!operator) {
        return NextResponse.json(
          { error: 'Operator not found or invalid operator role' },
          { status: 404 }
        );
      }
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    const { data: zone, error } = await supabase
      .from('zones')
      .insert([{
        name,
        location: location || null,
        client_id: client_id || null,
        assigned_operator_id: assigned_operator_id || null,
        description: description || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating zone:', error);
      return NextResponse.json(
        { error: 'Failed to create zone' },
        { status: 500 }
      );
    }

    return NextResponse.json(zone);
  } catch (error) {
    console.error('Error creating zone:', error);
    return NextResponse.json(
      { error: 'Failed to create zone' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can update zones
    if (user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Only administrators can update zones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      id,
      name, 
      location, 
      client_id, 
      assigned_operator_id,
      description 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Zone ID is required' },
        { status: 400 }
      );
    }

    // Verify zone exists
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

    // If client_id is provided, verify client exists
    if (client_id) {
      const { data: client } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', client_id)
        .eq('role', 'client')
        .single();

      if (!client) {
        return NextResponse.json(
          { error: 'Client not found or invalid client role' },
          { status: 404 }
        );
      }
    }

    // If assigned_operator_id is provided, verify operator exists
    if (assigned_operator_id) {
      const { data: operator } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', assigned_operator_id)
        .eq('role', 'operator')
        .single();

      if (!operator) {
        return NextResponse.json(
          { error: 'Operator not found or invalid operator role' },
          { status: 404 }
        );
      }
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    const updateData = {};
    if (name) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (client_id !== undefined) updateData.client_id = client_id;
    if (assigned_operator_id !== undefined) updateData.assigned_operator_id = assigned_operator_id;
    if (description !== undefined) updateData.description = description;

    const { data: zone, error } = await supabase
      .from('zones')
      .update(updateData)
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

    return NextResponse.json(zone);
  } catch (error) {
    console.error('Error updating zone:', error);
    return NextResponse.json(
      { error: 'Failed to update zone' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can delete zones
    if (user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Only administrators can delete zones' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Zone ID is required' },
        { status: 400 }
      );
    }

    // Verify zone exists
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
        { error: 'Cannot delete zone with assigned generators. Please reassign or delete generators first.' },
        { status: 400 }
      );
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

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