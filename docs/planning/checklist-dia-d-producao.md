# Checklist operacional - dia D (producao)

## 1) Antes da janela
- Confirmar branch/tag de release aprovada.
- Confirmar backup agendado e estrategia de restore validada.
- Confirmar equipe de plantao (Tech Lead, DBA, Dev).
- Confirmar segredos no ambiente de producao.
- Rodar preflight local/CI e aprovar sem bloqueios.

Comando sugerido:

```bash
npm run preflight:prod
npm run build
```

## 2) Inicio da janela
- Comunicar inicio para stakeholders.
- Congelar mudancas nao criticas.
- Suspender jobs de escrita nao essenciais (se aplicavel).

## 3) Banco de dados
- Executar backup completo imediatamente antes da migracao.
- Aplicar somente migracoes aprovadas para producao.
- Validar objetos criticos:
  - public.users
  - public.campaigns
  - public.logs
  - public.creatives
- Validar indices e constraints principais.
- Validar politicas RLS e permissoes.

## 4) Deploy da aplicacao
- Publicar release tag no ambiente de producao.
- Confirmar variaveis de ambiente no provedor.
- Rodar warmup de rotas principais.

## 5) Smoke test pos-deploy
- Login e logout.
- Menu hamburger mostrando:
  - usuario logado
  - acao de sair
  - acao de entrar quando deslogado
- Home/listagem de campanhas.
- Dashboard individual:
  - desktop normal
  - mobile com cards compactos e grafico apenas no modal
- Rotas admin por permissao.
- Endpoints Meta principais sem erro 500.

## 6) Go/No-Go
Criterios de GO:
- Sem erro bloqueante de autenticacao/autorizacao.
- Sem erro estrutural de banco.
- Sem regressao funcional critica.

Criterios de NO-GO:
- Falha em login/logout geral.
- Falha em leitura/escrita de campanhas.
- Falha em politicas de acesso por role.

## 7) Rollback (se necessario)
- Reverter aplicacao para tag anterior.
- Restaurar banco para backup pre-release (se houver impacto estrutural).
- Revalidar smoke minimo.
- Comunicar incidente e acao corretiva.
