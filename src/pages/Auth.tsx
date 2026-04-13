import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Sparkles, Sun, Moon, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordInput, validatePassword } from '@/components/PasswordInput';
import { MathCaptcha } from '@/components/MathCaptcha';
import { supabase } from '@/integrations/supabase/client';
import { BrandWordmark } from '@/components/BrandWordmark';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', clinicName: '' });
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const captchaDataRef = useRef<{ answer: number; token: string; timestamp: number }>({ answer: 0, token: '', timestamp: 0 });
  const [registrationAllowed, setRegistrationAllowed] = useState(true);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  useEffect(() => {
    supabase.functions.invoke('validate-signup', {
      body: { action: 'check_registration' },
    }).then(({ data }) => {
      setRegistrationAllowed(data?.allowed !== false);
      setCheckingRegistration(false);
    }).catch(() => {
      setCheckingRegistration(false);
    });
  }, []);

  const onCaptchaVerified = useCallback((v: boolean, data?: { answer: number; token: string; timestamp: number }) => {
    setCaptchaVerified(v);
    if (v && data) {
      captchaDataRef.current = data;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      const pwError = validatePassword(form.password);
      if (pwError) { toast.error(pwError); return; }
      if (!captchaVerified) { toast.error('Complete a verificação de segurança'); return; }

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('validate-signup', {
          body: {
            email: form.email, password: form.password, fullName: form.fullName,
            clinicName: form.clinicName,
            captchaAnswer: captchaDataRef.current.answer,
            captchaToken: captchaDataRef.current.token,
            captchaTimestamp: captchaDataRef.current.timestamp,
            website: honeypot,
          },
        });
        if (error) { toast.error('Erro na validação do servidor'); return; }
        if (data && !data.valid) { (data.errors as string[]).forEach((e: string) => toast.error(e)); return; }
        const signUpResult = await signUp(form.email, form.password, form.fullName, form.clinicName);
        
        if (signUpResult?.session) {
          toast.success('Conta criada com sucesso! Preparando seu acesso...');
          // Give a small delay for profile hooks to settle
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.', {
            duration: 10000,
          });
        }
      } catch (err: any) {
        toast.error(err.message || 'Erro ao criar conta');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await signIn(form.email, form.password);
        toast.success('Bem-vindo de volta!');
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('Email not confirmed')) {
          toast.error('Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada!', {
            duration: 8000,
          });
        } else {
          toast.error(msg || 'Erro ao autenticar');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative">
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-4 right-4 h-9 w-9 rounded-lg"
        aria-label="Alternar tema"
      >
        <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      </Button>

      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-elevated border-border/50">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 ring-2 ring-primary/20">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex justify-center pt-1">
              <BrandWordmark variant="legal" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display">{isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}</CardTitle>
              <CardDescription className="mt-1.5">
                {isSignUp
                  ? 'Cadastre sua clínica e comece a gerenciar seus agendamentos'
                  : 'Acesse sua conta para gerenciar sua clínica'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Seu Nome</Label>
                    <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required maxLength={100} placeholder="Maria Silva" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicName">Nome da Clínica</Label>
                    <Input id="clinicName" value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} required maxLength={100} placeholder="Clínica Beleza Pura" className="h-10" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={255} placeholder="email@exemplo.com" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput id="password" value={form.password} onChange={(pw) => setForm({ ...form, password: pw })} showRules={isSignUp} />
              </div>

              {!isSignUp && (
                <div className="text-right">
                  <Link to="/reset-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Esqueci minha senha
                  </Link>
                </div>
              )}

              <div className="absolute -left-[9999px]" aria-hidden="true">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </div>

              {isSignUp && <MathCaptcha onVerified={onCaptchaVerified} />}

              <Button type="submit" className="w-full h-10 shadow-sm" disabled={loading || (isSignUp && !captchaVerified)}>
                {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isSignUp ? (
                <>
                  Já tem conta?{' '}
                  <button type="button" onClick={() => setIsSignUp(false)} className="text-primary font-medium hover:underline">Entrar</button>
                </>
              ) : registrationAllowed && !checkingRegistration ? (
                <>
                  Não tem conta?{' '}
                  <button type="button" onClick={() => setIsSignUp(true)} className="text-primary font-medium hover:underline">Criar conta</button>
                </>
              ) : !checkingRegistration ? (
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Novos cadastros estão desabilitados</span>
                </div>
              ) : null}
            </div>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              <Link to="/termos" className="hover:underline">Termos de Serviço</Link>
              {' · '}
              <Link to="/privacidade" className="hover:underline">Política de Privacidade</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
