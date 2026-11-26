import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { getCatalogItem } from '../data/catalog';
import { PlacedNode, PipeSegment, ProjectFile, ProjectMeta, ScenePhoto } from '../types/system';
import { computeFrameBounds, estimateFrameLoad, getPipeAxisLengthMm, getWorldPort } from './geometry';

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
  lengthMm: number;
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
    const length = getPipeAxisLengthMm(p);
    const key = `${p.diameterMm}__${length}__${p.color}`;
    const existing = pipeMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      pipeMap.set(key, {
        diameterMm: p.diameterMm,
        color: p.color,
        lengthMm: length,
        count: 1,
      });
    }
  }

  return {
    nodeRows: Array.from(nodeMap.values()).sort((a, b) => a.articleNumber.localeCompare(b.articleNumber)),
    pipeRows: Array.from(pipeMap.values()).sort((a, b) => b.diameterMm - a.diameterMm || b.lengthMm - a.lengthMm),
  };
}

type Vec2 = [number, number];
type DrawingViewId = 'front' | 'back' | 'top' | 'left' | 'right' | 'iso';

function projectPoint(point: [number, number, number], view: DrawingViewId): Vec2 {
  const [x, y, z] = point;
  switch (view) {
    case 'front':
      return [x, y];
    case 'back':
      return [-x, y];
    case 'top':
      return [x, z];
    case 'left':
      return [z, y];
    case 'right':
      return [-z, y];
    case 'iso': {
      const c = Math.cos(Math.PI / 6);
      return [(x - z) * c, y + (x + z) * 0.5];
    }
  }
}

function drawArrow(doc: jsPDF, tipX: number, tipY: number, dirX: number, dirY: number) {
  const size = 1.7;
  const spread = 0.38;
  const angle = Math.atan2(dirY, dirX);
  doc.setFillColor(0, 0, 0);
  doc.triangle(
    tipX,
    tipY,
    tipX - size * Math.cos(angle + spread),
    tipY - size * Math.sin(angle + spread),
    tipX - size * Math.cos(angle - spread),
    tipY - size * Math.sin(angle - spread),
    'F'
  );
}

interface ViewCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ConnectorArm {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
}

function getConnectorArms(node: PlacedNode): ConnectorArm[] {
  const armLength = Math.max(node.diameterMm * 0.7, 7);
  return node.ports.map((port) => {
    const world = getWorldPort(node, port);
    return {
      start: world.pos,
      end: [
        world.pos[0] + world.dir[0] * armLength,
        world.pos[1] + world.dir[1] * armLength,
        world.pos[2] + world.dir[2] * armLength,
      ],
      radius: node.diameterMm * 0.26,
    };
  });
}

