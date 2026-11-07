# Leitor de PDF e S Pen — E0: viabilidade e experimento

Data: 06/11/2026. Issue #7. Situação: protótipo de leitura local, ainda NÃO homologado no tablet; não há decisão de biblioteca, banco ou integração.

## Motivação

O catálogo referencia livros digitais por links, inclusive links privados do Drive. Um link de visualização não garante acesso autenticado aos bytes do PDF dentro de uma página. A página renderizada pelo visualizador nativo também não fornece coordenadas estáveis para desenhar sobre cada página e recuperar os traços depois de zoom ou rotação. Sobrepor um canvas a um iframe não seria uma solução correta para anotações duráveis.

## Comparação de alternativas

| Alternativa | Vantagens | Restrições | Situação |
| --- | --- | --- | --- |
| Visualizador nativo dentro de iframe, arquivo local via blob | Nenhuma dependência adicional, leitura de PDF local e fallback em nova aba | O suporte móvel varia; páginas, zoom e scroll pertencem ao visualizador e não são controlados pela app | Implementado apenas como teste E0 |
| PDF.js com páginas renderizadas | Controle das páginas e coordenadas, oportunidade de camada vetorial por página e navegação própria | Nova dependência/worker; maior bundle; renderização, memória, offline e manutenção exigem testes | Candidato à implementação E1/E2, depende de aprovação |
| Abrir Google Drive no navegador/app | Reaproveita permissões e ferramentas de anotações nativas existentes | Navegação e gravação fora da biblioteca; iframe privado pode ser bloqueado; não fornece traços para o webapp | Fallback preservado |
| Samsung Notes nativo | Ergonomia de caneta e recursos específicos do aparelho | Não é uma solução integrada ao navegador; exportação e sincronização dependem de fluxo externo | Alternativa enquanto escrita web não for validada |

Fontes oficiais consultadas: PDF.js https://mozilla.github.io/pdf.js/getting_started/ ; MDN Pointer Events https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events ; Google Drive downloads https://developers.google.com/workspace/drive/api/guides/manage-downloads .

## Implementação reversível E0 nesta branch

- Tela isolada para escolher PDF salvo no aparelho; validação básica da assinatura PDF, visualização pelo navegador e opção Ver PDF em outra aba. Não são buscados nem enviados arquivos remotos.
- O link HTTP(S) associado à obra é mostrado somente como Abrir original no navegador; links de protocolos inseguros não entram nesse campo.
- URL de arquivo local temporária revogada ao trocar, fechar e sair da página. Arquivos não entram no estado da biblioteca, backup ou sincronização.
- Área opcional separada do PDF para verificar eventos de S Pen: tipo de ponteiro pen/touch/mouse, pressão reportada, cancelamento. Caneta pode desenhar no canvas de teste; toque é contado sem desenhar; mouse só após habilitação explícita.
- O diagnóstico não é escrita sobre o PDF, não salva dados e não comprova rejeição de palma ou latência equivalente ao Samsung Notes.
- Atalho de teste na ficha da obra (digital ou com link) e na área avançada do dashboard; mantém o botão Abrir texto externo.
- Sem novas dependências, API, OAuth, alterações de dados, migração ou publicação.

NÃO implementado: desenho sobre páginas, marca-texto/borracha, autosave, exportação de PDF anotado, persistência, zoom/paginação controlados, carregamento de PDF privado dentro da app, integração com o caderno ou garantia de rejeição da palma.

## Roteiro de teste real no Samsung

1. Testar PDF curto sintético em Chrome Android, Samsung Internet e PWA: arquivo local, rolagem com dedo, zoom e retorno. Caso o PDF fique em branco dentro da tela, usar Ver PDF em outra aba e registrar o navegador/modelo.
2. Testar PDF sintético longo (50–100 páginas), retrato/paisagem, rolagem, abertura e saída, tela de 320/390/768/1024/1440 px. Verificar memória e travamentos. Não publicar capturas ou dados de arquivos privados.
3. Expandir Testar S Pen e toque. Riscar com a caneta, observar se o navegador relata pen e pressão variável. Depois tocar com dedo e apoiar palma, registrando eventos touch e cancelamentos. Teste não valida automaticamente palm rejection.
4. Abrir e fechar leitor a partir de ficha de obra e painel de início; verificar retorno de foco. Ao reabrir, arquivo deverá ser escolhido novamente e traços do teste desaparecem.
5. Testar arquivo vazio, arquivo que não é PDF e PDF protegido. Confirmar fallback útil e ausência de upload.
6. Para Drive privado, usar somente a abertura externa existente. Não requisitar novos escopos nem acessar arquivos reais para teste automatizado.

## Pendências de decisão antes de E1/E2/E3

- Aprovação de PDF.js/worker e versão fixada, após comparação de licenças, tamanho, performance e offline.
- Armazenamento de traços vetoriais por documento/página: avaliar IndexedDB com identidade estável do arquivo, coordenadas normalizadas, limites, backup e restauração. Não colocar PDFs, imagens ou grandes traços no appState atual (limite de 700 mil caracteres).
- Acesso aos bytes de arquivos privados no Drive requer escopos e autorização específicos, sujeitos a avaliação; o E0 não os altera.
- Exportação em cópia nova do PDF e escrita de volta no Drive dependem de decisão separada; proibir sobrescrita silenciosa.
- Homologação real da S Pen, eventos de toque, palma e fluidez no tablet antes de chamar a experiência de equivalente ao Samsung Notes.

## Gates técnicos

- [ ] Rodar npm ci, npm run build, npm test e npm run test:browser em checkout Node 22.
- [ ] Validar visual no navegador e em tablet, PDFs curtos e longos, modo offline, teclado e foco.
- [ ] Comprovar que nenhum conteúdo privado ou resultado do teste foi gravado em estado, rede ou repositório.
- [ ] Registrar decisão de dependência/persistência antes de implementar anotações sobre as páginas.

Nesta sessão foram feitas verificações sintáticas e simulações isoladas de JavaScript. As suítes completas, o teste real com PDF no navegador e a homologação S Pen no Samsung NÃO foram realizados. Sem merge ou deploy.
