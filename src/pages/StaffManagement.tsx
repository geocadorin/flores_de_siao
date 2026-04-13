import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServices } from '@/hooks/useTenantData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';
import { cn } from '@/lib/utils';
import { UserCog, Gem, Clock, Plus, Trash2, Shield, Activity, Calendar } from 'lucide-react';

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
}

interface StaffService {
  id: string;
  staff_id: string;
  service_id: string;
  services: { name: string } | null;
}

interface BusinessHour {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

const DAY_LABELS: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

function useStaffMembers() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, role, phone').order('full_name');
      if (error) throw error;
      return data as StaffMember[];
    },
    enabled: !!profile,
  });
}

function useAllStaffServices() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['staff-services-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_services').select('*, services(name)');
      if (error) throw error;
      return data as StaffService[];
    },
    enabled: !!profile,
  });
}

function useAllBusinessHours() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['business-hours-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_hours').select('*').eq('active', true).order('day_of_week');
      if (error) throw error;
      return data as BusinessHour[];
    },
    enabled: !!profile,
  });
}

export default function StaffManagement() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: staff = [], isLoading: staffLoading } = useStaffMembers();
  const { data: services = [] } = useServices();
  const { data: staffServices = [] } = useAllStaffServices();
  const { data: allHours = [] } = useAllBusinessHours();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const assignMutation = useMutation({
    mutationFn: async ({ staffId, serviceIds }: { staffId: string; serviceIds: string[] }) => {
      // Get current assignments for this staff
      const currentIds = staffServices.filter(ss => ss.staff_id === staffId).map(ss => ss.service_id);
      const toAdd = serviceIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !serviceIds.includes(id));

      // Remove unchecked
      if (toRemove.length > 0) {
        const { error } = await supabase.from('staff_services')
          .delete()
          .eq('staff_id', staffId)
          .in('service_id', toRemove);
        if (error) throw error;
      }

      // Add new
      if (toAdd.length > 0) {
        const rows = toAdd.map(serviceId => ({
          tenant_id: profile!.tenant_id,
          staff_id: staffId,
          service_id: serviceId,
        }));
        const { error } = await supabase.from('staff_services').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-services-all'] });
      toast.success('Serviços atribuídos com sucesso!');
      setAssignOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atribuir serviços'),
  });

  const openAssign = (staffMember: StaffMember) => {
    setSelectedStaffId(staffMember.id);
    const current = staffServices.filter(ss => ss.staff_id === staffMember.id).map(ss => ss.service_id);
    setSelectedServices(current);
    setAssignOpen(true);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const getStaffServices = (staffId: string) => staffServices.filter(ss => ss.staff_id === staffId);
  const getStaffHours = (staffId: string) => allHours.filter(h => h.staff_id === staffId);

  return (
    <div className="space-y-10">
      <FadeIn>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[4px] text-primary mb-2 font-display italic">Estrutura Organizacional</h3>
            <h2 className="text-4xl font-black font-display uppercase tracking-tight italic">
              Operadores & Atendentes
            </h2>
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest mt-2">
              Gestão de perfis técnicos, privilégios e atribuições de serviço.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Sincronização Ativa</p>
               <p className="text-sm font-bold text-primary italic">SISTEMA_OPERACIONAL</p>
             </div>
             <div className="w-[2px] h-10 bg-border hidden sm:block" />
             <Button variant="outline" className="btn-premium h-14 px-6 border-border hover:bg-muted/5 font-bold uppercase tracking-widest text-xs">
               Exploitar Logs
             </Button>
          </div>
        </div>
      </FadeIn>

      {staffLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="bg-muted/10 h-64 border border-border animate-pulse" />)}
        </div>
      ) : !staff.length ? (
        <FadeIn>
           <div className="flex flex-col items-center justify-center py-32 text-center glass-panel border-dashed">
            <div className="w-20 h-20 bg-muted/20 flex items-center justify-center mb-6">
              <UserCog className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h4 className="text-xl font-black font-display uppercase tracking-tight italic mb-2">Quadro Técnico Vazio</h4>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest max-w-xs">Nenhum operador registrado no sistema local.</p>
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => {
            const memberServices = getStaffServices(member.id);
            const memberHours = getStaffHours(member.id);
            return (
              <FadeIn key={member.id}>
                <div className="group relative bg-card border border-border p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-premium overflow-hidden">
                  {/* Decorative ID Card Elements */}
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Shield className="h-12 w-12 text-primary" />
                  </div>
                  
                  {/* Profile Header */}
                  <div className="flex items-start gap-4 mb-8">
                    <div className="relative">
                      <div className="w-16 h-16 bg-muted/20 border border-border flex items-center justify-center text-xl font-black font-display italic text-primary group-hover:bg-primary/5 transition-colors">
                        {getInitials(member.full_name)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary border-4 border-card" title="Status Online" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 font-mono">OP_CODE_{member.id.slice(0, 4)}</span>
                      </div>
                      <h4 className="text-xl font-black font-display uppercase tracking-tight italic group-hover:text-primary transition-colors truncate">
                        {member.full_name}
                      </h4>
                      <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[2px] mt-1 italic">
                        {member.role}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                    {/* Services Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
                          <Gem className="h-3 w-3 text-primary/50" /> Protocolos Atribuídos
                        </p>
                        <Button variant="ghost" className="h-6 text-[10px] font-black uppercase tracking-widest text-primary px-2 border border-transparent hover:border-primary/20 hover:bg-primary/5" onClick={() => openAssign(member)}>
                          <Plus className="h-3 w-3 mr-1" /> Editar
                        </Button>
                      </div>
                      
                      {memberServices.length === 0 ? (
                        <div className="p-3 border border-dashed border-border bg-muted/5">
                           <p className="text-[10px] font-bold text-muted-foreground/40 italic uppercase text-center">Nenhum protocolo parametrizado</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {memberServices.map(ss => (
                            <div key={ss.id} className="px-2.5 py-1 bg-muted/20 border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 group-hover:border-primary/20 transition-colors">
                              {ss.services?.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hours/Schedule Section */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2 font-display italic">
                        <Activity className="h-3 w-3 text-primary/50" /> Janela de Operação
                      </p>
                      
                      {memberHours.length === 0 ? (
                        <div className="p-3 border border-dashed border-border bg-muted/5">
                           <p className="text-[10px] font-bold text-muted-foreground/40 italic uppercase text-center">Cronograma não definido</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {memberHours.map(h => (
                            <div key={h.id} className="p-2 bg-muted/10 border border-border/50 flex items-center gap-2">
                               <div className="text-[9px] font-black text-primary/40 uppercase">{DAY_LABELS[h.day_of_week]}</div>
                               <div className="text-[10px] font-bold text-muted-foreground uppercase">{h.start_time.slice(0, 5)} - {h.end_time.slice(0, 5)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Background Accent */}
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary/20 group-hover:bg-primary transition-colors" />
                </div>
              </FadeIn>
            );
          })}
        </StaggerContainer>
      )}

      {/* Assign Services Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[600px] border-border bg-card p-0 overflow-hidden">
          <div className="bg-muted/30 p-8 border-b border-border flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black font-display uppercase tracking-tight italic">
                Atribuição de Funções
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 text-muted-foreground/60">
                 Operador: <span className="text-primary italic">{staff.find(s => s.id === selectedStaffId)?.full_name}</span>
              </DialogDescription>
            </div>
            <div className="bg-primary/10 p-3">
               <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {services?.map((service) => (
                <label
                  key={service.id}
                  className={cn(
                    "flex items-center gap-4 border p-5 cursor-pointer transition-all duration-300",
                    selectedServices.includes(service.id) 
                      ? "bg-primary/5 border-primary/40 shadow-[0_0_15px_rgba(255,107,43,0.1)]" 
                      : "bg-muted/10 border-border hover:bg-muted/20"
                  )}
                >
                  <Checkbox
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                    className="h-5 w-5 border-2"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-widest italic">{service.name}</p>
                    <div className="flex items-center gap-3 mt-1.5 opacity-60">
                       <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-[10px] font-bold uppercase">{service.duration_minutes} MIN</span>
                       </div>
                       <div className="w-[1px] h-3 bg-border" />
                       <div className="flex items-center gap-1">
                          <span className="text-[10px] font-black uppercase text-primary">R$ {Number(service.price).toFixed(2)}</span>
                       </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="pt-4 grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => setAssignOpen(false)} className="h-14 font-black uppercase tracking-widest border-border text-xs">
                CANCELAR
              </Button>
              <Button
                onClick={() => assignMutation.mutate({ staffId: selectedStaffId, serviceIds: selectedServices })}
                disabled={assignMutation.isPending}
                className="h-14 btn-premium bg-primary text-white font-black uppercase tracking-widest"
              >
                {assignMutation.isPending ? 'PROCESSANDO...' : 'ATUALIZAR VÍNCULOS'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