function drawConnector(
  doc: jsPDF,
  node: PlacedNode,
  view: DrawingViewId,
  toPdf: (u: number, v: number) => Vec2,
  scale: number
) {
  const arms = getConnectorArms(node);
  const minArmLengthPdf = 0.9;
  const minRadiusPdf = 0.3;
  const hubRadius = Math.max(node.diameterMm * 0.26 * scale, 0.55);
  const hub = toPdf(...projectPoint(node.position, view));

  interface ArmShape {
    end: Vec2;
    radius: number;
  }

  const shapes: ArmShape[] = [];

  for (const arm of arms) {
    const projectedStart = projectPoint(arm.start, view);
    const projectedEnd = projectPoint(arm.end, view);
    const a = toPdf(projectedStart[0], projectedStart[1]);
    const projectedB = toPdf(projectedEnd[0], projectedEnd[1]);
    const dx = projectedB[0] - a[0];
    const dy = projectedB[1] - a[1];
    const projectedLen = Math.hypot(dx, dy);
    const radius = Math.max(arm.radius * scale, minRadiusPdf);

    if (projectedLen < 0.05) {
      continue;
    }

    const ux = dx / projectedLen;
    const uy = dy / projectedLen;
    const armLength = Math.max(projectedLen, minArmLengthPdf);
    shapes.push({ end: [a[0] + ux * armLength, a[1] + uy * armLength], radius });
  }

  // Gemeinsame Außenkontur als Sternpolygon um die Nabe: für jeden Winkel
  // den weitesten Punkt über alle Arme/Rundungen bestimmen. Dadurch entstehen
  // keine störenden Innenkanten zwischen den einzelnen Anschlussarmen.
  const samples = 96;
  const step = (Math.PI * 2) / samples;
  const outline: Vec2[] = [];
  const eps = 1e-6;

  for (let i = 0; i < samples; i += 1) {
    const theta = i * step;
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    let distance = hubRadius;

    for (const shape of shapes) {
      const bx = shape.end[0] - hub[0];
      const by = shape.end[1] - hub[1];
      const length = Math.hypot(bx, by);
      if (length < eps) {
        distance = Math.max(distance, shape.radius);
        continue;
      }

      const ex = bx / length;
      const ey = by / length;
      const cosAngle = ux * ex + uy * ey;
      const sinAbs = Math.abs(ux * ey - uy * ex);
      const r = shape.radius;

      // Rechteckiger Arm ab der Nabe
      if (cosAngle > eps) {
        const tEnd = length / cosAngle;
        const tSide = sinAbs > 1e-9 ? r / sinAbs : Infinity;
        distance = Math.max(distance, Math.min(tEnd, tSide));
      }

      // Runde Armspitze
      const disc = r * r - length * length * sinAbs * sinAbs;
      if (disc >= 0) {
        const tDisk = length * cosAngle + Math.sqrt(disc);
        if (tDisk > 0) distance = Math.max(distance, tDisk);
      }
    }

    outline.push([hub[0] + ux * distance, hub[1] + uy * distance]);
  }

  const segments = outline.map((point, index) => {
    const next = outline[(index + 1) % outline.length];
    return [next[0] - point[0], next[1] - point[1]] as [number, number];
  });

  // Orange Füllung, darüber wird nur die schwarze Kontur gezeichnet.
  doc.setFillColor(249, 115, 22);
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.22);
  doc.lines(segments, outline[0][0], outline[0][1], [1, 1], 'FD', true);

  doc.setFillColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.22);
  doc.lines(segments, outline[0][0], outline[0][1], [1, 1], 'D', true);
}

