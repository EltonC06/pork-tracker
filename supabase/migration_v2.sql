-- Pork Tracker — Supabase SQL Migration V2 (Planejamento Financeiro)

-- 1. Tabela Transactions (Gastos e Ganhos Efetivados)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type_id UUID REFERENCES public.account_types(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies for transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" 
    ON public.transactions FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" 
    ON public.transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" 
    ON public.transactions FOR DELETE 
    USING (auth.uid() = user_id);


-- 2. Tabela Recurring Plans (Previsões e Recorrências)
CREATE TABLE IF NOT EXISTS public.recurring_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type_id UUID REFERENCES public.account_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly', 'one-time')),
    target_date DATE, -- Para one-time ou para saber o dia do mês
    last_processed_date DATE, -- Última vez que a rotina "lazy" gerou transação pra esse plano
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.recurring_plans ENABLE ROW LEVEL SECURITY;

-- Policies for recurring_plans
DROP POLICY IF EXISTS "Users can view own recurring_plans" ON public.recurring_plans;
CREATE POLICY "Users can view own recurring_plans" 
    ON public.recurring_plans FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recurring_plans" ON public.recurring_plans;
CREATE POLICY "Users can insert own recurring_plans" 
    ON public.recurring_plans FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recurring_plans" ON public.recurring_plans;
CREATE POLICY "Users can delete own recurring_plans" 
    ON public.recurring_plans FOR DELETE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recurring_plans" ON public.recurring_plans;
CREATE POLICY "Users can update own recurring_plans" 
    ON public.recurring_plans FOR UPDATE 
    USING (auth.uid() = user_id);
