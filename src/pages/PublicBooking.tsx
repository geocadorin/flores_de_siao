import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Clock, CheckCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  hero_title: string | null;
  hero_description: string | null;
}

interface PublicService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
}

interface PublicStaff {
  id: string;
  full_name: string;
}

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [booked, setBooked] = useState(false);

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['public-tenant', slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_tenant_info' as any, { p_slug: slug });
      if (error) throw error;
      return data as TenantInfo;
    },
    enabled: !!slug,
  });

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['public-services', slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_services' as any, { p_slug: slug });
      if (error) throw error;
      return data as PublicService[];
    },
    enabled: !!slug,
  });

  const { data: staffList } = useQuery({
    queryKey: ['public-staff', slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_staff' as any, { p_slug: slug });
      if (error) throw error;
      return data as PublicStaff[];
    },
    enabled: !!slug,
  });

  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['public-slots', slug, selectedStaff, selectedDate, selectedService?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_available_slots' as any, {
        p_slug: slug,
        p_staff_id: selectedStaff,
        p_date: selectedDate,
        p_service_id: selectedService!.id,
      });
      if (error) throw error;
      return data as string[];
    },
    enabled: !!slug && !!selectedStaff && !!selectedDate && !!selectedService,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      const { data, error } = await supabase.rpc('create_public_appointment' as any, {
        p_tenant_slug: slug,
        p_client_name: form.name,
        p_client_phone: form.phone,
        p_client_email: form.email || null,
        p_service_id: selectedService!.id,
        p_scheduled_at: scheduledAt,
        p_staff_id: selectedStaff || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setBooked(true);
      toast.success('Agendamento realizado com sucesso!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao agendar'),
  });

  const resetAll = () => {
    setBooked(false);
    setSelectedService(null);
    setSelectedStaff('');
    setSelectedDate('');
    setSelectedTime('');
    setForm({ name: '', phone: '', email: '' });
  };

  if (tenantLoading || servicesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <CardTitle>Clínica não encontrada</CardTitle>
          <CardDescription className="mt-2">Verifique o link e tente novamente.</CardDescription>
        </Card>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center p-8 space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <CardTitle>Agendamento Confirmado!</CardTitle>
          <CardDescription>
            Seu agendamento em <strong>{tenant.name}</strong> foi realizado com sucesso.
            Você receberá um lembrete antes do horário.
          </CardDescription>
          <Button onClick={resetAll}>Agendar outro horário</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="mx-auto h-14 w-14 rounded-2xl object-contain" />
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="h-7 w-7" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{tenant.hero_title || tenant.name}</h1>
          {tenant.hero_description && <p className="text-sm text-muted-foreground">{tenant.hero_description}</p>}
          {tenant.address && <p className="text-sm text-muted-foreground">{tenant.address}</p>}
          {tenant.phone && <p className="text-sm text-muted-foreground">{tenant.phone}</p>}
        </div>

        {!selectedService ? (
          <ServiceList services={services} onSelect={setSelectedService} />
        ) : (
          <BookingForm
            service={selectedService}
            staffList={staffList || []}
            selectedStaff={selectedStaff}
            setSelectedStaff={(v) => { setSelectedStaff(v); setSelectedTime(''); }}
            selectedDate={selectedDate}
            setSelectedDate={(v) => { setSelectedDate(v); setSelectedTime(''); }}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            availableSlots={availableSlots || []}
            slotsLoading={slotsLoading}
            form={form}
            setForm={setForm}
            onBack={() => { setSelectedService(null); setSelectedStaff(''); setSelectedDate(''); setSelectedTime(''); }}
            onSubmit={() => bookMutation.mutate()}
            isPending={bookMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function ServiceList({ services, onSelect }: { services?: PublicService[]; onSelect: (s: PublicService) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Escolha um serviço</h2>
      {!services?.length ? (
        <p className="text-muted-foreground">Nenhum serviço disponível no momento.</p>
      ) : (
        <div className="grid gap-3">
          {services.map((svc) => (
            <Card key={svc.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelect(svc)}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{svc.name}</p>
                  {svc.description && <p className="text-sm text-muted-foreground">{svc.description}</p>}
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold">R$ {Number(svc.price).toFixed(2)}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {svc.duration_minutes}min
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface BookingFormProps {
  service: PublicService;
  staffList: PublicStaff[];
  selectedStaff: string;
  setSelectedStaff: (v: string) => void;
  selectedDate: string;
  setSelectedDate: (v: string) => void;
  selectedTime: string;
  setSelectedTime: (v: string) => void;
  availableSlots: string[];
  slotsLoading: boolean;
  form: { name: string; phone: string; email: string };
  setForm: (f: { name: string; phone: string; email: string }) => void;
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

function BookingForm({
  service, staffList, selectedStaff, setSelectedStaff,
  selectedDate, setSelectedDate, selectedTime, setSelectedTime,
  availableSlots, slotsLoading, form, setForm, onBack, onSubmit, isPending,
}: BookingFormProps) {
  const canSubmit = form.name && form.phone && selectedStaff && selectedDate && selectedTime;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{service.name}</CardTitle>
            <CardDescription>{service.duration_minutes}min · R$ {Number(service.price).toFixed(2)}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack}>Trocar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          {/* Staff */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><User className="h-4 w-4" /> Profissional *</Label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {staffList.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum profissional disponível.</p>
            )}
          </div>

          {/* Date */}
          {selectedStaff && (
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          )}

          {/* Time slots */}
          {selectedStaff && selectedDate && (
            <div className="space-y-2">
              <Label>Horário *</Label>
              {slotsLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">Carregando horários...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-destructive">Nenhum horário disponível nesta data.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      variant={selectedTime === slot ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Client info */}
          <div className="space-y-2">
            <Label>Seu Nome *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maria Silva" maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp / Telefone *</Label>
            <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" maxLength={255} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending || !canSubmit}>
            {isPending ? 'Agendando...' : 'Confirmar Agendamento'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
