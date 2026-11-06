# Arquitetura e compatibilidade

## Fonte e artefatos

O HTML original continha estilos, base pessoal e funções de múltiplas responsabilidades. O novo fonte separa a estrutura em `templates/index.html`, estilos em sete arquivos e lógica em módulos por domínio. `scripts/build.mjs` reúne as referências e copia os recursos para `dist/`. O índice gerado continua com scripts externos; os bundles de validação e integração são artefatos, não fonte.

O acervo demonstrativo está em `data/demo.json`. Builds locais podem usar `private/catalog.json`. A configuração de execução é externa ao fonte. `runtime.js` é gerado e contém a configuração pública e os dados selecionados para aquele build; ele não é um cofre.

## Contrato preservado

Os arquivos clássicos compartilham os identificadores legados e os handlers usados pelo HTML. Essa dependência é explícita e ordenada por `src/manifest.json`. Não houve conversão artificial para React nem mudança dos contratos por conveniência. Essa primeira modularização permite editar e revisar responsabilidades isoladas, embora ainda exista acoplamento global legado. Uma migração futura para imports/exportações em toda a UI deve ser uma entrega própria, com testes equivalentes.

`appState` conserva `leituras`, `notas`, `citacoes`, `fichamentos`, `colecoes`, `metaOverrides` e `config`. Obras cadastradas manualmente continuam em `metaOverrides` com `catalogManual`, preservando o esquema existente. Os IDs do catálogo importado permanecem iguais. A chave de armazenamento da demonstração difere da aplicação antiga.

`src/cloud/sync-core.mjs` contém o merge de três vias e o validador compartilhado. `src/core/validation.mjs` disponibiliza esse mesmo validador para importação de backup no modo local. A sincronização não é necessária para abrir um caderno local.

## Firebase opcional

`src/cloud/auth-sync.mjs` mantém o fluxo de login e sincronização preexistente; a conta proprietária, o projeto e o banco vêm da configuração local. `src/cloud/bridge.js` conecta o estado do catálogo ao sincronizador como arquivo executável separado.

Para verificar a compilação sem credenciais: `npm run build -- --config=config/firebase.example.json`. Esse comando não acessa o projeto real e não publica nada. Para uso privado, uma cópia ignorada `config/firebase.json` deve conter a configuração da aplicação existente; o backend deve continuar impondo propriedade por UID, email verificado e provedor Google. Não basta configurar o email na interface. Não foram enviadas regras nem configurações reais da conta neste PR e não foi alterada a instalação em produção.

O limite de sincronização permanece em 700 mil caracteres de JSON. Exportar um fichamento cria um download, não um documento no Drive. Recursos de anotação por caneta, OCR, escrita direta no Drive e teste em tablet não são promessas desta refatoração.

## Dependências

Firebase, esbuild e Playwright conservam as versões instaladas no projeto local, agora fixadas no lockfile. A dependência transitiva `@grpc/grpc-js` foi fixada em `1.13.6`, corrigindo avisos reportados pela auditoria do npm sem fazer downgrade do Firebase. Nenhuma biblioteca de interface foi adicionada.

## Atualização e recuperação

Antes de usar uma nova versão com anotações reais, exportar o backup JSON pelo aplicativo atual. Testar o build da branch com outra chave de armazenamento e importar uma cópia desse backup. Só substituir o aplicativo principal depois de revisão. Rollback de código usa Git; recuperação de dados usa backup. A cópia original e seus arquivos auxiliares permanecem fora deste checkout, sem alterações nesta tarefa.
