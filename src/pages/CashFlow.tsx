import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, Activity, Filter, BarChart3 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';
import {
  CashFlowDateRangeFilter,
  CASH_FLOW_RANGE_STORAGE_KEY,
  getDefaultCashFlowRange,
} from '@/components/cash-flow/CashFlowDateRangeFilter';

interface CashFlowData {
  total_income: number;
  total_expense: number;
  balance: number;
  daily_flow: Array<{ day: string; label: string; income: number; expense: number; net: number }>;
  by_category: Array<{ category: string; type: string; total: number }>;
}

const flowConfig: ChartConfig = {
  income: { label: 'Entradas', color: '#FF4B91' },
  expense: { label: 'Saídas', color: '#404040' },
};

const netConfig: ChartConfig = {
  net: { label: 'Saldo', color: '#FF4B91' },
};

function readStoredCashFlowRange(): { start: string; end: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CASH_FLOW_RANGE_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { start?: unknown; end?: unknown };
    if (typeof p.start === 'string' && typeof p.end === 'string') return { start: p.start, end: p.end };
  } catch {
    /* ignore */
  }
  return null;
}

export default function CashFlow() {
  const { profile } = useAuth();
  const [startDate, setStartDate] = useState(() => readStoredCashFlowRange()?.start ?? getDefaultCashFlowRange().start);
  const [endDate, setEndDate] = useState(() => readStoredCashFlowRange()?.end ?? getDefaultCashFlowRange().end);

  useEffect(() => {
    try {
      sessionStorage.setItem(CASH_FLOW_RANGE_STORAGE_KEY, JSON.stringify({ start: startDate, end: endDate }));
    } catch {
      /* ignore */
    }
  }, [startDate, endDate]);

  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cash_flow' as any, {
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) throw error;
      return data as CashFlowData;
    },
    enabled: !!profile,
  });

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const incomeCategories = (data?.by_category || []).filter(c => c.type === 'income');
  const expenseCategories = (data?.by_category || []).filter(c => c.type === 'expense');

  return (
    <div className="space-y-10 pb-20">
      <FadeIn direction="down">
        <div className="space-y-6 border-b border-border pb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="page-header min-w-0">
              <h2 className="page-title italic">Fluxo de Caixa</h2>
              <p className="page-description">Análise técnica de liquidez e movimentação patrimonial.</p>
            </div>
            <div className="flex h-12 shrink-0 items-center px-4 bg-muted/10 border border-border">
              <Activity className="h-3.5 w-3.5 text-primary animate-pulse mr-2.5" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-3">
                Período:
              </span>
              <span className="text-xs font-bold font-mono truncate max-w-[200px] md:max-w-none" title={`${startDate} → ${endDate}`}>
                {startDate} → {endDate}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/5 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Filtrar por intervalo
            </p>
            <CashFlowDateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onRangeChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              onReset={() => {
                const d = getDefaultCashFlowRange();
                setStartDate(d.start);
                setEndDate(d.end);
              }}
            />
          </div>
        </div>
      </FadeIn>

      {/* Summary Cards */}
      <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <FadeIn direction="up">
          <div className="stat-card group hover:border-emerald-500/40 relative overflow-hidden transition-all duration-500">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <ArrowUpRight className="h-20 w-20 text-emerald-500" />
             </div>
             <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 group-hover:text-emerald-500 transition-colors">Entradas Operacionais</span>
                <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                   <TrendingUp className="h-6 w-6" />
                </div>
             </div>
             {isLoading ? <div className="loading-skeleton h-10 w-40" /> : (
               <p className="text-3xl font-black font-display tracking-tighter italic text-emerald-600">
                 {fmt(data?.total_income ?? 0)}
               </p>
             )}
             <div className="mt-6 pt-6 border-t border-border/50 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[2px] italic">
               Vetor de Recebíveis
             </div>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.1}>
          <div className="stat-card group hover:border-destructive/40 relative overflow-hidden transition-all duration-500">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <ArrowDownLeft className="h-20 w-20 text-destructive" />
             </div>
             <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 group-hover:text-destructive transition-colors">Fluxo de Desembolso</span>
                <div className="w-12 h-12 bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20 group-hover:bg-destructive group-hover:text-white transition-all duration-500">
                   <TrendingDown className="h-6 w-6" />
                </div>
             </div>
             {isLoading ? <div className="loading-skeleton h-10 w-40" /> : (
               <p className="text-3xl font-black font-display tracking-tighter italic text-destructive">
                 {fmt(data?.total_expense ?? 0)}
               </p>
             )}
             <div className="mt-6 pt-6 border-t border-border/50 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[2px] italic">
               Passivos e Custos Operacionais
             </div>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.2}>
          <div className={cn("stat-card group relative overflow-hidden transition-all duration-500", (data?.balance ?? 0) >= 0 ? "hover:border-primary/40" : "hover:border-destructive/40")}>
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet className="h-20 w-20 text-primary" />
             </div>
             <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 group-hover:text-primary transition-colors">Saldo Técnico</span>
                <div className={cn("w-12 h-12 flex items-center justify-center border border-border transition-all duration-500", 
                   (data?.balance ?? 0) >= 0 ? "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary group-hover:text-white" : "bg-destructive/10 text-destructive border-destructive/20 group-hover:bg-destructive group-hover:text-white")}>
                   <Wallet className="h-6 w-6" />
                </div>
             </div>
             {isLoading ? <div className="loading-skeleton h-10 w-40" /> : (
               <p className={cn("text-3xl font-black font-display tracking-tighter italic", (data?.balance ?? 0) >= 0 ? 'text-primary' : 'text-destructive')}>
                 {fmt(data?.balance ?? 0)}
               </p>
             )}
             <div className="mt-6 pt-6 border-t border-border/50 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[2px] italic">
               Liquidez Consolidada do Período
             </div>
          </div>
        </FadeIn>
      </StaggerContainer>

      {/* Main Analysis Chart */}
      <FadeIn delay={0.4}>
        <Card className="stat-card p-0 border-border overflow-hidden bg-background">
          <CardHeader className="p-4 sm:p-8 lg:p-10 border-b border-border bg-muted/2">
             <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base sm:text-xl lg:text-2xl font-black font-display uppercase tracking-tighter italic">
                  Comportamento de Fluxo Diário
                </CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-8 lg:p-10">
            {isLoading ? <div className="loading-skeleton h-[260px] sm:h-[360px] lg:h-[400px] w-full" /> : !data?.daily_flow?.length ? (
              <div className="py-24 text-center border-2 border-dashed border-border/40 rounded-3xl group">
                 <div className="w-16 h-16 bg-muted/10 border border-border mx-auto mb-6 flex items-center justify-center rotate-45 group-hover:rotate-90 transition-transform duration-700">
                    <Activity className="h-8 w-8 text-muted-foreground/20 -rotate-45 group-hover:-rotate-90 transition-transform duration-700" />
                 </div>
                 <h4 className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground/40 italic">Null Data Matrix</h4>
                 <p className="text-xs text-muted-foreground/20 mt-2 italic">Aguardando injeção de transações no banco de dados.</p>
              </div>
            ) : (
                <ChartContainer config={flowConfig} className="h-[260px] sm:h-[360px] lg:h-[400px] w-full mt-4 sm:mt-6">
                <BarChart data={data.daily_flow} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: '900', fill: 'rgba(255,255,255,0.4)' }} 
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: '900', fill: 'rgba(255,255,255,0.4)' }} 
                    tickFormatter={(v) => `R$${v}`} 
                  />
                  <ChartTooltip content={<ChartTooltipContent className="bg-background/95 border-border shadow-2xl font-mono text-[10px] uppercase" />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[2, 2, 0, 0]} barSize={20} />
                  <Bar dataKey="expense" fill="var(--color-expense)" radius={[2, 2, 0, 0]} barSize={20} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Balance Evolution */}
        <FadeIn direction="right" delay={0.1}>
          <Card className="stat-card p-0 border-border overflow-hidden bg-background">
            <CardHeader className="p-4 sm:p-6 lg:p-8 border-b border-border bg-muted/3">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Evolução do Saldo Projetado</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-8 lg:p-10">
              {!data?.daily_flow?.length ? (
                <div className="py-20 text-center"><p className="text-[10px] font-black uppercase text-muted-foreground/20 italic">Vetor Vazio</p></div>
              ) : (
                <ChartContainer config={netConfig} className="h-[220px] sm:h-[260px] lg:h-[300px] w-full">
                  <AreaChart data={data.daily_flow} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradientNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-net)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--color-net)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: 'rgba(255,255,255,0.2)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: 'rgba(255,255,255,0.2)' }} tickFormatter={(v) => `R$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2} fillOpacity={1} fill="url(#gradientNet)" />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Categories Analysis */}
        <FadeIn direction="left" delay={0.1}>
          <Card className="stat-card p-0 border-border overflow-hidden bg-background">
            <CardHeader className="p-4 sm:p-6 lg:p-8 border-b border-border bg-muted/3">
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Análise de Segmentos Financeiros</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 lg:p-8 space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black uppercase tracking-[2px] text-emerald-500 italic">Major Assets // Entradas</p>
                   <span className="h-[1px] flex-1 mx-4 bg-emerald-500/10" />
                </div>
                {!incomeCategories.length ? (
                  <div className="text-xs text-muted-foreground/30 italic uppercase tracking-tighter p-4 border border-dashed border-border/40 rounded-lg text-center">Nenhum evento capturado</div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {incomeCategories.map(c => (
                      <div key={c.category} className="group flex items-center justify-between p-4 hover:bg-emerald-500/5 transition-all duration-300">
                        <div className="flex items-center gap-4">
                           <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20" />
                           <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">{c.category}</span>
                        </div>
                        <span className="text-xs font-black font-mono tracking-tighter italic text-emerald-600 group-hover:scale-110 transition-transform">{fmt(Number(c.total))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black uppercase tracking-[2px] text-destructive/60 italic">Critical Liabilities // Saídas</p>
                   <span className="h-[1px] flex-1 mx-4 bg-destructive/10" />
                </div>
                {!expenseCategories.length ? (
                  <div className="text-xs text-muted-foreground/30 italic uppercase tracking-tighter p-4 border border-dashed border-border/40 rounded-lg text-center">Fluxo zerado</div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {expenseCategories.map(c => (
                      <div key={c.category} className="group flex items-center justify-between p-4 hover:bg-destructive/5 transition-all duration-300">
                        <div className="flex items-center gap-4">
                           <div className="h-1.5 w-1.5 bg-destructive rounded-full shadow-lg shadow-destructive/20" />
                           <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">{c.category}</span>
                        </div>
                        <span className="text-xs font-black font-mono tracking-tighter italic text-destructive group-hover:scale-110 transition-transform">{fmt(Number(c.total))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
