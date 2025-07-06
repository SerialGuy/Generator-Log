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
    if (user.role === 'OPERATOR' || user.role === 'operator') {
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

export async function POST(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can create generators
    if (user.role !== 'ADMIN' && user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Only administrators can create generators' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      kva, 
      zone_id, 
      fuel_type = 'diesel',
      fuel_capacity_liters,
      current_fuel_level,
      status = 'offline'
    } = body;

    if (!name || !kva) {
      return NextResponse.json(
        { error: 'Name and KVA are required' },
        { status: 400 }
      );
    }

    // Verify zone exists if zone_id is provided
    if (zone_id) {
      const { data: zone } = await supabase
        .from('zones')
        .select('id')
        .eq('id', zone_id)
        .single();

      if (!zone) {
        return NextResponse.json(
          { error: 'Zone not found' },
          { status: 404 }
        );
      }
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    const { data: generator, error } = await supabase
      .from('generators')
      .insert([{
        name,
        kva: parseFloat(kva),
        zone_id: zone_id || null,
        fuel_type,
        fuel_capacity_liters: fuel_capacity_liters ? parseFloat(fuel_capacity_liters) : null,
        current_fuel_level: current_fuel_level ? parseFloat(current_fuel_level) : null,
        status,
        total_runtime_hours: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating generator:', error);
      return NextResponse.json(
        { error: 'Failed to create generator' },
        { status: 500 }
      );
    }

    return NextResponse.json(generator);
  } catch (error) {
    console.error('Error creating generator:', error);
    return NextResponse.json(
      { error: 'Failed to create generator' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can update generators
    if (user.role !== 'ADMIN' && user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Only administrators can update generators' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      id,
      name, 
      kva, 
      zone_id, 
      fuel_capacity_liters,
      current_fuel_level,
      status,
      total_runtime_hours
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Generator ID is required' },
        { status: 400 }
      );
    }

    // Verify generator exists
    const { data: existingGenerator } = await supabase
      .from('generators')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingGenerator) {
      return NextResponse.json(
        { error: 'Generator not found' },
        { status: 404 }
      );
    }

    // If zone_id is being updated, verify zone exists
    if (zone_id) {
      const { data: zone } = await supabase
        .from('zones')
        .select('id')
        .eq('id', zone_id)
        .single();

      if (!zone) {
        return NextResponse.json(
          { error: 'Zone not found' },
          { status: 404 }
        );
      }
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    const updateData = {};
    if (name) updateData.name = name;
    if (kva) updateData.kva = parseFloat(kva);
    if (zone_id) updateData.zone_id = zone_id;
    if (fuel_capacity_liters !== undefined) updateData.fuel_capacity_liters = fuel_capacity_liters ? parseFloat(fuel_capacity_liters) : null;
    if (current_fuel_level !== undefined) updateData.current_fuel_level = current_fuel_level ? parseFloat(current_fuel_level) : null;
    if (status) updateData.status = status;
    if (total_runtime_hours !== undefined) updateData.total_runtime_hours = parseFloat(total_runtime_hours);

    const { data: generator, error } = await supabase
      .from('generators')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating generator:', error);
      return NextResponse.json(
        { error: 'Failed to update generator' },
        { status: 500 }
      );
    }

    return NextResponse.json(generator);
  } catch (error) {
    console.error('Error updating generator:', error);
    return NextResponse.json(
      { error: 'Failed to update generator' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can delete generators
    if (user.role !== 'ADMIN' && user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Only administrators can delete generators' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Generator ID is required' },
        { status: 400 }
      );
    }

    // Verify generator exists
    const { data: existingGenerator } = await supabase
      .from('generators')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!existingGenerator) {
      return NextResponse.json(
        { error: 'Generator not found' },
        { status: 404 }
      );
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    const { error } = await supabase
      .from('generators')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting generator:', error);
      return NextResponse.json(
        { error: 'Failed to delete generator' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: `Generator "${existingGenerator.name}" deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting generator:', error);
    return NextResponse.json(
      { error: 'Failed to delete generator' },
      { status: 500 }
    );
  }
} 