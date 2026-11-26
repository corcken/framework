import * as THREE from 'three';
import { PlacedNode, PipeSegment, PortDef } from '../types/system';

export function getWorldPort(node: PlacedNode, port: PortDef): {
  pos: [number, number, number];
  dir: [number, number, number];
} {
  const euler = new THREE.Euler(node.rotationEuler[0], node.rotationEuler[1], node.rotationEuler[2], 'XYZ');
  const q = new THREE.Quaternion().setFromEuler(euler);

  const p = new THREE.Vector3(...port.localPos).applyQuaternion(q).add(new THREE.Vector3(...node.position));
  const d = new THREE.Vector3(...port.localDir).applyQuaternion(q).normalize();

  return {
    pos: [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, Math.round(p.z * 10) / 10],
    dir: [d.x, d.y, d.z],
  };
}

export function getPipeAxisLengthMm(pipe: PipeSegment): number {
  const dx = pipe.endPos[0] - pipe.startPos[0];
  const dy = pipe.endPos[1] - pipe.startPos[1];
  const dz = pipe.endPos[2] - pipe.startPos[2];
  return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
}

export interface BoundingBoxMm {
  width: number;
  depth: number;
  height: number;
  min: [number, number, number];
  max: [number, number, number];
}

export function computeFrameBounds(nodes: PlacedNode[], pipes: PipeSegment[]): BoundingBoxMm {
  if (nodes.length === 0 && pipes.length === 0) {
    return { width: 0, depth: 0, height: 0, min: [0, 0, 0], max: [0, 0, 0] };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  const pushPt = (p: [number, number, number], pad = 0) => {
    minX = Math.min(minX, p[0] - pad);
    minY = Math.min(minY, p[1] - pad);
    minZ = Math.min(minZ, p[2] - pad);
    maxX = Math.max(maxX, p[0] + pad);
    maxY = Math.max(maxY, p[1] + pad);
    maxZ = Math.max(maxZ, p[2] + pad);
  };

  for (const n of nodes) pushPt(n.position, n.diameterMm * 0.7);
  for (const p of pipes) {
    pushPt(p.startPos, p.diameterMm / 2);
    pushPt(p.endPos, p.diameterMm / 2);
  }

  return {
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
    depth: Math.round(maxZ - minZ),
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
  };
}

export interface LoadEstimate {
  maxSpanMm: number;
  maxSpanDiameterMm: number;
  estimatedSafeCenterLoadKg: number;
  estimatedFrameLoadKg: number;
  warnings: string[];
}

/**
 * Unverbindliche statische Überschlagsrechnung für Aluminium-/Stahl-Rundrohre
 * in Kombination mit 3D-gedruckten PLA/PETG-Verbindern.
 * Keine Gewährleistung oder Haftung!
 */
export function estimateFrameLoad(nodes: PlacedNode[], pipes: PipeSegment[]): LoadEstimate {
  const warnings: string[] = [];
  if (pipes.length === 0) {
    return {
      maxSpanMm: 0,
      maxSpanDiameterMm: 0,
      estimatedSafeCenterLoadKg: 0,
      estimatedFrameLoadKg: 0,
      warnings: ['Noch keine Rohre im Gestell vorhanden.'],
    };
  }

  let maxSpanMm = 0;
  let maxSpanDiameterMm = 20;

  // Finde längstes horizontales bzw. freitragendes Rohr
  for (const pipe of pipes) {
    const len = getPipeAxisLengthMm(pipe);
    if (len > maxSpanMm) {
      maxSpanMm = len;
      maxSpanDiameterMm = pipe.diameterMm;
    }
  }

  // Vereinfachte Balkenbiegung (Alu-Rohr, Wand ~1.5-2mm, zul. Durchbiegung L/200)
  // Trägheitsmoment I ≈ pi/64 * (D^4 - d^4)
  const D = maxSpanDiameterMm;
  const wall = D >= 30 ? 2.0 : 1.5;
  const dIn = D - 2 * wall;
  const I = (Math.PI / 64) * (Math.pow(D, 4) - Math.pow(dIn, 4)); // mm^4
  const E = 70000; // N/mm^2 (Aluminium)
  const L = Math.max(100, maxSpanMm);
  const fMax = L / 200; // mm zulässige Durchbiegung

  // F = (48 * E * I * fMax) / L^3  [N]
  const forceN = (48 * E * I * fMax) / Math.pow(L, 3);
  const beamKg = forceN / 9.81;

  // Begrenzung durch 3D-gedruckte Verbinder (Schichthaftung / Scherkraft Richtwert)
  const connectorCapKg = D <= 20 ? 15 : D <= 25 ? 25 : D <= 30 ? 35 : 55;
  const safeCenterKg = Math.max(1, Math.round(Math.min(beamKg, connectorCapKg)));
  const safeFrameKg = Math.round(safeCenterKg * Math.min(4, Math.max(1, nodes.filter((n) => n.catalogId === 'Fuss').length || 2)));

  if (maxSpanMm > 1200 && maxSpanDiameterMm <= 25) {
    warnings.push(`Große Spannweite (${maxSpanMm} mm) bei Ø${maxSpanDiameterMm} mm – Querstrebe oder Ø30/40 mm empfohlen.`);
  }
  if (nodes.length > 0 && pipes.length > 0) {
    warnings.push('3D-gedruckte Verbinder (PLA/PETG) können bei Dauerlast kriechen oder an Layer-Grenzen brechen.');
  }

  return {
    maxSpanMm,
    maxSpanDiameterMm,
    estimatedSafeCenterLoadKg: safeCenterKg,
    estimatedFrameLoadKg: safeFrameKg,
    warnings,
  };
}
