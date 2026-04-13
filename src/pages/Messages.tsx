import { useState, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';
import { useClients } from '@/hooks/useTenantData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Send, MessageSquare, Settings, RefreshCw, Wifi, WifiOff, Trash2, FileText, Plus, Pencil, Variable } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaginationControls } from '@/components/PaginationControls';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// --- Types ---
interface Message {
  id: string;
  created_at: string;
  status: string;
  message: string;
  clients?: {
    full_name: string;
    phone: string;
  };
}

interface Template {
  id?: string;
  name: string;
  content: string;
  category: string;
  active: boolean;
}

// --- Hooks ---
function useMessages() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('messages').select('*, clients(full_name, phone)').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!profile,
  });
}

function useEvolutionInstances() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['evolution-instances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('evolution_instances').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

function useMessageTemplates() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('message_templates').select('*').order('name');
      if (error) throw error;
      return data as Template[];
    },
    enabled: !!profile,
  });
}

// --- Constants ---
const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; dot: string }> = {
  queued: { label: 'Na fila', variant: 'outline', dot: 'bg-warning' },
  sent: { label: 'Enviada', variant: 'default', dot: 'bg-green-500' },
  failed: { label: 'Falhou', variant: 'destructive', dot: 'bg-destructive' },
};

const CATEGORIES = [
  { value: 'confirmation', label: 'Confirmação' },
  { value: 'reminder', label: 'Lembrete' },
  { value: 'welcome', label: 'Boas-vindas' },
  { value: 'followup', label: 'Pós-atendimento' },
  { value: 'custom', label: 'Personalizado' },
];

const categoryLabels: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const emptyForm: Template = { name: '', content: '', category: 'custom', active: true };

