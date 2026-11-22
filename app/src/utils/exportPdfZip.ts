import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { getCatalogItem } from '../data/catalog';
import { PlacedNode, PipeSegment, ProjectFile, ProjectMeta } from '../types/system';
import { computeFrameBounds, estimateFrameLoad, getPipeAxisLengthMm, getPipeCutLengthMm } from './geometry';

export interface BomNodeRow {
  articleNumber: string;
  name: string;
  diameterLabel: string;
  color: string;
  stlPath: string;
  count: number;
}

export interface BomPipeRow {
  diameterMm: number;
  color: string;
  axisLengthMm: number;
  cutLengthMm: number;
  count: number;
}

export function buildBom(nodes: PlacedNode[], pipes: PipeSegment[]): {
  nodeRows: BomNodeRow[];
  pipeRows: BomPipeRow[];
} {
  const nodeMap = new Map<string, BomNodeRow>();
  for (const n of nodes) {
    const key = `${n.articleNumber}__${n.color}`;
    const existing = nodeMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      const item = getCatalogItem(n.catalogId);
      nodeMap.set(key, {
        articleNumber: n.articleNumber,
        name: item?.name ?? n.catalogId,
        diameterLabel: n.secondDiameterMm ? `${n.diameterMm}→${n.secondDiameterMm} mm` : `Ø ${n.diameterMm} mm`,
        color: n.color,
        stlPath: n.stlPath,
        count: 1,
      });
    }
  }

  const pipeMap = new Map<string, BomPipeRow>();
  for (const p of pipes) {
    const cut = getPipeCutLengthMm(p);
    const axis = getPipeAxisLengthMm(p);
    const key = `${p.diameterMm}__${cut}__${p.color}`;
    const existing = pipeMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      pipeMap.set(key, {
        diameterMm: p.diameterMm,
        color: p.color,
        axisLengthMm: axis,
        cutLengthMm: cut,
        count: 1,
      });
    }
  }

  return {
    nodeRows: Array.from(nodeMap.values()).sort((a, b) => a.articleNumber.localeCompare(b.articleNumber)),
    pipeRows: Array.from(pipeMap.values()).sort((a, b) => b.diameterMm - a.diameterMm || b.cutLengthMm - a.cutLengthMm),
  };
}