function drawView(
  doc: jsPDF,
  view: DrawingViewId,
  label: string,
  nodes: PlacedNode[],
  pipes: PipeSegment[],
  cell: ViewCell,
  withDimensions: boolean
) {
  const projectedNodes = nodes.map((node) => ({
    node,
    p: projectPoint(node.position, view),
  }));
  const projectedPipes = pipes.map((pipe) => ({
    pipe,
    a: projectPoint(pipe.startPos, view),
    b: projectPoint(pipe.endPos, view),
  }));

  let minU = Infinity;
  let minV = Infinity;
  let maxU = -Infinity;
  let maxV = -Infinity;

  const include = (u: number, v: number, pad: number) => {
    minU = Math.min(minU, u - pad);
    minV = Math.min(minV, v - pad);
    maxU = Math.max(maxU, u + pad);
    maxV = Math.max(maxV, v + pad);
  };

  for (const entry of projectedNodes) {
    include(entry.p[0], entry.p[1], entry.node.diameterMm * 0.7);
    for (const arm of getConnectorArms(entry.node)) {
      const armStart = projectPoint(arm.start, view);
      const armEnd = projectPoint(arm.end, view);
      include(armStart[0], armStart[1], arm.radius);
      include(armEnd[0], armEnd[1], arm.radius);
    }
  }
  for (const entry of projectedPipes) {
    include(entry.a[0], entry.a[1], entry.pipe.diameterMm / 2);
    include(entry.b[0], entry.b[1], entry.pipe.diameterMm / 2);
  }

  doc.setTextColor(0, 0, 0);

  if (!Number.isFinite(minU) || !Number.isFinite(minV)) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, cell.x + cell.w / 2, cell.y + cell.h - 2, { align: 'center' });
    return;
  }

  const extW = Math.max(1, maxU - minU);
  const extH = Math.max(1, maxV - minV);
  const dimMargin = withDimensions ? 18 : 9;
  const labelSpace = 5;
  const availW = Math.max(8, cell.w - dimMargin * 2);
  const availH = Math.max(8, cell.h - dimMargin * 2 - labelSpace);
  const scale = Math.min(availW / extW, availH / extH);

  const centerU = (minU + maxU) / 2;
  const centerV = (minV + maxV) / 2;
  const originX = cell.x + cell.w / 2;
  const originY = cell.y + (cell.h - labelSpace) / 2;

  const toPdf = (u: number, v: number): Vec2 => [
    originX + (u - centerU) * scale,
    originY - (v - centerV) * scale,
  ];

  // Rohre als offene Mantellinien
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.22);
  for (const entry of projectedPipes) {
    const a = toPdf(entry.a[0], entry.a[1]);
    const b = toPdf(entry.b[0], entry.b[1]);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);

    if (len > 0.8) {
      const nx = -dy / len;
      const ny = dx / len;
      const offset = (entry.pipe.diameterMm / 2) * scale;
      doc.line(a[0] + nx * offset, a[1] + ny * offset, b[0] + nx * offset, b[1] + ny * offset);
      doc.line(a[0] - nx * offset, a[1] - ny * offset, b[0] - nx * offset, b[1] - ny * offset);
    } else {
      doc.circle(a[0], a[1], (entry.pipe.diameterMm / 2) * scale);
    }
  }

  // Verbinder mit ihren Anschlussarmen
  for (const entry of projectedNodes) {
    drawConnector(doc, entry.node, view, toPdf, scale);
  }

  const left = originX + (minU - centerU) * scale;
  const right = originX + (maxU - centerU) * scale;
  const top = originY - (maxV - centerV) * scale;
  const bottom = originY - (minV - centerV) * scale;

  if (withDimensions) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);

    const hValue = Math.round(maxU - minU);
    const vValue = Math.round(maxV - minV);
    const dimY = bottom + 12;
    const dimX = right + 12;

    // Waagerechte Gesamtbemaßung
    doc.line(left, bottom, left, dimY + 1.5);
    doc.line(right, bottom, right, dimY + 1.5);
    doc.line(left, dimY, right, dimY);
    drawArrow(doc, left, dimY, -1, 0);
    drawArrow(doc, right, dimY, 1, 0);
    doc.text(`${hValue} mm`, (left + right) / 2, dimY - 1.4, { align: 'center' });

    // Senkrechte Gesamtbemaßung
    doc.line(right, top, dimX + 1.5, top);
    doc.line(right, bottom, dimX + 1.5, bottom);
    doc.line(dimX, top, dimX, bottom);
    drawArrow(doc, dimX, top, 0, -1);
    drawArrow(doc, dimX, bottom, 0, 1);
    doc.text(`${vValue} mm`, dimX - 1.4, (top + bottom) / 2, {
      align: 'center',
      angle: 90,
    });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(label, cell.x + cell.w / 2, cell.y + cell.h - 2, { align: 'center' });
}

