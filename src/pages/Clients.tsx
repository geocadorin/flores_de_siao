import { useState } from 'react';
import { useClients, useCreateClient } from '@/hooks/useTenantData';
import { useUpdateClient, useDeleteClient } from '@/hooks/useCrudMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, Phone, Mail, Users, Pencil, Trash2, Filter, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PaginationControls } from '@/components/PaginationControls';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', notes: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = clients?.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const openNew = () => { setEditing(null); setForm({ full_name: '', phone: '', email: '', notes: '' }); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ full_name: c.full_name, phone: c.phone || '', email: c.email || '', notes: c.notes || '' }); setOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateClient.mutateAsync({ id: editing.id, ...form });
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await createClient.mutateAsync(form);
        toast.success('Cliente cadastrado com sucesso!');
      }
      setOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteClient.mutateAsync(deleteId);
      toast.success('Cliente removido do sistema.');
    } catch (err: any) { toast.error(err.message); }
    setDeleteId(null);
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <FadeIn direction="down">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-border pb-8">
          <div>
            <h2 className="page-title italic">Diretório de Clientes</h2>
            <p className="page-description">Gerenciamento técnico da base de usuários ativos.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex h-12 items-center px-4 bg-muted/30 border border-border">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-3">Status:</span>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                   <span className="text-xs font-bold">{clients?.length ?? 0} Sincronizados</span>
                </div>
             </div>
             <Button className="btn-premium h-12 group" onClick={openNew}>
               <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" /> Novo Cliente
             </Button>
          </div>
        </div>
      </FadeIn>

      {/* Control Bar */}
      <FadeIn delay={0.1}>
        <div className="flex flex-col gap-4 p-2 bg-muted/10 border border-border sm:flex-row sm:items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Filtro rápido: nome, id, contato..." 
              value={search} 
              onChange={(e) => handleSearch(e.target.value)} 
              className="pl-11 h-12 bg-transparent border-transparent focus-visible:ring-0 focus-visible:border-primary/50 transition-all font-medium"
            />
          </div>
          <div className="flex items-center gap-2 px-2 border-l border-border/50">
             <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                <Filter className="h-4 w-4" />
             </Button>
             <div className="w-px h-6 bg-border/50" />
             <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
          </div>
        </div>
      </FadeIn>

      {/* Grid Section */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-40 bg-muted/20 border border-border animate-pulse" />
          ))}
        </div>
      ) : !filtered.length ? (
        <FadeIn delay={0.2} className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border/40 bg-muted/5">
          <div className="w-20 h-20 bg-muted/30 flex items-center justify-center mb-6 transition-transform hover:rotate-6">
            <Users className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[4px] text-muted-foreground mb-2">Sem Resultados</h3>
          <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed italic">
            {search ? `Não encontramos registros para "${search}".` : 'O banco de dados está vazio. Inicie o registro de clientes.'}
          </p>
        </FadeIn>
      ) : (
        <div className="space-y-12">
          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((client, i) => (
              <FadeIn key={client.id} className="glass-panel group overflow-hidden border border-border hover:border-primary/30 transition-all duration-500">
                <div className="p-6 relative">
                  {/* Decorative corner accent */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-primary/5 -mr-4 -mt-4 rotate-45 group-hover:bg-primary/20 transition-colors" />
                  
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 border border-border/40 group-hover:border-primary/40 transition-colors bg-muted">
                      <AvatarFallback className="bg-transparent text-foreground/40 text-sm font-black uppercase tracking-tighter italic">
                        {getInitials(client.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black font-display uppercase tracking-tight group-hover:text-primary transition-all duration-300">
                        {client.full_name}
                      </p>
                      <div className="mt-3 space-y-2 opacity-80">
                        {client.phone && (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            <Phone className="h-3 w-3 text-primary/60" />
                            <span className="truncate">{client.phone}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            <Mail className="h-3 w-3 text-primary/60" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-border/50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20" 
                          onClick={() => openEdit(client)}
                        >
                          <Pencil className="h-3 w-3 mr-1.5" /> Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20" 
                          onClick={() => setDeleteId(client.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1.5" /> Deletar
                        </Button>
                     </div>
                     <span className="text-[10px] font-bold text-muted-foreground/40 font-mono">
                        UID-{client.id.slice(0, 4)}
                     </span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </StaggerContainer>

          <FadeIn delay={0.4}>
            <PaginationControls 
              page={page} 
              pageSize={pageSize} 
              total={total} 
              onPageChange={setPage} 
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} 
              pageSizeOptions={[12, 24, 48]} 
            />
          </FadeIn>
        </div>
      )}

      {/* Modal: Form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] border-border bg-card p-0 overflow-hidden">
          <div className="bg-muted/30 p-8 border-b border-border">
            <DialogTitle className="text-2xl font-black font-display uppercase tracking-tight italic">
              {editing ? 'Modificar Registro' : 'Novo Registro Técnico'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 text-muted-foreground/60">
              {editing ? 'Atualização de parâmetros do cliente no sistema.' : 'Inclusão de nova entrada na base de dados de clientes.'}
            </DialogDescription>
          </div>
          <form onSubmit={handleSave} className="p-8 space-y-6 bg-card/50">
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Nome Completo do Cliente *</Label>
              <Input 
                value={form.full_name} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                required 
                placeholder="Ex: ARTHUR MORGAN" 
                className="h-12 bg-background border-border focus:border-primary/50 transition-all font-bold"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Telefone / WhatsApp</Label>
                <Input 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  placeholder="(00) 0 0000-0000" 
                  className="h-12 bg-background border-border focus:border-primary/50 transition-all"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">E-mail de Contato</Label>
                <Input 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  placeholder="contato@exemplo.com" 
                  className="h-12 bg-background border-border focus:border-primary/50 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Logs / Observações Adicionais</Label>
              <Textarea 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                placeholder="Detalhes relevantes para o histórico do cliente..." 
                className="min-h-[120px] bg-background border-border focus:border-primary/50 transition-all resize-none"
              />
            </div>
            <div className="pt-4">
              <Button type="submit" className="w-full btn-premium h-14" disabled={createClient.isPending || updateClient.isPending}>
                {(createClient.isPending || updateClient.isPending) ? 'SINCRONIZANDO...' : editing ? 'EFETUAR ALTERAÇÕES' : 'CONFIRMAR INCLUSÃO'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog 
        open={!!deleteId} 
        onOpenChange={(o) => !o && setDeleteId(null)} 
        onConfirm={handleDelete} 
        loading={deleteClient.isPending} 
      />
    </div>
  );
}
