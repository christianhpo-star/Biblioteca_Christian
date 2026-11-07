# Retomada

## E0 — laboratório de leitura PDF e eventos da S Pen (06/11/2026)

- Branch `codex/pdf-e0-prototipo-local-pen`, baseada na PR #11 (`339e7d5`); escopo: **prova de viabilidade**, não leitor completo de anotações. Não alterar login, Drive, banco, estado, PDFs privados nem publicar.
- Código: `src/reading/pdf-prototype.js` e `styles/pdf-prototype.css` isolados; HTML de diálogo e botão na ficha/dash avançado; manifesto. Escolha PDF do dispositivo, iframe nativo e fallback em nova aba, revoga URL blob; tela de diagnóstico separada registra somente métricas visíveis, sem dados persistidos.
- Design e riscos: `docs/PDF_E0_FEASIBILITY.md`. Browser nativo não garante iframe no Android nem coordenadas de página; PDF.js é candidato após decisão, não está instalado.
- Testes adicionados: `tests/pdf-prototype.test.mjs` (nove) e `tests/browser.cjs` ampliado. PASS em 21 verificações V8 isoladas; suítes Node/Playwright, PDF real no navegador e Samsung físico **não validados**.
- Executar localmente com Node 22: `npm ci && npm run build && npm test && npm run test:browser`. Usar PDFs sintéticos; observar no tablet Chrome/Samsung Internet/PWA, touch/zoom, caneta/palma, foco, arquivos inválidos, formato em 320/390/768/1024/1440. Não enviar arquivos reais ao repositório.
- Após QA E0, decidir explicitamente dependência de renderização, IndexedDB/backup para traços e acesso de PDF privado. E1/E2/E3 ainda não iniciadas. Requer aprovação de escopos/arquitetura e PRs anteriores antes de merge/deploy.


## Próxima revisão — entrada do acervo com cinco obras (06/11/2026)

- Branch `codex/inicio-cinco-obras-recentes`, baseada na PR #10 (`190c19c`), após PRs #9, #8, #1. Scope: issue #4, sem merge/deploy/alteração de dados reais.
- `src/catalog/repository.js`: `getWorkAddedAtTimestamp`, `selectHomeWorks` — data ISO confiável, desempate estável, fallback alfabético sem datas inventadas. `src/catalog/dashboard.js`: até cinco botões de obra, Ver todo o acervo, retorno ao início. `templates/index.html` e `styles/dashboard.css`: prévia e demais indicadores em `<details>`. `src/study/workspace.js` grava `adicionadoEm` ao cadastrar. `src/catalog/metadata.js` preserva campos do registro manual ao editar. `src/reading/work-sheet.js` mostra data conhecida/ausente.
- Adicionados dez testes em `tests/home.test.mjs` e novo cenário em `tests/browser.cjs`. Realizadas 25 verificações JS isoladas PASS; **suítes Node/Playwright e QA visual não executados** por ausência de checkout via DNS; nunca interpretar isso como testes do navegador aprovados.
- Para executor local: `npm ci && npm run build && npm test && npm run test:browser`. Conferir screenshot e foco em 320, 390, 768, 1024 e 1440 px; fluxo acervo 0–4, >5, data igual, datas desconhecidas; adicionar obra, editar título, reabrir e restaurar backup sintético; verificar conflitos com filtros e busca; testar modo Firebase autenticado em ambiente autorizado, sem dados reais na PR.
- A próxima issue aberta é a #7 (leitor PDF com S Pen); iniciar pela viabilidade de PDF privado, anotações vetoriais, persistência segura e teste real no tablet antes de escolher dependência ou acessar o Drive.


## Integração da busca de catálogo — revisão (06/11/2026)

- Branch `codex/integrar-busca-sugestoes`, baseada na PR #9 `f8766eb` (que depende da PR #8 e da PR #1). Escopo: issue #2. Utiliza `src/catalog/search.js` preparado na branch paralela `codex/busca-autores-obras-sugestoes`, sem alterar essa origem.
- Uma busca no cabeçalho (também mobile). O dashboard tem botão de foco, o explorador apenas resumo da consulta e filtros. Há até seis sugestões por título/autor, teclado/toque, Enter/Escape, filtro exato de autor e respeito às facetas existentes.
- Fonte alterada: `src/catalog/search.js`, `src/catalog/explorer.js`, `src/catalog/filters.js`, `src/core/bootstrap.js`, `src/manifest.json`, `templates/index.html`, `styles/shell.css`, `styles/cloud.css`, `styles/dashboard.css`, `styles/catalog.css`; testes `tests/search.test.mjs`, `tests/filters.test.mjs`, `tests/browser.cjs`.
- Checks: sintaxe JS + contratos estáticos e 5 validações funcionais isoladas PASS. Gates **pendentes**: `npm ci`, `npm run build`, `npm test`, `npm run test:browser`; verificar mobile 320–900 px, foco na combobox e na ficha, posição das sugestões, navegação por teclado, acessibilidade com leitor de tela, consulta vazia, status sem resultado e acervo real em ambiente privado.
- Próximo plano UX independente: #4 (página inicial com até cinco inclusões recentes, sem datas inventadas). PDF/S Pen #7 depende de viabilidade técnica e tablet real. Não fazer merge/deploy sem validação e autorização.


