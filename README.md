# Pork Tracker 🐷

Um sistema pessoal completo para planejamento financeiro, focado em alta performance, usabilidade fluida e design moderno. 

## 🚀 Funcionalidades

### Navegação simplificada (v2.5)
- Menu principal: Dashboard, Contas, Extrato, Faturas, Categorias e Resumo; Configurações continua no rodapé.
- Ações e Gráficos ficam ocultos no menu, inclusive no celular. Suas rotas, dados e cálculos existentes são preservados.

### Conciliação de faturas Inter (v2.5)

Em `/dashboard/invoices`, importe o PDF textual exportado pelo Inter, revise as categorias e confirme os itens antes de salvar. O leitor foi validado com uma fatura real de nove páginas: 52 itens, duas compras parceladas e total conferido. A leitura acontece no navegador com PDF.js; o PDF original, nome do titular, endereço, boleto e número completo do cartão não são armazenados no projeto ou enviados ao servidor. Os registros revisados são salvos pela Server Action.

**Ativação no banco:** executar a migração aditiva [card_invoice_reconciliation](./supabase/migrations/20261122191752_card_invoice_reconciliation.sql) em um ambiente de teste antes da publicação. Ela depende das tabelas existentes `transactions` e `auth.users`; não executar o antigo script de clean start em um banco com dados. A migração foi testada em PostgreSQL temporário, mas isso não equivale a aplicá-la ou validá-la em produção. Sem a migração, a tela informa a indisponibilidade e desabilita a importação.

#### Separar consumo de fluxo de caixa

- **Extrato bancário:** mantém a saída real do pagamento da fatura, na data do pagamento. As compras do cartão não criam novas saídas da conta nem snapshots.
- **Consumo por categoria:** soma despesas diretas (Pix, débito etc.) e itens do cartão pela data informada no PDF. Exclui a parte explicitamente vinculada dos pagamentos de faturas desse total; o pagamento é liquidação de uma dívida. Em parcelas, a data de origem pode ser a da compra original; esta versão não distribui automaticamente valores por competência futura.
- **Conciliação pendente:** pagamentos não vinculados continuam nas despesas diretas. A tela informa a cobertura do detalhamento e mostra total provisório quando há faturas sem pagamento vinculado ou descrições que sugerem pagamento de cartão. O usuário deve conciliar para remover a sobreposição. Nenhuma associação é confirmada apenas por coincidência de valor.
- Exemplo: compras de R$ 100 em mercado e R$ 80 em transporte, seguidas de pagamento de R$ 180. Consumo conhecido: R$ 180; saída bancária: R$ 180. Esses indicadores não se somam. Compra em outubro paga em novembro aparece no consumo de outubro e no caixa de novembro.

#### Modelo e integridade

- Fatura: proprietário, nome do cartão, quatro últimos dígitos do cartão principal, vencimento, total declarado e hash dos itens normalizados. O vencimento identifica a fatura, sem presumir o mês pelo nome do arquivo.
- Item: fatura, ordem de origem, data, descrição, final do cartão físico/virtual, valor em centavos, categoria e parcela atual/total. Estorno reduz consumo; pagamento anterior e ofertas de parcelamento não são compras; juros e IOF lançados são preservados.
- Pagamentos: vínculo separado entre transação bancária e fatura, com valor alocado. Permite pagamentos parciais e múltiplos; uma transação não pode ter alocações acima do próprio valor. Importar a fatura não significa marcá-la como paga.
- Importação atômica por RPC: chave única proprietário/final do cartão/vencimento. Mesmo conteúdo retorna a fatura existente, preservando categorias editadas. Um conteúdo diferente para essa chave é recusado; para substituir, o usuário confere a diferença e remove explicitamente o detalhamento antigo. O hash independe da ordem dos itens e das categorias; preserva a multiplicidade de compras iguais.
- RLS, chaves estrangeiras de proprietário, soma dos itens verificada no commit e bloqueios de alocação no PostgreSQL protegem a consistência. É necessário desvincular antes de excluir um pagamento ou reduzir seu valor abaixo do alocado. As operações não alteram snapshots.

#### Fluxo de revisão

1. Importar PDF, identificar o cartão e conferir vencimento e total declarado. Limites: 10 MB e 40 páginas.
2. Revisar itens, categorias, parcelas e créditos antes de salvar. Divergência entre itens e total ou linha incompleta impede a importação. PDFs digitalizados, novos modelos, antecipações e saldos anteriores sem composição conferida precisam de suporte adicional; não são aceitos silenciosamente.
3. Sugerir pagamentos do extrato usando conta, descrição, data e valor. Coincidência de valor sozinha nunca confirma vínculo; usuário escolhe o pagamento. Permitir importar em qualquer ordem e vincular depois.
4. Conferir os estados não vinculada, parcial e integral, pagamentos alocados e saldo a conciliar. O pagamento histórico impresso dentro do PDF não prova a quitação da fatura atual.
5. Desfazer vínculo preserva o extrato original. Remover detalhamento retorna à apresentação sem composição, sem excluir pagamento. Dashboard apresenta consumo e fluxo de caixa separadamente; Extrato, Contas e Resumo continuam como caixa. Excel separa faturas, itens e vínculos em abas com instruções para não somar caixa e consumo.

#### Validação local

- `npm run test:invoices`: parser e consumo com dados sintéticos (parcelas, estornos, duas compras iguais, datas inválidas, divergências e meses diferentes). Para testar um PDF real sem copiá-lo ao repositório: `node scripts/test-invoices.cjs "caminho/arquivo.pdf"`. Apenas metadados agregados são impressos.
- `node scripts/test-invoice-db.cjs "caminho/runtime-temporario"`: usa `@electric-sql/pglite` instalado nesse diretório, fora das dependências da aplicação. Executa a migração real e testa repetição, importação divergente, rollback, alocação parcial, limites, edição, exclusão, isolamento entre usuários e acesso anônimo.
- Verificação local: TypeScript, lint (sem erros novos) e build de produção; componentes reais em navegador isolado a 320, 360, 390, 430, 768 e 1440 px, incluindo viewport curto, leitura do PDF real, confirmação, paginação, vínculo e desvínculo, sem overflow horizontal. Testes com ações simuladas e PostgreSQL temporário não substituem a validação autenticada em um ambiente de teste da aplicação.

### Categorias de despesas (v2.4)
- Categorias iniciais e categorias personalizadas por usuário, selecionadas em dropdown nos lançamentos e na revisão OFX.
- Tela `/dashboard/categories` com participação percentual no total de despesas da semana ou mês, composição em pizza, comparação em barras e evolução dos últimos 12 meses.
- Essa tela preserva a análise de fluxo de caixa. A composição das compras do cartão e a exclusão de pagamentos conciliados do consumo ficam em Faturas, evitando misturar indicadores.
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
