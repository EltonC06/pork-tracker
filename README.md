# Pork Tracker 🐷

Um sistema pessoal completo para planejamento financeiro, focado em alta performance, usabilidade fluida e design moderno. 

## 🚀 Funcionalidades

### 1. Gestão de Contas (Bancos, Cofre, Carteiras)
- Cadastro flexível de contas com ícones e cores customizáveis.
- **Edição** de nome, ícone e cor de contas existentes.
- Registro manual de saldos (snapshots) — foto do saldo real da conta.
- Histórico detalhado por conta e gráficos individuais.

### 2. Transações (Gastos & Ganhos)
- Registro de despesas e receitas por conta.
- **Categorias customizáveis** (texto livre: Alimentação, Transporte, etc.).
- Edição e exclusão de transações com confirmação visual.
- Transações são registros de fluxo de caixa — **não alteram o saldo da conta**.

### 3. Extrato Global & Lançamento Rápido (v2.1)
- **Quick Add FAB**: Botão flutuante global em todas as telas do dashboard com atalho `Ctrl+N` / `Cmd+N`.
- **Registro Ultrarrápido**: Modal otimizado com foco automático no valor, alternador intuitivo Despesa/Receita e autocomplete de categorias.
- **Lançamento Contínuo**: Suporte a atalhos de teclado:
  - `Ctrl+Enter` para salvar e fechar.
  - `Ctrl+Shift+Enter` para **Salvar e Novo** (lança e mantém o modal aberto para o próximo registro).
  - `Esc` para fechar.
- **Extrato Unificado (`/dashboard/transactions`)**:
  - Tabela completa de transações com busca por descrição/categoria e filtros avançados (conta, tipo, categoria e período).
  - **Agrupamento Dinâmico**: Visualização agrupada por **Dia**, **Semana** ou **Mês**, com cabeçalhos dedicados e subtotais automáticos.
  - **KPIs do Período**: Cards com Total de Entradas, Total de Saídas, Saldo Líquido e Contagem de registros do filtro ativo.
  - **100% Responsivo**: Tabela no desktop e cards modernos em dispositivos móveis (< 768px).

### 4. Importação de Extrato Bancário OFX (v2.2)
- **Upload Direto de Arquivo `.ofx`**: Suporte universal ao formato exportado por bancos brasileiros (Inter, Nubank, Itaú, Bradesco, BB, Caixa, Santander, C6, etc.).
- **Identificação Automática de Banco**: O sistema lê o código FEBRABAN e o nome da instituição no arquivo e pré-seleciona a conta de destino correspondente cadastrada no Pork Tracker.
- **Detecção Inteligente de Duplicatas**: Lançamentos com mesma data, valor e tipo já existentes na conta são identificados como possíveis duplicatas e desmarcados por padrão, evitando registros repetidos acidentais.
- **Motor de Sugestão de Categorias**: Classificação automática baseada em palavras-chave da descrição (Alimentação, Transporte, Moradia, Compras, Saúde, Lazer, etc.), com possibilidade de edição direta antes da importação.
- **Tabela de Pré-visualização e Edição Rápida**: Seleção em massa, edição inline de descrições e categorias, com cálculo em tempo real dos totais de entradas e saídas selecionadas.

### 5. Gestão de Carteira de Ações
- Cadastro de ativos de renda variável pelo *Ticker*.
- **Edição de posições** (quantidade e preço médio) sem precisar deletar.
- Acompanhamento do Total Investido vs Valor Atual.
- Cálculo automático de P&L (Lucros/Perdas) em reais e porcentagem.
- Layout responsivo: tabela no desktop, cards empilhados no mobile.

### 6. Dashboard Interativo
- Visão unificada do patrimônio total.
- **Fluxo do mês**: receitas vs despesas realizadas no mês corrente.
- **Próximas previsões**: alertas de vencimentos com indicadores de urgência.
- **KPI "Saldo Livre"**: patrimônio menos despesas previstas do mês.
- Gráficos de evolução mensal (Área/Linha).

### 7. Resumo Financeiro (ex-Planejamento)
- Fluxo realizado do mês atual + projeção 12 meses à frente.
- Regras de Lazy Execution para contas recorrentes (mensal, anual).
- Previsibilidade inteligente somando ganhos, gastos e saldos atuais.

