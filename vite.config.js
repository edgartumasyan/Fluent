import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const WORDS_FILES = {
  my: path.resolve(import.meta.dirname, "src/data/my-words.json"),
  caroline: path.resolve(import.meta.dirname, "src/data/caroline-words.json"),
};

function getWordsFile(req) {
  const url = new URL(req.url, "http://localhost");
  const source = url.searchParams.get("source");
  return WORDS_FILES[source] || WORDS_FILES.my;
}
const FONT_PATH = path.resolve(import.meta.dirname, "fonts/NotoSans-Regular.ttf");
const FONT_ARMENIAN = path.resolve(import.meta.dirname, "fonts/NotoSansArmenian-Regular.ttf");

function generatePdf(words, res) {
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="vocabulary.pdf"');
  doc.pipe(res);

  const pageWidth = doc.page.width - 80;
  const colWidths = {
    index: 30,
    english: pageWidth * 0.28,
    russian: pageWidth * 0.33,
    armenian: pageWidth * 0.33,
  };
  const startX = 40;
  const rowHeight = 28;
  const headerHeight = 32;

  const colors = {
    primary: "#1a1a2e",
    accent: "#3b82f6",
    headerBg: "#f0f4f8",
    headerText: "#374151",
    rowBorder: "#e5e7eb",
    altRow: "#f9fafb",
    muted: "#6b7280",
  };

  doc.registerFont("NotoSans", FONT_PATH);
  doc.registerFont("NotoSansArmenian", FONT_ARMENIAN);
  doc.font("NotoSans");

  doc.fontSize(22).fillColor(colors.accent).text("English Vocabulary", { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor(colors.muted).text(`${words.length} words`, { align: "center" });
  doc.moveDown(0.8);

  function drawTableHeader(y) {
    doc.save();
    doc.roundedRect(startX, y, pageWidth + 6, headerHeight, 4).fill(colors.headerBg);
    doc.restore();

    const textY = y + 10;
    doc.font("NotoSans").fontSize(8).fillColor(colors.headerText);

    let x = startX + 6;
    doc.text("#", x, textY, { width: colWidths.index });
    x += colWidths.index;
    doc.text("ENGLISH", x, textY, { width: colWidths.english });
    x += colWidths.english;
    doc.text("RUSSIAN", x, textY, { width: colWidths.russian });
    x += colWidths.russian;
    doc.text("ARMENIAN", x, textY, { width: colWidths.armenian });

    return y + headerHeight;
  }

  function drawRow(word, idx, y) {
    if (idx % 2 === 1) {
      doc.save();
      doc.rect(startX, y, pageWidth + 6, rowHeight).fill(colors.altRow);
      doc.restore();
    }

    doc
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + pageWidth + 6, y + rowHeight)
      .strokeColor(colors.rowBorder)
      .lineWidth(0.5)
      .stroke();

    const textY = y + 8;
    let x = startX + 6;

    doc.fontSize(8).fillColor(colors.muted);
    doc.text(String(idx + 1), x, textY, { width: colWidths.index });
    x += colWidths.index;

    doc.fontSize(9.5).fillColor(colors.primary);
    doc.text(word.english, x, textY, {
      width: colWidths.english - 8,
      ellipsis: true,
    });
    x += colWidths.english;

    doc.font("NotoSans").fontSize(9).fillColor(colors.headerText);
    doc.text(word.russian, x, textY, {
      width: colWidths.russian - 8,
      ellipsis: true,
    });
    x += colWidths.russian;

    doc.font("NotoSansArmenian").fontSize(9).fillColor(colors.headerText);
    doc.text(word.armenian, x, textY, {
      width: colWidths.armenian - 8,
      ellipsis: true,
    });
    doc.font("NotoSans");

    return y + rowHeight;
  }

  let y = drawTableHeader(doc.y);

  for (let i = 0; i < words.length; i++) {
    if (y + rowHeight > doc.page.height - 50) {
      doc.addPage();
      y = 40;
      y = drawTableHeader(y);
    }
    y = drawRow(words[i], i, y);
  }

  doc
    .fontSize(7)
    .fillColor(colors.muted)
    .text(
      `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      startX,
      doc.page.height - 40,
      { align: "center", width: pageWidth },
    );

  doc.end();
}

function writeWords(wordsFile, words) {
  fs.writeFileSync(wordsFile, JSON.stringify(words, null, 2) + "\n");
}

function wordsApiPlugin() {
  return {
    name: "words-api",
    configureServer(server) {
      server.middlewares.use("/api/words/pdf", (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const wordsFile = getWordsFile(req);
        const words = JSON.parse(fs.readFileSync(wordsFile, "utf-8"));
        generatePdf(words, res);
      });

      server.middlewares.use("/api/words", (req, res) => {
        const wordsFile = getWordsFile(req);

        if (req.method === "GET") {
          const data = fs.readFileSync(wordsFile, "utf-8");
          res.setHeader("Content-Type", "application/json");
          res.end(data);
          return;
        }

        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            const { english, russian, armenian } = JSON.parse(body);

            const words = JSON.parse(fs.readFileSync(wordsFile, "utf-8"));
            // Derive from the max id, not the length: ids stay unique even once
            // deletions have left gaps in the file.
            const newWord = {
              id: words.reduce((m, w) => Math.max(m, w.id), 0) + 1,
              english: english.trim(),
              russian: russian.trim(),
              armenian: armenian.trim(),
            };
            words.push(newWord);
            writeWords(wordsFile, words);

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(newWord));
          });
          return;
        }

        if (req.method === "DELETE") {
          const id = Number(new URL(req.url, "http://localhost").searchParams.get("id"));
          const words = JSON.parse(fs.readFileSync(wordsFile, "utf-8"));
          writeWords(wordsFile, words.filter((w) => w.id !== id));
          res.statusCode = 204;
          res.end();
          return;
        }

        res.statusCode = 405;
        res.end();
      });
    },
  };
}

export default defineConfig({
  base: "/Fluent/",
  plugins: [react(), wordsApiPlugin()],
});