export function generatePdfDoc(
  meta: ProjectMeta,
  nodes: PlacedNode[],
  pipes: PipeSegment[],
  canvasDataUrl?: string
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const bounds = computeFrameBounds(nodes, pipes);
  const { nodeRows, pipeRows } = buildBom(nodes, pipes);
  const load = estimateFrameLoad(nodes, pipes);

  // Kopf / Schriftfeld
  doc.setDrawColor(51, 65, 85);
  doc.setFillColor(241, 245, 249);
  doc.rect(12, 12, 186, 26, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(meta.name || 'Rohrgestell-Konfiguration', 16, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Datum: ${meta.createdAt || new Date().toISOString().slice(0, 10)}`, 16, 27);
  doc.text(`Autor: ${meta.author || '-'}`, 65, 27);
  doc.text(`Gesamtmaße (B×T×H): ${bounds.width} × ${bounds.depth} × ${bounds.height} mm`, 115, 27);
  if (meta.notes) {
    doc.text(`Notiz: ${meta.notes.slice(0, 95)}`, 16, 33);
  }

  let y = 44;

  // 3D-Ansicht einbetten
  if (canvasDataUrl) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, y, 186, 82);
    doc.addImage(canvasDataUrl, 'PNG', 13, y + 1, 184, 80);
    y += 88;
  }

  // Stückliste Rohre (Zuschnitt)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Stückliste Rohre (Zuschnittmaße)', 12, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.setFillColor(226, 232, 240);
  doc.rect(12, y, 186, 6, 'F');
  doc.text('Pos.', 14, y + 4.2);
  doc.text('Profil / Ø', 26, y + 4.2);
  doc.text('Schnittlänge', 72, y + 4.2);
  doc.text('Achsmaß', 105, y + 4.2);
  doc.text('Farbe', 135, y + 4.2);
  doc.text('Menge', 180, y + 4.2);
  y += 7;

  doc.setFont('helvetica', 'normal');
  if (pipeRows.length === 0) {
    doc.text('Keine Rohre vorhanden.', 14, y + 3);
    y += 7;
  } else {
    pipeRows.forEach((r, idx) => {
      if (y > 265) { doc.addPage(); y = 18; }
      doc.text(`${idx + 1}`, 14, y + 3.5);
      doc.text(`Rundrohr Ø ${r.diameterMm} mm`, 26, y + 3.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${r.cutLengthMm} mm`, 72, y + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${r.axisLengthMm} mm`, 105, y + 3.5);
      doc.text(r.color, 135, y + 3.5);
      doc.text(`${r.count}×`, 182, y + 3.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(12, y + 5, 198, y + 5);
      y += 6;
    });
  }

  y += 5;

  // Stückliste Druckteile (Verbinder)
  if (y > 245) { doc.addPage(); y = 18; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Stückliste 3D-Druckteile (Verbinder)', 12, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.setFillColor(226, 232, 240);
  doc.rect(12, y, 186, 6, 'F');
  doc.text('Art.-Nr.', 14, y + 4.2);
  doc.text('Bezeichnung', 42, y + 4.2);
  doc.text('Ø', 98, y + 4.2);
  doc.text('STL-Datei', 120, y + 4.2);
  doc.text('Menge', 182, y + 4.2);
  y += 7;

  doc.setFont('helvetica', 'normal');
  if (nodeRows.length === 0) {
    doc.text('Keine Verbinder vorhanden.', 14, y + 3);
    y += 7;
  } else {
    nodeRows.forEach((r) => {
      if (y > 265) { doc.addPage(); y = 18; }
      doc.text(r.articleNumber, 14, y + 3.5);
      doc.text(r.name.slice(0, 28), 42, y + 3.5);
      doc.text(r.diameterLabel, 98, y + 3.5);
      doc.text(r.stlPath.split('/').pop() || r.stlPath, 120, y + 3.5);
      doc.text(`${r.count}×`, 182, y + 3.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(12, y + 5, 198, y + 5);
      y += 6;
    });
  }

  y += 6;
  if (y > 255) { doc.addPage(); y = 18; }
  doc.setDrawColor(245, 158, 11);
  doc.setFillColor(254, 243, 199);
  doc.rect(12, y, 186, 22, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14);
  doc.text('Statik-Richtwert & Haftungsausschluss (unverbindliche Schätzung):', 15, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Max. Spannweite: ${load.maxSpanMm} mm (Ø ${load.maxSpanDiameterMm} mm) | Richtwert Einzellast: ~${load.estimatedSafeCenterLoadKg} kg | Gesamtgestell: ~${load.estimatedFrameLoadKg} kg`,
    15,
    y + 10.5
  );
  doc.text(
    'Hinweis: Alle Angaben sind grobe Richtwerte ohne Gewähr. Keine Haftung für Schäden. Tragfähigkeit hängt stark von Material,',
    15,
    y + 15.5
  );
  doc.text(
    'Druckqualität (Infill, Wandlinien, Layerhaftung) und Rohrwandstärke ab – bitte eigenverantwortlich prüfen und nachrechnen.',
    15,
    y + 19.5
  );

  return doc;
}

export async function downloadZipBundle(
  projectFile: ProjectFile,
  canvasDataUrl?: string
): Promise<void> {
  const zip = new JSZip();
  const safeName = (projectFile.meta.name || 'gestell').replace(/[^a-zA-Z0-9_-]+/g, '_');

  // 1. PDF
  const pdf = generatePdfDoc(projectFile.meta, projectFile.nodes, projectFile.pipes, canvasDataUrl);
  zip.file(`${safeName}_Zeichnung_Stueckliste.pdf`, pdf.output('arraybuffer'));

  // 2. Projekt-JSON
  zip.file(`${safeName}_projekt.json`, JSON.stringify(projectFile, null, 2));

  // 3. CSV-Stückliste
  const { nodeRows, pipeRows } = buildBom(projectFile.nodes, projectFile.pipes);
  const csvLines = [
    'Typ;Artikelnummer;Bezeichnung;Durchmesser;Schnittlaenge_mm;Farbe;Menge;STL_Datei',
    ...pipeRows.map((p) => `Rohr;-;Rundrohr;${p.diameterMm}mm;${p.cutLengthMm};${p.color};${p.count};-`),
    ...nodeRows.map((n) => `Verbinder;${n.articleNumber};${n.name};${n.diameterLabel};-;${n.color};${n.count};${n.stlPath}`),
  ];
  zip.file('stueckliste.csv', csvLines.join('\n'));

  // 4. Verwendete STL-Dateien laden
  const uniqueStls = Array.from(new Set(projectFile.nodes.map((n) => n.stlPath)));
  const stlFolder = zip.folder('stl');
  for (const stlPath of uniqueStls) {
    try {
      const res = await fetch(stlPath);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const fileName = stlPath.split('/').pop() || stlPath;
        stlFolder?.file(fileName, buf);
      }
    } catch {
      // ignore fetch errors for individual files
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_komplett.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
