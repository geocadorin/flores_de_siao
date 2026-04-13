import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';
import { cn } from '@/lib/utils';
import { Save, Building2, Phone, MapPin, Upload, X, Loader2, Shield, Clock, User, Lock, Mail, Sparkles, Activity, Command, Terminal, Settings as SettingsIcon } from 'lucide-react';

// ── Types ──
interface TenantInfo { id: string; name: string; slug: string; phone: string | null; address: string | null; logo_url: string | null; hero_title: string | null; hero_description: string | null; }
interface AuditEntry { id: string; field_name: string; old_value: string | null; new_value: string | null; created_at: string; }

// ── Hooks ──
function useTenantInfo() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['tenant-info'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('id, name, slug, phone, address, logo_url, hero_title, hero_description').single();
      if (error) throw error;
      return data as TenantInfo;
    },
    enabled: !!profile,
  });
}

function useTenantSettings() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenant_settings').select('*').maybeSingle();
      if (error) throw error;
      return data as { id: string; allow_registration: boolean } | null;
    },
    enabled: !!profile,
  });
}

function useAuditLog() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['settings-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings_audit_log').select('id, field_name, old_value, new_value, created_at').order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data as AuditEntry[];
    },
    enabled: !!profile,
  });
}

function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name?: string; phone?: string; address?: string; logo_url?: string; hero_title?: string; hero_description?: string }) => {
      const { data, error } = await supabase.rpc('update_tenant_info' as any, {
        p_name: input.name || null, p_phone: input.phone || null, p_address: input.address || null, p_logo_url: input.logo_url || null,
        p_hero_title: input.hero_title || null, p_hero_description: input.hero_description || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-info'] }); toast.success('Configurações salvas com sucesso!'); },
    onError: (err: any) => { toast.error(err.message || 'Erro ao salvar configurações'); },
  });
}

// ── Password strength helper ──
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Fraca', color: 'bg-destructive' };
  if (score <= 2) return { score, label: 'Razoável', color: 'bg-warning' };
  if (score <= 3) return { score, label: 'Boa', color: 'bg-primary' };
  return { score, label: 'Forte', color: 'bg-success' };
}

