# Componentes de exportação

- `docx` 9.15.2 — geração de Word no navegador; licença MIT. Fonte: https://github.com/dolanmiu/docx.
- `pdf-lib` 1.17.1 — geração local de PDF; licença MIT. Fonte: https://github.com/Hopding/pdf-lib.
- `@pdf-lib/fontkit` 1.1.1 — incorporação da fonte no PDF; licença MIT. Fonte: https://github.com/Hopding/fontkit.
- Noto Sans Regular — SIL Open Font License 1.1, cópia integral em `assets/fonts/OFL.txt`. Fonte original: `notofonts/noto-fonts`, commit `ffebf8c1ee449e544955a7e813c54f9b73848eac`, arquivo `hinted/ttf/NotoSans/NotoSans-Regular.ttf`.

A fonte é incorporada ao módulo de exportação para evitar downloads de terceiros durante o uso e permitir PDF com acentos. Caracteres não cobertos geram uma mensagem explícita; o aplicativo orienta exportar em Word para preservar o conteúdo completo. Nenhum caractere é descartado silenciosamente.

As bibliotecas e a fonte não impõem uma licença ao código próprio do produto. O responsável ainda não escolheu licença para distribuição desse código.
