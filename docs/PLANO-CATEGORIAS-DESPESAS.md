# Categorias de despesas — plano de implementação

## Objetivo

Permitir que cada pessoa cadastre categorias próprias, escolha uma categoria em um seletor ao lançar despesas e acompanhe valor e participação percentual dos gastos por semana e mês, com evolução mensal.

## Regras de produto

- O percentual de uma categoria é seu total dividido pelo total de despesas do período selecionado. Receitas, previsões e snapshots não entram no denominador.
- A semana vai de segunda a domingo, na data local; o mês usa o calendário local. O painel mostra explicitamente o intervalo selecionado.
- Há categorias iniciais para cada usuário. Novas categorias são pessoais; nomes são únicos sem diferenciar maiúsculas/minúsculas ou espaços externos.
- Despesas antigas com texto livre são preservadas e vinculadas a uma categoria correspondente na migração. Valores sem categoria aparecem como “Sem categoria”.
- Desativar uma categoria impede novos lançamentos nela, mas preserva o histórico e seus gráficos.
- A sugestão de categoria do OFX precisa ser confirmada no seletor; sugestões sem correspondência ficam sem categoria.
- O futuro módulo de cartões deve usar as mesmas categorias em compras. Pagamento de fatura não deve entrar como despesa de consumo, para evitar dupla contagem.

## Dados e segurança

Criar `expense_categories` com `user_id`, nome, estado ativo e marca de categoria inicial. Adicionar `category_id` em `transactions`, mantendo o campo textual antigo como compatibilidade e histórico. A chave composta `(category_id, user_id)` impede associação com categoria de outra pessoa. RLS e privilégios explícitos limitam acesso ao próprio usuário.

## Entrega

1. Migração aditiva, preenchimento do histórico e tipos TypeScript.
2. Server Actions para cadastro e desativação, com validação de propriedade e entrada.
3. Seletor reutilizável no lançamento rápido, formulário de contas, edição do extrato e revisão OFX.
4. Tela “Categorias” com resumo semanal e mensal, gráfico de composição, barras e evolução dos últimos meses; tratamento de estados vazios.
5. Verificação de TypeScript, lint, build, migração em ambiente isolado quando disponível, fluxo funcional e largura móvel de 320 a 430 px e viewport curto.

## Publicação

A branch `codex/expense-categories` abre PR para `main` após os testes. A migração deve ser aplicada antes de disponibilizar o código em produção; este plano não autoriza merge automático.
