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
    
    // Only admin can update clients
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can update clients' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, location, description, contact_person, contact_email, contact_phone, is_active } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      );
    }

    // Check if client exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    // Update client
    const { data: updatedClient, error } = await supabase
      .from('clients')
      .update({
        name,
        location: location || null,
        description: description || null,
        contact_person: contact_person || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can delete clients
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete clients' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check if client exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if client has zones
    const { data: zones } = await supabase
      .from('zones')
      .select('id')
      .eq('client_id', id);

    if (zones && zones.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with assigned zones. Please reassign or delete zones first.' },
        { status: 400 }
      );
    }

    // Set current user for audit log
    await supabase.rpc('set_current_user', { user_id: user.id });

    // Delete client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: `Client "${existingClient.name}" deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
} 