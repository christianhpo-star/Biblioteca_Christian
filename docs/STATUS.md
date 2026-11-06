# Estado — 06/11/2026

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
