import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Gem, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '@/lib/branding';

const STEP_CONFIG: Record<string, { label: string; icon: React.ElementType; route: string }> = {
  service: { label: 'Cadastrar serviço', icon: Gem, route: '/services' },
  hours: { label: 'Configurar horários', icon: Clock, route: '/business-hours' },
  client: { label: 'Adicionar cliente', icon: Users, route: '/clients' },
};

export function OnboardingBanner() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: setupStatus } = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const tenantId = profile!.tenant_id;

      const [services, hours, clients, tenant] = await Promise.all([
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('active', true),
        supabase.from('business_hours').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('active', true),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('tenants').select('onboarding_skipped_steps').eq('id', tenantId).maybeSingle(),
      ]);

      const missing: string[] = [];
      if ((services.count ?? 0) === 0) missing.push('service');
      if ((hours.count ?? 0) === 0) missing.push('hours');
      if ((clients.count ?? 0) === 0) missing.push('client');

      return { missing, skipped: (tenant.data as any)?.onboarding_skipped_steps || [] };
    },
    enabled: !!profile && profile.role === 'admin',
    staleTime: 60_000,
  });

  if (!setupStatus || setupStatus.missing.length === 0) return null;

  return (
    <Card className="border-warning/30 bg-warning/5 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/15">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Configuração incompleta</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Finalize a configuração para usar todo o potencial da {APP_NAME}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {setupStatus.missing.map(key => {
            const cfg = STEP_CONFIG[key];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-warning/30 hover:bg-warning/10"
                onClick={() => navigate(cfg.route)}
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
                <ArrowRight className="h-3 w-3" />
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
