import { useState } from 'react';
import { usePackages, useCreatePackage, useServices, useClients, useCreateClientPackage, useClientPackages } from '@/hooks/useTenantData';
import { useUpdatePackage, useDeletePackage } from '@/hooks/useCrudMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';

export default function Packages() {
  const { data: packages, isLoading: loadingPkg } = usePackages();
  const { data: services } = useServices();
  const { data: clients } = useClients();
  const { data: clientPackages, isLoading: loadingCP } = useClientPackages();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();
  const createClientPackage = useCreateClientPackage();
  const [openPkg, setOpenPkg] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pkgForm, setPkgForm] = useState({ name: '', service_id: '', total_sessions: 10, price: 0 });
  const [assignForm, setAssignForm] = useState({ client_id: '', package_id: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setPkgForm({ name: '', service_id: '', total_sessions: 10, price: 0 }); setOpenPkg(true); };
  const openEdit = (pkg: any) => { setEditing(pkg); setPkgForm({ name: pkg.name, service_id: pkg.service_id, total_sessions: pkg.total_sessions, price: Number(pkg.price) }); setOpenPkg(true); };

  const handleSavePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updatePackage.mutateAsync({ id: editing.id, ...pkgForm });
        toast.success('Pacote atualizado!');
      } else {
        await createPackage.mutateAsync(pkgForm);
        toast.success('Pacote criado!');
      }
      setOpenPkg(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deletePackage.mutateAsync(deleteId); toast.success('Pacote removido!'); } catch (err: any) { toast.error(err.message); }
    setDeleteId(null);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = packages?.find((p) => p.id === assignForm.package_id);
    if (!pkg) return;
    try {
      await createClientPackage.mutateAsync({ client_id: assignForm.client_id, package_id: assignForm.package_id, sessions_total: pkg.total_sessions });
      toast.success('Pacote atribuído!');
      setOpenAssign(false);
      setAssignForm({ client_id: '', package_id: '' });
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-10">
      <FadeIn>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[4px] text-primary mb-2 font-display italic">Protocolo de Vendas</h3>
            <h2 className="text-4xl font-black font-display uppercase tracking-tight italic">
              Gestão de Pacotes
            </h2>
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest mt-2">
              Configuração de sessões recorrentes e contratos de serviço.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" className="btn-premium h-12 px-6" onClick={() => setOpenAssign(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Atribuir Pacote
             </Button>
             <Button className="btn-premium h-12 px-6 bg-primary text-white" onClick={openNew}>
                <Plus className="h-5 w-5 mr-1" /> Novo Registro
             </Button>
          </div>
        </div>
      </FadeIn>

      <Tabs defaultValue="packages" className="w-full">
        <div className="flex items-center justify-between border-b border-border/60 pb-1 mb-8 overflow-x-auto custom-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 gap-8 rounded-none">
            <TabsTrigger value="packages" className="rounded-none border-b-2 border-transparent px-0 pb-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-black uppercase tracking-[2px] transition-all">
              Inventário de Serviços
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent px-0 pb-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-black uppercase tracking-[2px] transition-all">
              Operações Ativas
            </TabsTrigger>
          </TabsList>

          <div className="hidden lg:flex items-center gap-3">
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/5 border border-border/40">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sistema Nominal</span>
             </div>
          </div>
        </div>

        <TabsContent value="packages" className="mt-0 focus-visible:ring-0">
          {loadingPkg ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map((i) => <div key={i} className="bg-muted/10 h-48 border border-border animate-pulse" />)}
            </div>
          ) : !packages?.length ? (
            <FadeIn>
              <div className="flex flex-col items-center justify-center py-24 text-center glass-panel border-dashed">
                <div className="w-20 h-20 bg-muted/20 flex items-center justify-center mb-6">
                  <Package className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <h4 className="text-xl font-black font-display uppercase tracking-tight italic mb-2">Base de Dados Vazia</h4>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest max-w-xs mb-8">Nenhum protocolo de pacote detectado no sistema.</p>
                <Button onClick={openNew} className="btn-premium h-12 px-8 bg-primary">
                  <Plus className="h-4 w-4 mr-2" /> Iniciar Cadastro
                </Button>
              </div>
            </FadeIn>
          ) : (
            <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <FadeIn key={pkg.id}>
                  <div className="group relative bg-card border border-border p-6 transition-all duration-300 hover:border-primary/40 hover:bg-muted/5">
                    <div className="flex items-start justify-between gap-4 mb-8">
                      <div className="min-w-0">
                         <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-primary/5 border border-primary/20">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Sku #{pkg.id.slice(0, 4)}</span>
                         </div>
                         <h4 className="text-xl font-black font-display uppercase tracking-tight italic group-hover:text-primary transition-colors truncate">
                           {pkg.name}
                         </h4>
                         <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                           {(pkg as any).services?.name}
                         </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 border border-transparent hover:border-primary/20 hover:bg-primary/5" onClick={() => openEdit(pkg)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive border border-transparent hover:border-destructive/20 hover:bg-destructive/5" onClick={() => setDeleteId(pkg.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-6 border-t border-border/50">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Sessões</p>
                          <div className="flex items-center gap-2">
                             <Clock className="h-3 w-3 text-primary/60" />
                             <span className="text-lg font-black font-display italic uppercase tracking-tight">{pkg.total_sessions} UN</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Custo Total</p>
                          <p className="text-2xl font-black font-display text-primary italic tracking-tighter">
                            R$ {Number(pkg.price).toFixed(0)}
                            <span className="text-sm font-bold opacity-60">,{Number(pkg.price).toFixed(2).split('.')[1]}</span>
                          </p>
                       </div>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary group-hover:w-full transition-all duration-700" />
                  </div>
                </FadeIn>
              ))}
            </StaggerContainer>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-0 focus-visible:ring-0">
          {loadingCP ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map((i) => <div key={i} className="bg-muted/10 h-40 border border-border animate-pulse" />)}
            </div>
          ) : !clientPackages?.length ? (
            <FadeIn>
              <div className="flex flex-col items-center justify-center py-24 text-center glass-panel border-dashed">
                <div className="w-20 h-20 bg-muted/20 flex items-center justify-center mb-6">
                  <UserPlus className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <h4 className="text-xl font-black font-display uppercase tracking-tight italic mb-2">Sem Monitoramento</h4>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest max-w-xs mb-8">Nenhum cliente está operando sob regime de pacote atualmente.</p>
                <Button onClick={() => setOpenAssign(true)} className="btn-premium h-12 px-8 bg-primary">
                  <UserPlus className="h-4 w-4 mr-2" /> Atribuir Primeiro Registro
                </Button>
              </div>
            </FadeIn>
          ) : (
            <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {clientPackages.map((cp) => {
                const remaining = cp.sessions_total - cp.sessions_used;
                const pct = (cp.sessions_used / cp.sessions_total) * 100;
                return (
                  <FadeIn key={cp.id}>
                    <div className="relative glass-panel p-6 space-y-6 overflow-hidden">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                           <p className="text-lg font-black font-display uppercase tracking-tight italic truncate">
                             {(cp as any).clients?.full_name}
                           </p>
                           <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className="text-[9px] font-black py-0 px-2 border-primary/20 text-primary uppercase tracking-widest">
                                {(cp as any).packages?.name}
                              </Badge>
                           </div>
                        </div>
                        <div className="p-2 bg-success/5 border border-success/20">
                          <TrendingUp className="h-4 w-4 text-success" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Sessões Restantes</p>
                              <span className={cn("text-2xl font-black font-display italic", remaining === 0 ? "text-destructive" : "text-foreground")}>
                                {remaining} <span className="text-sm font-bold opacity-40">/ {cp.sessions_total}</span>
                              </span>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Taxa de Uso</p>
                              <span className="text-sm font-black font-display italic">
                                {pct.toFixed(0)}%
                              </span>
                           </div>
                        </div>
                        <div className="h-2 bg-muted/20 border border-border/50 rounded-none overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-1000", pct > 80 ? "bg-destructive shadow-glow-destructive" : "bg-primary shadow-glow")} 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>

                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    </div>
                  </FadeIn>
                );
              })}
            </StaggerContainer>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={openPkg} onOpenChange={setOpenPkg}>
        <DialogContent className="sm:max-w-[500px] border-border bg-card p-0 overflow-hidden">
          <div className="bg-muted/30 p-8 border-b border-border">
            <DialogTitle className="text-2xl font-black font-display uppercase tracking-tight italic">
              {editing ? 'Calibragem de Pacote' : 'Novo Protocolo'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 text-muted-foreground/60">
              {editing ? 'Ajuste de sessões e parametrização técnica.' : 'Configuração de novo pacote comercial no sistema.'}
            </DialogDescription>
          </div>
          
          <form onSubmit={handleSavePkg} className="p-8 space-y-6">
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Identificação do Pacote *</Label>
              <Input value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} required placeholder="Ex: PROTOCOLO DIAMANTE 10X" className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold uppercase tracking-widest" />
            </div>
            
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Serviço Vinculado *</Label>
              <Select value={pkgForm.service_id} onValueChange={(v) => setPkgForm({ ...pkgForm, service_id: v })}>
                <SelectTrigger className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold">
                  <SelectValue placeholder="Definir procedimento..." />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase tracking-widest">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Volume de Sessões</Label>
                <Input type="number" value={pkgForm.total_sessions} onChange={(e) => setPkgForm({ ...pkgForm, total_sessions: Number(e.target.value) })} min={1} className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold" />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Custo Operacional (R$)</Label>
                <Input type="number" step="0.01" value={pkgForm.price} onChange={(e) => setPkgForm({ ...pkgForm, price: Number(e.target.value) })} min={0} className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold" />
              </div>
            </div>
            
            <div className="pt-4">
              <Button type="submit" className="w-full btn-premium h-14 bg-primary text-white" disabled={createPackage.isPending || updatePackage.isPending}>
                {(createPackage.isPending || updatePackage.isPending) ? 'SINCRONIZANDO...' : editing ? 'VALIDAR ALTERAÇÕES' : 'EFETIVAR CADASTRO'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={handleDelete} loading={deletePackage.isPending} description="O pacote será desativado e não aparecerá mais nas listagens." />
    </div>
  );
}
