# Retomada

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
