import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpRight, ArrowDownLeft, Activity, Filter, BarChart3, PieChart } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';

interface CashFlowData {
  total_income: number;
  total_expense: number;
  balance: number;
  daily_flow: Array<{ day: string; label: string; income: number; expense: number; net: number }>;
  by_category: Array<{ category: string; type: string; total: number }>;
}

const PERIODS = [
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: '90d', label: '90 dias', days: 90 },
  { key: '365d', label: '1 ano', days: 365 },
] as const;

const flowConfig: ChartConfig = {
  income: { label: 'Entradas', color: '#FF4B91' },
  expense: { label: 'Saídas', color: '#404040' },
};

const netConfig: ChartConfig = {
  net: { label: 'Saldo', color: '#FF4B91' },
};

export default function CashFlow() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState('30d');
  const days = PERIODS.find(p => p.key === period)?.days ?? 30;

  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow', days],
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - days);
      const { data, error } = await supabase.rpc('get_cash_flow' as any, {
        p_start_date: start.toISOString().split('T')[0],
        p_end_date: new Date().toISOString().split('T')[0],
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
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-border pb-8">
          <div className="page-header">
            <h2 className="page-title italic">Fluxo de Caixa</h2>
            <p className="page-description">Análise técnica de liquidez e movimentação patrimonial.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex h-12 items-center px-4 bg-muted/10 border border-border">
                <Activity className="h-3.5 w-3.5 text-primary animate-pulse mr-2.5" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-3">Status:</span>
                <span className="text-xs font-bold font-mono">LIVE_DATA_FEED</span>
             </div>
             <div className="flex gap-1.5 rounded-none bg-muted/5 border border-border p-1">
               {PERIODS.map(p => (
                 <Button key={p.key} variant="ghost" size="sm" onClick={() => setPeriod(p.key)}
                   className={cn('h-10 px-6 text-[10px] font-black uppercase tracking-widest transition-all duration-300', 
                     period === p.key ? 'bg-primary text-white shadow-glow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10')}>
                   {p.label}
                 </Button>
               ))}
             </div>
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
          <CardHeader className="p-10 border-b border-border bg-muted/2">
             <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl font-black font-display uppercase tracking-tighter italic">Comportamento de Fluxo Diário</CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-10">
            {isLoading ? <div className="loading-skeleton h-[400px] w-full" /> : !data?.daily_flow?.length ? (
              <div className="py-24 text-center border-2 border-dashed border-border/40 rounded-3xl group">
                 <div className="w-16 h-16 bg-muted/10 border border-border mx-auto mb-6 flex items-center justify-center rotate-45 group-hover:rotate-90 transition-transform duration-700">
                    <Activity className="h-8 w-8 text-muted-foreground/20 -rotate-45 group-hover:-rotate-90 transition-transform duration-700" />
                 </div>
                 <h4 className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground/40 italic">Null Data Matrix</h4>
                 <p className="text-xs text-muted-foreground/20 mt-2 italic">Aguardando injeção de transações no banco de dados.</p>
              </div>
            ) : (
                <ChartContainer config={flowConfig} className="h-[400px] w-full mt-6">
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
            <CardHeader className="p-8 border-b border-border bg-muted/3">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Evolução do Saldo Projetado</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              {!data?.daily_flow?.length ? (
                <div className="py-20 text-center"><p className="text-[10px] font-black uppercase text-muted-foreground/20 italic">Vetor Vazio</p></div>
              ) : (
                <ChartContainer config={netConfig} className="h-[300px] w-full">
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
            <CardHeader className="p-8 border-b border-border bg-muted/3">
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Análise de Segmentos Financeiros</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
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
