import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, BarChart3, Users, TrendingUp } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { cn } from '@/lib/utils';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';
import { Activity, Clock } from 'lucide-react';

interface ReportsData {
  monthly_revenue: Array<{ month: string; label: string; revenue: number; sessions: number }>;
  total_revenue: number;
  total_sessions: number;
  recurrence_rate: number;
  top_services: Array<{ name: string; count: number; revenue: number }>;
}

const PERIODS = [
  { key: '1m', label: 'Último mês', months: 1 },
  { key: '3m', label: '3 meses', months: 3 },
  { key: '6m', label: '6 meses', months: 6 },
  { key: '12m', label: '1 ano', months: 12 },
] as const;

function useReportsData(months: number) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['reports-data', months],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      const { data, error } = await supabase.rpc('get_reports_data' as any, {
        p_start_date: startDate.toISOString(),
        p_end_date: new Date().toISOString(),
      });
      if (error) throw error;
      return data as ReportsData;
    },
    enabled: !!profile,
  });
}

const revenueConfig: ChartConfig = {
  revenue: { label: 'Receita', color: 'hsl(var(--primary))' },
};

const sessionsConfig: ChartConfig = {
  sessions: { label: 'Sessões', color: 'hsl(var(--success))' },
};

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--accent-foreground))',
  'hsl(var(--muted-foreground))',
];

export default function Reports() {
  const [period, setPeriod] = useState<string>('12m');
  const months = PERIODS.find((p) => p.key === period)?.months ?? 12;
  const { data, isLoading } = useReportsData(months);

  const stats = [
    {
      label: 'Receita no Período',
      value: `R$ ${(data?.total_revenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      bg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Sessões no Período',
      value: data?.total_sessions ?? 0,
      icon: BarChart3,
      bg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      label: 'Taxa de Recorrência',
      value: `${data?.recurrence_rate ?? 0}%`,
      icon: Users,
      bg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
  ];

  return (
    <div className="space-y-12">
      <FadeIn direction="down">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-border pb-8">
          <div className="page-header">
            <h2 className="page-title italic">Relatórios</h2>
            <p className="page-description">Análise profunda de métricas e performance de ativos.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border border-border">
              <Activity className="h-3.5 w-3.5 text-primary animate-pulse mr-1" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">Intervalo:</span>
              <div className="flex gap-1 bg-background/50 p-1 border border-border/40">
                {PERIODS.map((p) => (
                  <Button
                    key={p.key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setPeriod(p.key)}
                    className={cn(
                      'h-8 px-3 text-[10px] font-black rounded-none transition-all uppercase tracking-widest',
                      period === p.key
                        ? 'bg-primary text-white shadow-glow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <FadeIn key={s.label} direction="up" delay={i * 0.1}>
            <div className="stat-card group hover:border-primary/40 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 group-hover:text-primary transition-colors">{s.label}</span>
                <div className={cn("w-10 h-10 flex items-center justify-center border transition-all duration-300", s.bg, s.iconColor, "group-hover:bg-primary group-hover:text-white group-hover:border-primary")}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                {isLoading ? (
                  <div className="h-9 w-24 bg-muted animate-pulse" />
                ) : (
                  <p className="text-3xl font-black font-display italic tracking-tighter text-foreground">{s.value}</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                Métrica consolidada do período {PERIODS.find(p => p.key === period)?.label}
              </div>
            </div>
          </FadeIn>
        ))}
      </StaggerContainer>

      <FadeIn delay={0.4}>
        <Card className="stat-card p-0 overflow-hidden">
          <CardHeader className="p-8 border-b border-border bg-muted/5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-xl font-black font-display uppercase tracking-tight italic">Fluxo de Receita Mensal</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {isLoading ? (
              <div className="loading-skeleton h-[300px] w-full" />
            ) : !data?.monthly_revenue?.length ? (
              <div className="empty-state py-10">
                <div className="empty-state-icon"><TrendingUp className="h-7 w-7 text-muted-foreground" /></div>
                <p className="empty-state-title">Sem dados ainda</p>
                <p className="empty-state-description">Complete agendamentos para ver os relatórios.</p>
              </div>
            ) : (
              <ChartContainer config={revenueConfig} className="h-[300px] w-full">
                <BarChart data={data.monthly_revenue} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeIn direction="right">
          <Card className="stat-card p-0 overflow-hidden">
            <CardHeader className="p-6 border-b border-border bg-muted/5">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Sessões Mensais</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="loading-skeleton h-[250px] w-full" />
              ) : !data?.monthly_revenue?.length ? (
                <div className="empty-state py-8"><p className="empty-state-title">Sem dados</p></div>
              ) : (
                <ChartContainer config={sessionsConfig} className="h-[250px] w-full">
                  <LineChart data={data.monthly_revenue} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="sessions" stroke="var(--color-sessions)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn direction="left">
          <Card className="stat-card p-0 overflow-hidden">
            <CardHeader className="p-6 border-b border-border bg-muted/5">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Serviços Populares</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="loading-skeleton h-[250px] w-full" />
              ) : !data?.top_services?.length ? (
                <div className="empty-state py-8"><p className="empty-state-title">Sem dados</p></div>
              ) : (
                <div className="space-y-3">
                  {data.top_services.map((svc, i) => (
                    <div key={svc.name} className="flex items-center gap-4 p-3 bg-muted/5 border border-border/50 hover:border-primary/20 hover:bg-muted/10 transition-all duration-300 group">
                      <div
                        className="h-8 w-1 flex shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase tracking-tight group-hover:text-primary transition-colors">{svc.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{svc.count} sessões identificadas</p>
                      </div>
                      <p className="text-sm font-black font-mono italic tracking-tighter text-primary">
                        {svc.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
