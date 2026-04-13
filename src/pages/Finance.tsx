import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { PaginationControls } from '@/components/PaginationControls';
import { TrendingUp, TrendingDown, DollarSign, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Download, FileText, Tags, Activity, Plus, Filter, Search, Wallet, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  transaction_date: string;
  payment_method: string | null;
  notes: string | null;
  category_id: string | null;
  supplier_id: string | null;
  financial_categories: { name: string } | null;
  suppliers: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Supplier {
  id: string;
  name: string;
}

function exportCSV(transactions: Transaction[]) {
  const header = 'Data,Tipo,Descrição,Categoria,Fornecedor,Forma de Pagamento,Valor,Observações';
  const rows = transactions.map(t => {
    const date = new Date(t.transaction_date + 'T12:00:00').toLocaleDateString('pt-BR');
    const tipo = t.type === 'income' ? 'Receita' : 'Despesa';
    const cat = t.financial_categories?.name || '';
    const sup = t.suppliers?.name || '';
    const pgto = t.payment_method || '';
    const valor = (t.type === 'income' ? '' : '-') + Number(t.amount).toFixed(2).replace('.', ',');
    const notes = (t.notes || '').replace(/"/g, '""');
    return `${date},"${tipo}","${t.description.replace(/"/g, '""')}","${cat}","${sup}","${pgto}",${valor},"${notes}"`;
  });
  const csv = '\uFEFF' + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financeiro_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDFText(transactions: Transaction[]) {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  
  let content = `RELATÓRIO FINANCEIRO\nGerado em: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
  content += `Receitas: ${fmt(totalIncome)}\nDespesas: ${fmt(totalExpense)}\nSaldo: ${fmt(totalIncome - totalExpense)}\n\n`;
  content += `${'='.repeat(80)}\n`;
  content += `Data          | Tipo     | Descrição                    | Valor\n`;
  content += `${'-'.repeat(80)}\n`;
  
  transactions.forEach(t => {
    const date = new Date(t.transaction_date + 'T12:00:00').toLocaleDateString('pt-BR');
    const tipo = t.type === 'income' ? 'Receita' : 'Despesa';
    const valor = (t.type === 'income' ? '+' : '-') + fmt(Number(t.amount));
    content += `${date.padEnd(14)}| ${tipo.padEnd(9)}| ${t.description.substring(0, 29).padEnd(29)}| ${valor}\n`;
  });
  
  content += `${'='.repeat(80)}\n`;
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financeiro_${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Finance() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'expense' as string,
    description: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: '',
    category_id: '',
    supplier_id: '',
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['financial-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*, financial_categories(name), suppliers(name)')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!profile,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['financial-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('id, name, type')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!profile,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!profile,
  });

  // Auto-seed default categories
  useEffect(() => {
    if (profile && categories.length === 0) {
      supabase.rpc('seed_default_categories' as any).then(({ error }) => {
        if (!error) qc.invalidateQueries({ queryKey: ['financial-categories'] });
      });
    }
  }, [profile, categories.length, qc]);

  const filtered = typeFilter === 'all' ? transactions : transactions.filter(t => t.type === typeFilter);
  const total = filtered.length;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const saveMutation = useMutation({
    mutationFn: async (input: any) => {
      const payload = {
        type: input.type,
        description: input.description,
        amount: parseFloat(input.amount),
        transaction_date: input.transaction_date,
        payment_method: input.payment_method || null,
        notes: input.notes || null,
        category_id: input.category_id || null,
        supplier_id: input.supplier_id || null,
      };
      if (input.id) {
        const { error } = await supabase.from('financial_transactions').update(payload).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('financial_transactions').insert({ ...payload, tenant_id: profile!.tenant_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-transactions'] });
      toast.success(editing ? 'Transação atualizada!' : 'Transação registrada!');
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial-transactions'] });
      toast.success('Transação removida!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao remover'),
  });

  const openNew = (type: string = 'expense') => {
    setEditing(null);
    setForm({ type, description: '', amount: '', transaction_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '', category_id: '', supplier_id: '' });
    setDialogOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      type: t.type,
      description: t.description,
      amount: String(t.amount),
      transaction_date: t.transaction_date,
      payment_method: t.payment_method || '',
      notes: t.notes || '',
      category_id: t.category_id || '',
      supplier_id: t.supplier_id || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleSave = () => {
    if (!form.description.trim()) { toast.error('Descrição é obrigatória'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) { toast.error('Valor inválido'); return; }
    saveMutation.mutate({ ...form, id: editing?.id });
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filteredCategories = categories.filter(c => c.type === form.type);

  return (
    <div className="space-y-10">
      <FadeIn direction="down">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-border pb-8">
          <div className="page-header">
            <h2 className="page-title italic">Controle Financeiro</h2>
            <p className="page-description">Sincronização de fluxo e gestão de liquidez.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 items-center px-4 bg-muted/30 border border-border">
              <Activity className="h-3.5 w-3.5 text-primary animate-pulse mr-2.5" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-3">Status:</span>
              <div className="flex items-center gap-1.5">
                 <span className="text-xs font-bold font-mono">STABLE_RECAP</span>
              </div>
            </div>
            {transactions.length > 0 && (
              <div className="flex gap-1.5">
                <Button variant="outline" size="icon" className="h-12 w-12 border-border hover:bg-muted" onClick={() => exportCSV(filtered)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-12 w-12 border-border hover:bg-muted" onClick={() => exportPDFText(filtered)}>
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={() => openNew('income')} className="h-12 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 font-black uppercase tracking-widest text-[10px]">
              <Plus className="h-4 w-4 mr-2" /> Receita
            </Button>
            <Button onClick={() => openNew('expense')} className="btn-premium h-12">
              <Plus className="h-4 w-4 mr-2" /> Despesa
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Summary Section */}
      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FadeIn direction="up">
          <div className="stat-card group hover:border-emerald-500/40">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 group-hover:text-emerald-500 transition-colors">Entradas Totais</span>
              <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-black font-display italic tracking-tighter text-emerald-600">{fmt(totalIncome)}</p>
            <div className="mt-4 pt-4 border-t border-border/50 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              Volume bruto de recebíveis
            </div>
          </div>
        </FadeIn>
        
        <FadeIn direction="up" delay={0.1}>
          <div className="stat-card group hover:border-destructive/40">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 group-hover:text-destructive transition-colors">Saídas Totais</span>
              <div className="w-10 h-10 bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20 group-hover:bg-destructive group-hover:text-white transition-all duration-300">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-black font-display italic tracking-tighter text-destructive">{fmt(totalExpense)}</p>
            <div className="mt-4 pt-4 border-t border-border/50 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              Fluxo de desembolso operacional
            </div>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.2}>
          <div className="stat-card group hover:border-primary/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/60 group-hover:text-primary transition-colors">Saldo Líquido</span>
              <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <p className={cn("text-3xl font-black font-display italic tracking-tighter", balance >= 0 ? 'text-emerald-600' : 'text-destructive')}>
              {fmt(balance)}
            </p>
            <div className="mt-4 pt-4 border-t border-border/50 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              Disponibilidade em caixa
            </div>
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-12 h-1 bg-primary/40" />
          </div>
        </FadeIn>
      </StaggerContainer>

      {/* Filter and List */}
      <div className="space-y-6">
        <FadeIn delay={0.3}>
          <div className="flex flex-col gap-4 p-4 bg-muted/10 border border-border sm:flex-row sm:items-center justify-between transition-all hover:bg-muted/15">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 pr-4 border-r border-border/50">
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filtro de Fluxo</span>
              </div>
              <div className="flex gap-1 p-1 bg-background/40 border border-border/40">
                {[{ key: 'all', label: 'TUDO' }, { key: 'income', label: 'RECEITAS' }, { key: 'expense', label: 'DESPESAS' }].map(f => (
                  <Button 
                    key={f.key} 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setTypeFilter(f.key); setPage(1); }}
                    className={cn(
                      'h-8 px-4 text-[10px] font-black rounded-none transition-all uppercase tracking-widest', 
                      typeFilter === f.key ? 'bg-primary text-white shadow-glow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input placeholder="Buscar transação..." className="h-10 pl-9 border-border bg-background/50 text-xs font-bold uppercase tracking-widest min-w-[250px] transition-all focus:bg-background focus:ring-1 focus:ring-primary/20" />
              </div>
            </div>
          </div>
        </FadeIn>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted/10 border border-border animate-pulse" />)}</div>
        ) : !paged.length ? (
          <FadeIn className="py-20 border border-dashed border-border/60 bg-muted/5 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-muted/30 flex items-center justify-center mb-4 rotate-45 group hover:rotate-90 transition-transform">
              <DollarSign className="h-8 w-8 text-muted-foreground/20 -rotate-45 group-hover:-rotate-90 transition-transform" />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground/60">Null Vector Data</h4>
            <p className="text-xs text-muted-foreground/40 italic mt-2">Nenhum registro de transação identificado no setor financeiro.</p>
            <Button variant="outline" className="mt-6 font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5" onClick={() => openNew()}>
              INICIAR PROTOCOLO DE FLUXO
            </Button>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-3">
            {paged.map((t) => (
              <FadeIn key={t.id} direction="right" className="group bg-muted/10 border border-border p-4 hover:border-primary/30 hover:bg-muted/20 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center text-white shrink-0 font-mono text-[10px] font-black italic transition-all duration-500 group-hover:scale-110 group-hover:shadow-glow-sm",
                    t.type === 'income' ? 'bg-emerald-500' : 'bg-destructive'
                  )}>
                    {t.type === 'income' ? 'IN' : 'OUT'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black text-primary font-mono uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 border border-primary/10 transition-colors group-hover:bg-primary group-hover:text-white">ID: {t.id.substring(0, 8).toUpperCase()}</span>
                      <div className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(t.transaction_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-sm font-black font-display uppercase tracking-tight group-hover:text-primary transition-colors">{t.description}</p>
                    
                    <div className="flex flex-wrap gap-3 mt-2">
                      {t.financial_categories?.name && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-background/50 border border-border/40 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 transition-colors group-hover:border-primary/20">
                          <Tags className="h-2.5 w-2.5 opacity-40 shrink-0" /> {t.financial_categories.name}
                        </div>
                      )}
                      {t.suppliers?.name && (
                         <div className="flex items-center gap-1.5 px-2 py-0.5 bg-background/50 border border-border/40 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 transition-colors group-hover:border-primary/20">
                           <Building2 className="h-2.5 w-2.5 opacity-40 shrink-0" /> {t.suppliers.name}
                         </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:text-right border-t border-border/50 pt-4 sm:border-0 sm:pt-0">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/40 mb-1">Valor Unitário</p>
                      <p className={cn("text-xl font-black font-mono italic tracking-tighter", t.type === 'income' ? 'text-emerald-500' : 'text-destructive')}>
                        {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount))}
                      </p>
                    </div>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-10 w-10 border border-transparent hover:border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 border border-transparent hover:border-destructive/20 hover:bg-destructive/5 hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
            <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </StaggerContainer>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-border bg-card p-0 overflow-hidden">
          <div className="bg-muted/30 p-8 border-b border-border">
            <DialogTitle className="text-2xl font-black font-display uppercase tracking-tight italic">
              {editing ? 'Calibrar Transação' : 'Novo Registro de Fluxo'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-2 text-muted-foreground/60">
              Parametrização técnica de ativos e passivos financeiros.
            </DialogDescription>
          </div>

          <div className="p-8 space-y-6 bg-card/50">
            <div className="flex gap-2 p-1 bg-muted/30 border border-border">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setForm(p => ({ ...p, type: 'income', category_id: '' }))}
                className={cn(
                  'flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-none transition-all', 
                  form.type === 'income' ? 'bg-emerald-500 text-white' : 'text-muted-foreground'
                )}
              >
                Receita
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setForm(p => ({ ...p, type: 'expense', category_id: '' }))}
                className={cn(
                  'flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-none transition-all', 
                  form.type === 'expense' ? 'bg-destructive text-white' : 'text-muted-foreground'
                )}
              >
                Despesa
              </Button>
            </div>

            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Descrição do Evento *</Label>
              <Input 
                value={form.description} 
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} 
                maxLength={200} 
                className="h-12 bg-background border-border font-bold text-xs uppercase tracking-widest"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Valor Operacional (R$) *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={form.amount} 
                  onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} 
                  className="h-12 bg-background border-border font-black text-sm italic"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Data do Log *</Label>
                <Input 
                  type="date" 
                  value={form.transaction_date} 
                  onChange={(e) => setForm(p => ({ ...p, transaction_date: e.target.value }))} 
                  className="h-12 bg-background border-border font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Categoria Técnica</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm(p => ({ ...p, category_id: v }))}>
                  <SelectTrigger className="h-12 bg-background border-border text-xs font-bold uppercase tracking-widest">
                    <SelectValue placeholder="Sinalizar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase tracking-widest">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Forma de Liquidação</Label>
                <Select value={form.payment_method || ''} onValueChange={(v) => setForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger className="h-12 bg-background border-border text-xs font-bold uppercase tracking-widest">
                    <SelectValue placeholder="Definir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {['Dinheiro', 'PIX', 'Cartão Crédito', 'Cartão Débito', 'Transferência', 'Boleto'].map(m => <SelectItem key={m} value={m} className="text-xs font-bold uppercase tracking-widest">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === 'expense' && (
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Credor / Fornecedor</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm(p => ({ ...p, supplier_id: v }))}>
                  <SelectTrigger className="h-12 bg-background border-border text-xs font-bold uppercase tracking-widest">
                    <SelectValue placeholder="Identificar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase tracking-widest">{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Notas de Auditoria</Label>
              <Textarea 
                value={form.notes} 
                onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} 
                rows={2} 
                maxLength={500} 
                placeholder="Inserir metadados adicionais..."
                className="bg-background border-border text-xs font-medium resize-none min-h-[80px]"
              />
            </div>
          </div>
          
          <div className="p-8 border-t border-border bg-muted/10 flex gap-3">
             <Button variant="outline" className="flex-1 h-12 font-black uppercase tracking-widest text-[10px] border-border" onClick={closeDialog}>
               ABORTAR
             </Button>
             <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-[2] btn-premium h-12 uppercase tracking-widest font-black">
               {saveMutation.isPending ? 'PROCESSANDO...' : 'EFETIVAR TRANSAÇÃO'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} onConfirm={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }} loading={deleteMutation.isPending} />
    </div>
  );
}
