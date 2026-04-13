import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, FileText, Scale, Zap, ShieldCheck, Clock, Ban } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandWordmark } from '@/components/BrandWordmark';
import { APP_NAME, CONTACT_EMAIL } from '@/lib/branding';

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background grain overflow-x-hidden selection:bg-primary/30 selection:text-primary pb-20">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
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
              <Scale className="h-3.5 w-3.5" /> Compliance Protocol
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-display uppercase italic tracking-[-0.04em] leading-[0.9]">
              Termos de <br/><span className="text-primary">Serviço.</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground/40 italic">
              Última atualização: 03 de abril de 2026 // Versão 1.8 (SaaS Agreement)
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-10">
          <FadeIn delay={0.2}>
            <div className="bg-background/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-14 shadow-2xl space-y-16">
              
              <div className="grid md:grid-cols-2 gap-10">
                <section className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Zap className="h-4 w-4 text-primary" />
                    <h2 className="text-[10px] font-black uppercase tracking-[3px] italic">01. Descrição</h2>
                  </div>
                  <p className="text-sm text-muted-foreground/60 leading-relaxed italic font-medium">
                    A {APP_NAME} orquestra a gestão de clínicas de elite através de agendamentos online, controle de pacotes e BI de performance.
                  </p>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-4">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h2 className="text-[10px] font-black uppercase tracking-[3px] italic">02. Isolamento</h2>
                  </div>
                  <p className="text-sm text-muted-foreground/60 leading-relaxed italic font-medium">
                    Cada operação é um ecossistema isolado. Seus dados são protegidos por criptografia de ponta e isolamento total de servidor.
                  </p>
                </section>
              </div>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-1 border-l-4 border-primary rounded-full" />
                  <h2 className="text-xs font-black uppercase tracking-[4px] text-primary italic">Uso Aceitável & Proibições</h2>
                </div>
                <div className="grid gap-4">
                  {[
                    { icon: Ban, text: 'Proibido revenda ou sublicenciamento sem autorização prévia.' },
                    { icon: Clock, text: 'SLA de disponibilidade garantida de 99.8% para a rede.' },
                    { icon: FileText, text: `Propriedade intelectual exclusiva da plataforma ${APP_NAME}.` }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white/2 border border-white/5 hover:border-primary/10 transition-all group">
                         <item.icon className="h-4 w-4 text-primary/40 group-hover:text-primary transition-colors" />
                         <span className="text-xs font-bold italic text-muted-foreground/80">{item.text}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-1 border-l-4 border-primary rounded-full" />
                  <h2 className="text-xs font-black uppercase tracking-[4px] text-primary italic">Cancelamento & Foro</h2>
                </div>
                <p className="text-sm text-muted-foreground/60 leading-relaxed font-medium italic">
                  O encerramento de conta pode ser solicitado a qualquer momento via Dashboard. Estes termos são regidos pelas leis da República Federativa do Brasil, com foro exclusivo na sede da operadora {APP_NAME}.
                </p>
              </section>

              <div className="pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[2px] italic text-primary/60">System Online // All Logs Active</span>
                 </div>
                 <p className="text-[10px] font-black italic break-all">{CONTACT_EMAIL}</p>
              </div>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.4}>
          <div className="mt-20 py-10 text-center border-t border-white/5">
             <p className="text-[10px] font-medium leading-relaxed text-muted-foreground/25">© 2026 {APP_NAME}</p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
