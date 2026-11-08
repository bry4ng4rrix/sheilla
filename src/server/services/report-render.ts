import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { fmtDateTime } from "@/lib/dates";
import type { Report } from "./reports";

const ORANGE = "EF8200";
const logo = () => readFile(path.join(process.cwd(), "public", "logo.png"));

export async function toXlsx(
  report: Report,
  meta: { company: string; author: string },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.author;
  wb.created = new Date();
  const ws = wb.addWorksheet(report.title.slice(0, 31), {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });
  const n = report.columns.length;

  ws.addImage(
    wb.addImage({
      buffer: (await logo()) as unknown as ExcelJS.Buffer,
      extension: "png",
    }),
    { tl: { col: 0, row: 0 }, ext: { width: 56, height: 56 } },
  );
  ws.mergeCells(1, 2, 1, n);
  ws.getCell(1, 2).value = `${meta.company} — Jiro sy Rano Malagasy`;
  ws.getCell(1, 2).font = {
    bold: true,
    size: 14,
    color: { argb: "FF" + ORANGE },
  };
  ws.mergeCells(2, 2, 2, n);
  ws.getCell(2, 2).value = report.title;
  ws.getCell(2, 2).font = { bold: true, size: 12 };
  ws.mergeCells(3, 2, 3, n);
  ws.getCell(3, 2).value =
    `${report.period} · Généré le ${fmtDateTime(new Date())} par ${meta.author}`;
  ws.getCell(3, 2).font = {
    italic: true,
    size: 9,
    color: { argb: "FF78716C" },
  };
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;

  const headerRow = ws.getRow(5);
  report.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + ORANGE },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: c.align ?? "left",
      wrapText: true,
    };
    ws.getColumn(i + 1).width = Math.max(10, Math.round((c.width ?? 80) / 5.5));
  });
  headerRow.height = 30;

  report.rows.forEach((r, ri) => {
    const row = ws.getRow(6 + ri);
    report.columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = r[c.key] ?? "";
      cell.alignment = { horizontal: c.align ?? "left" };
      if (ri % 2)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF7ED" },
        };
    });
  });
  if (report.totals) {
    const row = ws.getRow(6 + report.rows.length);
    report.columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = report.totals![c.key] ?? "";
      cell.font = { bold: true };
      cell.alignment = { horizontal: c.align ?? "left" };
      cell.border = {
        top: { style: "medium", color: { argb: "FF" + ORANGE } },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFEDD5" },
      };
    });
  }
  ws.views = [{ state: "frozen", ySplit: 5 }];
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: n } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function toPdf(
  report: Report,
  meta: { company: string; author: string },
): Promise<Buffer> {
  const totalWidth = report.columns.reduce((s, c) => s + (c.width ?? 80), 0);
  const doc = new PDFDocument({
    size: "A4",
    layout: totalWidth > 520 ? "landscape" : "portrait",
    margin: 36,
    bufferPages: true,
    info: { Title: report.title, Author: meta.author },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) =>
    doc.on("end", () => res(Buffer.concat(chunks))),
  );

  const img = await logo();
  const left = doc.page.margins.left;
  const usable = doc.page.width - left - doc.page.margins.right;
  const scale = usable / totalWidth;
  const widths = report.columns.map((c) => (c.width ?? 80) * scale);
  const bottom = () => doc.page.height - doc.page.margins.bottom - 30;

  // En-tête administratif
  doc.rect(0, 0, doc.page.width, 6).fill("#" + ORANGE);
  doc.image(img, left, 22, { width: 46 });
  doc
    .fillColor("#" + ORANGE)
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(meta.company, left + 58, 26);
  doc
    .fillColor("#57534e")
    .font("Helvetica")
    .fontSize(8.5)
    .text(
      "Jiro sy Rano Malagasy — Service des Ressources Humaines",
      left + 58,
      45,
    );
  doc
    .fillColor("#1c1917")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(report.title, left, 84, { width: usable, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#57534e")
    .text(report.period, left, 106, { width: usable, align: "center" });
  doc
    .fontSize(8)
    .text(
      `Généré le ${fmtDateTime(new Date())} par ${meta.author}`,
      left,
      120,
      { width: usable, align: "center" },
    );

  let y = 142;
  const drawRow = (
    values: (string | number)[],
    opts: { header?: boolean; fill?: string; bold?: boolean },
  ) => {
    const h = opts.header ? 24 : 18;
    if (opts.fill) doc.rect(left, y, usable, h).fill(opts.fill);
    let x = left;
    doc
      .font(opts.header || opts.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(opts.header ? 7.8 : 7.8)
      .fillColor(opts.header ? "#ffffff" : "#1c1917");
    values.forEach((v, i) => {
      doc.text(String(v ?? ""), x + 4, y + (opts.header ? 4 : 5), {
        width: widths[i] - 8,
        height: h - 4,
        align: report.columns[i].align ?? "left",
        ellipsis: true,
        lineBreak: !!opts.header,
      });
      x += widths[i];
    });
    y += h;
  };
  const header = () =>
    drawRow(
      report.columns.map((c) => c.label),
      { header: true, fill: "#" + ORANGE },
    );

  header();
  if (report.rows.length === 0) {
    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor("#78716c")
      .text("Aucune donnée pour les critères sélectionnés.", left, y + 10);
    y += 30;
  }
  report.rows.forEach((r, i) => {
    if (y > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
      header();
    }
    drawRow(
      report.columns.map((c) => r[c.key] ?? ""),
      { fill: i % 2 ? "#fff7ed" : undefined },
    );
  });
  if (report.totals) {
    if (y > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc
      .moveTo(left, y)
      .lineTo(left + usable, y)
      .lineWidth(1.2)
      .strokeColor("#" + ORANGE)
      .stroke();
    drawRow(
      report.columns.map((c) => report.totals![c.key] ?? ""),
      { fill: "#ffedd5", bold: true },
    );
  }

  if (report.signature) {
    if (y + 90 > bottom()) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    y += 30;
    const boxX = left + usable - 220;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#1c1917")
      .text(
        `Antsirabe, le ${fmtDateTime(new Date()).split(" à ")[0]}`,
        boxX,
        y,
        { width: 220, align: "center" },
      );
    doc
      .font("Helvetica-Bold")
      .text("Le Responsable des Ressources Humaines", boxX, y + 14, {
        width: 220,
        align: "center",
      });
    doc
      .moveTo(boxX + 30, y + 70)
      .lineTo(boxX + 190, y + 70)
      .lineWidth(0.5)
      .strokeColor("#a8a29e")
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#78716c")
      .text("Signature et cachet", boxX, y + 74, {
        width: 220,
        align: "center",
      });
  }

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(7.5).fillColor("#a8a29e");
    doc.text(
      `${meta.company} · ${report.title} · Page ${i + 1}/${range.count}`,
      left,
      doc.page.height - 28,
      { width: usable, align: "center", lineBreak: false },
    );
  }
  doc.end();
  return done;
}
