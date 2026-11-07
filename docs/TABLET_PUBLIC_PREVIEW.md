# Publicação da demonstração E0 para teste no tablet

Esta página explica como publicar uma **prévia pública, exclusivamente com dados fictícios**, sem fazer merge na main, sem Firebase e sem substituir a biblioteca pessoal.

Branch de publicação: codex/tablet-e0-public-preview
Workflow: .github/workflows/tablet-preview-pages.yml
Configuração de build: config/tablet-preview.json
Catálogo permitido: data/demo.json (três obras EXEMPLO, nenhuma referência real)
Verificação obrigatória: scripts/prepare-tablet-preview.mjs

## 1. Habilitar GitHub Pages

Uma pessoa com permissão administrativa no repositório deve:

1. Abrir https://github.com/christianhpo-star/Biblioteca_Christian/settings/pages
2. Em **Build and deployment → Source**, selecionar **GitHub Actions**.
3. Manter esta demonstração apenas com os dados fictícios e sem configurar Firebase.
4. Voltar a https://github.com/christianhpo-star/Biblioteca_Christian/actions e procurar o workflow **Tablet E0 — demonstração pública e testes**.
5. Conferir a execução gerada ao enviar a branch. Se o primeiro workflow falhou porque Pages ainda não estava habilitado, usar **Re-run all jobs** nessa execução, ou fazer um novo commit na branch. Como o YAML está numa branch que não é a default, o botão manual workflow_dispatch pode não aparecer na lista até estar na default.

**Endereço previsto, não verificado:** https://christianhpo-star.github.io/Biblioteca_Christian/ . O endereço só deve ser compartilhado como ativo depois que GitHub Actions mostrar deployment concluído e o link abrir com sucesso.

Se a ação de deploy disser que o site não foi configurado, verificar a opção **Source: GitHub Actions**. Se houver regra de proteção no ambiente github-pages que permite somente a main, não enfraquecer a proteção sem avaliar; usar ambiente/estratégia apropriados com autorização específica.

Fonte oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 2. O que a automação valida

Em runner isolado com Node 22: npm ci; npm run build; npm test; instala Chromium do Playwright; npm run test:browser. Somente se todos passarem, refaz o build com configuração local de demonstração e executa o verificador de privacidade. Esse verificador:

- confere que modo é local, sem configuração Firebase, com storageKey própria;
- exige que o runtime seja exatamente igual a data/demo.json com três obras fictícias sem links/PDFs e fichamentos vazios;
- impede a presença de dist/cloud.js;
- corrige caminhos do manifesto para o subdiretório do GitHub Pages;
- acrescenta aviso de ambiente público e atalho para o teste PDF;
- gera artefato dist/ para GitHub Pages, sem incluir private/, test-results/, PDFs ou backups.

O workflow só publica se todos os gates concluírem. A disponibilidade da URL depende da configuração GitHub Pages e do resultado da execução. **Publicar a demo não significa homologar S Pen, palm rejection ou visualização de PDFs no tablet.**

## 3. Teste no Samsung

1. Acesse a URL **HTTPS efetivamente informada pelo deployment** no Chrome Android. Repita no Samsung Internet, se disponível.
2. Na faixa **Ambiente público de testes**, escolha **Abrir teste de PDF e S Pen**.
3. Escolha **um PDF sintético salvo no tablet**, preferencialmente com 2 a 5 páginas, e teste: abertura no iframe, rolagem com dedo, pinça e zoom, retrato/paisagem. Se o PDF não aparecer, use **Ver PDF em outra aba** e anote o navegador em que ocorreu.
4. Expanda **Testar S Pen e toque (área separada do PDF)**. Desenhe com S Pen, observe contagem de eventos "Caneta", pressão e cancelamentos; depois experimente tocar com o dedo e apoiar a palma. A área não desenha nas páginas e apaga tudo ao fechar.
5. Experimente fechar e reabrir. Confirme que é necessário selecionar o arquivo novamente e que os traços não são recuperados — esse é o comportamento esperado do E0.
6. Registre somente modelo do tablet, navegador, resultado de exibição, fluidez percebida, leitura com o dedo e valores genéricos do diagnóstico. Não envie PDFs privados, links do Drive, capturas de documentos pessoais ou dados reais ao repositório.

## 4. Limites e privacidade

- A demonstração fica **pública na internet**. Não adicione livros, links, notas ou outras informações pessoais, ainda que o modo local armazene registros no dispositivo.
- Os PDFs escolhidos no laboratório não são enviados ao servidor, porém o visualizador do navegador é responsável por como são exibidos.
- O laboratório NÃO anota PDFs: o teste da S Pen desenha num quadro separado. Rejeição de palma ainda não está comprovada.
- Esta publicação não usa Firebase Authentication, Firestore nem acesso privado ao Drive. O botão de link externo preserva apenas links que o usuário tiver cadastrado no dispositivo; a demo inicial não possui nenhum.
- Para desativar a demonstração, entre em Settings → Pages e ajuste a origem/desative a publicação, respeitando eventuais outras páginas publicadas no repositório. A branch e a PR podem continuar abertas sem merge.
- Se decidir futuramente publicar a biblioteca pessoal, planejar hospedagem/autenticação privada em tarefa separada; não substituir este teste fictício por um build com dados reais.

## 5. Roteiro de QA local

Em checkout isolado da branch:

    npm ci
    npm run build
    npm test
    npx playwright install chromium
    npm run test:browser
    npm run build -- --config=config/tablet-preview.json --catalog=data/demo.json
    node scripts/prepare-tablet-preview.mjs

A pasta dist é gerada e não entra no Git. Não declarar publicado antes de confirmação da execução e acesso ao site.
