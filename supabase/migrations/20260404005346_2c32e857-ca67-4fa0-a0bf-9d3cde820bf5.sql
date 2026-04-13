
-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view suppliers" ON public.suppliers FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant members can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant members can update suppliers" ON public.suppliers FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant members can delete suppliers" ON public.suppliers FOR DELETE USING (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Financial categories table
CREATE TABLE public.financial_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view categories" ON public.financial_categories FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant members can insert categories" ON public.financial_categories FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant members can update categories" ON public.financial_categories FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant members can delete categories" ON public.financial_categories FOR DELETE USING (tenant_id = get_user_tenant_id());

-- Financial transactions table
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view transactions" ON public.financial_transactions FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant members can insert transactions" ON public.financial_transactions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant members can update transactions" ON public.financial_transactions FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant members can delete transactions" ON public.financial_transactions FOR DELETE USING (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DB function for cash flow summary
CREATE OR REPLACE FUNCTION public.get_cash_flow(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_start DATE;
  v_end DATE;
  v_result JSON;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  v_start := COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '30 days')::date);
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  SELECT json_build_object(
    'total_income', (
      SELECT COALESCE(SUM(amount), 0)::numeric
      FROM public.financial_transactions
      WHERE tenant_id = v_tenant_id AND type = 'income'
        AND transaction_date >= v_start AND transaction_date <= v_end
    ),
    'total_expense', (
      SELECT COALESCE(SUM(amount), 0)::numeric
      FROM public.financial_transactions
      WHERE tenant_id = v_tenant_id AND type = 'expense'
        AND transaction_date >= v_start AND transaction_date <= v_end
    ),
    'balance', (
      SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)::numeric
      FROM public.financial_transactions
      WHERE tenant_id = v_tenant_id
        AND transaction_date >= v_start AND transaction_date <= v_end
    ),
    'daily_flow', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.day), '[]'::json)
      FROM (
        SELECT 
          transaction_date as day,
          to_char(transaction_date, 'DD/MM') as label,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::numeric as income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::numeric as expense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)::numeric as net
        FROM public.financial_transactions
        WHERE tenant_id = v_tenant_id
          AND transaction_date >= v_start AND transaction_date <= v_end
        GROUP BY transaction_date
        ORDER BY transaction_date
      ) d
    ),
    'by_category', (
      SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
      FROM (
        SELECT 
          COALESCE(fc.name, 'Sem categoria') as category,
          ft.type,
          COALESCE(SUM(ft.amount), 0)::numeric as total
        FROM public.financial_transactions ft
        LEFT JOIN public.financial_categories fc ON fc.id = ft.category_id
        WHERE ft.tenant_id = v_tenant_id
          AND ft.transaction_date >= v_start AND ft.transaction_date <= v_end
        GROUP BY fc.name, ft.type
        ORDER BY total DESC
      ) c
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
