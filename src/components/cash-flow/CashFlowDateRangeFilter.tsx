import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import {
  endOfMonth,
  format,
  isAfter,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, RotateCcw, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/sonner';

const MD_QUERY = '(min-width: 768px)';

function useIsMdUp() {
  const [ok, setOk] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MD_QUERY).matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const on = () => setOk(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  return ok;
}

function toYmd(d: Date) {
  return format(startOfDay(d), 'yyyy-MM-dd');
}

function parseYmd(s: string) {
  return startOfDay(parseISO(s));
}

export const CASH_FLOW_RANGE_STORAGE_KEY = 'flores-cash-flow-date-range';

export function getDefaultCashFlowRange() {
  const end = startOfDay(new Date());
  const start = subDays(end, 30);
  return { start: toYmd(start), end: toYmd(end) };
}

type Shortcut = { id: string; label: string; getRange: () => DateRange };

function buildShortcuts(): Shortcut[] {
  return [
    {
      id: 'today',
      label: 'Hoje',
      getRange: () => {
        const d = startOfDay(new Date());
        return { from: d, to: d };
      },
    },
    {
      id: 'last7',
      label: 'Últimos 7 dias',
      getRange: () => {
        const end = startOfDay(new Date());
        return { from: subDays(end, 6), to: end };
      },
    },
    {
      id: 'last30',
      label: 'Últimos 30 dias',
      getRange: () => {
        const end = startOfDay(new Date());
        return { from: subDays(end, 30), to: end };
      },
    },
    {
      id: 'month',
      label: 'Mês atual',
      getRange: () => {
        const now = new Date();
        return { from: startOfMonth(now), to: endOfMonth(now) };
      },
    },
    {
      id: 'last90',
      label: 'Últimos 90 dias',
      getRange: () => {
        const end = startOfDay(new Date());
        return { from: subDays(end, 90), to: end };
      },
    },
    {
      id: 'last365',
      label: 'Último ano',
      getRange: () => {
        const end = startOfDay(new Date());
        return { from: subDays(end, 365), to: end };
      },
    },
  ];
}

export interface CashFlowDateRangeFilterProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  onReset: () => void;
  className?: string;
}

function RangePickerBody({
  draft,
  onDraftChange,
  onApply,
  onShortcut,
  onCancel,
  isDesktop,
}: {
  draft: DateRange | undefined;
  onDraftChange: (r: DateRange | undefined) => void;
  onApply: () => void;
  onShortcut: (r: DateRange) => void;
  onCancel: () => void;
  isDesktop: boolean;
}) {
  const shortcuts = useMemo(() => buildShortcuts(), []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <Button
            key={s.id}
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[40px] rounded-md text-xs font-semibold"
            onClick={() => onShortcut(s.getRange())}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Calendar
        mode="range"
        numberOfMonths={isDesktop ? 2 : 1}
        defaultMonth={draft?.from ?? draft?.to ?? new Date()}
        selected={draft}
        onSelect={onDraftChange}
        locale={ptBR}
        className="rounded-md border border-border p-2"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="min-h-[44px] w-full sm:w-auto" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" className="min-h-[44px] w-full sm:w-auto" onClick={onApply}>
          Aplicar período
        </Button>
      </div>
    </div>
  );
}

export function CashFlowDateRangeFilter({
  startDate,
  endDate,
  onRangeChange,
  onReset,
  className,
}: CashFlowDateRangeFilterProps) {
  const isMdUp = useIsMdUp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(() => ({
    from: parseYmd(startDate),
    to: parseYmd(endDate),
  }));

  const label = useMemo(() => {
    try {
      const a = format(parseYmd(startDate), 'dd/MM/yyyy', { locale: ptBR });
      const b = format(parseYmd(endDate), 'dd/MM/yyyy', { locale: ptBR });
      return `${a} — ${b}`;
    } catch {
      return 'Selecionar período';
    }
  }, [startDate, endDate]);

  const syncDraftFromProps = useCallback(() => {
    setDraft({ from: parseYmd(startDate), to: parseYmd(endDate) });
  }, [startDate, endDate]);

  useEffect(() => {
    if (!open) syncDraftFromProps();
  }, [open, syncDraftFromProps]);

  const applyDraft = () => {
    const from = draft?.from;
    const to = draft?.to;
    if (!from || !to) {
      toast.error('Selecione a data inicial e a data final.');
      return;
    }
    if (isAfter(startOfDay(from), startOfDay(to))) {
      toast.error('A data final não pode ser anterior à data inicial.');
      return;
    }
    onRangeChange(toYmd(from), toYmd(to));
    setOpen(false);
  };

  const applyShortcut = (r: DateRange) => {
    const from = r.from;
    const to = r.to ?? r.from;
    if (!from || !to) return;
    onRangeChange(toYmd(from), toYmd(to));
    setOpen(false);
  };

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      className="min-h-[44px] w-full justify-start gap-2 text-left font-medium md:max-w-md"
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
      <span className="truncate">{label}</span>
    </Button>
  );

  const resetBtn = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="min-h-[44px] shrink-0 gap-2 px-3 text-muted-foreground hover:text-foreground"
      onClick={() => {
        onReset();
        setOpen(false);
      }}
      title="Redefinir para o período padrão (últimos 30 dias)"
    >
      <RotateCcw className="h-4 w-4" />
      <span className="hidden sm:inline">Redefinir</span>
    </Button>
  );

  const body = (
    <RangePickerBody
      draft={draft}
      onDraftChange={setDraft}
      onApply={applyDraft}
      onShortcut={applyShortcut}
      onCancel={() => {
        syncDraftFromProps();
        setOpen(false);
      }}
      isDesktop={isMdUp}
    />
  );

  return (
    <div className={cn('flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-2', className)}>
      {isMdUp ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <PopoverContent className="w-auto max-w-[min(100vw-2rem,920px)] p-4" align="start">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Período</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {body}
          </PopoverContent>
        </Popover>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full justify-start gap-2 text-left font-medium"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">{label}</span>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0">
              <div className="flex max-h-[100dvh] flex-col">
                <DialogHeader className="border-b border-border px-4 pb-3 pt-4 sm:px-6">
                  <DialogTitle className="text-left text-base">Selecionar período</DialogTitle>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{body}</div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {resetBtn}
    </div>
  );
}
