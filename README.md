# Biblioteca Christian

Catálogo pessoal e cadernos de estudo para obras digitais e livros em papel. Fonte modular em JavaScript e CSS, sem framework. Versão: **0.3.0**.

Este repositório é público: contém **código e três obras fictícias**. PDFs, fichamentos reais, links do acervo e configurações da conta ficam fora do Git.

## Executar uma prévia

Requisitos: Node.js 22 ou superior e npm. Validado no Windows com a versão de Node registrada em `docs/VALIDATION.md`.

```sh
npm ci
npm run build
npm start
```

Abra `http://127.0.0.1:5001`. A prévia usa uma chave de armazenamento própria para não substituir seus dados antigos. Não existe publicação automática.

## Onde editar

| Responsabilidade | Fonte |
| --- | --- |
| Estrutura das telas | `templates/index.html` |
| Estado, persistência, backup e inicialização | `src/core/` |
| Acervo, busca, filtros, coleções e metadados | `src/catalog/` |
| Progresso e ficha da obra | `src/reading/` |
| Caderno, fichamentos e citações | `src/study/` |
| Navegação e janelas | `src/ui/` |
| Sincronização autenticada opcional | `src/cloud/` |
| Aparência por responsabilidade | `styles/` |
| Ordem dos scripts e estilos | `src/manifest.json` |
| Dados fictícios | `data/demo.json` |

`dist/index.html` é gerado; não deve ser editado. A arquitetura e os contratos de compatibilidade estão em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Usar o acervo existente sem publicá-lo

```sh
npm run import:local -- "CAMINHO/LOCAL/Catalogo_Biblioteca.html"
npm run build -- --catalog=private/catalog.json
npm start
```

O importador lê as duas bases embutidas no HTML e grava apenas `private/catalog.json`, ignorado pelo Git. Não altera o arquivo de origem, PDFs ou armazenamento do navegador. Anotações feitas pelo usuário vivem no armazenamento do navegador: para transferi-las, exporte um backup JSON pelo aplicativo antigo e importe-o na prévia.

**Um build com acervo real contém dados pessoais em `dist/runtime.js`. Use-o somente localmente ou em ambiente privado autorizado. Nunca publique esse diretório como demonstração pública.** A pasta `dist/` também é ignorada pelo Git.

Para separar o armazenamento do acervo real da demonstração, copie `config/example.json` para `config/local.json`, escolha outra `storageKey` e acrescente `--config=config/local.json` ao build. Mantenha `mode: "local"`.

## Validar

```sh
npm test
npm run test:browser
```

O teste de navegador usa Chromium do Playwright. Se ele não estiver instalado: `npx playwright install chromium`. Os testes trabalham exclusivamente com dados sintéticos. Execute `npm run build` antes do teste de navegador. Capturas ficam em `test-results/`, fora do Git.

## Revisar versões antes de usar

1. Criar uma branch `codex/<alteracao>` a partir da versão aprovada.
2. Alterar o fonte, gerar a prévia e executar os testes.
3. Abrir uma pull request com evidências e limitações.
4. Revisar o diff e testar a prévia antes de incorporar a mudança à `main`.
5. Substituir a cópia principal ou publicar a aplicação somente com autorização específica e backup das anotações.

Reverter um commit recupera o código; recuperar fichamentos exige o backup dos dados. Veja [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md).

## Integrações e limites

O fonte da sincronização Firebase existente foi preservado, com a configuração separada. `config/firebase.example.json` é fictício; gerar seu bundle não valida login, permissões ou sincronização real. Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) antes de preparar uma publicação privada.

O fichamento usa registros curtos: anotação, trecho literal ou ambos. A referência e os dados do exemplar ficam recolhidos; cada registro pode ser editado. Em **Ver documento**, o fichamento aparece como uma página contínua com as entradas ordenadas pela página do livro. Na mesma página, mantém a ordem de criação; registros sem página ficam ao final.

O documento permite baixar **Word (.docx), PDF e Markdown**, gerados neste dispositivo, com trecho e comentário juntos. Rascunhos automáticos ficam fora do documento até usar **Guardar registro**. Conteúdo anterior é preservado, sem migração obrigatória. Licenças e fonte de exportação: [THIRD_PARTY.md](THIRD_PARTY.md).

Criar e atualizar arquivos diretamente no Google Drive continua pendente. Não foram transferidos PDFs, backups pessoais, logs nem ferramentas locais de processamento de livros para este repositório.

Nenhuma licença de distribuição foi escolhida automaticamente.
