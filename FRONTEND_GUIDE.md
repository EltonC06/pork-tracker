# Pork Tracker — Manual de Desenvolvimento para IAs

> **LEITURA OBRIGATÓRIA.** Este documento é o guia de desenvolvimento do projeto Pork Tracker. Qualquer agente de IA que for modificar, refatorar, ou adicionar qualquer funcionalidade **DEVE ler e seguir este manual integralmente** antes de escrever uma única linha de código.

---

## 1. Visão Geral do Projeto

**Pork Tracker** é um sistema pessoal de planejamento financeiro construído com Next.js 16 (App Router), TypeScript e Supabase como backend. O sistema permite que o usuário gerencie contas bancárias, posições de ações e visualize sua evolução patrimonial através de gráficos.

### Stack obrigatória (não substitua sem autorização):
| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Linguagem | TypeScript | 5.x |
| Estilização | Vanilla CSS via Custom Properties | - |
| Backend / Auth | Supabase | 2.x |
| Gráficos | Recharts | 3.x |
| Ícones | Lucide React | 1.x |
| Toasts | Sonner | 2.x |

---

## 2. Regras de Ouro (Nunca Quebre Essas)

1. **Nunca hardcode chaves ou segredos.** Todas as variáveis de ambiente ficam em `.env.local` e são acessadas via `process.env`. O arquivo `.env.local` está no `.gitignore` e **nunca** deve ser commitado.
2. **Nunca use strings de cores diretas (ex: `#6366f1`, `red`, `rgb(...)`) em estilos.** Use **apenas as variáveis CSS** definidas em `src/app/globals.css`. Isso garante consistência de tema.
3. **Nunca crie estilos via classes Tailwind ad-hoc** — o projeto usa CSS Custom Properties como sistema de design. Tailwind está instalado mas as classes utilitárias não devem ser usadas para layout ou cores de componentes de UI.
4. **Nunca faça mutations de dados via `fetch` direto no cliente.** Toda mutação de dados (criação, edição, exclusão) deve passar por uma **Server Action** (`'use server'`) localizada em `src/app/actions/`.
5. **Nunca contorne o Husky.** O hook de `pre-commit` garante que `tsc --noEmit` e `eslint .` passem sem erros antes de qualquer commit.

---

## 3. Sistema de Design (Design System)

Todo o design system está centralizado em **`src/app/globals.css`** — leia esse arquivo antes de estilizar qualquer componente.

### 3.1 Paleta de Cores (CSS Custom Properties)

```
/* Marca / Identidade */
--brand-400 → #818cf8  (tom claro, gradientes, textos em destaque)
--brand-500 → #6366f1  (tom médio)
--brand-600 → #4f46e5  (tom escuro, fundos de botões primários)

/* Semântica Financeira */
--success-400 → #34d399  (valores positivos, P&L positivo)
--danger-400  → #fb7185  (valores negativos, erros)
--warning-400 → #fbbf24  (alertas, avisos)

/* Fundo (Dark Mode nativo) */
--bg-base    → #0a0a0f  (fundo geral da página)
--bg-surface → #111118  (sidebar, cabeçalhos de seção)
--bg-card    → #16161f  (cards, modais, containers)
--bg-card-hover → #1c1c28 (estado hover de cards)
--bg-border  → #252535  (bordas gerais)

/* Texto */
--text-primary   → #f1f0ff  (texto principal)
--text-secondary → #9b9ac5  (texto descritivo, labels)
--text-muted     → #5c5a7a  (texto inativo, placeholders)
```

### 3.2 Componentes CSS Reutilizáveis

Estas classes CSS já estão definidas. **Use-as antes de criar novos estilos:**

| Classe CSS | Quando usar |
|---|---|
| `.glass-card` | Container principal de módulo, seções |
| `.kpi-card` | Cards de KPI / métricas do dashboard |
| `.btn-primary` | Botão de ação principal (azul/gradiente) |
| `.btn-ghost` | Botão secundário (borda sutil) |
| `.btn-danger` | Botão de exclusão/ação destrutiva |
| `.input` | Todos os campos de texto/número/select |
| `.label` | Label de formulário |
| `.data-table` | Tabelas de dados |
| `.badge`, `.badge-success`, `.badge-danger`, `.badge-neutral` | Tags/rótulos |
| `.modal-overlay` + `.modal-content` | Modais |
| `.skeleton` | Loading state de conteúdo |
| `.gradient-text` | Texto com gradiente da marca |
| `.empty-state` | Estado vazio de listas/módulos |
| `.nav-item` | Itens de navegação na sidebar |

