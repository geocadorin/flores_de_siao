import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppointments, useClients, useServices, useCompleteAppointment, useUpdateAppointmentStatus, useClientPackages } from '@/hooks/useTenantData';
import { useDeleteAppointment } from '@/hooks/useCrudMutations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Check, X, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Pencil, Trash2, AlertCircle, Users, Activity, Filter, Settings2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';
import { motion, AnimatePresence } from 'framer-motion';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; dot: string; bg: string; text: string }> = {
  scheduled: { label: 'Agendado', variant: 'secondary', dot: 'bg-warning', bg: 'bg-warning/20', text: 'text-foreground' },
  confirmed: { label: 'Confirmado', variant: 'default', dot: 'bg-primary', bg: 'bg-primary/10', text: 'text-primary' },
  completed: { label: 'Concluído', variant: 'outline', dot: 'bg-success', bg: 'bg-success/10', text: 'text-success' },
  cancelled: { label: 'Cancelado', variant: 'destructive', dot: 'bg-destructive', bg: 'bg-destructive/10', text: 'text-destructive' },
  no_show: { label: 'Faltou', variant: 'destructive', dot: 'bg-gray-500', bg: 'bg-gray-500/10', text: 'text-gray-600' },
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function useStaffMembers() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

function useStaffServices() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['staff-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_services')
        .select('staff_id, service_id');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

function useStaffBusinessHours(staffId: string | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['staff-business-hours', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_hours')
        .select('day_of_week, start_time, end_time, active')
        .eq('staff_id', staffId!)
        .eq('active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!profile && !!staffId,
  });
}

function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  for (let m = startMin; m + durationMinutes <= endMin; m += durationMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

export default function Appointments() {
  const { data: appointments, isLoading } = useAppointments();
  const { data: clients } = useClients();
  const { data: services } = useServices();
  const { data: clientPkgs } = useClientPackages();
  const { data: staffMembers } = useStaffMembers();
  const { data: staffServices } = useStaffServices();
  const completeAppointment = useCompleteAppointment();
  const deleteAppointment = useDeleteAppointment();
  const updateStatus = useUpdateAppointmentStatus();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingApt, setEditingApt] = useState<any>(null);
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [availabilityMsg, setAvailabilityMsg] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [form, setForm] = useState({
    client_id: '', service_id: '', scheduled_at: '', duration_minutes: 60, client_package_id: '', notes: '', staff_id: '',
  });

  const { data: staffBizHours } = useStaffBusinessHours(form.staff_id || undefined);

  // Atomic mutation via Edge Function
  const manageAppointment = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke('manage-appointment', {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['client-packages'] });
    },
  });

  const selectedService = services?.find((s) => s.id === form.service_id);
  const availablePkgs = clientPkgs?.filter((cp) => cp.client_id === form.client_id && cp.status === 'active');

  // Filter services by selected staff member's assigned services
  const filteredServicesForForm = useMemo(() => {
    if (!form.staff_id || !staffServices || !services) return services;
    const assignedServiceIds = staffServices
      .filter((ss) => ss.staff_id === form.staff_id)
      .map((ss) => ss.service_id);
    if (assignedServiceIds.length === 0) return services;
    return services.filter((s) => assignedServiceIds.includes(s.id));
  }, [form.staff_id, staffServices, services]);

  // Available time slots based on staff business hours for the selected date
  const availableTimeSlots = useMemo(() => {
    if (!form.staff_id || !formDate || !staffBizHours) return null;
    const selectedDateObj = new Date(formDate + 'T12:00:00');
    const dow = getDay(selectedDateObj); // 0=Sun, 6=Sat
    const dayHours = staffBizHours.find((bh) => bh.day_of_week === dow && bh.active);
    if (!dayHours) return [];
    const duration = selectedService?.duration_minutes ?? 60;
    return generateTimeSlots(dayHours.start_time, dayHours.end_time, duration);
  }, [form.staff_id, formDate, staffBizHours, selectedService]);

  // Filter out already booked slots — block the FULL duration interval, not just the start time
  const bookedSlots = useMemo(() => {
    if (!formDate || !form.staff_id || !appointments) return new Set<string>();
    const set = new Set<string>();
    const slotDuration = selectedService?.duration_minutes ?? 60;

    appointments
      .filter((a) => a.staff_id === form.staff_id && a.status !== 'cancelled' && a.status !== 'no_show')
      .filter((a) => format(new Date(a.scheduled_at), 'yyyy-MM-dd') === formDate)
      .filter((a) => !editingApt || a.id !== editingApt.id)
      .forEach((a) => {
        // Block every slot that would overlap with this appointment's range
        const aptStart = new Date(a.scheduled_at);
        const aptStartMin = aptStart.getHours() * 60 + aptStart.getMinutes();
        const aptEndMin = aptStartMin + a.duration_minutes;

        // A slot starting at S with duration D overlaps if S < aptEnd AND S + D > aptStart
        // We need to check all available slots; for now mark all that overlap
        if (availableTimeSlots) {
          for (const slot of availableTimeSlots) {
            const [sh, sm] = slot.split(':').map(Number);
            const slotStart = sh * 60 + sm;
            const slotEnd = slotStart + slotDuration;
            if (slotStart < aptEndMin && slotEnd > aptStartMin) {
              set.add(slot);
            }
          }
        }
      });
    return set;
  }, [formDate, form.staff_id, appointments, editingApt, availableTimeSlots, selectedService]);

  // Filter appointments by staff
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    if (staffFilter === 'all') return appointments;
    if (staffFilter === 'unassigned') return appointments.filter((a) => !a.staff_id);
    return appointments.filter((a) => a.staff_id === staffFilter);
  }, [appointments, staffFilter]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, typeof filteredAppointments>();
    filteredAppointments.forEach((apt) => {
      const dateKey = format(new Date(apt.scheduled_at), 'yyyy-MM-dd');
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(apt);
    });
    return map;
  }, [filteredAppointments]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(monthEnd, { locale: ptBR });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) { days.push(day); day = addDays(day, 1); }
    return days;
  }, [currentMonth]);

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedAppointments = selectedDateKey ? (appointmentsByDate.get(selectedDateKey) || []) : [];

  const checkAvailability = async (staffId: string, scheduledAt: string, durationMinutes: number, excludeId?: string) => {
    if (!staffId || !scheduledAt) return;
    setCheckingAvailability(true);
    setAvailabilityMsg(null);
    try {
      const { data, error } = await supabase.rpc('check_staff_availability' as any, {
        p_staff_id: staffId,
        p_scheduled_at: new Date(scheduledAt).toISOString(),
        p_duration_minutes: durationMinutes,
        p_exclude_appointment_id: excludeId || null,
      });
      if (error) throw error;
      const result = data as { available: boolean; reason: string | null };
      if (!result.available) {
        setAvailabilityMsg(result.reason || 'Atendente indisponível');
      }
    } catch {
      // silently fail availability check
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleFormChange = (updates: Partial<typeof form>) => {
    const newForm = { ...form, ...updates };
    setForm(newForm);
    setAvailabilityMsg(null);
    // If staff_id changed, reset service and time
    if (updates.staff_id) {
      setFormTime('');
      newForm.scheduled_at = '';
      if (newForm.service_id && staffServices) {
        const assigned = staffServices.filter((ss) => ss.staff_id === newForm.staff_id).map((ss) => ss.service_id);
        if (assigned.length > 0 && !assigned.includes(newForm.service_id)) {
          newForm.service_id = '';
        }
      }
      setForm(newForm);
    }
    // If service changed, reset time (duration may differ)
    if (updates.service_id) {
      setFormTime('');
      newForm.scheduled_at = '';
      setForm(newForm);
    }
  };

  const handleSelectDate = (dateStr: string) => {
    setFormDate(dateStr);
    setFormTime('');
    setForm((f) => ({ ...f, scheduled_at: '' }));
    setAvailabilityMsg(null);
  };

  const handleSelectTime = (time: string) => {
    setFormTime(time);
    const scheduledAt = `${formDate}T${time}`;
    setForm((f) => ({ ...f, scheduled_at: scheduledAt }));
    setAvailabilityMsg(null);
    // Auto-check availability
    if (form.staff_id) {
      const dur = selectedService?.duration_minutes ?? form.duration_minutes;
      checkAvailability(form.staff_id, scheduledAt, dur, editingApt?.id);
    }
  };

  const openCreateForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setFormDate(dateStr);
    setFormTime('');
    setForm({ client_id: '', service_id: '', scheduled_at: '', duration_minutes: 60, client_package_id: '', notes: '', staff_id: '' });
    setAvailabilityMsg(null);
    setCreateOpen(true);
  };

  const handleDayClick = (day: Date) => { setSelectedDate(day); };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduled_at) { toast.error('Selecione data e horário'); return; }
    if (availabilityMsg) { toast.error(availabilityMsg); return; }
    try {
      await manageAppointment.mutateAsync({
        id: editingApt?.id || undefined,
        client_id: form.client_id,
        service_id: form.service_id,
        staff_id: form.staff_id || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: selectedService?.duration_minutes ?? form.duration_minutes,
        client_package_id: form.client_package_id || null,
        notes: form.notes || null,
      });
      toast.success(editingApt ? 'Agendamento atualizado!' : 'Agendamento criado!');
      setCreateOpen(false);
      setEditingApt(null);
      setForm({ client_id: '', service_id: '', scheduled_at: '', duration_minutes: 60, client_package_id: '', notes: '', staff_id: '' });
    } catch (err: any) {
      const msg = err?.context?.error || err?.message || 'Erro ao salvar agendamento';
      toast.error(msg);
    }
  };

  const handleComplete = async (id: string) => {
    try { await completeAppointment.mutateAsync(id); toast.success('Sessão concluída!'); } catch (err: any) { toast.error(err.message); }
  };

  const handleCancel = async (id: string) => {
    try { await updateStatus.mutateAsync({ id, status: 'cancelled' }); toast.success('Agendamento cancelado.'); } catch (err: any) { toast.error(err.message); }
  };

  const openEditApt = (apt: any) => {
    setEditingApt(apt);
    const aptDate = format(new Date(apt.scheduled_at), 'yyyy-MM-dd');
    const aptTime = format(new Date(apt.scheduled_at), 'HH:mm');
    setFormDate(aptDate);
    setFormTime(aptTime);
    setForm({
      client_id: apt.client_id,
      service_id: apt.service_id,
      scheduled_at: `${aptDate}T${aptTime}`,
      duration_minutes: apt.duration_minutes,
      client_package_id: apt.client_package_id || '',
      notes: apt.notes || '',
      staff_id: apt.staff_id || '',
    });
    setAvailabilityMsg(null);
    setCreateOpen(true);
  };

  const handleDeleteApt = async () => {
    if (!deleteId) return;
    try { await deleteAppointment.mutateAsync(deleteId); toast.success('Agendamento excluído!'); } catch (err: any) { toast.error(err.message); }
    setDeleteId(null);
  };

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return null;
    return staffMembers?.find((s) => s.id === staffId)?.full_name || null;
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <FadeIn direction="down">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-border pb-8">
          <div>
            <h2 className="page-title italic">Controle de Fluxo</h2>
            <p className="page-description">Orquestração técnica e agendamento de sessões.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex h-12 items-center px-4 bg-muted/30 border border-border">
                <Activity className="h-3.5 w-3.5 text-primary animate-pulse mr-2.5" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-3">Monitor:</span>
                <div className="flex items-center gap-1.5">
                   <span className="text-xs font-bold">{filteredAppointments.length} Registros de Filtro</span>
                </div>
             </div>
              <Button className="btn-premium h-12 group w-full sm:w-auto" onClick={() => { openCreateForDate(new Date()); }}>
                <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" /> Novo Agendamento
              </Button>
          </div>
        </div>
      </FadeIn>

      {/* Filter Bar */}
      <FadeIn delay={0.1}>
        <div className="flex flex-col gap-4 p-2 bg-muted/10 border border-border sm:flex-row sm:items-center">
           <div className="flex items-center gap-3 px-4 py-2 border-b sm:border-b-0 sm:border-r border-border/50 shrink-0">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Atendente</span>
           </div>
           <div className="flex-1 w-full sm:w-auto">
             <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="h-12 sm:h-10 border-transparent bg-transparent focus:ring-0">
                  <SelectValue placeholder="Selecione o atendente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold uppercase tracking-widest">Todos os atendentes</SelectItem>
                  <SelectItem value="unassigned" className="text-xs font-bold uppercase tracking-widest">Sem atendente definido</SelectItem>
                  {staffMembers?.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase tracking-widest">{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
           <div className="flex items-center justify-end gap-2 px-2 border-t sm:border-t-0 sm:border-l border-border/50 py-2 sm:py-0">
             <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                <Filter className="h-4 w-4" />
             </Button>
             <div className="w-px h-6 bg-border/50" />
             <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                <Settings2 className="h-4 w-4" />
             </Button>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <FadeIn delay={0.2} className="lg:col-span-2">
          <div className="bg-card border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/5">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-10 w-10 border border-border hover:bg-muted" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xl font-black font-display uppercase tracking-tight italic min-w-[160px] text-center">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 border border-border hover:bg-muted" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border/60">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Calendário Ativo</span>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 table-container">
              <div className="min-w-[600px] sm:min-w-0">
                {isLoading ? (
                <div className="grid grid-cols-7 gap-px bg-border/20 rounded-none overflow-hidden">
                   {[...Array(35)].map((_, i) => (
                     <div key={i} className="aspect-square bg-muted/10 animate-pulse border border-border/10" />
                   ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 mb-4">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-border/40 border border-border/40">
                    {calendarDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayAppointments = appointmentsByDate.get(dateKey) || [];
                      const inMonth = isSameMonth(day, currentMonth);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const today = isToday(day);
                      const hasAppointments = dayAppointments.length > 0;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => handleDayClick(day)}
                          className={cn(
                            'relative flex flex-col items-start gap-1 p-3 min-h-[80px] sm:min-h-[110px] bg-background transition-all group overflow-hidden',
                            !inMonth && 'bg-muted/5 opacity-30',
                            isSelected && 'bg-primary/5 ring-1 ring-primary/40 z-10',
                            today && !isSelected && 'bg-primary/5',
                            'hover:bg-muted/30 cursor-pointer'
                          )}
                        >
                          <span className={cn(
                            'text-xs font-black font-display tracking-widest transition-all duration-300',
                            isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                            today && 'bg-primary text-white px-2 py-0.5'
                          )}>
                            {format(day, 'd')}
                          </span>
                          
                          <div className="mt-auto w-full flex flex-col gap-1.5">
                             {dayAppointments.slice(0, 2).map((apt) => {
                               const st = statusMap[apt.status];
                               return (
                                 <div key={apt.id} className="w-full flex items-center gap-1.5">
                                    <div className={cn('w-1 h-1 rounded-full shrink-0', st?.dot || 'bg-muted-foreground')} />
                                    <span className="text-[9px] font-bold text-muted-foreground truncate uppercase tracking-[0.5px]">
                                      {(apt as any).clients?.full_name?.split(' ')[0]}
                                    </span>
                                 </div>
                               );
                             })}
                             {dayAppointments.length > 2 && (
                               <div className="text-[8px] font-black text-primary uppercase tracking-widest py-0.5 border-t border-primary/10 mt-1">
                                 + {dayAppointments.length - 2} MAIS
                               </div>
                             )}
                          </div>
                          
                          {/* Hover Accent */}
                          <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary group-hover:w-full transition-all duration-500" />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Day detail panel */}
        <FadeIn delay={0.3}>
          <div className="bg-card border border-border h-full flex flex-col">
            <div className="p-6 border-b border-border bg-muted/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[3px] text-muted-foreground mb-1 font-display italic">Timeline</h3>
                  <p className="text-sm font-black font-display uppercase tracking-tight italic">
                    {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Ponto de Controle'}
                  </p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 bg-primary/5 border border-primary/20">
                   <Clock className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-6">
              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-muted/30 flex items-center justify-center mb-4 transition-transform rotate-45">
                    <CalendarIcon className="h-6 w-6 text-muted-foreground/30 -rotate-45" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">Select Vector</p>
                </div>
              ) : selectedAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/60">
                   <div className="w-16 h-16 bg-muted/30 flex items-center justify-center mb-4">
                     <AlertCircle className="h-6 w-6 text-muted-foreground/30" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground mb-4">Agenda Vazia</p>
                   <Button size="sm" variant="outline" className="btn-premium h-10 px-6" onClick={() => openCreateForDate(selectedDate)}>
                     <Plus className="h-3 w-3 mr-2" /> Programar
                   </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4 -mr-4">
                   <StaggerContainer className="space-y-4">
                    {selectedAppointments
                      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                      .map((apt) => {
                        const st = statusMap[apt.status] ?? { label: apt.status, variant: 'secondary' as const, dot: 'bg-muted-foreground', bg: 'bg-muted', text: 'text-muted-foreground' };
                        const isPending = apt.status === 'scheduled' || apt.status === 'confirmed';
                        const staffName = getStaffName(apt.staff_id);
                        return (
                          <FadeIn key={apt.id} className="group border border-border bg-background p-4 transition-all duration-300 hover:border-primary/40 hover:bg-muted/5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                   <div className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border", st.bg, st.text, "border-transparent")}>
                                     {st.label}
                                   </div>
                                   <div className="text-[10px] font-bold text-muted-foreground/40 font-mono">
                                     {format(new Date(apt.scheduled_at), 'HH:mm')}
                                   </div>
                                </div>
                                <p className="text-sm font-black font-display uppercase tracking-tight group-hover:text-primary transition-colors">
                                  {(apt as any).clients?.full_name}
                                </p>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                  {(apt as any).services?.name}
                                </p>
                                {staffName && (
                                  <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                    <Users className="h-3 w-3 text-primary/40" />
                                    {staffName}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
                              {isPending && (
                                <Button size="sm" variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-success/10 hover:text-success border border-transparent hover:border-success/20 flex-1" onClick={() => handleComplete(apt.id)}>
                                  <Check className="h-3.5 w-3.5 mr-1" /> OK
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-8 w-8 hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20" onClick={() => openEditApt(apt)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20" onClick={() => setDeleteId(apt.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              {isPending && (
                                <Button size="sm" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-muted/10" onClick={() => handleCancel(apt.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </FadeIn>
                        );
                      })}
                   </StaggerContainer>
                </ScrollArea>
              )}
            </div>
            
            <div className="p-6 bg-muted/5 border-t border-border">
               <Button className="w-full btn-premium h-12" onClick={() => openCreateForDate(selectedDate || new Date())}>
                  <Plus className="h-4 w-4 mr-2" /> Agendar Horário
               </Button>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setEditingApt(null); setAvailabilityMsg(null); } }}>
        <DialogContent className="sm:max-w-[550px] border-border bg-card p-0 overflow-hidden">
          <div className="bg-muted/30 p-8 border-b border-border">
            <DialogTitle className="text-2xl font-black font-display uppercase tracking-tight italic">
              {editingApt ? 'Calibrar Agendamento' : 'Novo Registro de Fluxo'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 text-muted-foreground/60">
              {editingApt ? 'Ajuste de parâmetros e alocação de recursos.' : 'Configuração de nova sessão no sistema operacional.'}
            </DialogDescription>
          </div>
          
          <form onSubmit={handleEditSave} className="p-8 space-y-6 bg-card/50 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Atendente Designado</Label>
                <Select value={form.staff_id} onValueChange={(v) => handleFormChange({ staff_id: v })}>
                  <SelectTrigger className="h-12 bg-background border-border focus:border-primary/50 transition-all">
                    <SelectValue placeholder="Alocação automática" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers?.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase tracking-widest">{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Cliente *</Label>
                <Select value={form.client_id} onValueChange={(v) => handleFormChange({ client_id: v, client_package_id: '' })}>
                  <SelectTrigger className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold">
                    <SelectValue placeholder="Identificar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase tracking-widest">{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Serviço / Procedimento *</Label>
              <Select value={form.service_id} onValueChange={(v) => handleFormChange({ service_id: v })}>
                <SelectTrigger className="h-12 bg-background border-border focus:border-primary/50 transition-all">
                  <SelectValue placeholder="Definir protocolo..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredServicesForForm?.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase tracking-widest">
                      {s.name} <span className="opacity-40 ml-2">[{s.duration_minutes} MIN]</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availablePkgs && availablePkgs.length > 0 && (
              <div className="space-y-2.5 p-4 bg-primary/5 border border-primary/10">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-primary">Créditos Disponíveis</Label>
                <Select value={form.client_package_id} onValueChange={(v) => handleFormChange({ client_package_id: v })}>
                  <SelectTrigger className="h-10 bg-background border-primary/20 focus:border-primary/50 transition-all">
                    <SelectValue placeholder="Dedução de pacote..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePkgs.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id} className="text-xs font-bold uppercase tracking-widest">
                        {(cp as any).packages?.name} <span className="text-primary ml-2">({cp.sessions_total - cp.sessions_used} UN)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Data de Execução *</Label>
              <Input type="date" value={formDate} onChange={(e) => handleSelectDate(e.target.value)} required min={format(new Date(), 'yyyy-MM-dd')} className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold" />
            </div>

            {/* Time slots */}
            {form.staff_id && formDate && (
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Slots Disponíveis *</Label>
                {availableTimeSlots === null ? (
                  <p className="text-[10px] text-muted-foreground italic tracking-widest uppercase">Processando disponibilidade...</p>
                ) : availableTimeSlots.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 bg-destructive/5 border border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Fora do Horário Operacional</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimeSlots.map((slot) => {
                      const isBooked = bookedSlots.has(slot);
                      const isSelected = formTime === slot;
                      return (
                        <Button
                          key={slot}
                          type="button"
                          variant="outline"
                          disabled={isBooked}
                          className={cn(
                             'h-10 text-[10px] font-black border-border transition-all duration-300',
                             isSelected ? 'bg-primary text-white border-primary shadow-glow' : 'hover:border-primary/50 hover:bg-primary/5',
                             isBooked && 'opacity-20 grayscale cursor-not-allowed line-through'
                          )}
                          onClick={() => handleSelectTime(slot)}
                        >
                          {slot}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Fallback */}
            {!form.staff_id && (
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Horário Técnico *</Label>
                <Input type="time" value={formTime} onChange={(e) => { setFormTime(e.target.value); if (formDate) setForm((f) => ({ ...f, scheduled_at: `${formDate}T${e.target.value}` })); }} required className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold" />
              </div>
            )}

            {/* Availability warning */}
            {availabilityMsg && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest">{availabilityMsg}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Logs / Notas do Atendimento</Label>
              <Textarea 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                placeholder="Inserir notas de campo..." 
                className="min-h-[100px] bg-background border-border focus:border-primary/50 transition-all resize-none"
              />
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full btn-premium h-14" disabled={manageAppointment.isPending || !!availabilityMsg}>
                {manageAppointment.isPending ? 'SINCRONIZANDO...' : editingApt ? 'VALIDAR ALTERAÇÕES' : 'EFETIVAR AGENDAMENTO'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={handleDeleteApt} loading={deleteAppointment.isPending} />
    </div>
  );
}
