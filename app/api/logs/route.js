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
    if (user.role === 'OPERATOR') {
      const { data: assignedZones } = await supabase
        .from('zones')
        .select('id')
        .eq('assigned_operator_id', user.id);
      
      if (!assignedZones || assignedZones.length === 0) {
        return NextResponse.json([]);
      }

      const zoneIds = assignedZones.map(zone => zone.id);
      
      // Get generators in assigned zones
      const { data: generators } = await supabase
        .from('generators')
        .select('id')
        .in('zone_id', zoneIds);

      if (!generators || generators.length === 0) {
        return NextResponse.json([]);
      }

      const generatorIds = generators.map(g => g.id);
      
      // Get logs from assigned generators - only select fields that exist in the logs table
      const { data: logs, error } = await supabase
        .from('logs')
        .select(`
          id,
          action,
          timestamp,
          operator_id,
          generator_id,
          runtime_hours,
          fuel_consumed_liters,
          fuel_added_liters,
          fuel_level_before,
          fuel_level_after,
          remarks,
          fault_description,
          maintenance_actions
        `)
        .in('generator_id', generatorIds)
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
      // Admin can see all logs - only select fields that exist in the logs table
      const { data: logs, error } = await supabase
        .from('logs')
        .select(`
          id,
          action,
          timestamp,
          operator_id,
          generator_id,
          runtime_hours,
          fuel_consumed_liters,
          fuel_added_liters,
          fuel_level_before,
          fuel_level_after,
          remarks,
          fault_description,
          maintenance_actions
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
    const body = await request.json();
    const { 
      generator_id, 
      operator_id, 
      action, 
      timestamp,
      runtime_hours,
      fuel_consumed_liters,
      fuel_added_liters,
      fuel_level_before,
      fuel_level_after,
      remarks,
      fault_description,
      maintenance_actions,
      attachments
    } = body;

    if (!generator_id || !action) {
      return NextResponse.json({ error: 'Generator ID and action are required' }, { status: 400 });
    }

    // Get generator and zone information
    const { data: generator } = await supabase
      .from('generators')
      .select('*, zones(*)')
      .eq('id', generator_id)
      .single();

    if (!generator) {
      return NextResponse.json({ error: 'Generator not found' }, { status: 404 });
    }

    // Get operator name
    const operatorName = user.name;
    const operatorId = user.id;

    // Prepare log data
    const logData = {
      generator_id,
      generator_name: generator.name,
      zone_id: generator.zone_id,
      zone_name: generator.zones?.name,
      operator_id: operatorId,
      operator_name: operatorName,
      action,
      timestamp: timestamp || new Date().toISOString(),
      status: action === 'start' ? 'running' : 
              action === 'stop' ? 'offline' : 
              action === 'maintenance' ? 'maintenance' : 
              action === 'fault' ? 'fault' : 'offline',
      runtime_hours,
      fuel_consumed_liters,
      fuel_added_liters,
      fuel_level_before,
      fuel_level_after,
      remarks,
      fault_description,
      maintenance_actions,
      attachments
    };

    // Insert log
    const { data, error } = await supabase
      .from('logs')
      .insert([logData])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating log:', error);
      return NextResponse.json({ error: 'Failed to add log' }, { status: 500 });
    }

    // Update generator status and fuel level
    const updateData = { status: logData.status };
    if (fuel_level_after !== undefined) {
      updateData.current_fuel_level = fuel_level_after;
    }
    if (runtime_hours) {
      updateData.total_runtime_hours = (generator.total_runtime_hours || 0) + parseFloat(runtime_hours);
    }

    await supabase
      .from('generators')
      .update(updateData)
      .eq('id', generator_id);

    // Create notifications for faults
    if (action === 'fault' && fault_description) {
      // Notify admin about fault
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'ADMIN');

      if (admins) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          title: 'Generator Fault Alert',
          message: `Generator ${generator.name} in zone ${generator.zones?.name} has reported a fault: ${fault_description}`,
          type: 'fault',
          priority: 'high',
          related_entity_type: 'generator',
          related_entity_id: generator_id
        }));

        await supabase.from('notifications').insert(notifications);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating log:', error);
    return NextResponse.json({ error: 'Failed to add log' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = authenticateToken(request);
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete logs' },
        { status: 403 }
      );
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
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can update logs' },
        { status: 403 }
      );
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