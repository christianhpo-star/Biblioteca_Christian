# Fluxo de desenvolvimento

1. Conferir remoto, branch, HEAD e alterações locais. Ler PROJECT e STATUS.
2. Definir uma alteração delimitada e trabalhar em branch `codex/…`.
3. Editar os módulos fonte, gerar o build e usar a demonstração sintética para testar.
4. Conferir arquivos adicionados antes do commit: `private/`, `dist/`, configurações locais, logs e backups não podem entrar no Git.
5. Abrir PR com objetivo, comportamento, comandos executados, resultados e limitações. Rever o diff antes de incorporar a mudança à principal.
6. Atualizar STATUS e registrar decisões estruturais quando houver.

Não executar deploy, merge, migração, exclusão ou contratação sem autorização específica. Autorização para subir código não autoriza publicar fichamentos nem alterar produção. Preservar trabalho existente e não usar force push.

Referência metodológica efetivamente consultada: EDU Dev Agent — Central, repositório `christianhpo-star/edu-dev-agent`, commit `8b57d19cca411f4d963bc2a12096697f4fa6303c`: AGENTS, PROJECT, STATUS, AI_WORKFLOW e procedimentos de engenharia/entrega. Esses documentos orientam o processo; não transformam o kit central no repositório deste produto.
