import { useDashboardStats } from '@/hooks/useTenantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Package, Clock, TrendingUp, ArrowRight, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';

function StatSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-muted rounded-full" />
        <div className="h-8 w-8 bg-muted rounded-sm" />
      </div>
      <div className="h-8 w-16 bg-muted rounded-sm mb-2" />
      <div className="h-3 w-20 bg-muted rounded-full" />
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const navigate = useNavigate();

  const cards = [
    { label: 'Total Clientes', value: stats?.total_clients ?? 0, icon: Users, change: '+12%', trend: 'up' },
    { label: 'Agendamentos Hoje', value: stats?.appointments_today ?? 0, icon: Calendar, change: null, trend: null },
    { label: 'Esta Semana', value: stats?.appointments_week ?? 0, icon: TrendingUp, change: '+5%', trend: 'up' },
    { label: 'Pacotes Ativos', value: stats?.active_packages ?? 0, icon: Package, change: null, trend: null },
  ];

  return (
    <div className="space-y-12">
      {/* Onboarding Banner */}
      <OnboardingBanner />

      {/* Header */}
      <FadeIn direction="down" delay={0.1}>
        <div className="page-header flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="page-title italic">Dashboard</h2>
            <p className="page-description">Visão técnica e performática da sua unidade.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 px-3 py-1 border border-border">
            <Activity className="h-3 w-3 text-primary animate-pulse" /> Live System Monitor
          </div>
        </div>
      </FadeIn>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          cards.map((card) => (
            <FadeIn key={card.label} direction="up" className="stat-card group">
              <div className="flex items-start justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                  {card.label}
                </p>
                <div className="flex h-10 w-10 items-center justify-center bg-muted/50 border border-border transition-all duration-300 group-hover:bg-primary group-hover:border-primary group-hover:shadow-glow">
                  <card.icon className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tighter font-display italic">
                  {card.value}
                </span>
                {card.change && (
                  <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 border border-success/20">
                    {card.change}
                  </span>
                )}
              </div>
            </FadeIn>
          ))
        )}
      </StaggerContainer>

      {/* Section: Main Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <FadeIn delay={0.4} className="lg:col-span-2">
          <div className="bg-card border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/5 transition-colors hover:bg-muted/10">
              <div>
                <h3 className="text-xl font-bold font-display italic uppercase tracking-tight">Status da Agenda</h3>
                <p className="text-xs text-muted-foreground font-medium">Fila de atendimento em tempo real</p>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 rounded-none font-bold text-[10px] uppercase tracking-widest px-2 py-1">
                <Clock className="h-3 w-3" /> Hoje: {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
              </Badge>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted/50 border border-border animate-pulse" />
                  ))}
                </div>
              ) : !stats?.upcoming_appointments?.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/60">
                   <div className="w-16 h-16 bg-muted/30 flex items-center justify-center mb-4 transition-transform hover:rotate-12">
                     <Calendar className="h-8 w-8 text-muted-foreground/40" />
                   </div>
                   <h4 className="text-sm font-bold uppercase tracking-widest opacity-60">Null Data</h4>
                   <p className="text-xs text-muted-foreground mt-1">Nenhum registro encontrado para o período.</p>
                </div>
              ) : (
                <div className="table-container">
                  <div className="space-y-3 min-w-[500px] sm:min-w-0">
                    {stats.upcoming_appointments.map((apt, i) => (
                    <div
                      key={apt.id}
                      className="group flex flex-col gap-4 p-4 border border-border bg-background transition-all duration-300 hover:border-primary/40 hover:bg-muted/5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-muted group-hover:bg-primary/10 transition-colors">
                          <p className="text-xs font-black text-muted-foreground group-hover:text-primary">
                            #{i + 1}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-black font-display uppercase tracking-tight group-hover:text-primary transition-colors">
                            {apt.client_name}
                          </p>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                            {apt.service_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 sm:text-right border-t border-border pt-4 sm:border-0 sm:pt-0">
                        <div className="flex-1 sm:flex-none">
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[2px] mb-0.5">Horário</p>
                           <p className="text-sm font-black font-display italic">
                             {format(new Date(apt.scheduled_at), "HH:mm", { locale: ptBR })}
                           </p>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="w-px h-8 bg-border hidden sm:block" />
                           <Button variant="ghost" size="icon" className="group-hover:text-primary group-hover:bg-primary/5 transition-all">
                             <ArrowRight className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-muted/5 border-t border-border flex justify-between items-center">
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Logs de Sincronização: OK</span>
               <Button 
                variant="link" 
                className="text-[10px] font-black uppercase tracking-widest p-0 h-auto text-primary hover:no-underline hover:opacity-80"
                onClick={() => navigate('/appointments')}
              >
                 Ver Agenda Completa »
               </Button>
            </div>
          </div>
        </FadeIn>

        {/* Sidebar Mini-Content */}
        <FadeIn delay={0.6}>
           <div className="space-y-6">
              <div className="p-6 border border-border bg-card">
                 <h3 className="text-xs font-black uppercase tracking-[3px] text-muted-foreground mb-4 font-display italic">Atalho Rápido</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     <Button 
                      variant="outline" 
                      className="h-14 sm:h-auto flex-row sm:flex-col p-4 gap-4 sm:gap-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all justify-start sm:justify-center"
                      onClick={() => navigate('/clients')}
                    >
                        <Users className="h-5 w-5 sm:h-4 sm:w-4 opacity-40 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Cliente</span>
                     </Button>
                     <Button 
                      variant="outline" 
                      className="h-14 sm:h-auto flex-row sm:flex-col p-4 gap-4 sm:gap-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all justify-start sm:justify-center"
                      onClick={() => navigate('/appointments')}
                    >
                        <Calendar className="h-5 w-5 sm:h-4 sm:w-4 opacity-40 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Agenda</span>
                     </Button>
                  </div>
              </div>
           </div>
        </FadeIn>
      </div>
    </div>
  );
}
