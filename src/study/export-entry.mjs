/** Local-only exporters, loaded on demand. The exact model shown by the reader is the export source. */
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fontData from "../../assets/fonts/NotoSans-Regular.ttf";
import { documentBlocks } from "./records.mjs";
export async function createWord(model) {
  const paragraphs = documentBlocks(model).flatMap((block) => block.text.split(/\r?\n/).map((line) => new Paragraph({
    heading: block.kind === "title" ? HeadingLevel.TITLE : block.kind === "heading" ? HeadingLevel.HEADING_1 : void 0,
    spacing: { after: block.kind === "heading" ? 120 : 160, line: 300 },
    indent: block.kind === "quote" ? { left: 360 } : void 0,
    keepNext: ["title", "heading", "label"].includes(block.kind),
    children: [new TextRun({ text: line, font: "Calibri", size: block.kind === "title" ? 36 : block.kind === "heading" ? 28 : 22, color: "000000", bold: ["title", "heading", "label"].includes(block.kind), italics: block.kind === "quote" })]
  })));
  const doc = new Document({ title: model.title, creator: "Biblioteca Christian", styles: { default: { document: { run: { font: "Calibri", size: 22, color: "000000" }, paragraph: { spacing: { line: 300 } } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: paragraphs }] });
  return Packer.toBlob(doc);
}
function wrap(text, font, size, width) {
  const lines = [];
  for (const paragraph of text.replace(/\t/g, "    ").split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/ +/)) {
      if (font.widthOfTextAtSize((line ? line + " " : "") + word, size) <= width) {
        line += (line ? " " : "") + word;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width && line) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
export async function createPdf(model) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(model.title);
  pdf.setAuthor("Biblioteca Christian");
  const bytes = Uint8Array.from(atob(fontData.split(",")[1]), (c) => c.charCodeAt(0));
  const font = await pdf.embedFont(bytes, { subset: true });
  const charset = new Set(font.getCharacterSet());
  const unsupported = [...new Set(documentBlocks(model).flatMap((b) => Array.from(b.text)).filter((c) => !["\n", "\r", "	"].includes(c) && !charset.has(c.codePointAt(0))))];
  if (unsupported.length) throw Error("O PDF não suporta estes caracteres: " + unsupported.join(" ") + ". Baixe em Word para preservar o texto completo.");
  const width = 595.28, height = 841.89, margin = 56.7;
  let page, y;
  const nextPage = () => {
    page = pdf.addPage([width, height]);
    y = height - margin;
  };
  nextPage();
  for (const block of documentBlocks(model)) {
    const size = block.kind === "title" ? 19 : block.kind === "heading" ? 13 : 10.5;
    const indent = block.kind === "quote" ? 14 : 0, leading = size * 1.55;
    const lines = wrap(block.text, font, size, width - 2 * margin - indent);
    if (["heading", "label"].includes(block.kind) && y - margin < leading * 3) nextPage();
    for (const line of lines) {
      if (y - leading < margin) nextPage();
      y -= leading;
      page.drawText(line, { x: margin + indent, y, size, font, color: rgb(0, 0, 0) });
    }
    y -= block.kind === "heading" ? 7 : 11;
  }
  pdf.getPages().forEach((p, index) => p.drawText(String(index + 1), { x: width - margin - 10, y: 30, font, size: 9, color: rgb(0.35, 0.35, 0.35) }));
  return new Blob([await pdf.save()], { type: "application/pdf" });
}
window.StudyDocuments = { createWord, createPdf };
