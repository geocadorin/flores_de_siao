import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Formats a Brazilian phone number for Evolution API.
 * Input examples: "11999887766", "(11) 99988-7766", "5511999887766"
 * Output: "5511999887766" (country code + DDD + 9-digit mobile)
 */
function formatPhoneForEvolution(raw: string): string | null {
  // Remove all non-digits
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  let number = digits;

  // If already starts with 55 and has 12-13 digits, it's already formatted
  if (number.startsWith('55') && number.length >= 12) {
    // Ensure mobile has 9 digits (add leading 9 if 12 digits = 55 + DDD(2) + 8-digit)
    if (number.length === 12) {
      // 55 + DD + 8 digits → insert 9 after DDD
      number = number.slice(0, 4) + '9' + number.slice(4);
    }
    return number;
  }

  // Strip leading + or 0
  if (number.startsWith('0')) {
    number = number.slice(1);
  }

  // Now we should have DDD + number (10 or 11 digits)
  if (number.length === 10) {
    // DDD(2) + 8-digit landline/old mobile → add 9 for mobile
    number = number.slice(0, 2) + '9' + number.slice(2);
  }

  if (number.length === 11) {
    // DDD(2) + 9-digit mobile — perfect
    return '55' + number;
  }

  // Fallback: just prepend 55 if not already there
  if (!number.startsWith('55')) {
    return '55' + number;
  }

  return number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get pending messages from queue
    const { data: pendingMessages, error: fetchErr } = await supabase
      .from('messages_queue')
      .select('*, clients(phone, full_name)')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .order('created_at')
      .limit(50);

    if (fetchErr) {
      console.error('Error fetching queue:', fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending messages', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group by tenant to get their Evolution instance
    const tenantIds = [...new Set(pendingMessages.map((m: any) => m.tenant_id))];
    const { data: instances } = await supabase
      .from('evolution_instances')
      .select('*')
      .in('tenant_id', tenantIds)
      .eq('status', 'connected');

    const instanceMap = new Map<string, any>();
    (instances || []).forEach((inst: any) => instanceMap.set(inst.tenant_id, inst));

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const msg of pendingMessages) {
      const client = msg.clients as any;
      const rawPhone = client?.phone || '';
      const formattedPhone = formatPhoneForEvolution(rawPhone);

      if (!formattedPhone) {
        await supabase.from('messages_queue').update({
          status: 'failed',
          error_message: 'Cliente sem telefone válido',
          processed_at: new Date().toISOString(),
        }).eq('id', msg.id);

        await supabase.from('messages').update({ status: 'failed' })
          .eq('tenant_id', msg.tenant_id)
          .eq('client_id', msg.client_id)
          .eq('message', msg.message)
          .eq('status', 'queued')
          .limit(1);

        failed++;
        processed++;
        continue;
      }

      const instance = instanceMap.get(msg.tenant_id);

      if (!instance) {
        console.log(`No Evolution instance for tenant ${msg.tenant_id}, message queued: ${msg.message.substring(0, 50)}...`);
        
        await supabase.from('messages_queue').update({
          status: 'failed',
          error_message: 'Instância Evolution não configurada',
          processed_at: new Date().toISOString(),
        }).eq('id', msg.id);

        await supabase.from('messages').update({ status: 'failed' })
          .eq('tenant_id', msg.tenant_id)
          .eq('client_id', msg.client_id)
          .eq('message', msg.message)
          .eq('status', 'queued')
          .limit(1);

        failed++;
        processed++;
        continue;
      }

      // Mark as processing
      await supabase.from('messages_queue').update({ status: 'processing' }).eq('id', msg.id);

      try {
        console.log(`Sending to ${formattedPhone} via ${instance.instance_name}`);

        const evoResponse = await fetch(
          `${instance.api_url}/message/sendText/${instance.instance_name}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': instance.api_key,
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: msg.message,
            }),
          }
        );

        if (evoResponse.ok) {
          const evoData = await evoResponse.json();
          
          await supabase.from('messages_queue').update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          }).eq('id', msg.id);

          await supabase.from('messages').update({
            status: 'sent',
            external_id: evoData?.key?.id || null,
          })
            .eq('tenant_id', msg.tenant_id)
            .eq('client_id', msg.client_id)
            .eq('message', msg.message)
            .eq('status', 'queued')
            .limit(1);

          sent++;
        } else {
          const errBody = await evoResponse.text();
          console.error('Evolution API error:', errBody);

          const newRetry = (msg.retry_count || 0) + 1;
          const newStatus = newRetry >= (msg.max_retries || 3) ? 'failed' : 'pending';

          await supabase.from('messages_queue').update({
            status: newStatus,
            retry_count: newRetry,
            error_message: errBody.substring(0, 500),
            processed_at: newStatus === 'failed' ? new Date().toISOString() : null,
          }).eq('id', msg.id);

          if (newStatus === 'failed') {
            await supabase.from('messages').update({ status: 'failed' })
              .eq('tenant_id', msg.tenant_id)
              .eq('client_id', msg.client_id)
              .eq('message', msg.message)
              .eq('status', 'queued')
              .limit(1);
            failed++;
          }
        }
      } catch (sendErr: any) {
        console.error('Send error:', sendErr);
        const newRetry = (msg.retry_count || 0) + 1;
        await supabase.from('messages_queue').update({
          status: newRetry >= 3 ? 'failed' : 'pending',
          retry_count: newRetry,
          error_message: sendErr.message?.substring(0, 500),
        }).eq('id', msg.id);
        failed++;
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ message: 'Queue processed', processed, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Process queue error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
