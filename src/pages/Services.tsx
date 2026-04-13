import { useState } from 'react';
import { useServices, useCreateService } from '@/hooks/useTenantData';
import { useUpdateService, useDeleteService } from '@/hooks/useCrudMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';
import { cn } from '@/lib/utils';
import { Settings, Activity, ShieldCheck, Clock, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Services() {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: 60, price: 0 });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setForm({ name: '', description: '', duration_minutes: 60, price: 0 }); setOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ name: s.name, description: s.description || '', duration_minutes: s.duration_minutes, price: Number(s.price) }); setOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateService.mutateAsync({ id: editing.id, ...form });
        toast.success('Serviço atualizado!');
      } else {
        await createService.mutateAsync(form);
        toast.success('Serviço criado!');
      }
      setOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteService.mutateAsync(deleteId); toast.success('Serviço removido!'); } catch (err: any) { toast.error(err.message); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-10">
      <FadeIn>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[4px] text-primary mb-2 font-display italic">Protocolo de Operação</h3>
            <h2 className="text-4xl font-black font-display uppercase tracking-tight italic">
              Serviços & Procedimentos
            </h2>
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest mt-2">
              Definição de protocolos técnicos e parâmetros de execução.
            </p>
          </div>
          <Button className="btn-premium h-14 px-8 bg-primary text-white" onClick={openNew}>
            <Plus className="h-5 w-5 mr-1" /> Novo Procedimento
          </Button>
        </div>
      </FadeIn>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="bg-muted/10 h-48 border border-border animate-pulse" />)}
        </div>
      ) : !services?.length ? (
        <FadeIn>
          <div className="flex flex-col items-center justify-center py-32 text-center glass-panel border-dashed">
            <div className="w-20 h-20 bg-muted/20 flex items-center justify-center mb-6">
              <Activity className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h4 className="text-xl font-black font-display uppercase tracking-tight italic mb-2">Módulo Vazio</h4>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest max-w-xs mb-8">Nenhum protocolo operacional detectado.</p>
            <Button onClick={openNew} className="btn-premium h-12 px-8 bg-primary">
              <Plus className="h-4 w-4 mr-2" /> Inicializar Catálogo
            </Button>
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <FadeIn key={service.id}>
              <div className="group relative bg-card border border-border p-6 transition-all duration-300 hover:border-primary/40 hover:bg-muted/5">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                       <ShieldCheck className="h-3 w-3 text-primary/60" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 font-mono">Module_ID: {service.id.slice(0, 8)}</span>
                    </div>
                    <h4 className="text-xl font-black font-display uppercase tracking-tight italic group-hover:text-primary transition-colors truncate">
                      {service.name}
                    </h4>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9 border border-transparent hover:border-primary/20 hover:bg-primary/5" onClick={() => openEdit(service)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive border border-transparent hover:border-destructive/20 hover:bg-destructive/5" onClick={() => setDeleteId(service.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {service.description && (
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed line-clamp-2 mb-8 opacity-60">
                    {service.description}
                  </p>
                )}

                <div className="flex items-end justify-between pt-6 border-t border-border/50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Latência de Execução</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="text-lg font-black font-display italic uppercase tracking-tight">{service.duration_minutes} MIN</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Taxa de Serviço</p>
                    <p className="text-2xl font-black font-display text-primary italic tracking-tighter">
                      R$ {Number(service.price).toFixed(0)}
                      <span className="text-sm font-bold opacity-60">,{Number(service.price).toFixed(2).split('.')[1]}</span>
                    </p>
                  </div>
                </div>
                
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                   <div className="absolute top-0 right-0 w-[2px] h-full bg-primary/10 group-hover:bg-primary/40 transition-colors" />
                   <div className="absolute top-0 right-0 h-[2px] w-full bg-primary/10 group-hover:bg-primary/40 transition-colors" />
                </div>
              </div>
            </FadeIn>
          ))}
        </StaggerContainer>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] border-border bg-card p-0 overflow-hidden">
          <div className="bg-muted/30 p-8 border-b border-border">
            <DialogTitle className="text-2xl font-black font-display uppercase tracking-tight italic">
              {editing ? 'Calibragem de Protocolo' : 'Novo Registro de Serviço'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 text-muted-foreground/60">
              {editing ? 'Ajuste de parâmetros técnicos e precificação operacional.' : 'Definição de novo módulo de serviço para o sistema.'}
            </DialogDescription>
          </div>
          
          <form onSubmit={handleSave} className="p-8 space-y-6 bg-card/50">
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Identificação do Serviço *</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required 
                placeholder="Ex: TERAPIA FOTODINÂMICA" 
                className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold uppercase tracking-widest"
              />
            </div>
            
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Documentação Técnica</Label>
              <Textarea 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                placeholder="Inserir especificações do procedimento..." 
                className="min-h-[100px] bg-background border-border focus:border-primary/50 transition-all resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Duração Estimada (MIN)</Label>
                <Input 
                  type="number" 
                  value={form.duration_minutes} 
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} 
                  min={5} 
                  className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Custo Base (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={form.price} 
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} 
                  min={0} 
                  className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold"
                />
              </div>
            </div>
            
            <div className="pt-4">
              <Button type="submit" className="w-full btn-premium h-14 bg-primary text-white" disabled={createService.isPending || updateService.isPending}>
                {(createService.isPending || updateService.isPending) ? 'SINCRONIZANDO...' : editing ? 'VALIDAR ALTERAÇÕES' : 'EFETIVAR CADASTRO'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={handleDelete} loading={deleteService.isPending} description="O serviço será desativado e não aparecerá mais nas listagens." />
    </div>
  );
}
