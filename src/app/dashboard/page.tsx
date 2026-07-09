import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import PatrimonyChart from '@/components/charts/PatrimonyChart'
import KpiCard from '@/components/ui/KpiCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Latest balance per account
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: rawAccountTypes } = await db
    .from('account_types')
    .select('id, name, icon, color')
    .eq('user_id', user!.id)
  const accountTypes = (rawAccountTypes ?? []) as { id: string; name: string; icon: string | null; color: string | null }[]

  const accountBalances: Record<string, number> = {}
  if (accountTypes.length > 0) {
    for (const acct of accountTypes) {
      const { data } = await db
        .from('account_snapshots')
        .select('balance, snapshot_date')
        .eq('user_id', user!.id)
        .eq('account_type_id', acct.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()
      const snap = data as { balance: number; snapshot_date: string } | null
      accountBalances[acct.id] = snap?.balance ?? 0
    }
  }

  // Stock portfolio value
  const { data: rawStocks } = await db
    .from('stock_positions')
    .select('quantity, avg_price, current_price')
    .eq('user_id', user!.id)
  const stocks = (rawStocks ?? []) as { quantity: number; avg_price: number; current_price: number | null }[]

  const stockValue = stocks.reduce((sum: number, s: { quantity: number; avg_price: number; current_price: number | null }) => {
    const price = s.current_price ?? s.avg_price
    return sum + s.quantity * price
  }, 0)

  const totalAccountBalance = Object.values(accountBalances).reduce((a, b) => a + b, 0)
  const totalPatrimony = totalAccountBalance + stockValue

  // Build monthly evolution for chart
  const { data: rawSnapshots } = await db
    .from('account_snapshots')
    .select('balance, snapshot_date, account_type_id')
    .eq('user_id', user!.id)
    .order('snapshot_date', { ascending: true })
  const snapshots = (rawSnapshots ?? []) as { balance: number; snapshot_date: string; account_type_id: string }[]

  // Group snapshots by month: latest balance per account per month
  const monthlyData: Record<string, Record<string, number>> = {}
  for (const snap of snapshots) {
    const month = snap.snapshot_date.substring(0, 7) // YYYY-MM
    if (!monthlyData[month]) monthlyData[month] = {}
    monthlyData[month][snap.account_type_id] = snap.balance
  }
  const chartData = Object.entries(monthlyData).map(([month, balances]) => ({
    month,
    total: Object.values(balances).reduce((a, b) => a + b, 0),
  })).slice(-12)

  // Month-over-month change
  const lastMonthTotal = chartData.length >= 2 ? chartData[chartData.length - 2].total : null
  const monthChange = lastMonthTotal ? ((totalAccountBalance - lastMonthTotal) / lastMonthTotal) * 100 : null

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Visão geral do seu patrimônio
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <KpiCard
          label="Patrimônio Total"
          value={formatCurrency(totalPatrimony)}
          icon={<DollarSign size={20} />}
          accent="brand"
        />
        <KpiCard
          label="Em Contas"
          value={formatCurrency(totalAccountBalance)}
          icon={<Wallet size={20} />}
          accent="brand"
          sub={monthChange !== null ? {
            value: formatPercent(monthChange),
            positive: monthChange >= 0,
            label: 'vs mês anterior'
          } : undefined}
        />
        <KpiCard
          label="Carteira de Ações"
          value={formatCurrency(stockValue)}
          icon={<TrendingUp size={20} />}
          accent="success"
          sub={{ value: `${stocks?.length ?? 0} ativos`, positive: true, label: 'posições abertas' }}
        />
        <KpiCard
          label="Contas Cadastradas"
          value={String(accountTypes?.length ?? 0)}
          icon={<Wallet size={20} />}
          accent="neutral"
          sub={{ value: 'contas', positive: true, label: 'monitoradas' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patrimony Chart */}
        <div className="glass-card lg:col-span-2" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: '700' }}>Evolução do Patrimônio (Contas)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Soma de todos os saldos registrados por mês</p>
          </div>
          {chartData.length > 0 ? (
            <PatrimonyChart data={chartData} />
          ) : (
            <div className="empty-state" style={{ padding: '3rem 2rem' }}>
              <div className="empty-state-icon">📊</div>
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Nenhum dado ainda</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Registre saldos em Contas para ver o gráfico
              </p>
            </div>
          )}
        </div>

        {/* Account balances summary */}
        {accountTypes && accountTypes.length > 0 && (
          <div className="glass-card lg:col-span-1" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '1rem' }}>Saldo Atual por Conta</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {accountTypes.map(acct => {
                const balance = accountBalances[acct.id] ?? 0
                const pct = totalAccountBalance > 0 ? (balance / totalAccountBalance) * 100 : 0
                return (
                  <div key={acct.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem', minWidth: '1.5rem' }}>{acct.icon ?? '💰'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{acct.name}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatCurrency(balance)}
                        </span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--bg-border)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: acct.color ?? 'var(--brand-500)',
                          borderRadius: '2px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '3rem', textAlign: 'right' }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


