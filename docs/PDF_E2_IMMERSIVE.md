# PDF E2 — leitura imersiva e correção de formas com S Pen

Data: 7 de novembro de 2026.
Base: \`codex/pdf-e1-integrated-pen-pages\` (PR #14).
Branch: \`codex/pdf-e2-immersive-shapes\`.
**Esta é uma alteração de código em PR. Não faz deploy ou merge.**

## Objetivo de UX

A validação do E1.1 no Samsung mostrou que o PDF abre e que é possível escrever dentro da Biblioteca.
A tela ainda apresentava muitos controles e textos, reduzindo a área de leitura. O objetivo do E2
é aproximar a ergonomia de leitores de anotações, como Samsung Notes, sem reivindicar
reprodução idêntica do comportamento nativo.

## Comportamento implementado

- Leitor ocupando a janela. Cabeçalho curto com **Voltar**, nome do arquivo, página atual e **Mais opções**.
- PDF centralizado sobre fundo cinza claro; os controles de anotação aparecem em uma
  **barra flutuante inferior**, com ícones e rótulos compactos.
- Menu de três pontos reúne **Trocar PDF**, link original do Drive quando disponível,
  fallback externo, **Limpar todos os riscos temporários**, ocultar a barra e
  abrir o diagnóstico da S Pen. O diagnóstico permanece oculto por padrão.
- O botão de ocultar ferramentas libera mais espaço; a ferramenta pode ser reaberta
  pelo botão flutuante. Ao fechar o documento, a barra e o estado voltam ao início.
- A barra contém **Caneta**, **Marca-texto**, **Borracha**, **Formas**, **Desfazer**,
  **Refazer** e zoom. Os atalhos de teclado e foco do diálogo continuam disponíveis.
- Ao escolher **Formas**, surge um pequeno seletor:
  - **Auto**: endireita linhas quase retas ou reconhece retângulos e elipses fechados,
    quando o gesto tem características suficientemente claras. Gestos ambíguos continuam livres.
  - **Linha reta**: liga diretamente o início e o fim do gesto, mesmo que a mão oscile.
  - **Retângulo**, **Elipse/círculo**, **Triângulo**: transformações explícitas usando
    a área delimitada pelo gesto.
- A conversão acontece **ao soltar a S Pen**. Formas e traços usam coordenadas do PDF;
  continuam na mesma página durante o zoom. Borracha procura o contorno já corrigido.
- O histórico de desfazer/refazer abrange adição, exclusão e limpeza, inclusive formas.
  Novo gesto depois de desfazer invalida o ramo de refazer.
- Dedo continua navegação/zoom, S Pen continua anotação. A rejeição de palma permanece
  **heurística** e precisa ser testada no hardware real.

## Arquivos de código e arquitetura

- \`templates/index.html\`: leitor compacto, menu e barra inferior com os mesmos IDs
  relevantes preservados.
- \`styles/pdf-prototype.css\`: regras E2 de layout responsivo, modo de leitura ativo,
  ferramentas flutuantes, menu, contraste/foco e redução de movimento.
- \`src/reading/pdf-prototype.js\`: troca entre tela de seleção e modo imersivo,
  menu, diagnóstico, troca de PDF, esconder/mostrar barra.
- \`src/reading/ink-shapes.js\`: matemática pura, sem rede e sem dados pessoais, para
  endireitar e reconhecer formas; retorna um caminho SVG e pontos do contorno.
- \`src/reading/pdf-pages.js\`: seleção da ferramenta e modo de formas, aplicação do
  caminho SVG na página e histórico reversível.
- \`src/manifest.json\`: insere o módulo de geometria antes do leitor de páginas.
- Testes: \`tests/ink-shapes.test.mjs\`, \`tests/pdf-pages.test.mjs\`,
  \`tests/pdf-prototype.test.mjs\`, \`tests/browser.cjs\` e
  \`scripts/verify-tablet-preview.mjs\`.
- \`.github/workflows/pdf-e2-quality.yml\`: compila a demo fictícia, testa Node e
  Chromium, verifica privacidade e captura a interface em 390 e 1024 px. **Não publica**.

## Testes e limitações

Execução [42336779898](https://github.com/christianhpo-star/Biblioteca_Christian/actions/runs/42336779898):
**68/68 testes Node aprovados**, Playwright **1/1**, validação sintética em
390 e 1024 pixels, guard da demo pública e ausência de PDFs reais: PASS.

Falhas de desenvolvimento corrigidas antes desse PASS:
1. Um círculo no modo automático foi interpretado como retângulo; a detecção de
   retângulo passou a exigir passagem pelos quatro cantos.
2. Ao simplificar o menu, o elemento \`pdfInkClear\` deixou de existir, interrompendo a
   inicialização do leitor. A ação foi mantida no menu, e todos os IDs usados pelos
   listeners foram conferidos.

As capturas geradas automaticamente **não substituem a inspeção visual e o teste físico**.
A branch não está publicada no GitHub Pages; o site público atual continua E1.1.

## Como homologar no Samsung, quando a demo E2 for publicada

1. Abrir o site de teste com **dados fictícios**, preferencialmente no Chrome externo,
   em vez do navegador embutido do ChatGPT.
2. Escolher um PDF sintético de várias páginas. Confirmar que a folha ocupa a maior parte
   da tela e que o cabeçalho mostra apenas título, página e menu.
3. Testar leitura com o dedo, zoom, orientação e barra flutuante inferior.
4. Selecionar **Formas → Linha reta** e desenhar uma linha torta com S Pen:
   ao levantar a ponta deve virar uma linha reta.
5. Testar **Formas → Auto** com linha quase reta, círculo e retângulo,
   comparando reconhecimento automático e traços ambíguos.
6. Testar opções explícitas Retângulo, Elipse e Triângulo, borracha, Desfazer e Refazer.
7. Ampliar/reduzir zoom; confirmar que formas e tintas permanecem alinhadas à página.
8. Apoiar a palma enquanto escreve e verificar interrupções ou deslocamentos.
   Não prometer rejeição perfeita, nem equivalência com Samsung Notes.
9. Trocar o PDF e reabrir; **todos os riscos devem desaparecer** neste protótipo,
   pois a gravação ainda não está implementada.

## Restrições

- Nenhum PDF, anotação, traço ou identificação de documento é enviado, sincronizado
  ou salvo no estado da Biblioteca ou no Drive nesta etapa.
- Não há exportação, autosave, arquivo anotado permanente ou integração com o caderno.
- Não houve mudança de Firebase, OAuth, banco, permissões nem dependência comercial.
- A publicação depende de autorização separada e de testes finais sobre o commit aprovado.
