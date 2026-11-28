# Pork Tracker 🐷

Um sistema pessoal completo para planejamento financeiro, focado em alta performance, usabilidade fluida e design moderno. 

## 🚀 Funcionalidades

### Extratos separados (v2.6)

- **Geral** (`/dashboard/statement`): banco + compras do cartão, excluindo despesas bancárias da categoria **Pagamento de fatura**. A exclusão é por categoria, mesmo que a fatura correspondente ainda não tenha sido importada. Os totais incluem somente compras conhecidas; classifique os pagamentos no banco e importe os PDFs de cada mês para completar o histórico.
- **Banco** (`/dashboard/transactions`): preserva todos os lançamentos da conta, inclusive pagamentos de faturas. Contas, snapshots e fluxo de caixa continuam independentes das compras no cartão.
- **Cartão** (`/dashboard/invoices`): faturas por mês de referência, com seletor de fatura, compras, categorias, valores, percentuais e gráficos. Não há associação de fatura a pagamento.
- As três telas compartilham abas de navegação. Geral e Cartão abrem nos lançamentos; o controle “Análise por categoria” mostra os gráficos mantendo os filtros e totais. Ações e Gráficos continuam ocultos do menu principal.
- Exemplo: Pix de R$20 + compras de R$180 + pagamento da fatura de R$180. Banco registra R$200 em saídas; cartão registra R$180; geral registra R$200, excluindo o pagamento classificado.

#### Importação e mês de referência

Importe o PDF textual do Inter e revise o nome do cartão, mês, vencimento, total e categorias. As categorias usam o catálogo pessoal por dropdown, tanto na revisão quanto após salvar. Sugestões desconhecidas ficam sem categoria. A revisão tem dez itens por página. A leitura usa PDF.js localmente; o PDF e os dados pessoais do cabeçalho não são enviados ao servidor.

O mês sugerido é o mês com mais lançamentos no PDF, com desempate pelo mais recente. Pode ser alterado antes e depois da importação. O vencimento identifica a fatura e não determina seu mês. Uma fatura de outubro que vence em novembro pode ser classificada em outubro. Faturas antigas recebem essa mesma sugestão na migração; revise compras parceladas com data original antiga.

Os gráficos e o geral usam o mês de referência para todas as compras da fatura. A lista preserva a data original do PDF e a parcela atual. Só o valor da parcela lançada entra nos gastos; estornos reduzem despesas. Percentuais usam saldos positivos por categoria; categorias com saldo negativo continuam na lista, fora da pizza. O banco usa a data do lançamento.

A importação é atômica: soma dos itens conferida no commit, valores em centavos, identidade única por usuário/cartão/vencimento e hash dos itens. Mesmo PDF retorna a fatura existente, sem duplicar compras ou sobrescrever categorias e mês. Conteúdo divergente é recusado. Pagamentos anteriores, ofertas de parcelamento e previsões futuras não entram como compras. PDFs digitalizados, modelos desconhecidos e composição divergente são recusados. Limites: 10 MB e 40 páginas.

#### Ativação no Supabase

Após as migrações de categorias e [card_invoice_reconciliation](./supabase/migrations/20261122191752_card_invoice_reconciliation.sql), execute **somente a nova** [separate_bank_card_statements](./supabase/migrations/20261122202208_separate_bank_card_statements.sql) no SQL Editor do ambiente correspondente. Não reexecute migrações já aplicadas nem scripts de clean start.

A nova migração adiciona mês de referência e categoria por ID às compras. Preserva as faturas existentes, cadastra os nomes antigos no catálogo e converte os pagamentos anteriormente vinculados para a categoria **Pagamento de fatura** (o lançamento bancário completo, inclusive quando o vínculo antigo era parcial). Os vínculos ficam como histórico de leitura, deixam de bloquear alterações ou exclusão no banco e não participam mais dos cálculos. Novos vínculos são desabilitados. Pagamentos nunca vinculados precisam ser classificados pelo usuário; o OFX sugere a categoria para descrições explícitas, sempre com revisão.

A tela informa indisponibilidade e desabilita importação enquanto falta a nova migração. O geral e o dashboard avisam que o total está restrito ao banco. A migração local não representa aplicação ou validação em produção. Excluir uma fatura remove suas compras do cartão e do geral, preservando o banco e sua classificação.

#### Validação e exportação

- `npm run test:invoices`: parser, parcelas, estornos, duplicatas legítimas, divergências, meses e separação dos três extratos. Aceita um PDF local com `node scripts/test-invoices.cjs "caminho/arquivo.pdf"`; imprime somente agregados.
- `node scripts/test-statements-db.cjs "caminho/runtime-temporario"`: aplica as migrações reais em PostgreSQL temporário via `@electric-sql/pglite` instalado fora da aplicação; testa transição dos vínculos antigos, mês, catálogo, proprietário, repetição, rollback, edições e RLS.
- `node scripts/test-invoice-db.cjs "caminho/runtime-temporario"`: teste de regressão da migração original, anterior à separação dos extratos.
- Excel mantém banco, faturas e itens separados e acrescenta `Extrato_Geral` calculado pela mesma regra da tela, além de instruções de interpretação. Não somar abas de caixa e consumo.
- Componentes podem ser verificados isoladamente em navegador; isso não substitui a validação autenticada com Supabase em um ambiente de teste.

