import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import type { GeneratedItem } from "../types";

type ExportContext = {
  title?: string;
  generationDisplayId?: string | null;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const safeFilePart = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const fetchRAGeneratedItemsForExport = async (generationId: string): Promise<GeneratedItem[]> => {
  const { data, error } = await supabase
    .from("ra_generated_items")
    .select("id,item_type,display_id,title,description,confidence_score,confidence_breakdown,sort_order")
    .eq("generation_id", generationId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    type: row.item_type,
    key: row.display_id || row.id,
    title: row.title,
    description: row.description || "",
    confidence: row.confidence_score ?? 0,
    confidenceBreakdown: row.confidence_breakdown ?? undefined,
  }));
};

export const exportRequirementAssistPdf = async (items: GeneratedItem[], ctx: ExportContext = {}) => {
  const prd = items.find((i) => i.type === "prd") || null;
  const epics = items.filter((i) => i.type === "epic");
  const features = items.filter((i) => i.type === "feature");
  const stories = items.filter((i) => i.type === "story");

  const title = ctx.title || prd?.title || "PRD";
  const displayId = ctx.generationDisplayId || "RA";

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;

  let y = 56;
  doc.setFontSize(18);
  doc.text(title, marginX, y);

  y += 20;
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Generation: ${displayId}`, marginX, y);
  doc.text(`Exported: ${new Date().toLocaleString()}`, pageWidth - marginX, y, { align: "right" });
  doc.setTextColor(0);

  y += 18;

  const addSectionTitle = (text: string) => {
    y += 18;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(text, marginX, y);
    doc.setFont(undefined, "normal");
    y += 10;
  };

  if (prd?.description) {
    addSectionTitle("PRD Summary");
    doc.setFontSize(10);
    const plain = prd.description.replace(/\r\n/g, "\n");
    const lines = doc.splitTextToSize(plain, pageWidth - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 12;
  }

  const addTable = (section: string, rows: GeneratedItem[]) => {
    if (!rows.length) return;
    addSectionTitle(section);

    autoTable(doc, {
      startY: y,
      head: [["Key", "Title", "Confidence"]],
      body: rows.map((r) => [r.key, r.title, `${Math.round(r.confidence)}%`]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [240, 242, 245], textColor: [10, 10, 10] },
      margin: { left: marginX, right: marginX },
      columnStyles: {
        0: { cellWidth: 90 },
        2: { cellWidth: 70, halign: "right" },
      },
    });

    // @ts-expect-error - jspdf-autotable adds lastAutoTable
    y = (doc as any).lastAutoTable.finalY + 6;
  };

  addTable("Epics", epics);
  addTable("Features", features);
  addTable("Stories", stories);

  const filename = `${safeFilePart(displayId)}-${safeFilePart(title)}.pdf` || "requirement-assist.pdf";
  const blob = doc.output("blob");
  downloadBlob(blob, filename);
};

export const exportRequirementAssistExcel = async (items: GeneratedItem[], ctx: ExportContext = {}) => {
  const prd = items.find((i) => i.type === "prd") || null;
  const epics = items.filter((i) => i.type === "epic");
  const features = items.filter((i) => i.type === "feature");
  const stories = items.filter((i) => i.type === "story");

  const title = ctx.title || prd?.title || "Requirement Assist";
  const displayId = ctx.generationDisplayId || "RA";

  const wb = XLSX.utils.book_new();

  const prdSheet = XLSX.utils.aoa_to_sheet([
    ["Generation", displayId],
    ["Title", title],
    ["Exported", new Date().toISOString()],
    [],
    ["PRD Key", prd?.key || ""],
    ["PRD Title", prd?.title || ""],
    ["PRD Description", prd?.description || ""],
  ]);
  XLSX.utils.book_append_sheet(wb, prdSheet, "PRD");

  const sheetFromRows = (rows: GeneratedItem[]) =>
    XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Key: r.key,
        Title: r.title,
        Description: r.description,
        Confidence: Math.round(r.confidence),
      }))
    );

  XLSX.utils.book_append_sheet(wb, sheetFromRows(epics), "Epics");
  XLSX.utils.book_append_sheet(wb, sheetFromRows(features), "Features");
  XLSX.utils.book_append_sheet(wb, sheetFromRows(stories), "Stories");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const filename = `${safeFilePart(displayId)}-${safeFilePart(title)}.xlsx` || "requirement-assist.xlsx";
  downloadBlob(blob, filename);
};
