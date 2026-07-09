-- ============================================================
-- FinTrack — Supabase SQL Migration
-- Execute no SQL Editor do Supabase: https://app.supabase.com
-- ============================================================

-- 1. Account Types (tipos de conta: banco, cofre, carteira, etc.)
CREATE TABLE IF NOT EXISTS public.account_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  icon       TEXT DEFAULT '💰',
  color      TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Account Snapshots (histórico de saldos)
CREATE TABLE IF NOT EXISTS public.account_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_type_id  UUID REFERENCES public.account_types(id) ON DELETE CASCADE NOT NULL,
  balance          NUMERIC(15, 2) NOT NULL,
  snapshot_date    DATE NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Stock Positions (posições de ações)
CREATE TABLE IF NOT EXISTS public.stock_positions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker        TEXT NOT NULL,
  quantity      NUMERIC(15, 6) NOT NULL,
  avg_price     NUMERIC(15, 4) NOT NULL,
  current_price NUMERIC(15, 4),
  last_updated  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- 4. Stock Price History (histórico de preços por dia)
CREATE TABLE IF NOT EXISTS public.stock_price_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker        TEXT NOT NULL,
  price         NUMERIC(15, 4) NOT NULL,
  recorded_date DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker, recorded_date)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_price_history ENABLE ROW LEVEL SECURITY;

-- account_types policies
DROP POLICY IF EXISTS "Users can view own account types" ON public.account_types;
CREATE POLICY "Users can view own account types"
  ON public.account_types FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own account types" ON public.account_types;
CREATE POLICY "Users can insert own account types"
  ON public.account_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own account types" ON public.account_types;
CREATE POLICY "Users can update own account types"
  ON public.account_types FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own account types" ON public.account_types;
CREATE POLICY "Users can delete own account types"
  ON public.account_types FOR DELETE
  USING (auth.uid() = user_id);

-- account_snapshots policies
DROP POLICY IF EXISTS "Users can view own snapshots" ON public.account_snapshots;
CREATE POLICY "Users can view own snapshots"
  ON public.account_snapshots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own snapshots" ON public.account_snapshots;
CREATE POLICY "Users can insert own snapshots"
  ON public.account_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own snapshots" ON public.account_snapshots;
CREATE POLICY "Users can update own snapshots"
  ON public.account_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own snapshots" ON public.account_snapshots;
CREATE POLICY "Users can delete own snapshots"
  ON public.account_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- stock_positions policies
DROP POLICY IF EXISTS "Users can view own stock positions" ON public.stock_positions;
CREATE POLICY "Users can view own stock positions"
  ON public.stock_positions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stock positions" ON public.stock_positions;
CREATE POLICY "Users can insert own stock positions"
  ON public.stock_positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stock positions" ON public.stock_positions;
CREATE POLICY "Users can update own stock positions"
  ON public.stock_positions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stock positions" ON public.stock_positions;
CREATE POLICY "Users can delete own stock positions"
  ON public.stock_positions FOR DELETE
  USING (auth.uid() = user_id);

-- stock_price_history policies
DROP POLICY IF EXISTS "Users can view own price history" ON public.stock_price_history;
CREATE POLICY "Users can view own price history"
  ON public.stock_price_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own price history" ON public.stock_price_history;
CREATE POLICY "Users can insert own price history"
  ON public.stock_price_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own price history" ON public.stock_price_history;
CREATE POLICY "Users can update own price history"
  ON public.stock_price_history FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own price history" ON public.stock_price_history;
CREATE POLICY "Users can delete own price history"
  ON public.stock_price_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_snapshots_user_date
  ON public.account_snapshots(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_account_date
  ON public.account_snapshots(account_type_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_user_ticker_date
  ON public.stock_price_history(user_id, ticker, recorded_date DESC);
