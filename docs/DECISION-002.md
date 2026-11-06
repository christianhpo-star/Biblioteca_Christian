# Decisão 002 — Fichamento por registros e documento para download

- Autor da aprovação: Christian Oliveira; data: 06/11/2026.
- Evidência: aprovou a prévia com referência recolhida, anotações e trechos opcionais por registro; confirmou documento contínuo por ordem de página com download Word e PDF; pediu “Isso vamos adicionar isso”.
- Alcance: substituir a área longa do fichamento pelo fluxo aprovado, permitir edição dos registros, documento de leitura e downloads locais reais em `.docx`, `.pdf` e Markdown.
- Dados: conservar `notas`, `citacoes` e `fichamentos`; adicionar apenas metadados de página/criação e um rascunho opcional dentro de cada fichamento. Não executar migração de backend nem apagar conteúdo anterior.
- Compatibilidade: notas antigas e o campo livre são exibidos pelos adaptadores sem conversão; campos estruturados anteriores permanecem recolhidos e entram como apêndice quando salvos pelo usuário. A referência da base continua acessível mesmo depois da criação de rascunhos.
- Ordenação: páginas numéricas e intervalos pelo primeiro número; preliminares romanas antes das páginas arábicas; entradas da mesma página pela criação quando disponível, com ordem estável para dados antigos; registros sem página ao final. Trecho e comentário constituem um registro único.
- Implementação: modelo puro compartilhado entre leitura e exportações; `docx` 9.15.2, `pdf-lib` 1.17.1 e `@pdf-lib/fontkit` 1.1.1 para geração no navegador. Fonte Noto Sans Regular sob OFL, com licença preservada. Sem servidor novo, assinatura ou envio dos textos a terceiros.
- Recuperação: rascunho automático separado dos registros guardados; falha de armazenamento mantém a escrita na tela e bloqueia a saída. Não incluir rascunhos silenciosamente no documento.
- Limites: atualização da branch e PR existente; não inclui merge, deploy, substituição do catálogo em uso nem gravação direta no Drive.
