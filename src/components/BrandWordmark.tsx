import type { ReactNode } from 'react';
import { APP_NAME_ACCENT, APP_NAME_LEAD } from '@/lib/branding';
import { cn } from '@/lib/utils';

type Variant = 'nav' | 'sidebar' | 'footer' | 'legal' | 'hero';

const wrapperClass: Record<Variant, string> = {
  /** Barra superior: marca legível e protagonista */
  nav: cn(
    'inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0 font-black font-display not-italic',
    'text-xl sm:text-2xl md:text-3xl',
    'leading-[1.12] tracking-tight',
    'max-w-[min(100%,20rem)] sm:max-w-none'
  ),
  /** Sidebar: contraste no fundo escuro */
  sidebar: cn(
    'inline-flex flex-wrap items-baseline gap-x-1 font-bold font-display not-italic',
    'text-base sm:text-lg',
    'leading-snug tracking-tight text-left',
    'min-w-0 flex-1'
  ),
  /** Rodapés */
  footer: cn(
    'inline-flex flex-wrap items-baseline gap-x-1.5 font-black font-display not-italic',
    'text-2xl sm:text-3xl md:text-[2rem]',
    'leading-tight tracking-tight'
  ),
  /** Termos / privacidade */
  legal: cn(
    'inline-flex flex-wrap items-baseline gap-x-1 font-black font-display not-italic',
    'text-xl sm:text-2xl',
    'leading-tight tracking-tight'
  ),
  /** Hero da home: escala máxima */
  hero: cn(
    'normal-case inline-flex flex-wrap items-baseline justify-center gap-x-2 font-black font-display not-italic',
    'text-4xl sm:text-6xl md:text-8xl',
    'tracking-[-0.05em] leading-[0.9]'
  ),
};

const leadClass: Record<Variant, string> = {
  nav: 'text-foreground [text-shadow:0_1px_2px_hsl(var(--background)/0.35)]',
  sidebar: 'text-white/95',
  footer: 'text-foreground',
  legal: 'text-foreground',
  hero: 'text-foreground',
};

const accentClass: Record<Variant, string> = {
  nav: cn(
    'italic text-primary',
    'drop-shadow-[0_2px_14px_hsl(var(--primary)/0.35)]'
  ),
  sidebar: cn(
    'italic text-primary',
    'drop-shadow-[0_0_18px_hsl(var(--primary)/0.45)]'
  ),
  footer: cn('italic text-primary', 'drop-shadow-[0_2px_12px_hsl(var(--primary)/0.25)]'),
  legal: 'italic text-primary',
  hero: cn(
    'italic text-primary',
    'drop-shadow-[0_4px_24px_hsl(var(--primary)/0.35)]'
  ),
};

type Props = {
  variant?: Variant;
  className?: string;
  /** Sufixo após o nome (ex.: ponto no hero) */
  suffix?: ReactNode;
};

export function BrandWordmark({ variant = 'nav', className, suffix }: Props) {
  return (
    <span className={cn(wrapperClass[variant], 'text-balance', className)}>
      <span className={leadClass[variant]}>{APP_NAME_LEAD}</span>
      <span className={accentClass[variant]}> {APP_NAME_ACCENT}</span>
      {suffix}
    </span>
  );
}
