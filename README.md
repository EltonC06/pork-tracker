# Pork Tracker 🐷

Um sistema pessoal completo para planejamento financeiro, focado em alta performance, usabilidade fluida e design moderno. 

## 🚀 Funcionalidades

### 1. Gestão de Contas (Bancos, Cofre, Carteiras)
- Cadastro flexível de contas com ícones e cores customizáveis.
- Registro de evolução de saldos (snapshots) por data.
- Histórico detalhado por conta e gráficos individuais.

### 2. Gestão de Carteira de Ações
- Cadastro de ativos de renda variável pelo *Ticker*.
- Acompanhamento do Total Investido (Preço Médio) vs Valor Atual.
- Cálculo automático de P&L (Lucros/Perdas) em reais e porcentagem.

### 3. Dashboard Interativo
- Visão unificada do patrimônio total.
- Gráficos de composição (Donut) e evolução mensal (Área/Linha).
- Filtros rápidos por período (30 dias, 90 dias, 1 ano, tudo).

### 4. Autenticação Segura
- Sistema de Login e Cadastro robusto integrado via Supabase Auth.
- Rotas protegidas via Next.js Proxy/Middleware.

---

## 🛠 Tecnologias e Stack

O projeto utiliza o que há de mais moderno no ecossistema web:

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router + Server Actions)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL + RLS)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Estilização:** CSS Custom Properties focado em UI limpa, Dark Mode nativo e alta flexibilidade (sem dependência pesada de utilitários css não-semânticos).

---

## 📂 Estrutura do Projeto

```text
src/
├── app/
│   ├── (auth)               # Rotas públicas: /login, /register, /auth/callback
│   ├── dashboard/           # Rotas protegidas (Módulos da aplicação)
│   ├── actions/             # Server Actions (Mutações no banco via servidor)
│   └── globals.css          # Design System e variáveis CSS
├── components/
│   └── charts/              # Componentes de gráficos reutilizáveis do Recharts
├── lib/
│   ├── supabase/            # Configuração do Client e Server do Supabase
│   └── utils.ts             # Funções utilitárias (formatações de moeda, datas)
├── proxy.ts                 # Middleware do Next.js (proteção de rotas na Edge)
└── types/
    └── database.ts          # Tipagem TypeScript do schema SQL
```

---

## 💻 Como Rodar o Projeto Localmente

### 1. Pré-requisitos
- Node.js versão 18+
- Conta no [Supabase](https://supabase.com/) (para criar o banco de dados)

### 2. Clone o repositório e instale dependências
```bash
git clone https://github.com/seu-usuario/fintrack.git
cd fintrack
npm install
```

### 3. Configure o Supabase (Banco de Dados)
1. Crie um projeto no Supabase.
2. Acesse o **SQL Editor** no painel do Supabase.
3. Copie o conteúdo do arquivo `supabase/migration.sql` (que fica na raiz deste projeto) e rode lá. Isso vai criar as tabelas e habilitar o RLS de segurança.
4. Desative a confirmação obrigatória de e-mail (Authentication > Providers > Email > "Confirm email" OFF), se quiser testar de forma mais fácil.

### 4. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto contendo as chaves do seu Supabase (elas ficam em *Project Settings -> API* no painel do Supabase):

```env
NEXT_PUBLIC_SUPABASE_URL=https://SUA_URL_AQUI.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLISHABLE_OU_ANON_AQUI
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Inicie a aplicação
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador. Crie uma conta no app e comece a testar!

---

## 🎨 Padrões e Boas Práticas Adotados

1. **Server Actions vs API Routes:** A mutação de dados é toda feita usando as modernas Server Actions do Next.js 16 (dentro da pasta `src/app/actions`), evitando endpoints de API redundantes.
2. **Row Level Security (RLS):** Toda query para o banco de dados Supabase é protegida a nível de linha. Um usuário nunca tem como acessar a conta bancária ou ação do outro.
3. **Padrão Client/Server Components:** A maioria das páginas (como `dashboard/page.tsx`) usa Server Components para fazer fetch seguro de dados na primeira requisição, passando os resultados prontos para Client Components (como `DashboardClient.tsx` ou gráficos interativos).
4. **Isolamento do CSS:** O uso de CSS baseado em Variáveis e escopo encapsulado previne classes gigantes, tornando o arquivo `globals.css` um verdadeiro Design System unificado.
