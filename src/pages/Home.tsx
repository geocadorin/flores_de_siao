import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Calendar, Clock, ChevronRight, Sun, Moon,
  MapPin, Phone, CheckCircle, User, Users as UsersIcon, Star, ArrowUp,
  Shield, Zap, Award, Instagram, MessageCircle, ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer } from '@/components/animations/FadeIn';
import { cn } from '@/lib/utils';
import { BrandWordmark } from '@/components/BrandWordmark';
import { APP_NAME } from '@/lib/branding';

// Interfaces
interface TenantInfo { id: string; name: string; slug: string; phone: string | null; address: string | null; logo_url: string | null; hero_title: string | null; hero_description: string | null; }
interface PublicService { id: string; name: string; description: string | null; duration_minutes: number; price: number; }
interface PublicStaff { id: string; full_name: string; }

export default function Home() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const isAuthenticated = !loading && !!user;
  const [selectedClinicSlug, setSelectedClinicSlug] = useState<string>('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Monitoramento de Scroll
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch de todas as clínicas públicas
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['all-public-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_public_tenants');
      if (error) throw error;
      return data as unknown as TenantInfo[];
    },
  });

  const clinic = useMemo(() => tenants?.find((t) => t.slug === selectedClinicSlug) ?? null, [tenants, selectedClinicSlug]);
  const activeSlug = clinic?.slug ?? '';

  // Fetch de Serviços da Clínica Selecionada
  const { data: services } = useQuery({
    queryKey: ['public-services', activeSlug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_services', { p_slug: activeSlug });
      if (error) throw error;
      return data as unknown as PublicService[];
    },
    enabled: !!activeSlug,
  });

  // Fetch de Profissionais da Clínica Selecionada
  const { data: staffList } = useQuery({
    queryKey: ['public-staff', activeSlug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_staff', { p_slug: activeSlug });
      if (error) throw error;
      return data as unknown as PublicStaff[];
    },
    enabled: !!activeSlug,
  });

  // Loading State
  if (tenantsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground/40 animate-pulse">Carregando {APP_NAME}</p>
        </div>
      </div>
    );
  }

  // No Clinics State
  if (!tenants?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center p-12 space-y-6 border-border/40 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-glow">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold font-display uppercase italic tracking-tight">Nenhuma clínica cadastrada</CardTitle>
            <CardDescription className="text-sm">O sistema está pronto para receber sua primeira operação.</CardDescription>
          </div>
          <Button onClick={() => navigate('/auth?signup=true')} className="btn-premium w-full h-12 text-sm font-black uppercase tracking-widest italic">
            Criar Conta Administrativa
          </Button>
        </Card>
      </div>
    );
  }

  // Clinic Selection UI
  if (!clinic) {
    return (
      <div className="min-h-screen bg-background grain overflow-x-hidden selection:bg-primary/30 selection:text-primary">
        {/* Navbar Hub */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-2xl">
          <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-10 py-3 sm:py-0">
            <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-glow ring-2 ring-primary/20">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <BrandWordmark variant="nav" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 italic sm:text-[11px]">
                  Rede de clínicas
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="h-10 w-10 border border-white/5 hover:bg-white/5">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              {isAuthenticated ? (
                <Button size="sm" className="btn-premium h-11 px-8 text-[10px] font-black uppercase tracking-[2px] italic shadow-glow" onClick={() => navigate('/dashboard')}>
                   Power Dashboard
                </Button>
              ) : (
                <Link to="/auth" className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground/60 hover:text-primary transition-all italic border-b border-transparent hover:border-primary">
                  Professional Access
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Hub */}
        <section className="relative min-h-[70vh] flex items-center justify-center pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="/img/hero_v2.png" 
              alt={`${APP_NAME} — rede de clínicas`}
              className="w-full h-full object-cover object-center opacity-40 dark:opacity-20 scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          </div>

          <div className="relative z-10 mx-auto max-w-5xl px-6 text-center space-y-10">
            <FadeIn className="space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-6 py-2 text-[10px] font-black uppercase tracking-[3px] text-primary italic backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" /> Select Your Professional Sanctuary
              </div>
              <h1 className="text-3xl font-black font-display uppercase italic leading-[0.9] tracking-[-0.05em] text-foreground sm:text-5xl md:text-6xl">
                <span className="text-foreground">Sua experiência em</span>
                <br />
                <span className="mt-2 block sm:mt-4">
                  <BrandWordmark
                    variant="hero"
                    suffix={<span className="italic text-primary">.</span>}
                  />
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground/80 font-medium leading-relaxed italic px-4">
                Explore as unidades mais sofisticadas da nossa rede e inicie sua jornada de autocuidado com protocolos de alta performance.
              </p>
            </FadeIn>
            
            <FadeIn delay={0.2} className="flex flex-wrap items-center justify-center gap-12 pt-8 border-t border-border/10">
                <div className="text-center group">
                    <p className="text-2xl font-black italic tracking-tighter text-foreground group-hover:text-primary transition-colors">15+</p>
                    <p className="text-[9px] font-black uppercase tracking-[3px] text-muted-foreground/40 italic">Clínicas Elite</p>
                </div>
                <div className="text-center group">
                    <p className="text-2xl font-black italic tracking-tighter text-foreground group-hover:text-primary transition-colors">50k+</p>
                    <p className="text-[9px] font-black uppercase tracking-[3px] text-muted-foreground/40 italic">Resultados VIP</p>
                </div>
                <div className="text-center group">
                    <p className="text-2xl font-black italic tracking-tighter text-foreground group-hover:text-primary transition-colors">4.9/5</p>
                    <p className="text-[9px] font-black uppercase tracking-[3px] text-muted-foreground/40 italic">Glow Score</p>
                </div>
            </FadeIn>
          </div>
        </section>
        
        {/* Unit Grid */}
        <section className="pb-40 relative px-6 sm:px-10">
          <div className="mx-auto max-w-7xl">
            <StaggerContainer className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {tenants.map((t) => (
                <FadeIn key={t.id}>
                   <Card
                    className="group relative overflow-hidden bg-background border-border/40 hover:border-primary/60 transition-all duration-700 h-full p-10 flex flex-col cursor-pointer hover:shadow-glow hover:-translate-y-2"
                    onClick={() => setSelectedClinicSlug(t.slug)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute top-0 right-0 px-4 py-2 bg-primary/10 border-b border-l border-primary/20 rounded-bl-xl text-[8px] font-black uppercase tracking-widest text-primary italic">Ativa</div>
                    
                    <div className="relative mb-8">
                      {t.logo_url ? (
                        <img src={t.logo_url} alt={t.name} className="h-20 w-20 rounded-[1.5rem] object-cover border border-border bg-white shadow-xl group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-muted/5 border border-border group-hover:border-primary/20 transition-all duration-700">
                          <Sparkles className="h-10 w-10 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
                        </div>
                      )}
                    </div>
                    
                    <div className="relative flex-1 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-[3px] text-primary/40 italic">Unidade parceira</span>
                        <h3 className="text-2xl font-black font-display uppercase italic tracking-tighter leading-none group-hover:text-primary transition-colors">{t.name}</h3>
                      </div>
                      
                      {t.address && (
                        <p className="text-sm text-muted-foreground/60 flex items-start gap-3 font-medium leading-tight italic">
                          <MapPin className="h-4 w-4 text-primary/40 shrink-0" /> {t.address}
                        </p>
                      )}
                    </div>

                    <div className="relative mt-12 pt-8 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[3px] text-primary transition-all group-hover:tracking-[4px] flex items-center gap-3">
                        Visitar Unidade <ArrowUpRight className="h-4 w-4" />
                      </span>
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => <div key={i} className="h-6 w-6 rounded-full border border-background bg-muted bg-cover" style={{ backgroundImage: `url('https://i.pravatar.cc/100?img=${i + 20}')` }} />)}
                      </div>
                    </div>
                  </Card>
                </FadeIn>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Global Footer */}
        <footer className="py-20 border-t border-border/10 bg-muted/1 px-6">
            <div className="mx-auto max-w-7xl flex flex-col items-center gap-12 text-center">
                <div className="flex max-w-2xl flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-glow ring-2 ring-primary/15">
                        <Sparkles className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <BrandWordmark variant="footer" className="text-center sm:text-left" />
                </div>
                <div className="flex flex-wrap justify-center gap-8 text-[10px] font-black uppercase tracking-[3px] text-muted-foreground/40 italic">
                    <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
                    <Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
                </div>
                <p className="max-w-md text-[10px] font-medium leading-relaxed text-muted-foreground/30 sm:text-[9px]">
                  © 2026 {APP_NAME}. Rede segura e dados tratados com responsabilidade.
                </p>
            </div>
        </footer>

        <ScrollToTopButton visible={showScrollTop} onClick={scrollToTop} />
      </div>
    );
  }

  // Clinic Landing Page (Ensuring clinic is not null)
  return (
    <div className="min-h-screen bg-background grain overflow-x-hidden selection:bg-primary/30 selection:text-primary">
      {/* Navbar Premium */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-4 cursor-pointer" onClick={scrollToTop}>
            <div className="flex h-10 w-10 items-center justify-center bg-primary shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-black font-display tracking-tight uppercase italic text-foreground">{clinic.name}</span>
              <span className="text-[9px] font-black uppercase tracking-[3px] text-primary/60 italic">Power Experience</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex items-center gap-10 mr-10">
                <button onClick={() => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' })} className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground/60 hover:text-primary hover:tracking-[4px] transition-all italic">Serviços</button>
                <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground/60 hover:text-primary hover:tracking-[4px] transition-all italic">Essência</button>
                <button onClick={() => setSelectedClinicSlug('')} className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground/60 hover:text-primary hover:tracking-[4px] transition-all italic">Mudar Clínica</button>
            </div>
            
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="h-10 w-10 border border-white/5 hover:bg-white/5">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            
            <Button size="sm" className="btn-premium h-11 px-8 text-[10px] font-black uppercase tracking-[2px] italic hidden sm:flex" onClick={() => document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' })}>
              Reservar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Imersivo */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/img/hero.png" 
            alt="Clinic Interior" 
            className="w-full h-full object-cover object-center opacity-40 dark:opacity-30 scale-110" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background z-10" />
        </div>

        <div className="relative z-20 mx-auto max-w-5xl px-6 text-center space-y-12">
          <FadeIn className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-6 py-2 text-[10px] font-black uppercase tracking-[3px] text-primary italic backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Excellence in Aesthetic Care
            </div>
            <h1 className="text-5xl md:text-8xl font-black font-display tracking-[-0.05em] uppercase italic leading-[0.85] text-foreground">
               {clinic.hero_title || clinic.name}
            </h1>
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground/80 font-medium leading-relaxed italic px-4">
              {clinic.hero_description || 'Uma nova era de beleza e cuidado integrativo. Sinta a transformação com tratamentos personalizados para sua essência.'}
            </p>
          </FadeIn>

          <FadeIn delay={0.2} className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-4">
             <Button size="lg" className="btn-premium h-14 px-12 group" onClick={() => document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' })}>
              <span className="text-xs font-black uppercase tracking-[3px] italic mr-3">Iniciar Transformação</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>

          </FadeIn>

          <FadeIn delay={0.4} className="flex flex-col sm:flex-row items-center justify-center gap-10 text-[9px] font-black uppercase tracking-[3px] text-muted-foreground/40 pt-16 border-t border-border/10 max-w-3xl mx-auto italic">
            <span className="flex items-center gap-2 text-nowrap"><CheckCircle className="h-3 w-3 text-primary/40" /> Atendimento Exclusivo</span>
            <span className="flex items-center gap-2 text-nowrap"><Shield className="h-3 w-3 text-primary/40" /> Biossegurança Premium</span>
            <span className="flex items-center gap-2 text-nowrap"><Zap className="h-3 w-3 text-primary/40" /> Tecnologia Avançada</span>
          </FadeIn>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 md:py-40 relative px-6 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative group">
              <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl">
                 <img src="/img/hero.png" alt="Essence" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-1000" />
                 <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                 <div className="absolute bottom-10 left-10 right-10 p-8 rounded-2xl bg-background/20 backdrop-blur-xl border border-white/5 shadow-2xl">
                    <div className="flex items-center gap-4 mb-4">
                        <Award className="h-8 w-8 text-primary" />
                        <span className="text-xs font-black uppercase tracking-[4px] italic">Beauty Excellence Awards</span>
                    </div>
                    <p className="text-xl font-bold font-display uppercase italic tracking-tighter">Redefinindo os pilares do cuidado de alto luxo.</p>
                 </div>
              </div>
            </div>

            <div className="space-y-12">
              <div className="space-y-6">
                <h2 className="text-[9px] font-black uppercase tracking-[5px] text-primary italic">Nossa Essência // 01</h2>
                <h3 className="text-4xl md:text-6xl font-black font-display uppercase italic leading-[0.95] tracking-tight text-foreground">Onde o <span className="border-b-2 border-primary pb-0.5 text-foreground">Cuidado</span> encontra a <span className="text-primary italic">Excelência.</span></h3>
                <p className="text-lg text-muted-foreground/80 leading-relaxed font-medium italic">
                  Na {clinic.name}, não entregamos apenas serviços; orquestramos jornadas de transformação. Elevamos sua autoestima através de ciência e arte.
                </p>
              </div>

              <div className="grid gap-8">
                {[
                  { icon: Shield, title: 'Ambiente Seguro', desc: 'Protocolos de biossegurança de nível hospitalar' },
                  { icon: Zap, title: 'Performance Máxima', desc: 'Equipamentos de última geração aprovados pelo FDA' },
                  { icon: UsersIcon, title: 'Especialistas', desc: 'Equipe em treinamento contínuo com os melhores do mercado' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group cursor-default">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted/2 border border-border group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-[3px] italic group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="text-sm text-muted-foreground/60 font-medium italic">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-32 md:py-48 bg-muted/2 px-6 sm:px-10" id="servicos">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-24">
            <div className="space-y-6">
              <h2 className="text-[9px] font-black uppercase tracking-[5px] text-primary italic">Menu de Experiências // 02</h2>
              <h3 className="text-4xl md:text-7xl font-black font-display uppercase italic leading-[0.9] tracking-tight">Tratamentos <br/><span className="text-primary italic">Assinados.</span></h3>
            </div>
            <p className="max-w-xs text-[10px] font-black uppercase text-muted-foreground/40 leading-relaxed tracking-[2px] italic">Cada detalhe foi desenhado para proporcionar o máximo resultado em um ambiente de total relaxamento.</p>
          </div>

          {!services?.length ? (
            <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-[3rem]">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/20 mb-6" />
              <p className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground/30 italic">Lançamento de Menu em Breve</p>
            </div>
          ) : (
            <StaggerContainer className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (
                <FadeIn key={svc.id}>
                  <Card className="group relative overflow-hidden bg-background border-border/40 hover:border-primary/40 transition-all duration-700 h-full p-10 flex flex-col shadow-subtle hover:shadow-glow">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/2 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000 blur-2xl" />
                    
                    <div className="relative mb-8 flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/3 border border-border group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        <Star className="h-6 w-6" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[3px] text-muted-foreground/40 italic">Code: PRM-{svc.id.slice(0, 4)}</span>
                    </div>

                    <div className="relative flex-1 space-y-4">
                      <h3 className="text-2xl font-black font-display uppercase italic tracking-tighter leading-none group-hover:text-primary transition-colors">{svc.name}</h3>
                      {svc.description && <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium italic line-clamp-3">{svc.description}</p>}
                    </div>

                    <div className="relative mt-12 pt-8 border-t border-border/40 flex items-center justify-between font-display">
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Investimento</span>
                        <p className="text-2xl font-black italic tracking-tighter text-foreground">R$ {Number(svc.price).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Duração</span>
                        <p className="text-xs font-black flex items-center gap-1.5 uppercase italic text-foreground"><Clock className="h-3 w-3 text-primary" /> {svc.duration_minutes} min</p>
                      </div>
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        className="mt-8 w-full border border-border group-hover:border-primary/20 group-hover:bg-primary/5 text-[10px] font-black uppercase tracking-[3px] italic h-12"
                        onClick={() => document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        Solicitar Horário
                    </Button>
                  </Card>
                </FadeIn>
              ))}
            </StaggerContainer>
          )}
        </div>
      </section>

      {/* Booking Section */}
      <section id="agendar" className="py-32 md:py-56 relative bg-background px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,_hsl(var(--primary)/0.05)_0%,_transparent_50%)] pointer-events-none" />
        <div className="mx-auto max-w-3xl relative">
          <div className="text-center space-y-6 mb-20">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-6 py-2 text-[10px] font-black uppercase tracking-[3px] text-primary italic">
              <Calendar className="h-3.5 w-3.5" /> Agendamento Concierge
            </div>
            <h2 className="text-4xl md:text-7xl font-black font-display uppercase italic tracking-[-0.04em] leading-[0.9]">Reserve seu <br/><span className="text-primary">Momento.</span></h2>
            <p className="text-muted-foreground font-medium italic max-w-lg mx-auto leading-relaxed">Seleção simplificada de horários com confirmação em tempo real pela plataforma {APP_NAME}.</p>
          </div>
          
          <BookingForm
            slug={activeSlug}
            clinicName={clinic.name}
            services={services || []}
            staffList={staffList || []}
          />
        </div>
      </section>

      <footer className="py-12 bg-background px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-3">
             <div className="flex h-8 w-8 items-center justify-center bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
            <span className="text-sm font-black italic uppercase tracking-tighter font-display">{clinic.name}</span>
          </div>
          <div className="flex flex-wrap gap-8 justify-center text-[9px] font-black uppercase tracking-[3px] text-muted-foreground/40 italic">
            <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
            {!isAuthenticated && <Link to="/auth" className="hover:text-primary transition-colors">Professional Hub</Link>}
          </div>
          <p className="max-w-[12rem] text-center text-[9px] font-medium leading-snug text-muted-foreground/25 sm:max-w-none sm:text-[8px]">
            © 2026 {APP_NAME}
          </p>
        </div>
      </footer>
      <ScrollToTopButton visible={showScrollTop} onClick={scrollToTop} />
    </div>
  );
}

// Subcomponents
function BookingForm({ slug, clinicName, services, staffList }: {
  slug: string;
  clinicName: string;
  services: PublicService[];
  staffList: PublicStaff[];
}) {
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [booked, setBooked] = useState(false);

  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['public-slots', slug, selectedStaff, selectedDate, selectedService?.id],
    queryFn: async () => {
      if (!selectedService) return [];
      const { data, error } = await supabase.rpc('get_public_available_slots', {
        p_slug: slug, p_staff_id: selectedStaff, p_date: selectedDate, p_service_id: selectedService.id,
      });
      if (error) throw error;
      return data as string[];
    },
    enabled: !!selectedStaff && !!selectedDate && !!selectedService,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedService || !selectedTime) throw new Error('Dados incompletos');
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      const { data, error } = await supabase.rpc('create_public_appointment', {
        p_tenant_slug: slug, p_client_name: form.name, p_client_phone: form.phone,
        p_client_email: form.email || null, p_service_id: selectedService.id,
        p_scheduled_at: scheduledAt, p_staff_id: selectedStaff || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { 
      setBooked(true); 
      toast.success('Protocolo confirmado com sucesso!'); 
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erro ao agendar');
    },
  });

  const resetAll = () => {
    setBooked(false); 
    setSelectedService(null); 
    setSelectedStaff('');
    setSelectedDate(''); 
    setSelectedTime(''); 
    setForm({ name: '', phone: '', email: '' });
  };

  if (booked) {
    return (
      <FadeIn>
        <Card className="border-primary/20 bg-muted/2 p-12 text-center rounded-[3rem]">
            <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
            </div>
            <h3 className="text-3xl font-black font-display uppercase italic tracking-tighter mb-4">Reserva Confirmada!</h3>
            <p className="text-muted-foreground font-medium italic mb-10 max-w-xs mx-auto leading-relaxed">Sua experiência em <span className="text-foreground">{clinicName}</span> foi orquestrada com sucesso. Nos vemos em breve.</p>
            <Button onClick={resetAll} className="btn-premium px-10 h-12 italic font-black uppercase tracking-[2px] text-[10px]">Agendar Nova Experiência</Button>
        </Card>
      </FadeIn>
    );
  }

  return (
    <Card className="bg-background border-border/40 shadow-2xl overflow-hidden rounded-[2.5rem] p-8 md:p-12 mb-10 border-t-4 border-t-primary">
      <div className="space-y-10">
        {!selectedService ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-black italic">01</div>
                <Label className="text-xs font-black uppercase tracking-[3px] italic">Escolha o Protocolo</Label>
            </div>
            {services.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-12 leading-relaxed">Nenhum protocolo liberado para agendamento online no momento.</p>
            ) : (
              <div className="grid gap-4">
                {services.map((svc) => (
                  <button key={svc.id} onClick={() => setSelectedService(svc)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-border/60 p-6 text-left hover:border-primary/40 hover:bg-muted/3 transition-all group">
                    <div className="space-y-1 mb-4 sm:mb-0">
                      <p className="font-black font-display uppercase italic tracking-tight group-hover:text-primary transition-colors text-lg">{svc.name}</p>
                      {svc.description && <p className="text-[10px] text-muted-foreground/60 italic font-medium line-clamp-1 uppercase tracking-wide">{svc.description}</p>}
                    </div>
                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div className="text-right">
                        <p className="font-black italic text-lg tracking-tighter">R$ {Number(svc.price).toFixed(2).replace('.', ',')}</p>
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">{svc.duration_minutes} MIN</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/20 group-hover:text-primary transition-colors group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); bookMutation.mutate(); }} className="space-y-10">
            <div className="flex items-center justify-between rounded-2xl bg-muted/3 border border-border p-6 shadow-glow/5">
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-[3px] text-primary italic">Protocolo Selecionado</p>
                <p className="font-black font-display uppercase italic tracking-tight text-lg">{selectedService.name}</p>
                <p className="text-[10px] text-muted-foreground/60 italic font-medium uppercase tracking-widest leading-none">{selectedService.duration_minutes} MIN · R$ {Number(selectedService.price).toFixed(2).replace('.', ',')}</p>
              </div>
              <Button type="button" variant="ghost" className="text-[9px] font-black uppercase tracking-[2px] italic text-primary hover:bg-primary/5 px-6 h-10" onClick={() => { setSelectedService(null); setSelectedStaff(''); setSelectedDate(''); setSelectedTime(''); }}>Trocar</Button>
            </div>

            <div className="space-y-6">
               <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-black italic">02</div>
                    <Label className="text-xs font-black uppercase tracking-[3px] italic">Profissional</Label>
                </div>
              <Select value={selectedStaff} onValueChange={(v) => { setSelectedStaff(v); setSelectedTime(''); }}>
                <SelectTrigger className="h-14 bg-muted/2 border-border/60 hover:border-primary/40 font-black uppercase text-[10px] tracking-widest italic focus:ring-primary/20 transition-all outline-none">
                    <SelectValue placeholder="SELECIONE O PROFISSIONAL..." />
                </SelectTrigger>
                <SelectContent className="border-border">
                  {staffList.map((s) => (<SelectItem key={s.id} value={s.id} className="font-black uppercase text-[10px] italic tracking-widest py-3">{s.full_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {selectedStaff && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-black italic">03</div>
                    <Label className="text-xs font-black uppercase tracking-[3px] italic">Janela de Horário</Label>
                </div>
                <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic ml-1">Data Preferencial</span>
                        <Input type="date" required value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }} min={format(new Date(), 'yyyy-MM-dd')} className="h-14 bg-muted/2 border-border/60 font-black uppercase text-xs italic tracking-widest focus:ring-primary/20 text-center cursor-pointer outline-none" />
                    </div>
                     <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic ml-1">Vagas Disponíveis</span>
                        <div className="flex flex-wrap gap-2">
                            {slotsLoading ? (
                                <div className="h-14 w-full flex items-center justify-center border border-dashed border-border/40 rounded-xl">
                                    <p className="text-[9px] font-black uppercase tracking-[4px] text-muted-foreground/20 animate-pulse">Consultando Agenda...</p>
                                </div>
                            ) : (availableSlots || []).length === 0 ? (
                                <div className="h-14 w-full flex items-center justify-center border border-dashed border-destructive/20 bg-destructive/5 rounded-xl">
                                    <p className="text-[9px] font-black uppercase tracking-[4px] text-destructive/40 italic">Sem disponibilidade hoje</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 w-full">
                                    {(availableSlots || []).map((slot) => (
                                    <button key={slot} type="button" 
                                        onClick={() => setSelectedTime(slot)}
                                        className={cn(
                                            "h-12 border rounded-xl text-[10px] font-black italic tracking-widest transition-all",
                                            selectedTime === slot 
                                                ? "bg-primary border-primary text-primary-foreground shadow-glow scale-95" 
                                                : "bg-muted/2 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
                                        )}
                                    >
                                        {slot}
                                    </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>
            )}

            <div className="space-y-10">
               <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-black italic">04</div>
                    <Label className="text-xs font-black uppercase tracking-[3px] italic">Suas Informações</Label>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2 group">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic group-focus-within:text-primary transition-colors ml-1">Nome Completo</span>
                        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="DIGITE SEU NOME..." maxLength={100} className="h-14 bg-muted/2 border-border/60 font-black uppercase text-xs italic tracking-widest focus:ring-primary/20 outline-none" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2 group">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic group-focus-within:text-primary transition-colors ml-1">WhatsApp</span>
                            <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" maxLength={20} className="h-14 bg-muted/2 border-border/60 font-black uppercase text-xs italic tracking-widest focus:ring-primary/20 outline-none" />
                        </div>
                        <div className="space-y-2 group">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic group-focus-within:text-primary transition-colors ml-1">E-mail de Contato</span>
                            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="DIGITE SEU E-MAIL..." maxLength={255} className="h-14 bg-muted/2 border-border/60 font-black uppercase text-xs italic tracking-widest focus:ring-primary/20 outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-8 flex flex-col items-center gap-6">
                <Button type="submit" className="btn-premium w-full h-16 text-xs font-black uppercase tracking-[4px] italic shadow-glow disabled:opacity-50"
                disabled={bookMutation.isPending || !form.name || !form.phone || !selectedStaff || !selectedDate || !selectedTime}>
                {bookMutation.isPending ? 'PROCESSANDO PROTOCOLO...' : '✨ SOLICITAR CONFIRMAÇÃO'}
                </Button>
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[3px] text-muted-foreground/30 italic">
                    <Shield className="h-3 w-3 shrink-0" /> Solicitação segura · {APP_NAME} © 2026
                </div>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}

function ScrollToTopButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Voltar ao topo"
      className={cn(
        "fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow transition-all duration-500 hover:scale-110 hover:shadow-2xl focus:outline-none",
        visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
      )}
    >
      <ArrowUp className="h-6 w-6" />
    </button>
  );
}
