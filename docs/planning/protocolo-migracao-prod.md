# Protocolo operacional de migracao para producao

Este documento padroniza o processo de migracao de banco + validacao para producao.

## Comando de chat para iniciar
Use esta frase no chat:

`Execute: npm run chat:migrate-prod`

## Pre-requisitos obrigatorios
1. Janela de mudanca aprovada.
2. Branch `main` atualizada com o release aprovado.
3. Supabase CLI autenticado (`npx supabase projects list` funcionando).
4. Variaveis de ambiente validas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `META_ADS_ACCESS_TOKEN`

## Guardrail de seguranca
O comando de migracao para producao so executa com confirmacao explicita:

```bash
$env:CONFIRM_PROD_MIGRATION='true'; $env:CONFIRM_MAIN_PROMOTION='true'; npm run chat:migrate-prod
```

`CONFIRM_MAIN_PROMOTION=true` habilita a etapa final de promocao `dev -> main`.

## O que o comando automatizado faz
1. Linka o Supabase para o projeto de producao.
2. Roda `preflight:prod`.
3. Lista migracoes locais/remotas antes do push.
4. Gera backup logico pre-migracao em `backups/`.
5. Executa `supabase db push --linked --yes`.
6. Lista migracoes novamente para confirmar sincronismo.
7. Executa validacao pos-migracao automatica.
8. Promove a branch `dev` para `main` (quando `CONFIRM_MAIN_PROMOTION=true`).
9. Relinka automaticamente para staging ao final.

## Comandos manuais equivalentes
```bash
npx supabase link --project-ref <PROD_PROJECT_REF> --yes
npm run preflight:prod
npx supabase migration list
npx supabase db dump --linked -f backups/prod-pre-migration-YYYYMMDD-HHMM.sql
npx supabase db push --linked --yes
npx supabase migration list
node scripts/validate-staging.mjs
git fetch origin
git checkout main
git pull origin main
git merge --no-ff dev -m "release: promote dev to production"
git push origin main
git checkout dev
```

## Critério de GO
1. `preflight:prod` aprovado.
2. `migration list` 100% sincronizado (local = remote).
3. `validate-staging.mjs` aprovado no ambiente de producao (sem falhas).
4. Promocao `dev -> main` concluida sem conflitos.

## Critério de NO-GO
1. Falha em `db push`.
2. Falha em integridade de tabelas/colunas criticas.
3. Falha em roles canonicas.
4. Falha em duplicidade de criativos.
5. Falha no merge/push para `main`.

## Rollback
1. Reverter app para tag anterior em `main`.
2. Restaurar banco usando backup gerado em `backups/`.
3. Revalidar rotas criticas.

## Pos-execucao
1. Monitorar logs por 30-60 min.
2. Rodar smoke test de login/logout, dashboard e APIs criticas.
3. Registrar resultado final da janela de mudanca.
