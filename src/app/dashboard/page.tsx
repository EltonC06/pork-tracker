import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Wallet, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import PatrimonyChart from '@/components/charts/PatrimonyChart'
import KpiCard from '@/components/ui/KpiCard'
import UpcomingPlans from '@/components/ui/UpcomingPlans'
import type { RecurringPlan } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch all data in parallel (eliminates N+1)
  const [
    { data: rawAccountTypes },
    { data: rawSnapshots },
    { data: rawStocks },
    { data: rawPlans },
    { data: rawMonthTxs },
  ] = await Promise.all([
    db.from('account_types').select('id, name, icon, color').eq('user_id', user!.id),
    db.from('account_snapshots').select('balance, snapshot_date, account_type_id').eq('user_id', user!.id).order('snapshot_date', { ascending: true }),
    db.from('stock_positions').select('quantity, avg_price, current_price').eq('user_id', user!.id),
    db.from('recurring_plans').select('*').eq('user_id', user!.id).order('target_date', { ascending: true }),
    db.from('transactions').select('amount, type').eq('user_id', user!.id).gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
  ])

  const accountTypes = (rawAccountTypes ?? []) as { id: string; name: string; icon: string | null; color: string | null }[]
  const snapshots = (rawSnapshots ?? []) as { balance: number; snapshot_date: string; account_type_id: string }[]
  const stocks = (rawStocks ?? []) as { quantity: number; avg_price: number; current_price: number | null }[]
  const plans = (rawPlans ?? []) as RecurringPlan[]
  const monthTxs = (rawMonthTxs ?? []) as { amount: number; type: string }[]

  // Compute latest balance per account from snapshots (no loop queries)
  const accountBalances: Record<string, number> = {}
  for (const snap of snapshots) {
    // Since snapshots are ordered ASC, last one per account wins
    accountBalances[snap.account_type_id] = snap.balance
  }

  // Stock portfolio value
  const stockValue = stocks.reduce((sum, s) => {
    const price = s.current_price ?? s.avg_price
    return sum + s.quantity * price
  }, 0)

  const totalAccountBalance = Object.values(accountBalances).reduce((a, b) => a + b, 0)
  const totalPatrimony = totalAccountBalance + stockValue

  // Monthly flow
  const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthNet = monthIncome - monthExpense

  // Upcoming expenses for "Saldo Livre"
  const upcomingExpenses = plans
    .filter(p => p.type === 'expense' && p.target_date)
    .filter(p => {
      const targetMonth = new Date(p.target_date + 'T12:00:00').getMonth()
      const currentMonth = new Date().getMonth()
      return targetMonth === currentMonth || p.frequency === 'monthly'
    })
    .reduce((s, p) => s + p.amount, 0)
  const saldoLivre = totalAccountBalance - upcomingExpenses

  // Build monthly evolution for chart
  const monthlyData: Record<string, Record<string, number>> = {}
  for (const snap of snapshots) {
    const month = snap.snapshot_date.substring(0, 7)
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
          label="Saldo Livre"
          value={formatCurrency(saldoLivre)}
          icon={<Wallet size={20} />}
          accent={saldoLivre >= 0 ? 'success' : 'danger'}
          sub={{ value: `${formatCurrency(upcomingExpenses)} previsto`, positive: false, label: 'em despesas' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patrimony Chart */}
        <div className="glass-card lg:col-span-2" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: '700' }}>Evolução do Patrimônio</h2>
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

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Monthly Flow */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '1rem' }}>Fluxo do Mês</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <ArrowUpRight size={16} color="var(--success-400)" /> Receitas
                </span>
                <span style={{ fontWeight: 700, color: 'var(--success-400)' }}>{formatCurrency(monthIncome)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <ArrowDownRight size={16} color="var(--danger-400)" /> Despesas
                </span>
                <span style={{ fontWeight: 700, color: 'var(--danger-400)' }}>{formatCurrency(monthExpense)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Resultado</span>
                <span style={{ fontWeight: 800, fontSize: '1.0625rem', color: monthNet >= 0 ? 'var(--success-400)' : 'var(--danger-400)' }}>
                  {monthNet >= 0 ? '+' : ''}{formatCurrency(monthNet)}
                </span>
              </div>
            </div>
          </div>

          {/* Upcoming Plans */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '1rem' }}>Próximas Previsões</h2>
            <UpcomingPlans plans={plans} limit={4} />
          </div>

          {/* Account balances summary */}
          {accountTypes && accountTypes.length > 0 && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '1rem' }}>Saldo por Conta</h2>
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
    </div>
  )
}