### 8. Gráficos Avançados
- Composição patrimonial (Donut).
- Evolução por conta (Multi-line).
- P&L por ação (Bar chart horizontal).
- Filtros rápidos por período (30 dias, 90 dias, 1 ano, tudo).
- **Layout responsivo** com grid adaptativo.

### 9. Exportação de Relatórios e Backup
- Geração instantânea de planilhas `.xlsx` com múltiplas abas.
- Impressão inteligente em PDF sem quebra de layout.

### 10. Autenticação Segura
- Sistema de Login e Cadastro robusto integrado via Supabase Auth.
- Rotas protegidas via Next.js Proxy/Middleware.

---

## 🛠 Tecnologias e Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Linguagem | TypeScript | 5.x |
| Backend & Auth | Supabase | 2.x |
| Gráficos | Recharts | 3.x |
| Ícones | Lucide React | 1.x |
| Estilização | CSS Custom Properties (Dark Mode nativo) | — |

---

## 📂 Estrutura do Projeto

```text
src/
├── app/
│   ├── actions/               # Server Actions (mutações no banco)
│   │   ├── auth.ts
│   │   ├── accounts.ts
│   │   ├── stocks.ts
│   │   ├── transactions.ts
│   │   ├── planning.ts
│   │   └── export.ts
│   ├── dashboard/             # Rotas protegidas
│   │   ├── page.tsx           # Dashboard principal
│   │   ├── accounts/          # Módulo de Contas
│   │   │   ├── page.tsx
│   │   │   ├── AccountsClient.tsx
│   │   │   └── components/    # Componentes extraídos
│   │   │       ├── AccountCard.tsx
│   │   │       ├── SnapshotForm.tsx
│   │   │       ├── TransactionForm.tsx
│   │   │       └── AccountEditForm.tsx
│   │   ├── stocks/            # Módulo de Ações
│   │   │   ├── page.tsx
│   │   │   ├── StocksClient.tsx
│   │   │   └── components/
│   │   │       └── StockEditModal.tsx
│   │   ├── planning/          # Resumo Financeiro
│   │   └── charts/            # Gráficos Avançados
│   └── globals.css            # Design System completo
├── components/
│   ├── charts/                # Componentes de gráficos (Recharts)
│   ├── layout/
│   │   └── Sidebar.tsx
│   └── ui/                    # Componentes reutilizáveis
│       ├── ConfirmDialog.tsx
│       ├── EmptyState.tsx
│       ├── FormModal.tsx
│       ├── KpiCard.tsx
│       ├── TabBar.tsx
│       └── UpcomingPlans.tsx
├── lib/
│   └── supabase/
├── types/
│   └── database.ts
└── proxy.ts
```

---

## 💻 Como Rodar o Projeto Localmente

### 1. Pré-requisitos
- Node.js versão 18+
- Conta no [Supabase](https://supabase.com/) (para criar o banco de dados)

### 2. Clone o repositório e instale dependências
```bash
git clone https://github.com/EltonC06/pork-tracker.git
cd pork-tracker
npm install
```

### 3. Configure o Supabase (Banco de Dados)
1. Crie um projeto no Supabase.
2. Acesse o **SQL Editor** no painel do Supabase.
3. Execute o conteúdo de `supabase/migration_v3.sql` — isso cria todas as tabelas, RLS e índices.
4. Desative a confirmação obrigatória de e-mail se quiser testar facilmente.

### 4. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SUA_URL_AQUI.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLISHABLE_OU_ANON_AQUI
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Inicie a aplicação
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 📐 Regras de Negócio Chave

1. **Snapshots ≠ Transações**: Snapshots são fotos do saldo real (manual). Transações são registros de fluxo. Transações **não** criam snapshots automaticamente.
2. **Categorias livres**: Cada transação pode ter uma categoria de texto livre definida pelo usuário.
3. **Row Level Security (RLS)**: Toda query é protegida a nível de linha no Supabase.
4. **Server Actions**: Toda mutação passa por Server Actions do Next.js 16.
5. **Componentes reutilizáveis**: ConfirmDialog, EmptyState, FormModal, TabBar — eliminam duplicação.

---

## 🎨 Padrões Adotados

1. **Server Actions** para todas as mutações (pasta `src/app/actions/`).
2. **Padrão Client/Server Components**: Server busca dados, Client renderiza UI interativa.
3. **CSS Custom Properties** como Design System centralizado em `globals.css`.
4. **Semantic Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `build:`.
