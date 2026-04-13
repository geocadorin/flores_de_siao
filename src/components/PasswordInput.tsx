import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const rules: PasswordRule[] = [
  { label: 'Mínimo de 8 caracteres', test: (pw) => pw.length >= 8 },
  { label: 'Pelo menos 1 letra maiúscula', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Pelo menos 1 letra minúscula', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Pelo menos 1 número', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Pelo menos 1 caractere especial', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function getPasswordStrength(password: string) {
  const passed = rules.filter((r) => r.test(password)).length;
  if (passed <= 2) return { level: 'fraca', color: 'bg-destructive', percent: 33 } as const;
  if (passed <= 4) return { level: 'média', color: 'bg-yellow-500', percent: 66 } as const;
  return { level: 'forte', color: 'bg-green-500', percent: 100 } as const;
}

export function validatePassword(password: string): string | null {
  for (const rule of rules) {
    if (!rule.test(password)) return `Senha inválida: ${rule.label}`;
  }
  return null;
}

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  showRules?: boolean;
}

export function PasswordInput({ value, onChange, id = 'password', placeholder = '••••••••', showRules = false }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  
  const ruleResults = useMemo(() => rules.map((r) => ({ ...r, passed: r.test(value) })), [value]);
  const strength = useMemo(() => getPasswordStrength(value), [value]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          minLength={8}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showRules && value.length > 0 && (
        <>
          {/* Strength bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Força da senha</span>
              <span className={cn(
                'font-medium capitalize',
                strength.level === 'fraca' && 'text-destructive',
                strength.level === 'média' && 'text-yellow-500',
                strength.level === 'forte' && 'text-green-500',
              )}>
                {strength.level}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', strength.color)}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <ul className="space-y-1 text-xs">
            {ruleResults.map((r) => (
              <li key={r.label} className={cn('flex items-center gap-1.5', r.passed ? 'text-green-500' : 'text-muted-foreground')}>
                {r.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {r.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
