import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PASSWORD_RULES = [
  { test: (pw: string) => pw.length >= 8, msg: 'Mínimo de 8 caracteres' },
  { test: (pw: string) => /[A-Z]/.test(pw), msg: 'Pelo menos 1 letra maiúscula' },
  { test: (pw: string) => /[a-z]/.test(pw), msg: 'Pelo menos 1 letra minúscula' },
  { test: (pw: string) => /[0-9]/.test(pw), msg: 'Pelo menos 1 número' },
  { test: (pw: string) => /[^A-Za-z0-9]/.test(pw), msg: 'Pelo menos 1 caractere especial' },
];

// Simple HMAC-based captcha token verification
const CAPTCHA_SECRET = 'floresdesiao-captcha-secret-2026';

async function createHmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(CAPTCHA_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Generate captcha challenge server-side
    if (body.action === 'generate_captcha') {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const answer = a + b;
      const timestamp = Date.now();
      const token = await createHmac(`${answer}:${timestamp}`);

      return new Response(JSON.stringify({ a, b, token, timestamp }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle registration check
    if (body.action === 'check_registration') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: settings } = await supabaseAdmin
        .from('tenant_settings')
        .select('allow_registration')
        .eq('allow_registration', false)
        .limit(1);

      const allowed = !settings || settings.length === 0;

      return new Response(JSON.stringify({ allowed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, fullName, clinicName, captchaAnswer, captchaToken, captchaTimestamp } = body;
    const errors: string[] = [];

    // Validate email
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('E-mail inválido');
    }
    if (email && email.trim().length > 255) {
      errors.push('E-mail muito longo');
    }

    // Validate password
    if (!password || typeof password !== 'string') {
      errors.push('Senha é obrigatória');
    } else {
      for (const rule of PASSWORD_RULES) {
        if (!rule.test(password)) errors.push(rule.msg);
      }
    }

    // Validate names
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      errors.push('Nome completo é obrigatório (mínimo 2 caracteres)');
    }
    if (fullName && fullName.trim().length > 100) {
      errors.push('Nome muito longo');
    }
    if (!clinicName || typeof clinicName !== 'string' || clinicName.trim().length < 2) {
      errors.push('Nome da clínica é obrigatório (mínimo 2 caracteres)');
    }
    if (clinicName && clinicName.trim().length > 100) {
      errors.push('Nome da clínica muito longo');
    }

    // Validate captcha server-side using HMAC token
    if (captchaAnswer == null || !captchaToken || !captchaTimestamp) {
      errors.push('Verificação de segurança é obrigatória');
    } else {
      // Check token expiry (5 minutes)
      const age = Date.now() - Number(captchaTimestamp);
      if (age > 5 * 60 * 1000) {
        errors.push('Verificação de segurança expirou. Recarregue a página.');
      } else {
        const expectedToken = await createHmac(`${Number(captchaAnswer)}:${captchaTimestamp}`);
        if (expectedToken !== captchaToken) {
          errors.push('Verificação de segurança incorreta');
        }
      }
    }

    // Honeypot check
    if (body.website && body.website.trim() !== '') {
      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check slug uniqueness
    if (clinicName && typeof clinicName === 'string' && errors.length === 0) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const slug = clinicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data: existing } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (existing) {
        errors.push('Já existe uma clínica com este nome. Escolha outro nome.');
      }
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ valid: false, errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ valid: false, errors: ['Requisição inválida'] }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
