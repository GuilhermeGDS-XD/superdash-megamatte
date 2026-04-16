# 🔒 Prompt Global de Auditoria de Segurança

> **Como usar:** Copie todo este arquivo e preencha as variáveis abaixo antes de enviar para a IA, ou peça para a sua IDE ler este arquivo considerando o contexto do workspace atual.

**[VARIÁVEIS DO PROJETO]**
- Stack: 
- Framework do Dashboard: 
- Caminho dos arquivos críticos: 

---

Atue como um Engenheiro de Segurança de Aplicações (AppSec) e Desenvolvedor Full-Stack sênior. 

Vou te fornecer o contexto do nosso projeto. Sua missão é realizar uma auditoria completa na estrutura, frameworks e dependências, definir uma esteira rigorosa de testes de segurança e desenhar a interface de um relatório (Dashboard) para apresentar os resultados.

Execute as seguintes etapas em ordem:

### ETAPA 1: Varredura e Análise de Arquitetura e Dependências
1. Mapeamento de Dependências: Analise todos os manifestos de pacote listados ou encontrados no projeto (ex: `package.json`, `composer.json`, `requirements.txt`). Identifique frameworks, bibliotecas de terceiros e suas respectivas versões. Aponte potenciais vulnerabilidades conhecidas (CVEs) ou dependências obsoletas.
2. Análise de Infraestrutura e Configuração: Inspecione profundamente todos os arquivos de orquestração e contêineres (ex: `docker-compose.yml`, `Dockerfile`), bem como configurações de automação, fluxos ou pipelines. Busque por falhas como exposição indevida de portas, uso de credenciais em hardcode, privilégios excessivos e imagens base vulneráveis.
3. Varredura da Estrutura de Diretórios: Analise a árvore de arquivos e o código-fonte principal. Identifique os vetores de ataque mais prováveis (ex: falhas de autenticação, injeções, exposição de APIs, falta de sanitização).
4. Resumo de Risco: Gere um relatório executivo rápido listando a superfície de ataque encontrada na sua varredura.

### ETAPA 2: Plano de Testes de Segurança (Security Testing)
1. Crie uma série de testes práticos de segurança focados *estritamente* nas vulnerabilidades e tecnologias mapeadas na Etapa 1.
2. Estruture os testes dividindo-os nas seguintes categorias:
   - Segurança de Infraestrutura e Contêineres.
   - Segurança de Dependências (SCA - Software Composition Analysis).
   - Segurança de Aplicação (DAST/SAST focado no código e nas APIs).
3. Para cada teste, forneça a metodologia de execução, o critério de aprovação/falha e os comandos exatos, scripts ou ferramentas do ecossistema que devem ser usados para automatizar essa verificação.

### ETAPA 3: Estrutura da Tela de Relatório (Dashboard Oculto)
1. Projete a estrutura de uma interface (UI/UX) para exibir o resultado de todos esses testes de forma limpa e acionável para a equipe de desenvolvimento.
2. **Acesso Restrito e Atalho:** A página do relatório não deve estar acessível por rotas públicas padrão ou menus de navegação. Crie a lógica necessária para que o painel fique **oculto na aplicação** e sua visibilidade seja alternada (toggle) única e exclusivamente ao pressionar o atalho de teclado global `CTRL + ALT + SHIFT + S`.
3. Liste os componentes visuais necessários (ex: cards de métricas de saúde das dependências, gráficos de severidade, lista de alertas de infraestrutura).
4. Crie um modelo de dados (formato JSON) que representaria as informações consolidadas da Etapa 1 e Etapa 2 para alimentar essa tela.
5. Forneça o código base estrutural para essa tela, **incluindo o script do *event listener* para o atalho de teclado** (utilize a linguagem/framework solicitada no contexto abaixo, ou HTML/CSS/JS moderno se não especificado).

---
CONTEXTO DO PROJETO E DIRETRIZ DE ACESSO:
- Instrução para a IA: [Se você tiver acesso ao workspace, leia todos os arquivos de configuração mencionados acima. Se não, utilize os dados fornecidos abaixo.]
- Stack Tecnológico Principal: [Ex: Node.js, WordPress, n8n, Docker, etc.]
- Linguagem/Framework da Tela de Relatório: [Ex: Vue, React, ou um plugin/painel customizado]
- Arquivos de Configuração / Dependências / Estrutura:
[Cole aqui o conteúdo de arquivos críticos como package.json, docker-compose.yml, arquivos de rotas, ou a árvore de diretórios completa do projeto]