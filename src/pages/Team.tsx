import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Trash2, Users, Shield, User, Mail } from 'lucide-react';
import { Navigate } from 'react-router-dom';

function useTeamMembers() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

function useTeamInvitations() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['team-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_invitations').select('*').eq('status', 'pending').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

export default function Team() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: invitations, isLoading: invLoading } = useTeamInvitations();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');

  if (profile && profile.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const invite = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('team_invitations').insert({ tenant_id: profile!.tenant_id, email: email.trim().toLowerCase(), role, invited_by: profile!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Convite enviado!'); setEmail(''); setRole('user'); qc.invalidateQueries({ queryKey: ['team-invitations'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('team_invitations').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('Convite removido'); qc.invalidateQueries({ queryKey: ['team-invitations'] }); },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, newRole }: { id: string; newRole: string }) => { const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('Papel atualizado'); qc.invalidateQueries({ queryKey: ['team-members'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const isLoading = membersLoading || invLoading;
  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h2 className="page-title">Equipe</h2>
        <p className="page-description">Gerencie os membros da sua equipe</p>
      </div>

      {/* Invite */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Convidar Membro</CardTitle>
          <CardDescription>Envie um convite por e-mail para adicionar um novo membro.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="novo@membro.com" className="h-10" />
            </div>
            <div className="w-full sm:w-40 space-y-1.5">
              <Label className="text-xs">Papel</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="h-10 gap-2 shadow-sm" onClick={() => invite.mutate()} disabled={!email || invite.isPending}>
                <Mail className="h-4 w-4" />
                {invite.isPending ? 'Enviando...' : 'Convidar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Membros</CardTitle>
          <CardDescription>{members?.length ?? 0} membros na equipe</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="loading-skeleton h-16" />)}</div>
          ) : (
            <div className="space-y-2">
              {members?.map((m, i) => (
                <div key={m.id} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between transition-all hover:shadow-soft" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className={`text-xs font-semibold ${m.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {getInitials(m.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{m.full_name}</p>
                        {m.role === 'admin' && <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{m.phone || 'Sem telefone'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {m.user_id === profile?.user_id ? (
                      <Badge variant="secondary" className="text-[11px]">Você</Badge>
                    ) : (
                      <Select value={m.role} onValueChange={(v) => updateRole.mutate({ id: m.id, newRole: v })}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">Usuário</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations && invitations.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Convites Pendentes</CardTitle>
            <CardDescription>{invitations.length} convite(s) aguardando aceite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 p-3 transition-all hover:shadow-soft">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
                      <Mail className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{inv.role}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => deleteInvite.mutate(inv.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
