# Regras deste produto

- Repositório exclusivo: `christianhpo-star/Biblioteca_Christian`. Ler `docs/PROJECT.md`, `docs/STATUS.md` e, antes de escrever, `docs/AI_WORKFLOW.md`.
- Manter fonte em `src/`, `styles/` e `templates/`. Não editar `dist/` como fonte nem reunir novamente a lógica no HTML.
- Preservar os contratos atuais de estado, IDs e armazenamento; alterações de banco, autenticação, permissões ou migração exigem escopo aprovado.
- Trabalhar em branch e abrir PR com testes. Não substituir a cópia principal, fazer merge ou deploy sem autorização pertinente.
- Este repositório é público. Não adicionar acervo real, PDFs, backups, links privados, contas, credenciais, configurações locais ou logs. Usar dados sintéticos em testes e capturas.
- Manter o JavaScript clássico compatível com os handlers do HTML nesta refatoração. A ordem está em `src/manifest.json`; mudanças de arquitetura adicionais precisam ser discutidas.
- Executar `npm run build`, `npm test` e `npm run test:browser` quando a interface ou seus contratos forem afetados. A captura automatizada não equivale a validação com usuário, tablet ou leitor de tela.
- Não inferir vínculo institucional: a identidade permanece neutra.