// ── Profile Tab ──
function ProfileTab() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [userPhone, setUserPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    if (profile) { setFullName(profile.full_name || ''); setUserPhone(profile.phone || ''); }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), phone: userPhone.trim() || null }).eq('id', profile!.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['auth-profile'] });
      toast.success('Perfil atualizado!');
    } catch (err: any) { toast.error(err.message || 'Erro ao atualizar perfil'); }
    finally { setSaving(false); }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) { toast.error('E-mail inválido'); return; }
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success('Um link de confirmação foi enviado para o novo e-mail.');
      setEmailDialogOpen(false);
      setNewEmail('');
    } catch (err: any) { toast.error(err.message || 'Erro ao atualizar e-mail'); }
    finally { setEmailSaving(false); }
  };

  return (
    <>
      <div className="space-y-6">
      <div className="bg-muted/10 border border-border p-8 relative overflow-hidden group">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xl font-black font-display uppercase tracking-tight italic">Configurações de Identidade</h4>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Gestão de credenciais e perfil de operador.</p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Nome de Operador *</Label>
              <Input 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Seu nome completo" 
                maxLength={100}
                className="h-12 bg-background/50 border-border font-bold uppercase tracking-widest text-xs" 
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Canal de Comunicação</Label>
              <Input 
                value={userPhone} 
                onChange={(e) => setUserPhone(e.target.value)} 
                placeholder="(11) 99999-9999" 
                maxLength={20}
                className="h-12 bg-background/50 border-border font-bold text-xs" 
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Endereço de Sincronização (E-mail)</Label>
              <div className="flex items-center gap-3">
                <Input value={user?.email || ''} disabled className="h-12 bg-muted/20 border-border opacity-70 font-bold text-xs flex-1" />
                <Button type="button" variant="outline" className="h-12 px-6 border-primary/40 text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[10px]" onClick={() => { setNewEmail(''); setEmailDialogOpen(true); }}>
                  MODIFICAR
                </Button>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">A alteração requer validação via token de segurança.</p>
            </div>
            
            <div className="pt-2">
              <Button onClick={handleSaveProfile} disabled={saving} className="btn-premium h-14 px-10 bg-primary text-white w-full sm:w-auto font-black uppercase tracking-widest">
                <Save className="h-4 w-4 mr-2" />{saving ? 'PROCESSANDO...' : 'ATUALIZAR PERFIL'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Accent Bar */}
        <div className="absolute top-0 right-0 w-16 h-1 bg-primary/20" />
      </div>
    </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar E-mail</DialogTitle>
            <DialogDescription>Digite seu novo endereço de e-mail. Um link de confirmação será enviado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-email">Novo E-mail</Label>
              <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateEmail} disabled={emailSaving}>{emailSaving ? 'Enviando...' : 'Confirmar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Password Tab ──
function PasswordTab() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const strength = getPasswordStrength(newPw);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) { toast.error('A nova senha deve ter pelo menos 8 caracteres'); return; }
    if (newPw !== confirmPw) { toast.error('As senhas não coincidem'); return; }
    if (strength.score <= 1) { toast.error('A senha é muito fraca. Use letras maiúsculas, números e caracteres especiais.'); return; }

    setSaving(true);
    try {
      // Verify current password by re-authenticating
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user!.email!, password: currentPw });
      if (signInErr) { toast.error('Senha atual incorreta'); return; }

      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success('Senha alterada com sucesso!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) { toast.error(err.message || 'Erro ao alterar senha'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-muted/10 border border-border p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-xl font-black font-display uppercase tracking-tight italic">Criptografia de Acesso</h4>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Atualização periódica de chaves de segurança recomendada.</p>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Chave Atual *</Label>
            <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" required className="h-12 bg-background/50 border-border" />
          </div>
          <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Nova Chave Mestra *</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Mínimo 8 caracteres" required minLength={8} className="h-12 bg-background/50 border-border" />
            
            {newPw && (
              <div className="pt-2 space-y-2">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={cn("h-1 flex-1 transition-all duration-300", i <= strength.score ? strength.color : 'bg-border')} />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Integridade da Chave</span>
                   <span className={cn("text-[9px] font-black uppercase tracking-widest italic", strength.score >= 3 ? "text-primary" : "text-muted-foreground")}>{strength.label}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Confirmar Nova Chave *</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Sincronize as chaves" required className="h-12 bg-background/50 border-border" />
            {confirmPw && newPw !== confirmPw && (
              <p className="text-[10px] font-black uppercase tracking-widest text-destructive italic mt-2 animate-pulse">Inconsistência de redundância detectada</p>
            )}
          </div>
          
          <div className="pt-2">
            <Button type="submit" disabled={saving} className="btn-premium h-14 px-10 bg-primary text-white w-full sm:w-auto font-black uppercase tracking-widest">
              <Lock className="h-4 w-4 mr-2" />{saving ? 'REPLICANDO...' : 'ATIVAR NOVA CHAVE'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Main Settings ──
export default function Settings() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: tenant, isLoading } = useTenantInfo();
  const { data: settings } = useTenantSettings();
  const { data: auditLog = [] } = useAuditLog();
  const updateMutation = useUpdateTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (tenant) { setName(tenant.name || ''); setPhone(tenant.phone || ''); setAddress(tenant.address || ''); setLogoUrl(tenant.logo_url || ''); setHeroTitle(tenant.hero_title || ''); setHeroDescription(tenant.hero_description || ''); }
  }, [tenant]);

  const registrationMutation = useMutation({
    mutationFn: async (allow: boolean) => {
      const { data, error } = await supabase.rpc('update_registration_setting' as any, { p_allow_registration: allow });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-settings'] }); qc.invalidateQueries({ queryKey: ['settings-audit-log'] }); toast.success('Configuração de registro atualizada!'); },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar'),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 2MB'); return; }
    setUploading(true);
    try {
      const tenantId = profile?.tenant_id;
      const ext = file.name.split('.').pop();
      const filePath = `${tenantId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from('clinic-logos').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('clinic-logos').getPublicUrl(filePath);
      setLogoUrl(urlData.publicUrl);
      toast.success('Logo enviado com sucesso!');
    } catch (err: any) { toast.error(err.message || 'Erro ao enviar logo'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error('Nome da clínica é obrigatório'); return; }
    updateMutation.mutate({ name: name.trim(), phone: phone.trim(), address: address.trim(), logo_url: logoUrl.trim() || undefined, hero_title: heroTitle.trim() || undefined, hero_description: heroDescription.trim() || undefined });
  };

  const allowRegistration = settings?.allow_registration ?? true;
  const fieldLabels: Record<string, string> = { allow_registration: 'Registro de usuários' };

  return (
    <div className="space-y-10">
      <FadeIn>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[4px] text-primary mb-2 font-display italic">Console de Administração</h3>
            <h2 className="text-4xl font-black font-display uppercase tracking-tight italic">
              Configurações do Sistema
            </h2>
            <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest mt-2">
              Parâmetros operacionais e gestão de infraestrutura de dados.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Terminal: ACTIVE</p>
               <p className="text-sm font-bold text-primary italic font-mono uppercase tracking-tighter">SEC_LEVEL_HIGH</p>
             </div>
             <div className="w-[2px] h-10 bg-border hidden sm:block" />
             <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
               <SettingsIcon className="h-6 w-6 animate-spin-slow" />
             </div>
          </div>
        </div>
      </FadeIn>

      <Tabs defaultValue="profile" className="space-y-12">
        <FadeIn>
          <TabsList className="bg-muted/10 border border-border p-1 h-14 flex items-stretch">
            <TabsTrigger value="profile" className="flex-1 gap-2 font-black uppercase tracking-[2px] text-[10px] italic data-[state=active]:bg-primary data-[state=active]:text-white">
              <User className="h-3.5 w-3.5" /> Identidade
            </TabsTrigger>
            <TabsTrigger value="password" className="flex-1 gap-2 font-black uppercase tracking-[2px] text-[10px] italic data-[state=active]:bg-primary data-[state=active]:text-white">
              <Lock className="h-3.5 w-3.5" /> Criptografia
            </TabsTrigger>
            <TabsTrigger value="clinic" className="flex-1 gap-2 font-black uppercase tracking-[2px] text-[10px] italic data-[state=active]:bg-primary data-[state=active]:text-white">
              <Building2 className="h-3.5 w-3.5" /> Corporativo
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1 gap-2 font-black uppercase tracking-[2px] text-[10px] italic data-[state=active]:bg-primary data-[state=active]:text-white">
              <Shield className="h-3.5 w-3.5" /> Protocolos
            </TabsTrigger>
          </TabsList>
        </FadeIn>

        {/* Profile Tab */}
        <TabsContent value="profile"><ProfileTab /></TabsContent>

        {/* Password Tab */}
        <TabsContent value="password"><PasswordTab /></TabsContent>

        {/* Clinic Tab */}
        <TabsContent value="clinic">
          <div className="bg-muted/10 border border-border p-8">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xl font-black font-display uppercase tracking-tight italic">Nódulos da Unidade</h4>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Sincronização de metadados da clínica e branding público.</p>
              </div>
            </div>

            <div className="space-y-10">
              {isLoading ? (
                <div className="space-y-4">{[1, 2, 3, 4].map((i) => <div key={i} className="bg-muted/10 h-12 border border-border animate-pulse" />)}</div>
              ) : (
                <>
                  {/* Logo Management */}
                  <div className="pb-10 border-b border-border/50">
                    <Label className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80 mb-4 block italic">Identidade Visual da Unidade</Label>
                    <div className="flex items-center gap-8">
                      {logoUrl ? (
                        <div className="relative group/logo">
                          <div className="h-24 w-24 bg-background border border-border p-2 group-hover:border-primary/40 transition-all flex items-center justify-center">
                            <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                          </div>
                          <button type="button" onClick={() => setLogoUrl('')} className="absolute -top-3 -right-3 h-8 w-8 bg-black border border-border text-white hover:bg-destructive transition-colors flex items-center justify-center">
                             <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-24 w-24 border border-dashed border-border flex items-center justify-center bg-muted/5">
                           <Building2 className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="space-y-3">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <Button type="button" variant="outline" className="h-12 px-8 border-border hover:bg-primary/5 hover:border-primary/20 font-black uppercase tracking-widest text-[10px]" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" /> : <Upload className="h-4 w-4 mr-2 text-primary" />}
                          {uploading ? 'UPLOADING...' : 'ATUALIZAR LOGO'}
                        </Button>
                        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">Formatos suportados: PNG, SVG, JPG. Limite: 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-10 md:grid-cols-2">
                    <div className="space-y-6">
                      <div className="space-y-2.5">
                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Nome Corporativo *</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da sua clínica" className="h-12 bg-background/50 border-border font-bold uppercase tracking-widest text-xs" />
                      </div>
                      <div className="space-y-2.5">
                        <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Canal de Atendimento</Label>
                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="h-12 bg-background/50 border-border font-bold text-xs" />
                      </div>
                      <div className="space-y-2.5">
                        <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground/80">Geolocalização Operacional</Label>
                        <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" className="min-h-[100px] bg-background/50 border-border font-bold text-xs resize-none" />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-primary/5 border border-primary/20 p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                           <Sparkles className="h-4 w-4 text-primary" />
                           <span className="text-[10px] font-black uppercase tracking-[2px] text-primary italic">Interface Pública (SEO/UX)</span>
                        </div>
                        <div className="space-y-2.5">
                          <Label htmlFor="heroTitle" className="text-[9px] font-black uppercase tracking-widest opacity-60">Título de Destaque</Label>
                          <Input id="heroTitle" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Ex: Protocolos de Estética Avançada" className="h-10 bg-background/80 border-border font-bold" />
                        </div>
                        <div className="space-y-2.5">
                          <Label htmlFor="heroDesc" className="text-[9px] font-black uppercase tracking-widest opacity-60">Narrativa da Marca</Label>
                          <Textarea id="heroDesc" value={heroDescription} onChange={(e) => setHeroDescription(e.target.value)} placeholder="Ex: Tecnologia de ponta aliada ao seu bem-estar." className="min-h-[80px] bg-background/80 border-border text-[11px] resize-none" />
                        </div>
                      </div>

                      {tenant?.slug && (
                        <div className="p-4 bg-muted/5 border border-border border-dashed space-y-2">
                          <div className="flex items-center gap-2">
                             <Terminal className="h-3 w-3 text-muted-foreground/40" />
                             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Status do Endpoint Público</p>
                          </div>
                          <p className="text-[11px] font-mono font-bold text-primary break-all">
                             https://seusite.com.br/agendar/{tenant.slug}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button onClick={handleSave} disabled={updateMutation.isPending} className="btn-premium h-14 px-12 bg-primary text-white w-full sm:w-auto font-black uppercase tracking-widest">
                      <Save className="h-4 w-4 mr-2" />{updateMutation.isPending ? 'SINCRONIZANDO...' : 'EFETIVAR ALTERAÇÕES CORPORATIVAS'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="bg-muted/10 border border-border p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xl font-black font-display uppercase tracking-tight italic">Protocolos de Defesa</h4>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Configurações globais de acesso e auditoria de registros.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className={cn(
                "flex items-center justify-between p-6 border transition-all duration-300",
                allowRegistration ? "bg-primary/5 border-primary/30" : "bg-muted/5 border-border"
              )}>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic mb-1">Status de Inscrição</p>
                  <p className="text-sm font-black uppercase tracking-widest italic">{allowRegistration ? 'REGISTRO_ABERTO' : 'REGISTRO_BLOQUEADO'}</p>
                  <p className="text-[10px] font-bold text-muted-foreground/60 italic uppercase tracking-widest">
                    {allowRegistration ? 'Novos operadores podem inicializar instâncias no sistema.' : 'A entrada de novos dados de perfil está desativada por política de segurança.'}
                  </p>
                </div>
                <Switch checked={allowRegistration} onCheckedChange={(checked) => registrationMutation.mutate(checked)} disabled={registrationMutation.isPending} className="data-[state=checked]:bg-primary" />
              </div>

              {auditLog.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-4">
                     <Terminal className="h-4 w-4 text-primary/40" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">LOG_SUBSYSTEM_AUDIT</p>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {auditLog.map((entry) => (
                      <div key={entry.id} className="flex flex-col gap-2 p-4 bg-background border border-border group/log hover:border-primary/20 transition-colors">
                        <div className="flex items-center justify-between">
                           <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 font-mono italic">{entry.field_name}</span>
                           <span className="text-[9px] font-bold text-muted-foreground/40 font-mono uppercase">{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                           <span className="text-muted-foreground/40 line-through italic">{entry.old_value || 'NULL'}</span>
                           <Activity className="h-3 w-3 text-primary animate-pulse" />
                           <span className="text-primary italic">{entry.new_value || 'NULL'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