### 3.3 Tipografia

- **Fonte única:** `Inter` (Google Fonts, já importada em `globals.css`)
- Pesos utilizados: 300, 400, 500, 600, 700, 800
- **Nunca importe fontes adicionais** sem aprovação explícita do usuário.

---

## 4. Arquitetura de Pastas

```
src/
├── app/
│   ├── actions/           ← Server Actions (APENAS mutations/escrita no banco)
│   │   ├── auth.ts        ← login, register, logout
│   │   ├── accounts.ts    ← CRUD de contas e snapshots
│   │   └── stocks.ts      ← CRUD de ações e histórico de preços
│   │
│   ├── auth/callback/     ← Route Handler do Supabase (não modifique)
│   │
│   ├── dashboard/         ← Rotas protegidas (requerem autenticação)
│   │   ├── layout.tsx     ← Layout com Sidebar (server component)
│   │   ├── page.tsx       ← Dashboard principal (server component)
│   │   ├── accounts/      ← Módulo de Contas
│   │   │   ├── page.tsx          ← Busca dados no servidor
│   │   │   └── AccountsClient.tsx ← Toda lógica interativa (client)
│   │   ├── stocks/        ← Módulo de Ações (mesma estrutura)
│   │   └── charts/        ← Módulo de Gráficos (mesma estrutura)
│   │
│   ├── login/page.tsx     ← Página pública de login
│   ├── register/page.tsx  ← Página pública de cadastro
│   ├── layout.tsx         ← Root layout (metadata global)
│   ├── page.tsx           ← Redirect para /dashboard ou /login
│   └── globals.css        ← Design System completo (CSS Custom Properties)
│
├── components/
│   ├── charts/            ← Componentes de gráficos reutilizáveis (Recharts)
│   │   ├── PatrimonyChart.tsx
│   │   └── AccountLineChart.tsx
│   └── layout/
│       └── Sidebar.tsx    ← Navegação lateral (client component)
│
├── lib/
│   └── supabase/
│       ├── client.ts      ← Supabase client para o browser
│       ├── server.ts      ← Supabase client para Server Components
│       └── middleware.ts  ← Refresh de sessão (usado pelo proxy.ts)
│
├── types/
│   └── database.ts        ← Tipos TypeScript do schema SQL
│
└── proxy.ts               ← Proteção de rotas (equivalente ao middleware do Next.js 16)
```

---

## 5. Padrão de Componentes (Componentização)

### 5.1 Separação Server / Client

O padrão de cada módulo é **obrigatório:**

```
dashboard/[modulo]/
  ├── page.tsx          ← Server Component: busca dados e passa como props
  └── [Modulo]Client.tsx ← Client Component: lógica de UI, estado, interatividade
```

**`page.tsx` (Server Component):**
```tsx
// Sem 'use client'
// Sem useState, useEffect
// SEM event handlers
import { createClient } from '@/lib/supabase/server'
import ModuloClient from './ModuloClient'

export default async function ModuloPage() {
  const supabase = await createClient()
  const { data } = await (supabase as any).from('tabela').select('*')
  return <ModuloClient initialData={data ?? []} />
}
```

**`ModuloClient.tsx` (Client Component):**
```tsx
'use client'
// useState, useTransition, handlers vivem aqui
// Chama Server Actions para mutações
```

### 5.2 Quando Criar um Novo Componente

Crie um novo componente em `src/components/` quando:
- O elemento é reutilizado em **2 ou mais lugares**
- O elemento é um gráfico (sempre vai em `src/components/charts/`)
- O elemento tem mais de **50 linhas de JSX**

### 5.3 Props e TypeScript

- **Sempre** defina interfaces explícitas para as props dos componentes.
- **Evite `any`** — use tipos específicos ou `unknown` com type guards.
- Tipos relacionados ao schema do banco ficam em `src/types/database.ts`.

```tsx
// ✅ Correto
interface AccountCardProps {
  id: string
  name: string
  balance: number
}

// ❌ Errado
function AccountCard(props: any) { ... }
```

---

## 6. Estilização — Regras Práticas

### 6.1 Hierarquia de Estilo

Use na seguinte ordem de preferência:

1. **Classes CSS globais** (`globals.css`) → sempre a primeira escolha
2. **`style={}` inline** → apenas para valores dinâmicos (ex: `color: isPositive ? 'var(--success-400)' : 'var(--danger-400)'`)
3. **CSS Modules** → se precisar criar estilos complexos e isolados para um componente grande
4. **Tailwind utilitários** → apenas para `display`, `flex`, `gap` em casos simples onde não há classe existente — **NUNCA** para cores ou tipografia

