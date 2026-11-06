# Estado — 06/11/2026

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
