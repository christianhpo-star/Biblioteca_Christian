# Decisão 001 — Fonte modular e versionamento

- Autor da autorização: Christian Oliveira.
- Data: 06/11/2026.
- Evidência: pedido no chat para subir o código em `https://github.com/christianhpo-star/Biblioteca_Christian` e fazer a modularização ao mesmo tempo, para revisar versões antes de alterar o arquivo principal.
- Estado: autorizado dentro desse alcance.
- Solução: branch com PR, fonte por responsabilidade, HTML de estrutura, CSS separado, dados/configuração fora do fonte e build reproduzível. Preservar stack e contratos para reduzir regressão.
- Alternativas: manter o monólito não atende ao pedido; trocar framework e contratos amplia o risco sem autorização ou necessidade demonstrada.
- Reversibilidade: checkout isolado e PR; nenhum arquivo principal nem dado de produção é substituído.
- Limites: não autoriza merge, deploy, migração de dados, publicação de acervo pessoal, nova contratação nem ampliação de acesso.
