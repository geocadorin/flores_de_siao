import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scissors, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordInput, validatePassword } from '@/components/PasswordInput';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase sends recovery tokens via URL hash fragment
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type') || searchParams.get('type');
    
    if (type === 'recovery') {
      setHasToken(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasToken(true);
        setReady(true);
      }
    });

    // Check if already in recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && (type === 'recovery' || hashParams.get('type') === 'recovery')) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Always show success to not reveal if email exists
      if (error) console.error('Reset error:', error);
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwError = validatePassword(newPassword);
    if (pwError) {
      toast.error(pwError);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso!');
      // Sign out so user logs in with new password
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: New password form (token present and session active)
  if (hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Scissors className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">Nova Senha</CardTitle>
            <CardDescription>Digite sua nova senha abaixo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={setNewPassword}
                  showRules
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Success message after requesting reset
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Scissors className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">Verifique seu E-mail</CardTitle>
            <CardDescription>
              Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a caixa de spam.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/auth')}>
              <ArrowLeft className="h-4 w-4" /> Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Request reset form
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Scissors className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber o link de redefinição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                placeholder="email@exemplo.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/auth')}>
              <ArrowLeft className="h-4 w-4" /> Voltar ao Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
