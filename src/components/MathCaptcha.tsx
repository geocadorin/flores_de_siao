import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CaptchaChallenge {
  a: number;
  b: number;
  token: string;
  timestamp: number;
}

interface MathCaptchaProps {
  onVerified: (verified: boolean, data?: { answer: number; token: string; timestamp: number }) => void;
}

export function MathCaptcha({ onVerified }: MathCaptchaProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [input, setInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchChallenge = useCallback(async () => {
    setLoading(true);
    setInput('');
    setVerified(false);
    onVerified(false);
    try {
      const { data } = await supabase.functions.invoke('validate-signup', {
        body: { action: 'generate_captcha' },
      });
      if (data) {
        setChallenge(data as CaptchaChallenge);
      }
    } catch {
      // Fallback: generate locally (less secure but functional)
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      setChallenge({ a, b, token: '', timestamp: Date.now() });
    }
    setLoading(false);
  }, [onVerified]);

  useEffect(() => {
    fetchChallenge();
  }, []);

  useEffect(() => {
    if (!challenge || input.trim() === '') {
      setVerified(false);
      onVerified(false);
      return;
    }
    const answer = parseInt(input.trim(), 10);
    const isCorrect = answer === challenge.a + challenge.b;
    setVerified(isCorrect);
    if (isCorrect) {
      onVerified(true, { answer, token: challenge.token, timestamp: challenge.timestamp });
    } else {
      onVerified(false);
    }
  }, [input, challenge, onVerified]);

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className={`h-4 w-4 ${verified ? 'text-green-500' : 'text-muted-foreground'}`} />
        <span>Verificação de segurança</span>
      </div>
      <div className="flex items-center gap-2">
        {loading || !challenge ? (
          <span className="text-sm text-muted-foreground">Carregando...</span>
        ) : (
          <>
            <Label className="text-sm whitespace-nowrap">
              Quanto é {challenge.a} + {challenge.b}?
            </Label>
            <Input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-20 h-8 text-center"
              placeholder="?"
            />
            <button type="button" onClick={fetchChallenge} className="text-xs text-muted-foreground hover:text-foreground underline">
              Trocar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
