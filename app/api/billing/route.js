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
    const zoneId = searchParams.get('zoneId');
    const status = searchParams.get('status');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    let query = supabase
      .from('billing')
      .select(`
        *,
        zones (
          id,
          name,
          location
        ),
        users!billing_client_id_fkey (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters based on user role
    if (user.role === 'client') {
      query = query.eq('client_id', user.id);
    } else if (user.role === 'operator') {
      // Operators can only see billing for their assigned zones
      const { data: assignedZones } = await supabase
        .from('zones')
        .select('id')
        .eq('assigned_operator_id', user.id);
      
      if (!assignedZones || assignedZones.length === 0) {
        return NextResponse.json([]);
      }
      
      const zoneIds = assignedZones.map(zone => zone.id);
      query = query.in('zone_id', zoneIds);
    }

    // Apply additional filters
    if (zoneId) query = query.eq('zone_id', zoneId);
    if (status) query = query.eq('status', status);
    if (periodStart) query = query.gte('billing_period_start', periodStart);
    if (periodEnd) query = query.lte('billing_period_end', periodEnd);

    const { data: billing, error } = await query;

    if (error) {
      console.error('Error fetching billing:', error);
      return NextResponse.json(
        { error: 'Failed to fetch billing' },
        { status: 500 }
      );
    }

    return NextResponse.json(billing);
  } catch (error) {
    console.error('Error fetching billing:', error);
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
      { error: 'Failed to fetch billing' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = authenticateToken(request);
    
    // Only admin and commercial users can create bills
    if (!['administrator', 'commercial'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized to create bills' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { zoneId, billingPeriodStart, billingPeriodEnd } = body;

    if (!zoneId || !billingPeriodStart || !billingPeriodEnd) {
      return NextResponse.json(
        { error: 'Zone ID and billing period are required' },
        { status: 400 }
      );
    }

    // Get zone and client information
    const { data: zone } = await supabase
      .from('zones')
      .select('*, users!zones_client_id_fkey(*)')
      .eq('id', zoneId)
      .single();

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Get current fuel price
    const { data: fuelPrice } = await supabase
      .from('fuel_prices')
      .select('price_per_liter')
      .eq('is_active', true)
      .single();

    if (!fuelPrice) {
      return NextResponse.json(
        { error: 'No active fuel price found' },
        { status: 400 }
      );
    }

    // Get generators in the zone
    const { data: generators } = await supabase
      .from('generators')
      .select('*')
      .eq('zone_id', zoneId);

    if (!generators || generators.length === 0) {
      return NextResponse.json(
        { error: 'No generators found in this zone' },
        { status: 400 }
      );
    }

    // Calculate billing data for each generator
    let totalFuelConsumed = 0;
    let totalRuntimeHours = 0;
    const billingDetails = [];

    for (const generator of generators) {
      // Get logs for the billing period
      const { data: logs } = await supabase
        .from('logs')
        .select('*')
        .eq('generator_id', generator.id)
        .gte('timestamp', billingPeriodStart)
        .lte('timestamp', billingPeriodEnd);

      let generatorFuelConsumed = 0;
      let generatorRuntimeHours = 0;

      if (logs) {
        logs.forEach(log => {
          if (log.fuel_consumed_liters) {
            generatorFuelConsumed += parseFloat(log.fuel_consumed_liters);
          }
          if (log.runtime_hours) {
            generatorRuntimeHours += parseFloat(log.runtime_hours);
          }
        });
      }

      totalFuelConsumed += generatorFuelConsumed;
      totalRuntimeHours += generatorRuntimeHours;

      billingDetails.push({
        generator_id: generator.id,
        generator_name: generator.name,
        fuel_consumed: generatorFuelConsumed,
        runtime_hours: generatorRuntimeHours,
        fuel_cost: generatorFuelConsumed * parseFloat(fuelPrice.price_per_liter)
      });
    }

    // Calculate total costs
    const fuelCost = totalFuelConsumed * parseFloat(fuelPrice.price_per_liter);
    const serviceFee = fuelCost * 0.05; // 5% service fee
    const totalAmount = fuelCost + serviceFee;

    // Generate bill number
    const { data: billNumber } = await supabase.rpc('generate_bill_number');

    // Create billing record
    const { data: billing, error } = await supabase
      .from('billing')
      .insert([{
        zone_id: zoneId,
        client_id: zone.client_id,
        billing_period_start: billingPeriodStart,
        billing_period_end: billingPeriodEnd,
        total_fuel_consumed: totalFuelConsumed,
        total_runtime_hours: totalRuntimeHours,
        fuel_cost: fuelCost,
        service_fee: serviceFee,
        total_amount: totalAmount,
        bill_number: billNumber,
        due_date: new Date(billingPeriodEnd).toISOString().split('T')[0]
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating billing:', error);
      return NextResponse.json(
        { error: 'Failed to create billing' },
        { status: 500 }
      );
    }

    // Create billing details
    const billingDetailsWithBillingId = billingDetails.map(detail => ({
      ...detail,
      billing_id: billing.id
    }));

    const { error: detailsError } = await supabase
      .from('billing_details')
      .insert(billingDetailsWithBillingId);

    if (detailsError) {
      console.error('Error creating billing details:', detailsError);
      // Continue anyway as the main billing record was created
    }

    return NextResponse.json(billing);
  } catch (error) {
    console.error('Error creating billing:', error);
    return NextResponse.json(
      { error: 'Failed to create billing' },
      { status: 500 }
    );
  }
} 