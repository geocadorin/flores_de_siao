import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Sparkles, Lock, Eye, Database, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandWordmark } from '@/components/BrandWordmark';
import { APP_NAME, DPO_EMAIL, PRIVACY_EMAIL } from '@/lib/branding';

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background grain overflow-x-hidden selection:bg-primary/30 selection:text-primary pb-20">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-50 border-b border-white/5 bg-background/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex min-w-0 cursor-pointer items-start gap-4" onClick={() => navigate('/')}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-glow ring-2 ring-primary/20">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <BrandWordmark variant="legal" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-[10px] font-black uppercase tracking-[3px] italic gap-3 hover:bg-white/5 transition-all">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-20">
        <FadeIn>
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-6 py-2 text-[10px] font-black uppercase tracking-[3px] text-primary italic">
              <Shield className="h-3.5 w-3.5" /> Segurança Proativa
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-display uppercase italic tracking-[-0.04em] leading-[0.9]">
              Política de <br/><span className="text-primary">Privacidade.</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground/40 italic">
              Última atualização: 03 de abril de 2026 // Versão 2.4 (LGPD Compliant)
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-12">
          <FadeIn delay={0.2}>
            <div className="bg-background/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-14 shadow-2xl space-y-12">
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-1 border-l-4 border-primary rounded-full" />
                  <h2 className="text-xs font-black uppercase tracking-[4px] text-primary italic">01. Introdução</h2>
                </div>
                <p className="text-lg text-muted-foreground/80 leading-relaxed font-medium italic">
                  A {APP_NAME} está comprometida com a proteção absoluta dos seus dados. Esta política detalha como orquestramos a segurança de suas informações em conformidade com a <span className="text-foreground font-bold">LGPD</span>.
                </p>
              </section>

              <section className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-1 border-l-4 border-primary rounded-full" />
                  <h2 className="text-xs font-black uppercase tracking-[4px] text-primary italic">02. Dados Coletados</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {[
                    { icon: Lock, title: 'Cadastro', desc: 'Identificação básica para acesso seguro à rede.' },
                    { icon: Eye, title: 'Uso', desc: 'Métricas de performance para otimização da experiência.' },
                    { icon: Database, title: 'Operação', desc: 'Dados técnicos necessários para gestão da sua clínica.' },
                    { icon: FileText, title: 'Histórico', desc: 'Registros de tratamentos e interações prioritárias.' }
                  ].map((item, i) => (
                    <div key={i} className="group space-y-3 p-6 rounded-2xl bg-white/2 border border-white/5 hover:border-primary/20 transition-all duration-500">
                      <item.icon className="h-5 w-5 text-primary/40 group-hover:text-primary transition-colors" />
                      <h3 className="text-[10px] font-black uppercase tracking-[3px] italic">{item.title}</h3>
                      <p className="text-xs text-muted-foreground/60 leading-relaxed italic">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-1 border-l-4 border-primary rounded-full" />
                  <h2 className="text-xs font-black uppercase tracking-[4px] text-primary italic">03. Finalidade e Base Legal</h2>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-muted-foreground/80 italic font-medium space-y-4">
                  <p>Utilizamos seus dados estritamente para a execução de contrato de serviços SaaS, garantindo que sua clínica opere com a máxima eficiência tecnológica.</p>
                  <ul className="grid gap-2 border-l border-white/10 pl-6 list-none">
                    <li className="flex items-center gap-3">
                      <div className="h-1 w-1 rounded-full bg-primary" /> Manutenção do Fluxo Operacional
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="h-1 w-1 rounded-full bg-primary" /> Segurança de Nível Bancário via Supabase
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="h-1 w-1 rounded-full bg-primary" /> Relatórios de Performance em Tempo Real
                    </li>
                  </ul>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-1 border-l-4 border-primary rounded-full" />
                  <h2 className="text-xs font-black uppercase tracking-[4px] text-primary italic">04. Contato Prioritário</h2>
                </div>
                <div className="p-8 rounded-2xl bg-primary/5 border border-primary/10">
                  <p className="text-sm text-foreground mb-6 font-bold italic">Dúvidas sobre seus direitos ou exclusão de dados?</p>
                  <div className="flex flex-col sm:flex-row gap-8">
                     <div>
                        <p className="text-[8px] font-black uppercase tracking-[3px] text-primary/60 mb-1">E-mail de Suporte</p>
                        <p className="text-sm font-black italic tracking-tight break-all">{PRIVACY_EMAIL}</p>
                     </div>
                     <div>
                        <p className="text-[8px] font-black uppercase tracking-[3px] text-primary/60 mb-1">DPO Responsibility</p>
                        <p className="text-sm font-black italic tracking-tight break-all">{DPO_EMAIL}</p>
                     </div>
                  </div>
                </div>
              </section>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.4}>
          <div className="mt-20 py-10 text-center border-t border-white/5">
             <p className="text-[10px] font-medium leading-relaxed text-muted-foreground/25">© 2026 {APP_NAME} · Dados criptografados em trânsito e em repouso.</p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