### 6.2 Tokens Obrigatórios

```tsx
// ✅ Correto — usa CSS variables
style={{ color: 'var(--text-primary)', background: 'var(--bg-card)' }}

// ❌ Errado — hardcode de cores
style={{ color: '#f1f0ff', background: '#16161f' }}
```

### 6.3 Espaçamento e Escala

Use `rem` para espaçamento. Guia de referência:

| valor | equivalente |
|---|---|
| `0.25rem` | 4px (micro gap) |
| `0.5rem` | 8px (gap mínimo) |
| `0.75rem` | 12px (gap padrão) |
| `1rem` | 16px (espaçamento base) |
| `1.25rem` | 20px |
| `1.5rem` | 24px (padding de card) |
| `2rem` | 32px (padding de page) |

---

## 7. Responsividade

O breakpoint principal é **768px** (tablets e mobile).

- A sidebar some abaixo de 768px (está no CSS como `transform: translateX(-100%)`)
- O `main-content` passa de `margin-left: 240px` para `margin-left: 0`
- **Todo novo componente deve ser testado em ambos os tamanhos** — use `flex-wrap` e `min-width: 0` para evitar overflow

```css
/* Padrão obrigatório para grids responsivos */
display: grid;
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
gap: 1rem;
```

---

## 8. Server Actions — Padrão de Escrita

Toda Server Action segue este padrão:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function minhaAction(formData: FormData) {
  const supabase = await createClient()

  // 1. Pegar o usuário autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // 2. Extrair dados do FormData
  const nome = formData.get('nome') as string

  // 3. Validação básica
  if (!nome) return { error: 'Nome é obrigatório.' }

  // 4. Operação no banco
  const { error } = await (supabase as any)
    .from('tabela')
    .insert({ nome, user_id: user.id })

  if (error) return { error: error.message }

  // 5. Revalidar o path para atualizar os dados na UI
  revalidatePath('/dashboard/modulo')
}
```

---

## 9. Processo de Desenvolvimento

### Antes de codar:
1. Ler este arquivo inteiro.
2. Ler `src/app/globals.css` para conhecer as classes CSS disponíveis.
3. Entender o schema do banco em `supabase/migration.sql`.

### Ao implementar:
1. Criar/modificar Server Actions em `src/app/actions/` primeiro.
2. Criar o Server Component (`page.tsx`) que busca os dados.
3. Criar o Client Component (`*Client.tsx`) com a UI.
4. Verificar se algum elemento pode ser extraído para `src/components/`.

### Ao finalizar:
1. Rodar `npm run type-check` para garantir TypeScript sem erros.
2. Rodar `npm run lint` para garantir ESLint sem erros.
3. Testar visualmente no mobile (abaixo de 768px).
4. Atualizar o `README.md` se a mudança foi significativa.
5. Commitar com Semantic Commit: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `build:`.
6. Dar push com `git push`.

### Atualização de versão (no Sidebar):
- **Patch (1.1 → 1.2):** Nova funcionalidade ou melhoria visível.
- **Minor (1.2 → 1.3):** Conjunto de funcionalidades ou mudança de módulo.
- **Major (1.x → 2.0):** Mudança disruptiva na arquitetura (requer aprovação explícita do usuário).
- Ao bumpar a versão, atualizar o número em `src/components/layout/Sidebar.tsx` **e** adicionar os bullet points no tooltip do changelog.

---

## 10. Anti-Padrões (Nunca Faça)

| ❌ Anti-Padrão | ✅ Correto |
|---|---|
| Buscar dados com `useEffect` + `fetch` no client | Usar Server Components + Server Actions |
| Criar componentes com `any` em props | Definir interface TypeScript explícita |
| Usar cores hexadecimais hardcoded | Usar `var(--variavel-css)` |
| Criar novos endpoints em `api/route.ts` para CRUD | Usar Server Actions |
| Commitar com mensagem genérica ("update", "fix") | Usar Semantic Commits |
| Adicionar novas fontes ou libs sem necessidade | Reusar o que já está instalado |
| Estilizar com Tailwind classes de cor (`text-blue-500`) | Usar `var(--brand-400)` |
| Usar `localStorage` para persistência de dados | Usar o Supabase |
| Fazer `console.log` em produção | Remover todos os logs antes de commitar |
