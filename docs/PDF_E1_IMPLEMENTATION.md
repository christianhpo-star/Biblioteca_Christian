# PDF E1 — leitura interna com PDF.js e S Pen temporária

Data: 07/11/2026. Implementação experimental referente à issue #7.
Branch: codex/pdf-e1-integrated-pen-pages (derivada da demonstração pública existente).
Sem merge, deploy ou alteração do acervo pessoal nesta entrega.

## Evidência do aparelho

No Samsung, a área de diagnóstico E0 reconheceu a caneta e permitiu desenhar.
O PDF não apareceu no iframe, mas "Ver PDF em outra aba" abriu no visualizador Google PDF,
que não expõe ao aplicativo os eventos distintos de caneta e dedo. O caminho externo
não resolve o requisito de leitura e escrita integradas.

## Solução E1/E2 temporária

- PDF.js 6.5.438 (Apache-2.0), distribuído **pela própria hospedagem**:
  build copia pdf.min.mjs e pdf.worker.min.mjs, além da licença.
  O npm pack é fixado na versão; o tarball é mantido apenas em cache de node_modules.
  Build e teste no GitHub Actions usam npm; o leitor do tablet não baixa código de CDN.
- Escolher PDF local com seletor explícito. Após validar assinatura, carregar bytes
  em memória com PDF.js, sem enviar PDFs ao Drive, Firebase ou terceiros.
  PDF remoto/privado continua sendo somente link externo.
- PDF renderizado em canvas por página, incluindo renderização sob demanda e descarte
  de pixels de páginas distantes (até seis canvases pintados), enquanto os traços
  continuam num SVG sobre a respectiva página durante a sessão.
- Dedo (pointerType touch): rolagem na área das páginas; gesto de dois dedos muda
  zoom ao soltar. S Pen (pointerType pen): desenha automaticamente; marca-texto,
  borracha e desfazer disponíveis. O mouse pode desenhar apenas se permitido no
  painel de teste. Anotações retêm coordenadas de página na memória ao mudar o zoom.
- Toques de dedo enquanto a caneta está escrevendo são ignorados por heurística,
  mas a **rejeição da palma não é garantida** no navegador Android.
- O botão de abrir PDF em outra aba continua como fallback, não como interface
  de edição. O iframe legado permanece oculto e não recebe PDF.
- Ao sair, trocar arquivo ou recarregar, os riscos e os bytes do PDF são
  descartados. **Não há autosave, exportação, sincronização ou edição do PDF original.**
  Não chamar esses traços de "salvos".

## Limites explícitos

- Até 50 MB e 500 páginas nesta prova de viabilidade; erros e PDFs protegidos
  devem exibir aviso e permitir abrir externamente.
- O gesto de pinça aplica o novo zoom ao soltar os dedos; ainda não é uma
  ampliação visual contínua equivalente ao Samsung Notes.
- Não há pressão variável no traço nem conversão do sistema nativo de caneta.
- Não implementa acesso a bytes de PDFs privados do Drive, novos escopos OAuth,
  upload, edição do arquivo, IndexedDB, backup ou exportação de PDF anotado.
- A publicação anterior E0 continua funcionando no GitHub Pages até autorização
  separada para atualizar a demonstração com o novo leitor.

## Como validar no Samsung depois de disponibilizar a PR

1. Acesse a versão de teste HTTPS atualizada; confirme que não está vendo a
   versão anterior do PWA (atualize/recarregue o navegador).
2. Selecione um PDF sintético com 2–5 páginas pelo botão Escolher PDF deste dispositivo.
3. Confirme que a primeira página aparece *dentro da Biblioteca* sem usar outra aba.
   Se falhar, registre o texto exato de status do leitor e o navegador.
4. Deslize com um dedo: o PDF deve rolar sem criar linhas.
5. Risque com a S Pen sobre o texto: a linha deve surgir sobre a mesma página,
   sem abrir o visualizador Google.
6. Teste marca-texto, borracha, desfazer, ampliar 120% e alternar páginas.
   As linhas já feitas devem continuar na posição correta.
7. Faça uma pinça com dois dedos e solte: a escala deve ser atualizada.
8. Apoie a palma enquanto escreve, observando deslocamentos ou riscos involuntários.
   O teste registra o comportamento real, não garante rejeição de palma perfeita.
9. Feche e reabra. Os riscos **devem desaparecer** nesta versão sem armazenamento.
10. Repita no Chrome Android, Samsung Internet e na PWA, se utilizada.
    Não anexe PDFs pessoais, links privados nem screenshots com trechos reais
    a issues públicas ou relatórios automatizados.

## Próximas decisões antes de E3

- PDF escolhido localmente versus documento vinculado em Drive; fluxos de permissão.
- Identidade estável e cache do documento, armazenamento vetorial IndexedDB,
  limites e estratégia de backup/sincronização.
- Autosave consistente (inclusive perda de foco), exportação como **novo PDF
  anotado** sem sobrescrever o original, conflito e recuperação.
- QA real de pressão, palm rejection e latência; UX/zoom contínuo e virtualização
  para documentos acadêmicos longos.

## Gates de release

- npm ci; npm run build com config/tablet-preview.json e data/demo.json;
  npm test; npm run test:browser; node scripts/prepare-tablet-preview.mjs;
  node scripts/verify-tablet-preview.mjs.
- A action .github/workflows/pdf-e1-quality.yml **não faz deploy**.
- Criar/revisar PR sobre codex/tablet-e0-public-preview.
- Não atualizar GitHub Pages nem mesclar sem autorização e evidência dos testes.