### Categorias de despesas (v2.4)
- Categorias iniciais e categorias personalizadas por usuário, selecionadas em dropdown nos lançamentos e na revisão OFX.
- Tela `/dashboard/categories` com participação percentual no total de despesas da semana ou mês, composição em pizza, comparação em barras e evolução dos últimos 12 meses.
- Essa tela preserva a análise do fluxo de caixa do banco. O Extrato geral reúne banco e cartão excluindo a categoria Pagamento de fatura; o Extrato do cartão analisa somente as faturas.
- Categorias podem ser desativadas sem apagar o histórico. Despesas antigas são vinculadas ao catálogo pela migração aditiva.
- Receitas mantêm suas categorias livres; os percentuais incluem somente despesas realizadas.

### 1. Gestão de Contas (Bancos, Cofre, Carteiras)
- Cadastro flexível de contas com ícones e cores customizáveis.
- **Edição** de nome, ícone e cor de contas existentes.
- Registro manual de saldos (snapshots) — foto do saldo real da conta.
- Histórico detalhado por conta e gráficos individuais.

### 2. Transações (Gastos & Ganhos)
- Registro de despesas e receitas por conta.
- **Categorias de despesas** escolhidas no catálogo pessoal; receitas continuam com categoria em texto livre.
- Edição e exclusão de transações com confirmação visual.
- Transações são registros de fluxo de caixa — **não alteram o saldo da conta**.

### 3. Extrato Global & Lançamento Rápido (v2.1)
- **Quick Add FAB**: Botão flutuante global em todas as telas do dashboard com atalho `Ctrl+N` / `Cmd+N`.
- **Registro Ultrarrápido**: Modal otimizado com foco automático no valor, alternador intuitivo Despesa/Receita e seletor de categorias de despesas.
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
- **Tabela de Pré-visualização e Edição Rápida**: Seleção em massa, edição inline de descrições e seleção de categorias registradas, com cálculo em tempo real dos totais de entradas e saídas selecionadas.

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
- Node.js 22.13+ (linha 22) para o leitor PDF.js e Next.js 16.
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
3. Em um projeto novo, execute `supabase/migration_v3.sql` para criar as tabelas iniciais. **Não execute esse arquivo em um banco existente**, pois ele remove as tabelas antigas.
4. Execute `supabase/migrations/20261027024508_expense_categories.sql` para adicionar o catálogo de categorias, preservar e vincular as despesas existentes. Aplique essa migração antes de publicar a versão 2.4.
5. Execute `supabase/migrations/20261027024659_expense_category_owner_index.sql` para indexar a chave estrangeira das categorias.
6. Mantenha a confirmação de e-mail habilitada em produção. Para testes locais, ela pode ser desativada temporariamente.
7. Em **Authentication > URL Configuration**, configure a `Site URL` e autorize somente as URLs necessárias, como `http://localhost:3000/auth/callback` durante o desenvolvimento.
8. Em **Authentication > Password**, configure a política mínima de senha e habilite a proteção contra senhas vazadas quando disponível.

### 4. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SUA_URL_AQUI.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLISHABLE_OU_ANON_AQUI
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

O fluxo de autenticação inclui a rota protegida `/dashboard/settings` para alteração de senha com confirmação da senha atual, além de `/forgot-password` e `/reset-password` para recuperação por e-mail. O link de recuperação usa `/auth/callback?next=/reset-password`; o callback aceita somente esse destino interno.

### 5. Inicie a aplicação
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 📐 Regras de Negócio Chave

1. **Snapshots ≠ Transações**: Snapshots são fotos do saldo real (manual). Transações são registros de fluxo. Transações **não** criam snapshots automaticamente.
2. **Categorias**: Despesas usam categorias do catálogo pessoal; receitas mantêm categorias livres em texto.
3. **Row Level Security (RLS)**: Toda query é protegida a nível de linha no Supabase.
4. **Server Actions**: Toda mutação passa por Server Actions do Next.js 16.
5. **Componentes reutilizáveis**: ConfirmDialog, EmptyState, FormModal, TabBar — eliminam duplicação.

---

## 🎨 Padrões Adotados

1. **Server Actions** para todas as mutações (pasta `src/app/actions/`).
2. **Padrão Client/Server Components**: Server busca dados, Client renderiza UI interativa.
3. **CSS Custom Properties** como Design System centralizado em `globals.css`.
4. **Semantic Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `build:`.

## 📱 Responsividade (v2.7)

- Layout do dashboard com larguras flexíveis, margens consistentes e cabeçalho móvel alinhado à tela.
- Históricos de Contas apresentados como cards com rótulos quando a tela ou o próprio card fica estreito; os controles de edição e exclusão continuam disponíveis.
- Extrato com cards visíveis no celular, subtotais em linha própria, filtros de agrupamento e datas adaptáveis.
- Gráficos com seletor de período abaixo do título no celular e legendas que acomodam nomes longos.
- Formulários em uma coluna em telas pequenas, modais com rolagem vertical e altura limitada à área visível, incluindo a prévia de importação OFX.
- Botão de lançamento rápido compacto no celular, com nome acessível e espaço reservado no final da página.
- Tabelas preservadas na impressão/PDF.

### Validação de layout

Validado em Chromium com os componentes reais e dados fictícios, com as gravações no servidor desativadas: larguras de 320, 360, 390, 430, 768, 1024 e 1440 px. A cobertura inclui Dashboard, Contas e suas três abas, Extrato, Gráficos, Resumo, Ações, Configurações, criação de conta/saldo/transação, OFX e lançamento rápido. Também foi verificado um viewport com 430 px de altura. Isso verifica o layout; o teste no aparelho real e com login deve ser feito no ambiente publicado.
