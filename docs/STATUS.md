# Estado — 06/11/2026

## Leitor PDF E2 em revisão — modo imersivo e formas S Pen (07/11/2026)

- Branch `codex/pdf-e2-immersive-shapes`, derivada da PR #14 sobre `codex/pdf-e1-integrated-pen-pages`. Projeto público `Biblioteca_Christian`, sem merge/deploy nem alterações nos PDFs pessoais.
- Com base no teste de leitura E1.1 do usuário no Samsung, a UI do leitor foi refeita com PDF como área principal, cabeçalho compacto, botão de três pontos, página atual e dock flutuante inferior com ícones. O quadro de diagnóstico fica escondido por padrão, acessível pelo menu.
- Modo **Formas**: opções Auto (corrige gestos confiáveis), Reta, Retângulo, Elipse e Triângulo; o traço é transformado ao tirar a S Pen da tela. `src/reading/ink-shapes.js` contém a geometria pura, o `pdf-pages.js` vincula forma/contorno a cada página, mantém tinta no zoom e suporta **Desfazer/Refazer**. A borracha trabalha nos pontos da forma corrigida.
- A seleção de PDF local, fallback externo e a distinção pen/touch do E1 permanecem. Não há persistência: todos os riscos são temporários e descartados ao sair/trocar PDF. PDF e dados privados não são enviados.
- UX responsiva e acessibilidade: foco visível, barra escondível e reabertura, `aria-pressed` para ferramentas, seletor de formas e menu de opções. Verificar ergonomia, pressão e rejeição de palma no tablet real; automação não comprova esse comportamento.
- QA: [run 42336779898](https://github.com/christianhpo-star/Biblioteca_Christian/actions/runs/42336779898) **PASS** com 68/68 Node, Playwright 1/1, verificação sintética em 390 e 1024 px e guard de privacidade. Ciclos anteriores identificaram e corrigiram reconhecimento incorreto de círculo e ausência do botão `pdfInkClear`. Capturas sintéticas passam a ficar disponíveis como artefato de CI para inspeção visual.
- Documentação e roteiro em `docs/PDF_E2_IMMERSIVE.md`. Este trabalho **não foi publicado** em GitHub Pages; a demonstração pública ainda é E1.1.


## QA automatizado do PDF E1 concluído — 07/11/2026

- **GitHub Actions PASS**: [execução 42334160948](https://github.com/christianhpo-star/Biblioteca_Christian/actions/runs/42334160948), commit `25def8d0a5583cee339449605adab796f9d39229` da branch `codex/pdf-e1-integrated-pen-pages`, sem deploy.
- `npm ci` e build com PDF.js 6.5.438 e worker locais: PASS. `npm test`: **55 testes, 55 aprovados, 0 falhas**. `npm run test:browser`: **1 fluxo completo, aprovado**. `scripts/prepare-tablet-preview.mjs`: PASS no guard de dados sintéticos sem Firebase/Drive privado. `scripts/verify-tablet-preview.mjs`: PASS nos viewports 1024×768 e 390×844, duas páginas geradas com dados fictícios, SVG com pen simulado, touch sem tinta, zoom e fallback externo. Guard de conteúdo privado: PASS.
- O primeiro browser test havia falhado com MIME `.mjs` incorreto do servidor (`application/octet-stream` com `nosniff`); corrigido em `scripts/serve.mjs` para `text/javascript`, validado pela execução acima. Cache de serviço atualizado.
- **Não comprovado**: rejeição da palma e precisão/latência da S Pen no Samsung real. O ambiente público do GitHub Pages **ainda publica o E0**, não o E1. PR #14 aberta como rascunho; nenhum merge ou deploy desta versão executado.
- Screenshots foram gerados durante o teste de navegador, mas não foram submetidos à revisão visual humana nesta sessão. O QA presencial no tablet continua necessário antes de afirmar equivalência com Samsung Notes.


## E1 em desenvolvimento — PDF.js com tinta temporária por página (07/11/2026)

- Relato confirmado no Samsung: quadro separado de diagnóstico S Pen funciona; PDF embutido em iframe não aparece; fallback Google PDF abre, mas não permite à Biblioteca separar caneta e dedo. O leitor E0 não está homologado para Android.
- Branch de implementação `codex/pdf-e1-integrated-pen-pages`, criada a partir do commit `f689dfa4faeb062364265b42f1d7edc8162ff7c7` da PR #13, sem alterar a branch de publicação ou a `main`.
- Novo renderizador `src/reading/pdf-pages.js`: PDF local por página com PDF.js 6.5.438 e worker da mesma origem, sem iframe; tela móvel com toolbar de caneta/marca-texto/borracha/desfazer/zoom; S Pen desenha num SVG vinculado à página e dedo usa rolagem/pinça. Até seis canvases pintados simultaneamente; riscos só na memória e apagados ao sair.
- `scripts/vendor-pdfjs.mjs` obtém pacote npm de versão fixa na compilação e copia os dois arquivos precompilados, licença, sem CDN no navegador; `scripts/build.mjs` inclui os arquivos no cache do service worker. `scripts/serve.mjs` corrigido para servir `.mjs` com JavaScript MIME (o bloqueio causou falha no primeiro teste de Chromium).
- Mantidos seleção local, fallback `Ver PDF em outra aba`, link Drive externo, diagnóstico separado e dados fictícios. Nenhum upload, mudança Firebase, persistência de traços, migração, exportação ou edição do PDF real. Limite de teste: PDFs de até 50 MB e 500 páginas.
- Testes adaptados em `tests/pdf-prototype.test.mjs`, `tests/pdf-pages.test.mjs`, `tests/browser.cjs`, `scripts/verify-tablet-preview.mjs`. Workflow `.github/workflows/pdf-e1-quality.yml` executa build e testes na branch **sem deploy**. `docs/PDF_E1_IMPLEMENTATION.md` descreve roteiro de homologação no Samsung.
- **Verificação real inicial:** GitHub Actions run 42333943652 — build e testes Node PASS; primeiro teste de navegador FAIL por timeout de página, investigado e encontrado problema de MIME para `.mjs` no servidor de desenvolvimento. Correção gravada; acompanhar novas execuções e não declarar Chromium/tablet validados antes de PASS real.
- A demonstração pública anterior no GitHub Pages permanece E0. A branch E1 não foi publicada nem mesclada. Autorização de publicação de uma nova versão ainda depende de verificação e aceite.


## Prévia pública publicada e verificada

- **URL HTTPS real:** https://christianhpo-star.github.io/Biblioteca_Christian/ — HTTP 200, verificada pelo script contra a publicação, em 1024×768 e 390×844.
- **Execução de publicação aprovada:** [42332359060](https://github.com/christianhpo-star/Biblioteca_Christian/actions/runs/42332359060), SHA `87fd2673e05aa976e614087e6a17eae261ba94af`, branch `codex/tablet-e0-public-preview`. Jobs de validação e deploy concluídos com `success`.
- PASS no site real: somente três obras fictícias, busca, filtros, abertura do PDF sintético de duas páginas, fallback em outra aba, retorno, revogação do blob, preservação do estado e ausência de uploads. Nenhum erro JavaScript nem recurso JS/CSS ausente nos cenários testados. Relatório e capturas locais em `test-results/tablet-preview-live.*` e `test-results/tablet-preview-live-*.png` (não versionados).

- Checkout de revisão isolado a partir de `99415db16d2cdf3fd86b226b8572e963aab38df1`; checkout principal e demais PRs preservados. Destino de publicação: `codex/tablet-e0-public-preview`, PR #13, sem merge.
- Reproduzidas as quatro falhas da execução [42331503144](https://github.com/christianhpo-star/Biblioteca_Christian/actions/runs/42331503144). Corrigidas as fixtures: ficha carrega sua dependência real `repository.js`; seletores da busca começam na opção `all`, como no HTML. Nenhum teste removido ou desativado; leitor E0 inalterado.
- PASS local com Node **22.23.4**: `npm ci`, build com `config/tablet-preview.json`/`data/demo.json`, **50 testes Node**, instalação Chromium, **1 fluxo completo de navegador**, reconstrução e guard de privacidade.
- Novo gate `scripts/verify-tablet-preview.mjs`: artefato final em 1024×768 e 390×844, três obras fictícias, busca/filtros, PDF sintético de duas páginas, fallback em outra aba com iframe ocultado, retorno, revogação da URL blob, estado preservado, ausência de uploads, erros JS ou JS/CSS ausentes. Capturas locais conferidas; o Chromium completo renderizou o PDF. A simulação não comprova funcionamento Android ou S Pen física.
- Pages já estava habilitado via Actions. O ambiente permitia apenas `main`; após autorização específica do proprietário, acrescentada **somente** a branch `codex/tablet-e0-public-preview`, preservando a regra `main` e as demais proteções.
- O artefato contém somente a demonstração sintética. Não foram importados PDFs, fichamentos, links privados, backups ou credenciais; Firebase/Drive de produção não foram configurados.
- A PR #13 continua draft, aberta e sem merge. A demonstração foi publicada, mas S Pen física, latência, navegação Android e rejeição da palma seguem pendentes de teste no Samsung. O diagnóstico desenha em quadro separado e não anota páginas do PDF.

## Preparação de publicação controlada — demonstração E0 no tablet (sem deploy confirmado)

- O usuário solicitou disponibilizar o projeto na internet para testar no Samsung. Escopo desta autorização: **prévia pública com dados sintéticos, isolada**; não é autorização para publicar acervo real, substituir produção, migrar dados, mudar autenticação ou mesclar PRs.
- Branch `codex/tablet-e0-public-preview` derivada da PR #12, commit base `25cceb4c7fb403df67e7de35f120480460631673`, sem alterar as branches anteriores.
- Hospedagem escolhida para teste: **GitHub Pages por GitHub Actions**, com build público apenas de `data/demo.json` (três obras fictícias), `config/tablet-preview.json` (modo local e chave exclusiva), validação em `scripts/prepare-tablet-preview.mjs` e texto de aviso no artefato gerado.
- Gatilho de publicação: workflow restrito à branch de demonstração; build, suíte Node, teste Playwright e guard de privacidade **precisam passar** antes do deploy. A pasta `dist/` continua fora do Git.
- O repositório era público e `has_pages=false` na consulta em 06/11/2026. A integração GitHub disponível não oferece alteração de configuração administrativa de Pages; o responsável deverá escolher **Settings → Pages → Source: GitHub Actions**. **Não afirmar que existe URL ativa até confirmação.**
- Teste de tablet documentado em `docs/TABLET_PUBLIC_PREVIEW.md`. O laboratório E0 continua sem anotações sobre o PDF, sem arquivos privados e sem gravação de traços; não declarar compatibilidade S Pen/palma antes de teste físico.
- Sem merge e sem configuração do Firebase pessoal. Avaliar resultado da execução de Actions e disponibilidade pública antes de declarar publicado.


## E0 em revisão — protótipo de leitura PDF local e diagnóstico S Pen (issue #7)

- Branch `codex/pdf-e0-prototipo-local-pen`, derivada de `codex/inicio-cinco-obras-recentes`, commit `339e7d511f925ab5439e648f4ad5b5779cb72789` (PR #11). PRs #1, #8–#11 seguem abertas; sem merge/deploy.
- Protótipo **experimental** e isolado: escolher PDF local, visualizar em iframe com o motor nativo do navegador, abrir em outra aba como fallback; link HTTP(S) do Drive aparece somente como alternativa externa. **Não busca PDFs privados, não os envia, não grava arquivos ou traços**.
- Diagnóstico em canvas separado das páginas: conta ponteiro pen/touch/mouse e cancelamentos, mostra pressão reportada, desenha apenas com pen (mouse opcional); comportamento não garante rejeição da palma nem escrita sobre o PDF.
- `src/reading/pdf-prototype.js`, `styles/pdf-prototype.css`, `templates/index.html`, `src/manifest.json`, `src/reading/work-sheet.js`. Ação discreta na ficha da obra (digital ou com link) e botão na área avançada do início, mantendo **Abrir texto**.
- `docs/PDF_E0_FEASIBILITY.md`: comparação nativo/PDF.js/Drive/Samsung Notes, roteiro de teste real, limites e decisões pendentes de biblioteca/armazenamento/escopos. Não foi selecionada nova dependência ou persistência.
- Testes adicionados: dez cenários em `tests/pdf-prototype.test.mjs` e cenário sintético em `tests/browser.cjs`. **Realizados:** 21 checks em ambiente JavaScript isolado com arquivos recuperados da branch, todos PASS (sintaxe, HTML/manifesto, URL local/revogação, segurança de link, caneta/touch, foco). **Não realizados:** execução completa de Node/Playwright, renderização real do PDF no navegador, teste no Samsung S Pen, avaliação de latência/palm rejection, acesso Drive privado.
- **Próximo gate**: rodar `npm ci && npm run build && npm test && npm run test:browser` no checkout local; validar visual no Samsung. Só depois decidir se E1/E2 devem usar PDF.js e persistência de traços com aprovação explícita. Nenhuma versão publicada.


## Implementação em revisão — cinco obras na entrada (issue #4)

- Branch isolada `codex/inicio-cinco-obras-recentes` baseada em `codex/integrar-busca-sugestoes`, commit `190c19c1ee8bc77e049a1f7e60ee14a4dc37c6ca` (PR #10). Não foi alterada nenhuma das branches de PRs anteriores.
- **Página inicial:** mostra até cinco cartões com título, autor, formato e situação, abertos por botão acessível; **Ver todo o acervo** limpa somente filtros de interface e abre o explorador com todas as obras, que também permite **Voltar ao início**. O dashboard anterior (indicadores, categorias, fila, Drive) segue disponível em seção **Indicadores e organização da biblioteca** inicialmente fechada.
- `getWorkAddedAtTimestamp` reconhece somente timestamp ISO válido explicitamente em `adicionadoEm`. `selectHomeWorks` ordena novas inclusões por data decrescente; empates por título/autor/ID; obras sem data são complemento alfabético no grupo **Do seu acervo — inclusão sem data registrada**. Nunca deduzir data por ID, arquivo, leitura ou ordem de importação.
- Novos cadastros físicos/digitais gravam `adicionadoEm: new Date().toISOString()`. A edição bibliográfica agora usa spread dos metadados anteriores, preservando `catalogManual`, `adicionadoEm`, `formato`, localização e link; isso evita que obras manuais desapareçam após editar. A ficha mostra a data ou **Data de inclusão não registrada**. Nenhuma obra existente recebeu carimbo inventado.
- Importação HTML em `scripts/import-local.mjs` continua copiando os objetos JSON de origem sem atribuir datas. Backup e validador de sincronização aceitam o campo opcional dentro de `metaOverrides`, sem nova coleção, migração ou mudança de backend. CSV não sofreu mudança de contrato.
- Estilos de cinco cartões e layout móvel em `styles/dashboard.css`. Casos adicionados: `tests/home.test.mjs` (dez cenários para Node, incluindo backup) e `tests/browser.cjs` estendido para prévia inicial, navegação ao acervo completo e cadastro novo.
- **Validação efetivamente executada nesta integração:** 25 verificações em JS com os arquivos recuperados da branch (sintaxe dos JS, seleção, datas válidas/inválidas, empates, preservação de edição, renderização em DOM fictício e navegação) — PASS. **Não executados:** `npm ci`, `npm run build`, `npm test`, `npm run test:browser`, screenshots/QA visual 320–1440, leitor de tela, tablet ou sincronização autenticada. `git ls-remote` no container falhou por DNS de github.com.
- Sem merge, deploy, alteração da versão em produção, acervo real ou arquivos privados. Leitor com PDF/S Pen da issue #7 segue para investigação de viabilidade e testes no Samsung real.


## Implementação em revisão — busca dinâmica por obras/autores (issue #2)

- Branch `codex/integrar-busca-sugestoes`, derivada da PR #9 (`f8766eba1281509f036f32821437de5a8eb093fa`). Importado e adaptado o módulo `src/catalog/search.js` da branch paralela `codex/busca-autores-obras-sugestoes` (commit `1e54fa0`); **a branch original não foi sobrescrita**.
- Catálogo passou a ter **uma busca principal** no cabeçalho, inclusive abaixo de 900 px. O botão no início apenas foca esse campo; o campo duplicado do explorador foi removido. A busca independente “Buscar na minha escrita” foi mantida.
- Até seis sugestões do catálogo, grupos Obras e Autores, normalização de acentos/capitalização/espaços, ordenação determinística, autora/autoria com contagem de obras, `combobox`/`listbox`, teclado (setas, Enter, Escape), fechamento ao clicar fora e abertura de ficha ou filtragem exata por autor.
- Digitação mostra sugestões imediatamente, sem troca forçada de visão no dashboard; no explorador atualiza a lista de obras em tempo real. Ao pressionar Enter sem destaque, mostra resultados; consulta vazia volta ao dashboard se não houver filtros ativos.
- Sugestões usam `getCatalogFacetedWorks()` da PR #9, respeitando área/subárea/situação/tags. Estado efêmero, sem novas dependências, serviço remoto, mudança no armazenamento ou dados reais.
- `tests/search.test.mjs`: oito casos propostos para Node; `tests/filters.test.mjs` adaptado com mais um caso de autor exato; `tests/browser.cjs` inclui cenário de teclado, sugestão e busca visível em 390 px.
- **Verificado nesta sessão:** análise de sintaxe dos JS modificados e dez contratos estáticos (PASS); cinco verificações funcionais do ranqueamento e normalização em JavaScript (PASS), além de verificações isoladas de fluxo. **Não executado via checkout real:** `npm ci`, `npm run build`, `npm test`, `npm run test:browser`, captura visual e teste com leitor de tela/tablet, pois o container não conseguiu resolver github.com. Não confundir testes adicionados com testes já executados.
- Issue #4 (cinco obras recentes) continua futura; a busca já aceita integração com essa mudança. Sem merge, deploy, migração ou alteração de PDFs e dados pessoais.


## Desenvolvimento UX em revisão — filtros simples (issue #3)

- Branch independente `codex/filtros-recolhidos-subarea-unica`, derivada do commit `748f4a7` da PR #8; sem alterar a branch de busca `codex/busca-autores-obras-sugestoes` encontrada em andamento.
- Explorador abre com campo de busca existente e botão **Filtros**. O painel recolhido abriga seletor de **uma única subárea**, Área, Situação e Ordenação; antiga nuvem de chips e controle E/OU removidos da tela principal.
- Subárea, área, situação e tags existentes se combinam com **todos os critérios exigidos**. As escolhas ativas aparecem em chips acessíveis com remoção individual e a ação Limpar filtros; os atalhos antigos por dashboard/categoria/subárea permanecem funcionais. Não foi alterado o esquema dos dados.
- Adicionado `getCatalogFacetedWorks()` para compartilhar as restrições atuais com as sugestões da futura busca (#2) sem mostrar resultados fora dos filtros. Busca de texto no explorador agora normaliza acentos.
- Estilos responsivos e comportamento de foco/Escape documentados. Novo arquivo `tests/filters.test.mjs` com cinco casos para execução no Node.
- **Validação nesta sessão:** 10 verificações de sintaxe, seleção única, composição de filtros, estados vazios, consulta sem acentos e Escape em simulação isolada (PASS). **Ainda não executado:** `npm ci`, `npm run build`, `npm test`, `npm run test:browser`, QA visual no dispositivo e acessibilidade com leitor de tela, devido à indisponibilidade do checkout remoto no executor.
- Esta alteração não inclui a busca com sugestões (#2), limite inicial de cinco obras (#4) ou leitor PDF com S Pen (#7). Sem merge, publicação ou dados reais.


## Desenvolvimento UX em revisão — ficha compacta e referências (issues #5 e #6)

- Branch isolada: `codex/ux-ficha-compacta-referencias`, baseada em `codex/modularizar-biblioteca` no commit `f67f709ac33eeae8a9ed793e756c9298bdf450c6`. A PR #1 da modularização segue independente e aberta.
- Ficha da obra reduzida a identificação, situação/favorito, **Abrir caderno** e **Abrir texto** somente com link HTTP(S) disponível. Dados da obra, leitura, coleções e relacionados são seções recolhidas. Formulários duplicados de notas e citações saíram da ficha, sem apagar conteúdo existente.
- Botões que geravam referências ABNT incompletas foram removidos da ficha e das coleções. O editor legado e o caderno deixam de fabricar referência genérica; o documento exportado indica claramente quando a referência não foi informada. Referências existentes no estado permanecem intactas.
- Foco do diálogo, Escape, Tab, favoritos, estrelas e links receberam revisões de acessibilidade; leituras relacionadas usam botões.
- Testes adicionados: `tests/work-sheet.test.mjs` (regressão de comportamento e referências). **Verificações realizadas na integração:** sintaxe JavaScript dos arquivos clássicos e 12 verificações de comportamento em simulação isolada JavaScript (PASS). **Não realizados nesta sessão:** `npm run build`, `npm test`, `npm run test:browser`, teste visual por Playwright, validação com tablet e sincronização real. A execução local integral e as capturas são gates antes de considerar a PR pronta para merge.
- Sem merge, deploy, alteração de banco/autenticação ou acesso a PDFs e dados pessoais. Issues #2–#4 e #7 continuam planejadas, sem implementação nesta branch.


## Atualização 0.3.0

- Fluxo aprovado por registros: referência e exemplar recolhíveis, anotação livre, trecho e comentário opcionais, edição e rascunho recuperável.
- Documento contínuo por ordem de página, com downloads reais Word, PDF e Markdown. Trecho e comentário sempre juntos; registros sem página ao final.
- Conteúdo anterior preservado por adaptadores, sem migração ou mudança de backend.
- PASS: 11 testes de domínio/compatibilidade e 1 fluxo completo em Chromium, incluindo downloads, conteúdo do DOCX, PDF com acentos, PDF longo de cinco páginas, erro explícito para glifo sem suporte, recuperação de rascunho/backup e falha de armazenamento.
- Conferência visual: tela desktop/celular e PDF curto/longo. DOCX validado por estrutura OOXML e conteúdo; renderização visual no Word/LibreOffice não executada, pois o renderizador não encontrou LibreOffice no ambiente.
- Envio na mesma branch/PR, sem merge, deploy ou substituição do arquivo principal.

As seções abaixo registram a base da modularização 0.2.0.

## Implementado

- Fonte separado em catálogo, leitura, estudo, navegação, armazenamento e sincronização.
- HTML estrutural sem dados, scripts ou estilos embutidos; estilos estáticos extraídos para arquivos CSS.
- Build demonstrativo reproduzível e importador de acervo para pasta privada ignorada pelo Git.
- Cadastro de obra física, escrita e citações preservados; exportação Markdown e busca no caderno.
- Contrato de backup compartilhado entre modo local e sincronização; ponte Firebase em arquivo executável separado.
- Contagem total baseada no catálogo atual, incluindo obras manuais.

## Validação

PASS: sete testes de estado/caderno/sincronização e um fluxo completo em Chromium, incluindo restauração de backup. Build com dados sintéticos, build local com 137 obras importadas e compilação do adaptador Firebase com configuração fictícia. Conferência de layout do caderno em desktop e celular; ausência de overflow nas larguras 320, 390, 768, 1024 e 1440 px no cenário testado. Evidências em VALIDATION.

## Entrega

Branch: `codex/modularizar-biblioteca`, a partir de `main` em `a8ca14b4d28e4203e7a3506252fb17f50ee8dae9`. Envio de código e PR para revisão, sem merge nem deploy. A cópia principal fora deste checkout permanece preservada. Acervo real e configurações da conta não entram no repositório público.

## Pendências

- Revisão e aprovação da PR antes de incorporar à principal ou substituir o aplicativo em uso.
- Teste autenticado de sincronização no ambiente real, sem alteração de produção neste escopo.
- Teste de uso em tablet, caneta e leitor de tela.
- Criação e atualização de arquivos no Google Drive.
- Reduzir o acoplamento global legado em uma futura etapa, se autorizado.
