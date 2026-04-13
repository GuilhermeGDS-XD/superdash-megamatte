# Plano de atualizacao para producao

## Objetivo
Garantir atualizacao segura de aplicacao e banco (incluindo mudancas estruturais) com downtime minimo, rollback claro e validacao funcional completa.

## Escopo desta release
- App Next.js 16.1.6 (frontend + APIs internas)
- Supabase (schema, migracoes, politicas e dados)
- Integracoes Meta Ads
- Fluxos de autenticacao e autorizacao por perfil

## Riscos identificados no estado atual
1. Migracao destrutiva existente:
- supabase/migrations/20260302032806_final_rebuild_success.sql contem DROP TABLE e carga de usuario inicial.
- Este arquivo nao pode ser executado em producao sem revisao cirurgica.

2. Inconsistencia de papeis (roles) entre app e banco:
- Existem variacoes como Super Admin/Admin/Gestor e SUPER_ADMIN/ADMIN/MANAGER.
- Isso pode quebrar autorizacao no middleware e menus.

3. Dependencias criticas de segredo:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- META_ADS_ACCESS_TOKEN

4. Historico recente com ajustes funcionais e de UX mobile:
- Necessario smoke test de navegacao e menu mobile apos deploy.

## Estrategia recomendada
Adotar rollout em 3 etapas: estabilizacao, migracao de banco, deploy aplicacao com validacao e observabilidade reforcada.

## Fase 0 - Congelamento e governanca (T-7 ate T-2)
1. Definir release owner, DBA owner e owner de negocio para decisao go/no-go.
2. Congelar merge em dev/main durante janela de release (apenas hotfix com aprovacao).
3. Criar branch de release e tag candidata.
4. Definir janela de manutencao e plano de comunicacao para usuarios.

Checklist:
- Responsaveis definidos
- Janela aprovada
- Criticos cientes

## Fase 1 - Higienizacao tecnica (T-5 ate T-1)
1. Fechar baseline de schema de producao:
- Extrair schema atual remoto.
- Comparar com migracoes locais.
- Eliminar operacoes destrutivas da trilha de producao.

2. Criar trilha de migracao segura:
- Substituir drop/create por alter table incremental.
- Tornar scripts idempotentes (if exists / if not exists).
- Separar migracao estrutural de seed.

3. Padronizar roles em um unico contrato:
- Escolher padrao oficial (sugestao: SUPER_ADMIN, ADMIN, MANAGER no banco e mapping visual no frontend).
- Corrigir comparacoes no app e middleware.
- Criar script de normalizacao de dados para roles legadas.

4. Preparar variaveis de ambiente de producao:
- Validar presenca de todos os segredos.
- Rotacionar tokens antigos e registrar responsavel pela rotacao.

5. Preparar observabilidade minima:
- Error tracking (frontend e API)
- Logs de auth e erros de integracao Meta
- Alerta para falha de rotas API criticas

Checklist de saida da fase:
- Migracoes revisadas e nao destrutivas
- Contrato de roles fechado
- Segredos validados
- Observabilidade pronta

## Fase 2 - Ensaio completo (staging espelhado) (T-1)
1. Restaurar snapshot recente de producao em ambiente de staging isolado.
2. Executar migracoes na mesma ordem prevista para producao.
3. Rodar build e subir app apontando para staging.
4. Executar smoke tests end-to-end:
- Login/logout
- Menu hamburger mostrando usuario logado e acao de sair/entrar
- Listagem e dashboard de campanhas
- Dashboard individual mobile (cards, modal de metricas, grafico no modal)
- Rotas admin por role
- Integracoes Meta principais

5. Registrar tempos:
- Tempo total de migracao
- Tempo de indisponibilidade percebida
- Tempo de rollback simulado

Critério de aprovacao:
- Zero erro bloqueante
- Zero perda de dados
- Autorizacao funcionando por role

## Fase 3 - Execucao em producao (dia D)
1. Pre-deploy imediato
- Ativar janela de mudanca
- Bloquear jobs nao essenciais
- Avisar stakeholders de inicio

2. Backup e ponto de retorno
- Backup logico completo do banco antes de qualquer alteracao
- Confirmar possibilidade de restore rapido
- Registrar hash/tag da versao atual da app

3. Migracao de banco
- Aplicar apenas migracoes aprovadas para producao
- Validar objetos criticos:
  - tabelas campaigns/users/logs/creatives
  - indices unicos (incluindo creatives)
  - policies RLS
  - colunas novas (ex: meta_account_id)

4. Deploy da aplicacao
- Deploy da release tag
- Atualizar variaveis de ambiente
- Warmup de rotas principais

5. Validacao pos-deploy (go/no-go em ate 30 min)
- Smoke test funcional completo
- Conferencia de logs de erro
- Conferencia de metricas de latencia e taxa de erro

6. Encerramento
- Comunicar sucesso
- Encerrar janela

## Rollback
Trigger de rollback:
- Falha de autenticacao generalizada
- Erro de autorizacao por role
- Falha de rotas criticas de campanha
- Erro estrutural de banco sem mitigacao imediata

Ordem de rollback:
1. Reverter app para tag anterior.
2. Se necessario, restaurar banco para snapshot pre-release.
3. Reaplicar segredos antigos (se houve rotacao durante release).
4. Revalidar smoke test minimo.

RTO alvo: ate 30 min
RPO alvo: ate o momento do backup pre-release

## Checklist de prontidao final (Go/No-Go)
- Migracoes de producao revisadas e aprovadas por DBA
- Backup testado e restore validado
- Roles padronizadas e testadas
- Segredos presentes e validos
- Smoke test staging aprovado
- Plano de rollback ensaiado
- Responsaveis online durante a janela

## Matriz de responsabilidade (sugestao)
- Tech Lead: dono do go/no-go tecnico
- DBA: dono de migracao, backup e restore
- Dev responsavel: deploy app e smoke test
- Produto/Operacao: comunicacao com usuarios

## Proximos passos praticos imediatos
1. Criar issue tecnica para substituir migracao destrutiva por migracoes incrementais.
2. Criar issue tecnica para padronizacao de roles (db + app + middleware).
3. Criar pipeline de preflight com:
- npm ci
- npm run build
- verificacao de env obrigatorias
- validacao de migracoes
4. Agendar rehearsal em staging com snapshot recente.