## Continuação atual — filtros recolhidos (06/11/2026)

- Branch `codex/filtros-recolhidos-subarea-unica` baseada na PR #8, commit inicial `748f4a7`; altera **somente** a experiência de filtragem da issue #3, em PR independente e encadeada.
- Arquivos: `templates/index.html`, `src/catalog/explorer.js`, `src/catalog/filters.js`, `src/core/bootstrap.js`, `styles/catalog.css`, `tests/filters.test.mjs`, docs.
- Painel recolhido, seleção única de subárea e chips removíveis; categoria, status, tags e subárea combinam em AND. O metadado e o estado persistido são preservados. `getCatalogFacetedWorks()` está disponível para reaproveitamento na busca.
- A branch `codex/busca-autores-obras-sugestoes` já continha `src/catalog/search.js` e não foi alterada: coordenar integração posteriormente, sem sobrescrever trabalho paralelo.
- PASS em 10 verificações V8 de comportamento e sintaxe. PENDENTE: `npm ci && npm run build && npm test && npm run test:browser`, QA visual 320/390/768/1024/1440, teclado e leitor de tela. Evitar merge/deploy antes da validação.
- Nenhuma versão instalada, banco, acervo real ou projeto Firebase foram modificados.


## Trabalho corrente — revisão da interface (06/11/2026)

- Branch: `codex/ux-ficha-compacta-referencias`, derivada da PR #1 (`f67f709`). Escopo autorizado: **iniciar implementação** das issues #6 e #5, separadamente da PR atual; não autoriza merge/deploy nem alterar banco/Drive.
- Mudanças: ficha compacta com ações principais e detalhes recolhidos; notas/citações passam pelo caderno; remoção de cópia ABNT presumida, preservando referências existentes; aviso quando referência ausente; foco/teclado e links válidos.
- Arquivos centrais: `templates/index.html`, `styles/dialogs.css`, `src/reading/work-sheet.js`, `src/ui/dialogs.js`, `src/catalog/collections.js`, `src/study/legacy-form.js`, `src/study/notebook.js`, `src/study/records.mjs`, `tests/work-sheet.test.mjs`.
- Verificações reais nesta sessão: análise estática/sintática e 12 verificações simuladas de comportamento. Ambiente remoto não forneceu checkout executável; `npm run build`, `npm test` e `npm run test:browser` **não** foram executados. Executá-los com Node 22, observar a ficha no navegador e revisar focos/atalhos e operações físicas/digitais antes de aprovar a PR.
- Próximas entregas independentes: busca e sugestões (#2), filtro de subáreas (#3), cinco obras e metadados de inclusão (#4), e investigação do leitor S Pen (#7). Esta branch não modifica o leitor.


- Atualização 0.3.0: registros compactos e documento ordenado com downloads Word/PDF/Markdown implementados, conforme DECISION-002. Domínio e UI em `src/study/`; geração com dependências fixadas e fonte OFL em `assets/fonts/`.
- Validação atual: 11 testes de domínio e 1 fluxo Chromium; Word estruturalmente verificado, PDF curto/longo renderizado. A renderização visual do DOCX depende de LibreOffice/Word e não foi executada neste ambiente. Detalhes em VALIDATION.

- Objetivo: código modular versionado para revisar mudanças antes de alterar o aplicativo principal.
- Repositório: `christianhpo-star/Biblioteca_Christian`; branch `codex/modularizar-biblioteca`.
- Base: `a8ca14b4d28e4203e7a3506252fb17f50ee8dae9`. O commit entregue consta da PR e do histórico Git.
- Autorização: pedido de Christian em 06/11/2026, registrado em DECISION-001. Não inclui merge nem deploy.
- Fonte: `src/`, `styles/`, `templates/`; ordem em `src/manifest.json`. Dados demonstrativos em `data/demo.json`.
- Acervo privado: importado apenas localmente em `private/`, ignorado pelo Git. Configurações pessoais não foram copiadas. A última saída `dist/` contém a demonstração sintética.
- Comandos: `npm ci`, `npm run build`, `npm test`, `npm run test:browser`, `npm start`.
- Evidências e limites: VALIDATION e STATUS.
- Próxima ação: revisar a PR e experimentar a prévia da branch; decidir separadamente quando incorporar à principal e substituir a aplicação em uso.