// --- Main Page ---
export default function Messages() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const queryClient = useQueryClient();
  const { data: allMessages = [], isLoading: msgLoading } = useMessages();
  const { data: instances = [] } = useEvolutionInstances();
  const { data: templates = [], isLoading: tplLoading } = useMessageTemplates();
  const { data: clients = [] } = useClients();

  const [activeTab, setActiveTab] = useState('send');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [msgPage, setMsgPage] = useState(1);
  const [msgPageSize, setMsgPageSize] = useState(10);
  
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplForm, setTplForm] = useState<Template>(emptyForm);
  const [tplDeleteId, setTplDeleteId] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const [instForm, setInstForm] = useState({ name: '', apiUrl: '', apiKey: '' });

  // Mutations
  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('messages').insert({
        client_id: selectedClient,
        message: messageText,
        status: 'queued',
        tenant_id: profile?.tenant_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mensagem enfileirada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageText('');
    },
    onError: (error) => toast.error(`Erro ao enviar: ${error.message}`),
  });

  const processQueue = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_message_queue' as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fila sincronizada');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const saveTplMutation = useMutation({
    mutationFn: async (tpl: Template) => {
      if (tpl.id) {
        const { error } = await supabase.from('message_templates').update(tpl).eq('id', tpl.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('message_templates').insert({ ...tpl, tenant_id: profile?.tenant_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(tplForm.id ? 'Template atualizado' : 'Template criado');
      setTplDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    },
  });

  const deleteTplMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('message_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template removido');
      setTplDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    },
  });

  const clearHistory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('messages').delete().neq('id', 'placeholder');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Logs expurgados');
      setClearDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const addInstance = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('evolution_instances').insert({
        instance_name: instForm.name,
        api_url: instForm.apiUrl,
        api_key: instForm.apiKey,
        tenant_id: profile?.tenant_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Instância vinculada');
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
      setInstForm({ name: '', apiUrl: '', apiKey: '' });
    },
  });

  const handleRefreshInstance = (name: string) => {
    toast.info(`Reiniciando motor: ${name}`);
    // Implementar RPC de refresh se necessário
  };

  const handleDeleteInstance = async (id: string) => {
    const { error } = await supabase.from('evolution_instances').delete().eq('id', id);
    if (error) toast.error('Erro ao remover');
    else {
      toast.success('Motor removido');
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    }
  };

  const paginatedMessages = useMemo(() => {
    return allMessages.slice((msgPage - 1) * msgPageSize, msgPage * msgPageSize);
  }, [allMessages, msgPage, msgPageSize]);

  const msgTotal = allMessages.length;

  const previewContent = (content: string) => content
    .replace(/\{\{nome\}\}/g, 'Maria Silva')
    .replace(/\{\{telefone\}\}/g, '(11) 99999-9999');

  return (
    <div className="space-y-8 pb-20">
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
          <div className="page-header mb-0">
            <h2 className="page-title">Centro de Comunicação</h2>
            <p className="page-description">Gerenciamento de gatilhos e templates de WhatsApp</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/5 border border-border/50 rounded-lg">
            <div className={cn("h-2 w-2 rounded-full animate-pulse", instances?.some((i: any) => i.status === 'connected' || i.status === 'open') ? "bg-green-500" : "bg-destructive")} />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 tracking-[2px]">
              Evolution API: {instances?.some((i: any) => i.status === 'connected' || i.status === 'open') ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </FadeIn>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <FadeIn direction="up">
          <TabsList className="bg-muted/5 border border-border/50 p-1 h-12">
            <TabsTrigger value="send" className="px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:font-bold transition-all">
              <Send className="h-3.5 w-3.5 mr-2" /> Enviar
            </TabsTrigger>
            <TabsTrigger value="history" className="px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:font-bold transition-all">
              <MessageSquare className="h-3.5 w-3.5 mr-2" /> Histórico
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="templates" className="px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:font-bold transition-all">
                  <FileText className="h-3.5 w-3.5 mr-2" /> Templates
                </TabsTrigger>
                <TabsTrigger value="instances" className="px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:font-bold transition-all">
                  <Settings className="h-3.5 w-3.5 mr-2" /> Configuração API
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </FadeIn>

        {/* --- ENVIAR --- */}
        <TabsContent value="send" className="space-y-6">
          <FadeIn direction="up" delay={0.1}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8">
                <Card className="stat-card border-border/40 overflow-hidden">
                  <CardHeader className="p-6 border-b border-border bg-muted/5">
                    <div className="flex items-center gap-3">
                      <Send className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Terminal de Disparo</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60">Destinatário Alvo</Label>
                      <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="h-12 bg-muted/2 border-border/40 font-mono text-[11px] font-bold">
                          <SelectValue placeholder="SELECIONAR OBJETO..." />
                        </SelectTrigger>
                        <SelectContent className="border-border/60">
                          {clients?.filter(c => c.phone).map((c: any) => (
                            <SelectItem key={c.id} value={c.id} className="font-mono text-xs uppercase tracking-tighter">
                              {c.full_name} <span className="opacity-40 italic">// {c.phone}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60">Conteúdo Codificado</Label>
                        <span className="text-[10px] font-mono text-muted-foreground/20 italic">{messageText.length}/4096 octets</span>
                      </div>
                      <Textarea 
                        value={messageText} 
                        onChange={(e) => setMessageText(e.target.value)} 
                        placeholder="DIGITE A MENSAGEM TÉCNICA..." 
                        className="bg-muted/2 border-border/40 italic leading-relaxed text-sm p-6 font-mono font-bold resize-none min-h-[220px]"
                      />
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row pt-4 border-t border-border/20">
                      <Button 
                        onClick={() => sendMessage.mutate()} 
                        disabled={!selectedClient || !messageText.trim() || sendMessage.isPending} 
                        className="btn-premium flex-1 h-14 font-black uppercase tracking-widest italic"
                      >
                        <Send className="mr-3 h-4 w-4" />
                        {sendMessage.isPending ? 'PROCESSANDO...' : 'EXECUTAR DISPARO'}
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          onClick={() => processQueue.mutate()} 
                          disabled={processQueue.isPending} 
                          className="flex-1 h-14 font-black uppercase tracking-widest italic border-border/60 hover:bg-muted/10 transition-all"
                        >
                          <RefreshCw className={cn("mr-3 h-4 w-4 text-primary", processQueue.isPending && "animate-spin")} />
                          Sincronizar Fila
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <Card className="stat-card p-6 border-primary/20 bg-muted/2">
                  <div className="flex items-center gap-2 mb-8">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-[2px] text-foreground italic">Templates Rápidos</h4>
                  </div>
                  <div className="space-y-4">
                    {!templates?.filter(t => t.active).length ? (
                      <div className="py-12 border border-dashed border-border/40 rounded-xl text-center">
                        <p className="text-[10px] text-muted-foreground/40 italic uppercase tracking-widest">Sem templates ativos</p>
                      </div>
                    ) : (
                      templates.filter(t => t.active).map(t => (
                        <Button 
                          key={t.id} 
                          variant="outline" 
                          className="w-full h-12 justify-start px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all bg-background border-border/60 group relative overflow-hidden"
                          onClick={() => setMessageText(t.content)}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform" />
                          <Plus className="mr-3 h-3 w-3 text-primary" /> {t.name}
                        </Button>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </FadeIn>
        </TabsContent>

        {/* --- HISTÓRICO --- */}
        <TabsContent value="history" className="space-y-6">
          <FadeIn direction="up" delay={0.1}>
            <Card className="stat-card border-border/40 overflow-hidden">
              <CardHeader className="p-6 border-b border-border bg-muted/5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Logs de Comunicação</CardTitle>
                </div>
                {isAdmin && allMessages.length > 0 && (
                  <Button variant="ghost" onClick={() => setClearDialogOpen(true)} className="h-10 font-black uppercase tracking-widest text-[10px] text-destructive hover:bg-destructive/5 transition-colors border border-transparent hover:border-destructive/20">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Expurgar Logs
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {msgLoading ? (
                  <div className="p-12 space-y-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 w-full animate-pulse bg-muted/10 rounded-xl" />)}
                  </div>
                ) : allMessages.length === 0 ? (
                  <div className="p-24 text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/10 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/40 italic">Nenhum log detectado</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-border/40">
                      {paginatedMessages.map((msg, idx) => (
                        <div key={msg.id} className="group p-8 hover:bg-muted/5 transition-all duration-300 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            <div className="flex items-start gap-5">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-border/60 bg-muted/3 rounded-lg">
                                <span className="text-[10px] font-black text-primary">#{String(msgTotal - ((msgPage - 1) * msgPageSize + idx)).padStart(2, '0')}</span>
                              </div>
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <h4 className="text-[11px] font-black uppercase tracking-[2px] text-foreground truncate">{msg.clients?.full_name}</h4>
                                  <Badge variant="outline" className="text-[9px] font-mono border-border/40 text-muted-foreground">{msg.clients?.phone}</Badge>
                                </div>
                                <p className="text-[13px] text-muted-foreground max-w-xl italic border-l-2 border-primary/10 pl-4 py-1">{msg.message}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-8 shrink-0">
                              <div className="text-right flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 px-3 py-1 border border-border/40 rounded-full bg-muted/2">
                                  <div className={cn("h-1.5 w-1.5 rounded-full", (statusLabels as any)[msg.status]?.dot || 'bg-muted')} />
                                  <span className="text-[9px] font-black uppercase tracking-[1px] text-muted-foreground/80">{(statusLabels as any)[msg.status]?.label || msg.status}</span>
                                </div>
                                <span className="text-[10px] font-black text-muted-foreground/40 italic uppercase tracking-tighter">
                                  {format(new Date(msg.created_at), "dd MMM // HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-8 border-t border-border bg-muted/3">
                      <PaginationControls 
                        page={msgPage}
                        pageSize={msgPageSize}
                        total={msgTotal}
                        onPageChange={setMsgPage}
                        onPageSizeChange={(s) => { setMsgPageSize(s); setMsgPage(1); }}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </TabsContent>

        {/* --- TEMPLATES --- */}
        {isAdmin && (
          <TabsContent value="templates" className="space-y-6">
            <FadeIn direction="up" delay={0.1}>
              <Card className="stat-card border-border/40 overflow-hidden">
                <CardHeader className="p-6 border-b border-border bg-muted/5 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-black font-display uppercase tracking-tight italic">Biblioteca de Templates</CardTitle>
                  </div>
                  <Button onClick={() => { setTplForm(emptyForm); setTplDialogOpen(true); }} size="sm" className="btn-premium h-10 px-8 font-black uppercase tracking-widest text-[10px]">
                    <Plus className="h-3.5 w-3.5 mr-2" /> Novo Template
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {tplLoading ? (
                    <div className="p-12 space-y-6">
                      {[1, 2].map(i => <div key={i} className="h-16 w-full animate-pulse bg-muted/10 rounded-xl" />)}
                    </div>
                  ) : !templates?.length ? (
                    <div className="p-24 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/10 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/40 italic">Sem templates salvos</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {templates.map((t) => (
                        <div key={t.id} className={cn("group p-8 hover:bg-muted/5 transition-all duration-300 relative", !t.active && "opacity-50 grayscale")}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                            <div className="space-y-2 min-w-0 flex-1">
                              <div className="flex items-center gap-3">
                                <h4 className="text-[11px] font-black uppercase tracking-[2px] text-foreground truncate">{t.name}</h4>
                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[2px] border-primary/30 bg-primary/5 text-primary italic">
                                  { (categoryLabels as any)[t.category] || t.category }
                                </Badge>
                              </div>
                              <p className="text-[13px] text-muted-foreground line-clamp-1 italic tracking-tight border-l-2 border-border/40 pl-4">{t.content}</p>
                            </div>
                            <div className="flex gap-3">
                              <Button variant="outline" size="icon" className="h-10 w-10 border-border/60" onClick={() => { setTplForm(t); setTplDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-10 w-10 border-border/60 hover:bg-destructive" onClick={() => setTplDeleteId(t.id || null)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </TabsContent>
        )}

        {/* --- INSTÂNCIAS --- */}
        {isAdmin && (
          <TabsContent value="instances" className="space-y-6">
            <FadeIn direction="up" delay={0.1}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="stat-card border-primary/20 overflow-hidden">
                  <CardHeader className="p-8 border-b border-border bg-muted/5">
                    <CardTitle className="text-xl font-black font-display uppercase tracking-tight italic">Instâncias Evolution API</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    {instances?.map((inst: any) => (
                      <div key={inst.id} className="space-y-8 group">
                        <div className="flex items-center justify-between p-8 bg-muted/2 border border-border/60 rounded-2xl relative">
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nome da Instância</p>
                            <h4 className="text-lg font-black italic tracking-tighter uppercase">{inst.instance_name}</h4>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <div className={cn("h-2.5 w-2.5 rounded-full", (inst.status === 'open' || inst.status === 'connected') ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/20' : 'bg-destructive')} />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">{(inst.status === 'open' || inst.status === 'connected') ? 'ONLINE' : 'HALT'}</span>
                          </div>
                        </div>

                        {inst.status !== 'open' && inst.qrcode && (
                          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-primary/20 rounded-3xl bg-muted/2">
                            <img src={inst.qrcode} alt="QR Code" className="h-64 w-64 grayscale group-hover:grayscale-0 transition-all duration-700 bg-white p-4 rounded-xl" />
                            <p className="text-[11px] font-black uppercase tracking-widest text-primary italic mt-8">EVOLUTION API SYNC</p>
                          </div>
                        )}

                        <div className="flex gap-4 pt-4 border-t border-border/20">
                          <Button onClick={() => handleRefreshInstance(inst.instance_name)} variant="outline" className="flex-1 h-12 font-black uppercase tracking-widest text-[10px]"><RefreshCw className="mr-3 h-4 w-4 text-primary" /> RECONECTAR</Button>
                          <Button onClick={() => handleDeleteInstance(inst.id)} variant="ghost" className="h-12 px-6 text-muted-foreground/40 hover:text-destructive"><Trash2 className="h-5 w-5"/></Button>
                        </div>
                      </div>
                    ))}
                    {!instances.length && (
                      <div className="py-24 text-center border-2 border-dashed border-border/40 rounded-3xl">
                        <p className="text-[10px] font-black uppercase text-muted-foreground/40 italic">Sem instâncias vinculadas</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="stat-card border-border/40 overflow-hidden bg-muted/2">
                  <CardHeader className="p-8 border-b border-border bg-muted/5">
                    <CardTitle className="text-xl font-black font-display uppercase tracking-tight italic">Configurar Evolution API</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black">NOME</Label>
                      <Input value={instForm.name} onChange={e => setInstForm({...instForm, name: e.target.value})} placeholder="Ex: INSTANCIA_GlowWS" className="h-12 font-mono uppercase" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black">URL</Label>
                      <Input value={instForm.apiUrl} onChange={e => setInstForm({...instForm, apiUrl: e.target.value})} placeholder="https://..." className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black">API KEY</Label>
                      <Input type="password" value={instForm.apiKey} onChange={e => setInstForm({...instForm, apiKey: e.target.value})} placeholder="***" className="h-12" />
                    </div>
                    <Button onClick={() => addInstance.mutate()} className="w-full btn-premium h-14 font-black uppercase tracking-widest italic" disabled={!instForm.name || addInstance.isPending}>
                      VINCULAR EVOLUTION
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </FadeIn>
          </TabsContent>
        )}
      </Tabs>

      {/* --- DIALOGS --- */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent className="max-w-3xl bg-background border-border/60 p-0 overflow-hidden text-foreground">
          <DialogHeader className="p-10 border-b border-border bg-muted/2">
            <DialogTitle className="text-2xl font-black font-display uppercase italic italic">Arquitetura de Template</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Configuração de script delta e automação</DialogDescription>
          </DialogHeader>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black">REF_NAME</Label>
                <Input value={tplForm.name} onChange={e => setTplForm((p: any) => ({ ...p, name: e.target.value }))} className="h-12 font-mono uppercase" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black">CLASS</Label>
                <Select value={tplForm.category} onValueChange={v => setTplForm((p: any) => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-12 font-mono uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k,v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center"><Label className="text-[10px] font-black">SCRIPT</Label></div>
              <Textarea value={tplForm.content} onChange={e => setTplForm((p: any) => ({ ...p, content: e.target.value }))} rows={6} className="bg-muted/5 font-mono italic" />
            </div>
            <div className="flex items-center gap-4 p-6 bg-muted/5 border rounded-2xl">
              <Switch checked={tplForm.active} onCheckedChange={v => setTplForm((p: any)=>({...p, active:v}))} />
              <Label className="text-[11px] font-black uppercase italic">Estado Ativo</Label>
            </div>
          </div>
          <DialogFooter className="p-10 border-t bg-muted/2">
            <Button variant="ghost" onClick={() => setTplDialogOpen(false)} className="h-14 flex-1 uppercase tracking-widest text-[10px] font-black italic">Abortar</Button>
            <Button onClick={() => saveTplMutation.mutate(tplForm)} className="btn-premium h-14 flex-[2] uppercase tracking-widest text-[10px] font-black italic">SALVAR REGISTRO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen} title="Expurgo" description="Limpar todos os logs?" onConfirm={() => clearHistory.mutate()} loading={clearHistory.isPending} />
      <ConfirmDialog open={!!tplDeleteId} onOpenChange={open => !open && setTplDeleteId(null)} title="Excluir" description="Remover template?" onConfirm={() => tplDeleteId && deleteTplMutation.mutate(tplDeleteId)} loading={deleteTplMutation.isPending} />
    </div>
  );
}
