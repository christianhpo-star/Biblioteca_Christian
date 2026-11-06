# Validação da versão 0.2.0

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
