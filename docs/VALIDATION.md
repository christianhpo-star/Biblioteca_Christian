# Validação da versão 0.2.0

## Atualização validada 0.3.0 em 06/11/2026

- `npm run build`: PASS; gera modelo compartilhado e módulo de exportação carregado quando solicitado.
- `npm test`: PASS, 11 testes; ordenação numérica/ranges/romanos, mesma página por criação, nota sem página ao final, edição, mudança de tipo sem duplicação, referência original preservada, compatibilidade com conteúdo antigo e isolamento entre obras.
- `npm run test:browser`: PASS, 1 fluxo completo; livro físico, campos inicialmente recolhidos, inclusão/edição, recuperação de rascunho após reload, busca, restauração de backup, documento ordenado e downloads reais.
- Word: arquivo ZIP/OOXML lido e conteúdo verificado, incluindo sequência de páginas, acentos e comentário. Tentativa de renderização pelo helper de documentos encontrou `LibreOffice soffice.exe was not found on PATH`; **renderização visual do DOCX não executada**. Não houve instalação de software para contornar esse limite.
- PDF: arquivo aberto pelo `pdf-lib` e PyMuPDF, renderizado e inspecionado visualmente. Cenários de 1 e 5 páginas, texto longo, palavra sem espaços e acentos. A fonte sem determinado glifo resulta em erro explícito orientando exportar Word; nada é omitido silenciosamente.
- Interface: capturas `document-desktop.png`, `document-mobile.png`, `records-mobile.png` inspecionadas; sem overflow no cenário documentado em 320, 390, 768, 1024 e 1440 px.
- Falha de quota simulada: escrita permanece na tela e a entrada não fecha até o salvamento voltar a funcionar.
- Dados e arquivos de teste são sintéticos e permanecem em `test-results/`, fora do Git. Teste autenticado, tablet/caneta/leitor de tela e deploy continuam pendentes.

## Histórico da modularização 0.2.0

Data: 06/11/2026. Ambiente: Windows, PowerShell, Node.js v24.19.0. Código testado na branch `codex/modularizar-biblioteca`; o commit exato consta da PR. Todos os testes de navegador usam dados sintéticos.

| Verificação | Resultado | Evidência / alcance |
| --- | --- | --- |
| Instalação pelo lockfile | PASS | `npm ci --ignore-scripts`; dependências instaladas no checkout isolado |
| Demonstração modular | PASS | `npm run build`; três obras fictícias, scripts e CSS externos |
| Estado, caderno e merge | PASS | `npm test`: sete testes; cadastro físico, preservação da base, salvamento, rascunho, exportação, esquema e mudanças concorrentes |
| Fluxo real de navegador | PASS | `npm run test:browser`: um teste em Chromium; cadastro físico, escrita, citação com página, download Markdown, reload, busca na escrita e restauração de backup |
| Responsividade do cenário | PASS | Sem overflow horizontal da página/caderno em 320, 390, 768, 1024 e 1440 px com movimento reduzido |
| Conferência visual | PASS parcial | Capturas desktop 1440×1000 e celular 390×844 inspecionadas; caderno com campos, botões e áreas de escrita. Capturas sintéticas geradas em `test-results/`, não versionadas |
| Importador do catálogo existente | PASS | Importou 137 obras e a base de fichamentos para `private/catalog.json`; build e sintaxe do payload verificados. O diretório permanece fora do Git e a demonstração foi regenerada depois |
| Compilação do Firebase | PASS | Build com `config/firebase.example.json` e `node --check dist/cloud.js`; não acessa contas reais |
| Auditoria de dependências | PASS | `npm audit`: zero vulnerabilidades reportadas após fixar a transitiva `@grpc/grpc-js` em 1.13.6 |
| Login e sincronização reais | NÃO EXECUTADO | Configuração da conta e backend de produção não utilizados |
| Tablet, caneta e leitor de tela | NÃO EXECUTADO | Não houve sessão em dispositivos reais nem avaliação com tecnologia assistiva |
| Escrita de arquivos no Drive | NÃO IMPLEMENTADO | A exportação é um download local |
| Deploy / substituição do aplicativo principal | NÃO EXECUTADO | Fora do alcance deste envio de código |

Um teste de ausência de overflow não comprova acessibilidade nem valida todo o catálogo. Os módulos de handlers legados ainda compartilham estado global; a separação por responsabilidade não é uma conversão completa para ES modules.
