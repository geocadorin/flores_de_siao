import { useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, Gem, Clock, Users, CheckCircle2, ArrowRight, ArrowLeft, SkipForward, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { APP_NAME } from '@/lib/branding';

const SEGMENTS = [
  'Estética Facial',
  'Estética Corporal',
  'Harmonização Facial',
  'Depilação',
  'Nail Designer',
  'Sobrancelhas e Cílios',
  'Maquiagem',
  'Cabelo e Penteado',
  'Barbearia',
  'Spa e Massagem',
  'Outro',
];

const DAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

interface StepData {
  company: { name: string; segment: string; phone: string; address: string };
  service: { name: string; description: string; price: string; duration: string };
  hours: { days: number[]; startTime: string; endTime: string };
  client: { name: string; phone: string; email: string };
}

const INITIAL_DATA: StepData = {
  company: { name: '', segment: '', phone: '', address: '' },
  service: { name: '', description: '', price: '', duration: '60' },
  hours: { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00' },
  client: { name: '', phone: '', email: '' },
};

const STEPS = [
  { id: 'company', title: 'Sua Empresa', icon: Building2, description: 'Informações do seu negócio' },
  { id: 'service', title: 'Primeiro Serviço', icon: Gem, description: 'Configure seu serviço principal' },
  { id: 'hours', title: 'Horários', icon: Clock, description: 'Quando você atende' },
  { id: 'client', title: 'Primeiro Cliente', icon: Users, description: 'Adicione um cliente' },
  { id: 'summary', title: 'Finalizar', icon: CheckCircle2, description: 'Revisão e conclusão' },
];

export default function Onboarding() {
  const { profile, refreshAuthState, markOnboardingCompleted } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const { data: progress, error } = await supabase.rpc('get_onboarding_progress' as any);
        if (!error && progress && !progress.completed) {
          if (progress.step > 0) setStep(progress.step);
          if (progress.skipped_steps?.length) {
            setSkippedSteps(new Set(progress.skipped_steps));
          }
          if (progress.data) {
            setData(prev => ({
              company: { ...prev.company, ...(progress.data.company || {}) },
              service: { ...prev.service, ...(progress.data.service || {}) },
              hours: {
                ...prev.hours,
                ...(progress.data.hours || {}),
                days: progress.data.hours?.days || prev.hours.days,
              },
              client: { ...prev.client, ...(progress.data.client || {}) },
            }));
          }
        }
      } catch {
        // Ignore errors loading progress
      } finally {
        setLoadingProgress(false);
      }
    };
    loadProgress();
  }, []);

  // Auto-save progress when step or data changes
  useEffect(() => {
    if (loadingProgress) return;
    const timeout = setTimeout(() => {
      void supabase.rpc('save_onboarding_progress' as any, {
        p_step: step,
        p_skipped_steps: Array.from(skippedSteps),
        p_data: data,
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [step, data, skippedSteps, loadingProgress]);

  const progress = ((step + 1) / STEPS.length) * 100;

  const updateField = useCallback(<K extends keyof StepData>(section: K, field: string, value: string | number[]) => {
    setData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  }, []);

  const canProceed = () => {
    switch (STEPS[step].id) {
      case 'company': return data.company.name.trim().length > 0;
      case 'service': return data.service.name.trim().length > 0 && Number(data.service.price) > 0;
      case 'hours': return data.hours.days.length > 0;
      case 'client': return data.client.name.trim().length > 0;
      default: return true;
    }
  };

  const skipStep = () => {
    setSkippedSteps(prev => new Set(prev).add(STEPS[step].id));
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleComplete = async (overrideSkippedSteps?: Set<string>) => {
    if (!profile) return;
    setSaving(true);
    const activeSkippedSteps = overrideSkippedSteps || skippedSteps;

    const ensureSuccess = (error: { message: string } | null) => {
      if (error) throw new Error(error.message);
    };

    try {
      const tenantId = profile.tenant_id;

      if (!activeSkippedSteps.has('company')) {
        const { error: tenantInfoError } = await supabase.rpc('update_tenant_info' as any, {
          p_name: data.company.name || null,
          p_phone: data.company.phone || null,
          p_address: data.company.address || null,
          p_logo_url: null,
          p_hero_title: null,
          p_hero_description: null,
        });
        ensureSuccess(tenantInfoError);

        if (data.company.segment) {
          await supabase
            .from('tenants')
            .update({ segment: data.company.segment } as any)
            .eq('id', tenantId);
        }
      }

      const setupTasks: Array<Promise<void>> = [];

      if (!activeSkippedSteps.has('service') && data.service.name.trim()) {
        setupTasks.push((async () => {
          const { error } = await supabase.from('services').insert({
            tenant_id: tenantId,
            name: data.service.name,
            description: data.service.description || null,
            price: Number(data.service.price) || 0,
            duration_minutes: Number(data.service.duration) || 60,
          });
          ensureSuccess(error);
        })());
      }

      if (!activeSkippedSteps.has('hours') && data.hours.days.length > 0) {
        setupTasks.push((async () => {
          const { error } = await supabase.from('business_hours').insert(
            data.hours.days.map(day => ({
              tenant_id: tenantId,
              staff_id: profile.id,
              day_of_week: day,
              start_time: data.hours.startTime,
              end_time: data.hours.endTime,
              active: true,
            }))
          );
          ensureSuccess(error);
        })());
      }

      if (!activeSkippedSteps.has('client') && data.client.name.trim()) {
        setupTasks.push((async () => {
          const { error } = await supabase.from('clients').insert({
            tenant_id: tenantId,
            full_name: data.client.name,
            phone: data.client.phone || null,
            email: data.client.email || null,
          });
          ensureSuccess(error);
        })());
      }

      await Promise.all(setupTasks);

      const { error: completeErr } = await supabase.rpc('complete_onboarding' as any);
      ensureSuccess(completeErr);

      flushSync(() => {
        markOnboardingCompleted();
      });
      void refreshAuthState();

      toast.success(`Onboarding concluído! Bem-vindo à ${APP_NAME}! 🎉`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    const current = data.hours.days;
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    updateField('hours', 'days', next);
  };

  if (loadingProgress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="h-7 w-7" />
            <h1 className="text-2xl font-bold">Configuração Inicial</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Vamos preparar tudo para você em poucos minutos
          </p>
          <div className="pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-muted-foreground hover:text-primary transition-colors h-auto p-0"
                >
                  <SkipForward className="h-3 w-3 mr-1" /> Pular configuração inicial e ir para o Dashboard
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Pular configuração?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso marcará seu perfil como configurado. Você poderá ajustar o nome da clínica, serviços e horários manualmente a qualquer momento nas configurações.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continuar Configurando</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={async () => {
                      const allSkipped = new Set(STEPS.map(s => s.id));
                      setSkippedSteps(allSkipped);
                      toast.info("Pulando configuração... Bem-vindo!");
                      void handleComplete(allSkipped);
                    }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Pular Tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Passo {step + 1} de {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => i < step && setStep(i)}
                  className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                    i === step ? 'text-primary font-semibold' :
                    i < step ? 'text-muted-foreground cursor-pointer hover:text-primary' :
                    'text-muted-foreground/40'
                  }`}
                  disabled={i > step}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => { const Icon = STEPS[step].icon; return <Icon className="h-5 w-5 text-primary" />; })()}
              {STEPS[step].title}
            </CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nome da empresa *</Label>
                  <Input id="company-name" placeholder="Ex: Studio Beleza" value={data.company.name}
                    onChange={e => updateField('company', 'name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Select value={data.company.segment} onValueChange={v => updateField('company', 'segment', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Telefone</Label>
                  <Input id="company-phone" placeholder="(11) 99999-9999" value={data.company.phone}
                    onChange={e => updateField('company', 'phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-address">Endereço (opcional)</Label>
                  <Input id="company-address" placeholder="Rua, número, cidade" value={data.company.address}
                    onChange={e => updateField('company', 'address', e.target.value)} />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="svc-name">Nome do serviço *</Label>
                  <Input id="svc-name" placeholder="Ex: Limpeza de Pele" value={data.service.name}
                    onChange={e => updateField('service', 'name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-desc">Descrição</Label>
                  <Textarea id="svc-desc" placeholder="Descrição breve do serviço" value={data.service.description}
                    onChange={e => updateField('service', 'description', e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="svc-price">Preço (R$) *</Label>
                    <Input id="svc-price" type="number" min="0" step="0.01" placeholder="150.00" value={data.service.price}
                      onChange={e => updateField('service', 'price', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="svc-duration">Duração (min)</Label>
                    <Select value={data.service.duration} onValueChange={v => updateField('service', 'duration', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[15, 30, 45, 60, 90, 120].map(m => (
                          <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-3">
                  <Label>Dias de atendimento *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS.map(d => (
                      <button key={d.value}
                        onClick={() => toggleDay(d.value)}
                        className={`p-2.5 rounded-lg text-sm font-medium border transition-all ${
                          data.hours.days.includes(d.value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Abertura</Label>
                    <Input id="start-time" type="time" value={data.hours.startTime}
                      onChange={e => updateField('hours', 'startTime', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Fechamento</Label>
                    <Input id="end-time" type="time" value={data.hours.endTime}
                      onChange={e => updateField('hours', 'endTime', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cli-name">Nome do cliente *</Label>
                  <Input id="cli-name" placeholder="Nome completo" value={data.client.name}
                    onChange={e => updateField('client', 'name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cli-phone">Telefone</Label>
                  <Input id="cli-phone" placeholder="(11) 99999-9999" value={data.client.phone}
                    onChange={e => updateField('client', 'phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cli-email">Email (opcional)</Label>
                  <Input id="cli-email" type="email" placeholder="email@exemplo.com" value={data.client.email}
                    onChange={e => updateField('client', 'email', e.target.value)} />
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-lg bg-accent/50 p-4 space-y-3 text-sm">
                  <div>
                    <span className="font-semibold text-foreground">🏢 Empresa:</span>{' '}
                    {skippedSteps.has('company') ? <span className="text-muted-foreground italic">Pulado</span> :
                      <span>{data.company.name} {data.company.segment && `(${data.company.segment})`}</span>}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">💎 Serviço:</span>{' '}
                    {skippedSteps.has('service') ? <span className="text-muted-foreground italic">Pulado</span> :
                      <span>{data.service.name} — R$ {Number(data.service.price || 0).toFixed(2)} ({data.service.duration} min)</span>}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">🕐 Horários:</span>{' '}
                    {skippedSteps.has('hours') ? <span className="text-muted-foreground italic">Pulado</span> :
                      <span>{data.hours.days.length} dias/semana • {data.hours.startTime} às {data.hours.endTime}</span>}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">👤 Cliente:</span>{' '}
                    {skippedSteps.has('client') ? <span className="text-muted-foreground italic">Pulado</span> :
                      <span>{data.client.name} {data.client.phone && `• ${data.client.phone}`}</span>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Você pode editar tudo depois nas configurações.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>

          <div className="flex gap-2">
            {step < 4 && step > 0 && (
              <Button variant="outline" size="sm" onClick={skipStep}>
                <SkipForward className="h-4 w-4 mr-1" /> Pular
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => handleComplete()} disabled={saving} className="min-w-[160px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Concluir Onboarding
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