export function generatePdfDoc(
  meta: ProjectMeta,
  nodes: PlacedNode[],
  pipes: PipeSegment[],
  photo?: ScenePhoto | null
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const bounds = computeFrameBounds(nodes, pipes);
  const { nodeRows, pipeRows } = buildBom(nodes, pipes);
  const load = estimateFrameLoad(nodes, pipes);

  // Seite 1: Stückliste & farbige 3D-Ansicht
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(8, 8, 281, 194);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Stückliste & Material', 12, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(meta.name || 'Rohrgestell-Konfiguration', 12, 24);
  doc.setFontSize(8);
  doc.text(`Gesamtmaße (B × T × H): ${bounds.width} × ${bounds.depth} × ${bounds.height} mm`, 12, 29);
  doc.text(`Datum: ${meta.createdAt || new Date().toISOString().slice(0, 10)} · Autor: ${meta.author || '-'}`, 12, 33.5);

  const photoBox = { x: 176, y: 11, w: 108, h: 62 };
  if (photo) {
    doc.setFillColor(248, 250, 252);
    doc.rect(photoBox.x, photoBox.y, photoBox.w, photoBox.h, 'F');
    const fit = Math.min(photoBox.w / photo.width, photoBox.h / photo.height);
    const imageW = photo.width * fit;
    const imageH = photo.height * fit;
    const imageX = photoBox.x + (photoBox.w - imageW) / 2;
    const imageY = photoBox.y + (photoBox.h - imageH) / 2;
    doc.addImage(photo.dataUrl, 'PNG', imageX, imageY, imageW, imageH);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.rect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
    doc.setTextColor(110, 110, 110);
    doc.setFontSize(7);
    doc.text('3D-Ansicht', photoBox.x + photoBox.w, photoBox.y + photoBox.h + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  let y = photo ? 81 : 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. Rohre', 12, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFillColor(235, 235, 235);
  doc.rect(12, y, 273, 6, 'F');
  doc.text('Pos.', 14, y + 4.2);
  doc.text('Profil / Ø', 26, y + 4.2);
  doc.text('Länge', 78, y + 4.2);
  doc.text('Farbe', 128, y + 4.2);
  doc.text('Menge', 260, y + 4.2);
  y += 7;

  doc.setFont('helvetica', 'normal');
  if (pipeRows.length === 0) {
    doc.text('Keine Rohre vorhanden.', 14, y + 3);
    y += 7;
  } else {
    pipeRows.forEach((row, index) => {
      if (y > 178) {
        doc.addPage('a4', 'landscape');
        doc.rect(8, 8, 281, 194);
        y = 18;
      }
      doc.text(`${index + 1}`, 14, y + 3.5);
      doc.text(`Rundrohr Ø ${row.diameterMm} mm`, 26, y + 3.5);
      doc.text(`${row.lengthMm} mm`, 78, y + 3.5);
      doc.text(row.color, 128, y + 3.5);
      doc.text(`${row.count}×`, 262, y + 3.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(12, y + 5, 285, y + 5);
      y += 6;
    });
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. 3D-Druckteile (Verbinder)', 12, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFillColor(235, 235, 235);
  doc.rect(12, y, 273, 6, 'F');
  doc.text('Art.-Nr.', 14, y + 4.2);
  doc.text('Bezeichnung', 44, y + 4.2);
  doc.text('Ø', 150, y + 4.2);
  doc.text('STL-Datei', 178, y + 4.2);
  doc.text('Menge', 262, y + 4.2);
  y += 7;

  doc.setFont('helvetica', 'normal');
  if (nodeRows.length === 0) {
    doc.text('Keine Verbinder vorhanden.', 14, y + 3);
    y += 7;
  } else {
    nodeRows.forEach((row) => {
      if (y > 178) {
        doc.addPage('a4', 'landscape');
        doc.rect(8, 8, 281, 194);
        y = 18;
      }
      doc.text(row.articleNumber, 14, y + 3.5);
      doc.text(row.name.slice(0, 42), 44, y + 3.5);
      doc.text(row.diameterLabel, 150, y + 3.5);
      doc.text(row.stlPath.split('/').pop() || row.stlPath, 178, y + 3.5);
      doc.text(`${row.count}×`, 262, y + 3.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(12, y + 5, 285, y + 5);
      y += 6;
    });
  }

  y += 8;
  if (y > 150) {
    doc.addPage('a4', 'landscape');
    doc.rect(8, 8, 281, 194);
    y = 18;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(12, y, 273, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Statik-Richtwert & Haftungsausschluss (unverbindliche Schätzung)', 15, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Max. Spannweite: ${load.maxSpanMm} mm (Ø ${load.maxSpanDiameterMm} mm) | Richtwert Einzellast: ~${load.estimatedSafeCenterLoadKg} kg | Gesamtgestell: ~${load.estimatedFrameLoadKg} kg`,
    15,
    y + 10.5
  );
  doc.text(
    'Alle Angaben sind grobe Richtwerte ohne Gewähr. Tragfähigkeit hängt von Material, Druckqualität (Infill, Wandlinien,',
    15,
    y + 16
  );
  doc.text(
    'Layerhaftung) und Rohrwandstärke ab. Bitte eigenverantwortlich prüfen und nachrechnen – keine Haftung.',
    15,
    y + 21
  );
  doc.text(
    '3D-gedruckte Verbinder können unter Dauerlast kriechen oder an Schichtgrenzen brechen.',
    15,
    y + 25.5
  );

  // Seite 2: Bemaßungszeichnung
  doc.addPage('a4', 'landscape');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(8, 8, 281, 194);

  // Schriftfeld
  doc.setLineWidth(0.35);
  doc.rect(10, 10, 277, 20);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Bemaßungszeichnung', 14, 19);
  doc.setFontSize(9);
  doc.text(meta.name || 'Rohrgestell-Konfiguration', 14, 25.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Gesamtmaße (B × T × H): ${bounds.width} × ${bounds.depth} × ${bounds.height} mm`, 180, 16);
  doc.text(`Datum: ${meta.createdAt || new Date().toISOString().slice(0, 10)}`, 180, 21);
  doc.text(`Autor: ${meta.author || '-'}`, 180, 25.5);
  doc.text('Maße in mm · Ansichten nicht maßstäblich · ohne Arbeitsfläche · Verbinder symbolisch', 14, 28.5);

  const views: Array<{ view: DrawingViewId; label: string; dims: boolean }> = [
    { view: 'front', label: 'Vorne', dims: true },
    { view: 'back', label: 'Hinten', dims: true },
    { view: 'top', label: 'Oben', dims: true },
    { view: 'left', label: 'Seite links', dims: true },
    { view: 'right', label: 'Seite rechts', dims: true },
    { view: 'iso', label: 'Isometrie', dims: false },
  ];

  const gridX = 10;
  const gridY = 36;
  const gridW = 277;
  const gridH = 162;
  const gap = 4;
  const cellW = (gridW - gap * 2) / 3;
  const cellH = (gridH - gap) / 2;

  views.forEach((entry, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const cell: ViewCell = {
      x: gridX + col * (cellW + gap),
      y: gridY + row * (cellH + gap),
      w: cellW,
      h: cellH,
    };

    drawView(doc, entry.view, entry.label, nodes, pipes, cell, entry.dims);
  });

  return doc;
}

export async function downloadZipBundle(projectFile: ProjectFile, photo?: ScenePhoto | null): Promise<void> {
  const zip = new JSZip();
  const safeName = (projectFile.meta.name || 'gestell').replace(/[^a-zA-Z0-9_-]+/g, '_');

  // 1. PDF
  const pdf = generatePdfDoc(projectFile.meta, projectFile.nodes, projectFile.pipes, photo);
  zip.file(`${safeName}_Zeichnung_Stueckliste.pdf`, pdf.output('arraybuffer'));

  // 2. Projekt-JSON
  zip.file(`${safeName}_projekt.json`, JSON.stringify(projectFile, null, 2));

  // 3. CSV-Stückliste
  const { nodeRows, pipeRows } = buildBom(projectFile.nodes, projectFile.pipes);
  const csvLines = [
    'Typ;Artikelnummer;Bezeichnung;Durchmesser;Laenge_mm;Farbe;Menge;STL_Datei',
    ...pipeRows.map((p) => `Rohr;-;Rundrohr;${p.diameterMm}mm;${p.lengthMm};${p.color};${p.count};-`),
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
