import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's token for RLS/auth context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const {
      id,
      client_id,
      service_id,
      staff_id,
      scheduled_at,
      duration_minutes,
      client_package_id,
      notes,
    } = body;

    // Basic validation
    if (!id && (!client_id || !service_id || !scheduled_at)) {
      return new Response(
        JSON.stringify({ error: 'client_id, service_id e scheduled_at são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the atomic DB function
    const { data, error } = await supabase.rpc('manage_appointment', {
      p_id: id || null,
      p_client_id: client_id || null,
      p_service_id: service_id || null,
      p_staff_id: staff_id || null,
      p_scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
      p_duration_minutes: duration_minutes || null,
      p_client_package_id: client_package_id || null,
      p_notes: notes || null,
    });

    if (error) {
      const status = error.message?.includes('Conflito') ? 409 : 400;
      return new Response(
        JSON.stringify({ error: error.message }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});