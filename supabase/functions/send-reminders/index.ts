import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Formats a Brazilian phone number for Evolution API.
 * Input: "11999887766", "(11) 99988-7766", "5511999887766"
 * Output: "5511999887766"
 */
function formatPhoneForEvolution(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  let number = digits;

  if (number.startsWith('55') && number.length >= 12) {
    if (number.length === 12) {
      number = number.slice(0, 4) + '9' + number.slice(4);
    }
    return number;
  }

  if (number.startsWith('0')) {
    number = number.slice(1);
  }

  if (number.length === 10) {
    number = number.slice(0, 2) + '9' + number.slice(2);
  }

  if (number.length === 11) {
    return '55' + number;
  }

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

    // Find appointments in next 24h that don't have a sent reminder
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id, scheduled_at, duration_minutes, tenant_id,
        clients(full_name, phone),
        services(name)
      `)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', in24h.toISOString())
      .in('status', ['scheduled', 'confirmed']);

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: 'No upcoming appointments', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check which appointments already have sent reminders
    const appointmentIds = appointments.map((a: any) => a.id);
    const { data: existingReminders } = await supabase
      .from('reminders')
      .select('appointment_id')
      .in('appointment_id', appointmentIds)
      .in('status', ['sent', 'pending']);

    const alreadyReminded = new Set((existingReminders || []).map((r: any) => r.appointment_id));
    const toRemind = appointments.filter((a: any) => !alreadyReminded.has(a.id));

    // Get Evolution instances for all tenants
    const tenantIds = [...new Set(toRemind.map((a: any) => a.tenant_id))];
    const { data: instances } = await supabase
      .from('evolution_instances')
      .select('*')
      .in('tenant_id', tenantIds)
      .eq('status', 'connected');

    const instanceMap = new Map<string, any>();
    (instances || []).forEach((inst: any) => instanceMap.set(inst.tenant_id, inst));

    let sentCount = 0;

    for (const apt of toRemind) {
      const client = apt.clients as any;
      const service = apt.services as any;
      const rawPhone = client?.phone || '';
      const formattedPhone = formatPhoneForEvolution(rawPhone);

      if (!formattedPhone) continue;

      const scheduledDate = new Date(apt.scheduled_at);
      const dateStr = scheduledDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const timeStr = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

      const instance = instanceMap.get(apt.tenant_id);

      // Create reminder record
      await supabase.from('reminders').insert({
        appointment_id: apt.id,
        tenant_id: apt.tenant_id,
        scheduled_for: now.toISOString(),
        type: 'whatsapp',
        status: instance ? 'pending' : 'skipped',
      });

      if (instance) {
        try {
          const message = `Olá ${client.full_name}! 😊\n\nLembrete do seu agendamento:\n📋 ${service.name}\n📅 ${dateStr} às ${timeStr}\n⏱ Duração: ${apt.duration_minutes} minutos\n\nAté lá! ✨`;

          console.log(`Sending reminder to ${formattedPhone} via ${instance.instance_name}`);

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
                text: message,
              }),
            }
          );

          if (evoResponse.ok) {
            await supabase
              .from('reminders')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('appointment_id', apt.id)
              .eq('status', 'pending');
            sentCount++;
          } else {
            const errBody = await evoResponse.text();
            console.error('Evolution API error:', errBody);
            await supabase
              .from('reminders')
              .update({ status: 'failed' })
              .eq('appointment_id', apt.id)
              .eq('status', 'pending');
          }
        } catch (evoErr) {
          console.error('Evolution send error:', evoErr);
          await supabase
            .from('reminders')
            .update({ status: 'failed' })
            .eq('appointment_id', apt.id)
            .eq('status', 'pending');
        }
      } else {
        console.log(`Reminder logged (Evolution not configured) for ${client.full_name}: ${service.name} on ${dateStr} ${timeStr}`);
        sentCount++;
      }
    }

    return new Response(
      JSON.stringify({ message: 'Reminders processed', total: toRemind.length, sent: sentCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Reminder function error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
