import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, Save, User, CalendarDays, Activity, ChevronRight, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';

const DAYS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

interface BusinessHour {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
}

function useStaffMembers() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, role').order('full_name');
      if (error) throw error;
      return data as StaffMember[];
    },
    enabled: !!profile,
  });
}

function useBusinessHours(staffId?: string) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['business-hours', staffId],
    queryFn: async () => {
      let q = supabase.from('business_hours').select('*').order('day_of_week');
      if (staffId) q = q.eq('staff_id', staffId);
      const { data, error } = await q;
      if (error) throw error;
      return data as BusinessHour[];
    },
    enabled: !!profile && !!staffId,
  });
}

export default function BusinessHoursPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: staff = [], isLoading: staffLoading } = useStaffMembers();
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const { data: hours = [], isLoading: hoursLoading } = useBusinessHours(selectedStaff);
  const [localHours, setLocalHours] = useState<Record<number, { start_time: string; end_time: string; active: boolean }>>({});
  const [saving, setSaving] = useState(false);

  const effectiveHours = DAYS.map((day) => {
    const existing = hours.find((h) => h.day_of_week === day.value);
    const local = localHours[day.value];
    return {
      day_of_week: day.value,
      label: day.label,
      short: day.short,
      start_time: local?.start_time ?? existing?.start_time ?? '09:00',
      end_time: local?.end_time ?? existing?.end_time ?? '18:00',
      active: local?.active ?? existing?.active ?? (day.value >= 1 && day.value <= 5),
      existingId: existing?.id,
    };
  });

  const updateLocal = (dayOfWeek: number, field: string, value: any) => {
    const current = effectiveHours.find((h) => h.day_of_week === dayOfWeek)!;
    setLocalHours((prev) => ({
      ...prev,
      [dayOfWeek]: {
        start_time: current.start_time,
        end_time: current.end_time,
        active: current.active,
        ...prev[dayOfWeek],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedStaff || !profile) return;
    setSaving(true);
    try {
      for (const h of effectiveHours) {
        const payload = {
          start_time: h.start_time,
          end_time: h.end_time,
          active: h.active,
        };
        if (h.existingId) {
          const { error } = await supabase.from('business_hours').update(payload).eq('id', h.existingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('business_hours').insert({
            ...payload,
            tenant_id: profile.tenant_id,
            staff_id: selectedStaff,
            day_of_week: h.day_of_week,
          });
          if (error) throw error;
        }
      }
      qc.invalidateQueries({ queryKey: ['business-hours', selectedStaff] });
      setLocalHours({});
      toast.success('Ciclo de disponibilidade sincronizado');
    } catch (err: any) {
      toast.error(err.message || 'Erro de sincronização');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <FadeIn direction="down">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-border pb-8">
          <div className="page-header">
            <h2 className="page-title italic">Configurar Ciclos</h2>
            <p className="page-description">Sincronização de janelas de disponibilidade e escalas.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 items-center px-4 bg-muted/10 border border-border">
              <Activity className="h-3.5 w-3.5 text-primary animate-pulse mr-2.5" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-3">Status:</span>
              <span className="text-xs font-bold font-mono">ACTIVE_SCHEDULER</span>
            </div>
            {selectedStaff && (
              <Button onClick={handleSave} disabled={saving} className="btn-premium h-12 px-10 font-black uppercase tracking-widest italic text-[10px]">
                <Save className="mr-3 h-4 w-4" />
                {saving ? 'PROCESSANDO...' : 'EXECUTAR COMMIT'}
              </Button>
            )}
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 space-y-8">
          <FadeIn direction="right" delay={0.1}>
            <Card className="stat-card p-0 overflow-hidden border-border bg-muted/2">
              <CardHeader className="p-8 border-b border-border bg-muted/5">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Operador / Atendente</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60">Selecionar Objeto Pessoal</Label>
                    <Select value={selectedStaff} onValueChange={(v) => { setSelectedStaff(v); setLocalHours({}); }}>
                      <SelectTrigger className="w-full h-14 bg-background border-border/80 font-mono text-[11px] font-bold uppercase transition-all focus:ring-primary/20">
                        <SelectValue placeholder="LISTA DE ATENDENTES..." />
                      </SelectTrigger>
                      <SelectContent className="border-border/60">
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="font-mono text-xs uppercase tracking-tighter hover:bg-primary/5">
                            {s.full_name} <span className="opacity-30 italic">// {s.role}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-6 bg-muted/3 border border-dashed border-border rounded-xl">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[2px] mb-4 italic flex items-center gap-2">
                       <Hash className="h-3 w-3" /> Guia de Operação
                    </p>
                    <ul className="space-y-3">
                      <li className="text-[11px] text-muted-foreground leading-relaxed flex gap-3">
                        <span className="text-primary font-black shrink-0">01.</span> 
                        Arquitetura de horários processada localmente antes do commit.
                      </li>
                      <li className="text-[11px] text-muted-foreground leading-relaxed flex gap-3">
                        <span className="text-primary font-black shrink-0">02.</span> 
                        Alterações no ciclo semanal refletem instantaneamente no agendamento público.
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        <div className="lg:col-span-8">
          {!selectedStaff ? (
            <FadeIn delay={0.2} className="h-full">
              <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-border/40 rounded-3xl bg-muted/2 transition-colors hover:bg-muted/5 group">
                <div className="w-20 h-20 bg-muted/10 flex items-center justify-center border border-border/60 mb-8 rotate-45 group-hover:rotate-90 transition-transform">
                   <CalendarDays className="h-10 w-10 text-muted-foreground/20 -rotate-45 group-hover:-rotate-90 transition-transform" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground/40 italic">Aguardando Parâmetro de Atendente</h4>
                <p className="text-xs text-muted-foreground/30 mt-3 italic tracking-tight font-medium">Selecione um operador para visualizar a matriz de horários.</p>
              </div>
            </FadeIn>
          ) : (
            <FadeIn direction="left" delay={0.1}>
              <Card className="stat-card p-0 overflow-hidden border-border bg-background">
                <CardHeader className="p-8 border-b border-border bg-muted/2">
                   <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-primary" />
                      <CardTitle className="text-xl font-black font-display uppercase tracking-tighter italic">Matriz Semanal de Atendimento</CardTitle>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                  {hoursLoading ? (
                    <div className="p-10 space-y-4">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 w-full bg-muted/10 animate-pulse border border-border" />
                      ))}
                    </div>
                  ) : (
                    <StaggerContainer className="divide-y divide-border/40">
                      {effectiveHours.map((h) => (
                        <FadeIn key={h.day_of_week} direction="up" className={cn(
                          "group relative p-8 transition-all duration-500",
                          h.active ? "bg-background hover:bg-muted/3" : "bg-muted/1 opacity-40 grayscale"
                        )}>
                          <div className={cn(
                            "absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500",
                            !h.active && "bg-muted-foreground/20"
                          )} />
                          
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="flex items-center gap-6 min-w-[200px]">
                              <Switch 
                                checked={h.active} 
                                onCheckedChange={(v) => updateLocal(h.day_of_week, 'active', v)}
                                className="data-[state=checked]:bg-primary"
                              />
                              <div className="space-y-0.5">
                                <h4 className="text-[11px] font-black uppercase tracking-[2px] group-hover:text-primary transition-colors">{h.label}</h4>
                                <span className="text-[9px] font-mono text-muted-foreground/40 italic uppercase tracking-tighter">Day Vector: 0{h.day_of_week}</span>
                              </div>
                            </div>

                            {h.active ? (
                              <div className="flex items-center gap-6 flex-1 max-w-md">
                                <div className="relative flex-1 group/input">
                                  <div className="absolute -top-6 left-0 text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover/input:text-primary transition-colors flex items-center gap-1.5">
                                     <div className="w-1 h-1 bg-primary/40 rounded-full" /> Início Expediente
                                  </div>
                                  <Input
                                    type="time"
                                    value={h.start_time.slice(0, 5)}
                                    onChange={(e) => updateLocal(h.day_of_week, 'start_time', e.target.value)}
                                    className="h-14 bg-muted/2 border-border/60 text-sm font-mono font-bold text-center italic transition-all hover:border-primary/30 focus:border-primary/60 outline-none"
                                  />
                                </div>
                                
                                <ChevronRight className="h-4 w-4 text-muted-foreground/20 shrink-0" />
                                
                                <div className="relative flex-1 group/input">
                                  <div className="absolute -top-6 left-0 text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover/input:text-primary transition-colors flex items-center gap-1.5">
                                      <div className="w-1 h-1 bg-primary/40 rounded-full" /> Final Atividades
                                  </div>
                                  <Input
                                    type="time"
                                    value={h.end_time.slice(0, 5)}
                                    onChange={(e) => updateLocal(h.day_of_week, 'end_time', e.target.value)}
                                    className="h-14 bg-muted/2 border-border/60 text-sm font-mono font-bold text-center italic transition-all hover:border-primary/30 focus:border-primary/60 outline-none"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center p-4 border border-dashed border-border/40 bg-muted/2 rounded-lg">
                                <span className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground/20 italic">VETOR_OFF: INDISPONÍVEL</span>
                              </div>
                            )}
                          </div>
                        </FadeIn>
                      ))}
                    </StaggerContainer>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </div>
      </div>
    </div>
  );
}
