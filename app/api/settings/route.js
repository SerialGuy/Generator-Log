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
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('publicOnly') === 'true';

    let query = supabase
      .from('system_settings')
      .select('*')
      .order('setting_key', { ascending: true });

    // If publicOnly is true, only return public settings
    if (publicOnly) {
      query = query.eq('is_public', true);
    } else {
      // Only admin can see all settings
      if (user.role !== 'administrator') {
        query = query.eq('is_public', true);
      }
    }

    const { data: settings, error } = await query;

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Convert to key-value object
    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.setting_key] = {
        value: setting.setting_value,
        type: setting.setting_type,
        description: setting.description,
        isPublic: setting.is_public
      };
    });

    return NextResponse.json(settingsObject);
  } catch (error) {
    console.error('Error fetching settings:', error);
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
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can create/update settings
    if (user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Only administrators can modify settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settingKey, settingValue, settingType, description, isPublic } = body;

    if (!settingKey || settingValue === undefined) {
      return NextResponse.json(
        { error: 'Setting key and value are required' },
        { status: 400 }
      );
    }

    // Upsert setting (insert or update)
    const { data, error } = await supabase
      .from('system_settings')
      .upsert([{
        setting_key: settingKey,
        setting_value: settingValue.toString(),
        setting_type: settingType || 'string',
        description: description || '',
        is_public: isPublic || false
      }], {
        onConflict: 'setting_key'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting setting:', error);
      return NextResponse.json(
        { error: 'Failed to save setting' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json(
      { error: 'Failed to save setting' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin can delete settings
    if (user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Only administrators can delete settings' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const settingKey = searchParams.get('key');

    if (!settingKey) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('setting_key', settingKey);

    if (error) {
      console.error('Error deleting setting:', error);
      return NextResponse.json(
        { error: 'Failed to delete setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    );
  }
} 