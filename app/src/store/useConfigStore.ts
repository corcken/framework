import { create } from 'zustand';
import * as THREE from 'three';
import { getCatalogItem, PART_COLORS, PIPE_COLORS } from '../data/catalog';
import { getExample } from '../data/examples';
import { PlacedNode, PipeSegment, PortDef, ProjectFile, ProjectMeta } from '../types/system';
import { getWorldPort } from '../utils/geometry';

export type CameraPreset =
  | 'iso'
  | 'top'
  | 'bottom'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | [number, number, number];

export interface PendingPortRef {
  nodeUid: string;
  portId: string;
}

export interface SnapPreview {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
}

type Vec3 = [number, number, number];

interface ConfigState {
  meta: ProjectMeta;
  nodes: PlacedNode[];
  pipes: PipeSegment[];
  selectedDiameter: number;
  selectedReducerPair: [number, number];
  activePartColor: string;
  activePipeColor: string;
  selectedUid: string | null;
  selectedType: 'node' | 'pipe' | null;
  pendingPort: PendingPortRef | null;
  showDimensions: boolean;
  snapDistanceMm: number;
  snapPreviews: SnapPreview[];
  moveConnectedGroup: boolean;
  cameraPreset: CameraPreset;
  cameraTick: number;

  setMeta: (partial: Partial<ProjectMeta>) => void;
  setSelectedDiameter: (d: number) => void;
  setSelectedReducerPair: (pair: [number, number]) => void;
  setActivePartColor: (hex: string) => void;
  setActivePipeColor: (hex: string) => void;
  setShowDimensions: (v: boolean) => void;
  setSnapDistanceMm: (d: number) => void;
  setMoveConnectedGroup: (v: boolean) => void;
  triggerCamera: (preset: CameraPreset) => void;

  selectItem: (uid: string | null, type: 'node' | 'pipe' | null) => void;
  setPendingPort: (ref: PendingPortRef | null) => void;

  addNode: (catalogId: string, position: [number, number, number], diameterMm?: number, secondDiameterMm?: number) => string | null;
  moveNode: (uid: string, position: [number, number, number]) => void;
  previewMoveNode: (uid: string, position: [number, number, number]) => void;
  movePipe: (uid: string, newMid: [number, number, number]) => void;
  previewMovePipe: (uid: string, newMid: [number, number, number]) => void;
  dropSelectedToGround: () => void;
  toggleLockSelected: () => void;
  togglePipeConnectionLock: (pipeUid: string, end: 'start' | 'end') => void;
  rotateNodeAxis: (uid: string, axis: 'x' | 'y' | 'z', deg: number) => void;
  rotatePipeAxis: (uid: string, axis: 'x' | 'y' | 'z', deg: number) => void;
  rotateSelectedAxis: (axis: 'x' | 'y' | 'z', deg: number) => void;
  setItemColor: (uid: string, type: 'node' | 'pipe', color: string) => void;
  deleteSelected: () => void;

  connectPorts: (a: PendingPortRef, b: PendingPortRef) => void;
  addPipeFromPort: (from: PendingPortRef, lengthMm: number) => void;
  addFreePipe: (startPos: [number, number, number], endPos: [number, number, number], diameterMm?: number) => void;
  updatePipeLength: (uid: string, newLengthMm: number) => void;

  loadDemoFrame: () => void;
  loadExample: (id: string) => void;
  clearProject: () => void;
  exportProjectFile: () => ProjectFile;
  importProjectFile: (data: ProjectFile) => void;
}

let uidCounter = 1;
function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}`;
}

function snapCoord(v: number, step: number): number {
  if (step <= 0) return Math.round(v * 10) / 10;
  return Math.round(v / step) * step;
}

function rotateVecAroundAxis(
  v: [number, number, number],
  axis: 'x' | 'y' | 'z',
  rad: number
): [number, number, number] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const [x, y, z] = v;
  if (axis === 'x') return [x, y * c - z * s, y * s + z * c];
  if (axis === 'y') return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}

function getConnectedComponent(
  pipes: PipeSegment[],
  seedNodeUids: string[],
  seedPipeUids: string[]
): { nodeUids: Set<string>; pipeUids: Set<string> } {
  const nodeUids = new Set<string>(seedNodeUids);
  const pipeUids = new Set<string>(seedPipeUids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of pipes) {
      const startLocked = Boolean(p.startNodeUid) && p.startLocked !== false;
      const endLocked = Boolean(p.endNodeUid) && p.endLocked !== false;
      const hasStart = startLocked && p.startNodeUid ? nodeUids.has(p.startNodeUid) : false;
      const hasEnd = endLocked && p.endNodeUid ? nodeUids.has(p.endNodeUid) : false;
      if (pipeUids.has(p.uid) || hasStart || hasEnd) {
        if (!pipeUids.has(p.uid)) {
          pipeUids.add(p.uid);
          changed = true;
        }
        if (startLocked && p.startNodeUid && !nodeUids.has(p.startNodeUid)) {
          nodeUids.add(p.startNodeUid);
          changed = true;
        }
        if (endLocked && p.endNodeUid && !nodeUids.has(p.endNodeUid)) {
          nodeUids.add(p.endNodeUid);
          changed = true;
        }
      }
    }
  }
  return { nodeUids, pipeUids };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function clampY(v: number): number {
  return Math.max(0, v);
}

function dist3(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

interface PortCandidate {
  node: PlacedNode;
  port: PortDef;
  world: Vec3;
  dist: number;
}

function bestPortCandidate(
  nodes: PlacedNode[],
  point: Vec3,
  snapDist: number,
  excludeNodeUids: Set<string>,
  excludePortKeys: Set<string>
): PortCandidate | null {
  let best: PortCandidate | null = null;
  let bestDist = snapDist;
  for (const node of nodes) {
    if (excludeNodeUids.has(node.uid)) continue;
    for (const port of node.ports) {
      const key = `${node.uid}:${port.id}`;
      if (excludePortKeys.has(key)) continue;
      const world = getWorldPort(node, port).pos;
      const d = dist3(world, point);
      if (d <= bestDist) {
        bestDist = d;
        best = { node, port, world, dist: d };
      }
    }
  }
  return best;
}

/** Verschiebt einen Knoten live (ohne Einrasten, mit Gummi-Vorschau) oder final (mit Einrasten). */
function computeNodeMovePatch(
  s: ConfigState,
  uid: string,
  position: Vec3,
  mode: 'live' | 'final'
): Partial<ConfigState> | null {
  const targetNode = s.nodes.find((n) => n.uid === uid);
  if (!targetNode || targetNode.locked) return null;

  const group = s.moveConnectedGroup
    ? getConnectedComponent(s.pipes, [uid], [])
    : { nodeUids: new Set([uid]), pipeUids: new Set<string>() };

  if (s.moveConnectedGroup) {
    const hasLockedNode = s.nodes.some((n) => group.nodeUids.has(n.uid) && n.locked);
    const hasLockedPipe = s.pipes.some((p) => group.pipeUids.has(p.uid) && p.locked);
    if (hasLockedNode || hasLockedPipe) return null;
  }

  let finalPos: Vec3 = [round1(position[0]), clampY(round1(position[1])), round1(position[2])];

  let preview: SnapPreview | null = null;
  let snapDelta: Vec3 | null = null;
  let snapNodePortId: string | undefined;
  let snapTargetPipe: { uid: string; end: 'start' | 'end' } | null = null;

  const snapDist = s.snapDistanceMm;
  if (snapDist > 0) {
    const candidateNode: PlacedNode = { ...targetNode, position: finalPos };
    let bestDist = snapDist;

    // 1. Gegen Ports externer Verbinder prüfen
    for (const myPort of candidateNode.ports) {
      const myWorld = getWorldPort(candidateNode, myPort).pos;
      for (const other of s.nodes) {
        if (group.nodeUids.has(other.uid)) continue;
        for (const otherPort of other.ports) {
          const otherWorld = getWorldPort(other, otherPort).pos;
          const d = dist3(otherWorld, myWorld);
          if (d <= bestDist) {
            bestDist = d;
            snapDelta = [
              otherWorld[0] - myWorld[0],
              otherWorld[1] - myWorld[1],
              otherWorld[2] - myWorld[2],
            ];
            preview = { id: `node-${uid}-snap`, start: myWorld, end: otherWorld };
            snapNodePortId = myPort.id;
            snapTargetPipe = null;
          }
        }
      }

      // 2. Gegen freie Rohrenden externer Rohre prüfen
      for (const pipe of s.pipes) {
        if (group.pipeUids.has(pipe.uid)) continue;
        if (!pipe.startNodeUid) {
          const d = dist3(pipe.startPos, myWorld);
          if (d <= bestDist) {
            bestDist = d;
            snapDelta = [
              pipe.startPos[0] - myWorld[0],
              pipe.startPos[1] - myWorld[1],
              pipe.startPos[2] - myWorld[2],
            ];
            preview = { id: `node-${uid}-snap`, start: myWorld, end: pipe.startPos };
            snapNodePortId = myPort.id;
            snapTargetPipe = { uid: pipe.uid, end: 'start' };
          }
        }
        if (!pipe.endNodeUid) {
          const d = dist3(pipe.endPos, myWorld);
          if (d <= bestDist) {
            bestDist = d;
            snapDelta = [
              pipe.endPos[0] - myWorld[0],
              pipe.endPos[1] - myWorld[1],
              pipe.endPos[2] - myWorld[2],
            ];
            preview = { id: `node-${uid}-snap`, start: myWorld, end: pipe.endPos };
            snapNodePortId = myPort.id;
            snapTargetPipe = { uid: pipe.uid, end: 'end' };
          }
        }
      }
    }
  }

  if (mode === 'final' && snapDelta) {
    finalPos = [
      round1(finalPos[0] + snapDelta[0]),
      clampY(round1(finalPos[1] + snapDelta[1])),
      round1(finalPos[2] + snapDelta[2]),
    ];
  }

  const dx = finalPos[0] - targetNode.position[0];
  let dy = finalPos[1] - targetNode.position[1];
  const dz = finalPos[2] - targetNode.position[2];

  if (s.moveConnectedGroup && group.nodeUids.size > 1) {
    let minNewY = Infinity;
    for (const n of s.nodes) {
      if (group.nodeUids.has(n.uid)) {
        minNewY = Math.min(minNewY, n.position[1] + dy);
      }
    }
    if (minNewY < 0) dy -= minNewY;
  }

  const nextNodes = s.nodes.map((n) => {
    if (!group.nodeUids.has(n.uid)) return n;
    return {
      ...n,
      position: [
        round1(n.position[0] + dx),
        clampY(round1(n.position[1] + dy)),
        round1(n.position[2] + dz),
      ] as Vec3,
    };
  });

  const nextPipes = s.pipes.map((p) => {
    if (s.moveConnectedGroup && group.pipeUids.has(p.uid)) {
      return {
        ...p,
        startPos: [p.startPos[0] + dx, p.startPos[1] + dy, p.startPos[2] + dz] as Vec3,
        endPos: [p.endPos[0] + dx, p.endPos[1] + dy, p.endPos[2] + dz] as Vec3,
      };
    }
    // Nicht mitbewegte Rohre werden am verschobenen Knoten gelöst,
    // damit ihre Länge unverändert bleibt.
    let updated = { ...p };
    if (p.startNodeUid === uid) {
      updated.startNodeUid = undefined;
      updated.startPortId = undefined;
      updated.startLocked = undefined;
      updated.startInsertionMm = 0;
    }
    if (p.endNodeUid === uid) {
      updated.endNodeUid = undefined;
      updated.endPortId = undefined;
      updated.endLocked = undefined;
      updated.endInsertionMm = 0;
    }
    return updated;
  });

  let finalPipes = nextPipes;
  const target = snapTargetPipe;
  if (mode === 'final' && target && snapNodePortId) {
    const movedNode = nextNodes.find((n) => n.uid === uid);
    const port = movedNode?.ports.find((pt) => pt.id === snapNodePortId);
    const targetIndex = finalPipes.findIndex((p) => p.uid === target.uid);
    if (movedNode && port && targetIndex >= 0) {
      const targetPipe = finalPipes[targetIndex];
      const connectedPipe: PipeSegment =
        target.end === 'start'
          ? {
              ...targetPipe,
              startNodeUid: uid,
              startPortId: port.id,
              startLocked: true,
              startInsertionMm: port.insertionDepthMm,
            }
          : {
              ...targetPipe,
              endNodeUid: uid,
              endPortId: port.id,
              endLocked: true,
              endInsertionMm: port.insertionDepthMm,
            };
      finalPipes = finalPipes.map((p, index) => (index === targetIndex ? connectedPipe : p));
    }
  }

  return {
    nodes: nextNodes,
    pipes: finalPipes,
    snapPreviews: mode === 'live' && preview ? [preview] : [],
  };
}

function attachPipeEnds(
  pipe: PipeSegment,
  nodes: PlacedNode[],
  tolerance: number,
  excludeNodeUids: Set<string>
): PipeSegment {
  let updated = { ...pipe };
  const usedPorts = new Set<string>();

  if (!updated.startNodeUid) {
    const cand = bestPortCandidate(nodes, updated.startPos, tolerance, excludeNodeUids, usedPorts);
    if (cand) {
      usedPorts.add(`${cand.node.uid}:${cand.port.id}`);
      updated = {
        ...updated,
        startNodeUid: cand.node.uid,
        startPortId: cand.port.id,
        startLocked: true,
        startInsertionMm: cand.port.insertionDepthMm,
      };
    }
  }

  if (!updated.endNodeUid) {
    const cand = bestPortCandidate(nodes, updated.endPos, tolerance, excludeNodeUids, usedPorts);
    if (cand) {
      updated = {
        ...updated,
        endNodeUid: cand.node.uid,
        endPortId: cand.port.id,
        endLocked: true,
        endInsertionMm: cand.port.insertionDepthMm,
      };
    }
  }

  return updated;
}

/** Verschiebt ein Rohr starr (Länge bleibt unverändert) und rastet es optional an Ports ein. */
function computePipeMovePatch(
  s: ConfigState,
  uid: string,
  newMid: Vec3,
  mode: 'live' | 'final'
): Partial<ConfigState> | null {
  const targetPipe = s.pipes.find((p) => p.uid === uid);
  if (!targetPipe || targetPipe.locked) return null;

  const oldMid: Vec3 = [
    (targetPipe.startPos[0] + targetPipe.endPos[0]) / 2,
    (targetPipe.startPos[1] + targetPipe.endPos[1]) / 2,
    (targetPipe.startPos[2] + targetPipe.endPos[2]) / 2,
  ];
  const delta: Vec3 = [
    newMid[0] - oldMid[0],
    newMid[1] - oldMid[1],
    newMid[2] - oldMid[2],
  ];

  const hasLockedConnection =
    (Boolean(targetPipe.startNodeUid) && targetPipe.startLocked !== false) ||
    (Boolean(targetPipe.endNodeUid) && targetPipe.endLocked !== false);

  // Verbund-Verschieben für angeschlossenes Gestell mit geschlossenen Schlössern
  if (s.moveConnectedGroup && hasLockedConnection) {
    const group = getConnectedComponent(s.pipes, [], [uid]);
    const hasLockedNode = s.nodes.some((n) => group.nodeUids.has(n.uid) && n.locked);
    const hasLockedPipe = s.pipes.some((p) => group.pipeUids.has(p.uid) && p.locked);
    if (hasLockedNode || hasLockedPipe) return null;

    let dx = delta[0];
    let dy = delta[1];
    let dz = delta[2];

    const clampGroupY = () => {
      let minNewY = Infinity;
      for (const n of s.nodes) {
        if (group.nodeUids.has(n.uid)) minNewY = Math.min(minNewY, n.position[1] + dy);
      }
      for (const p of s.pipes) {
        if (group.pipeUids.has(p.uid)) {
          minNewY = Math.min(minNewY, p.startPos[1] + dy, p.endPos[1] + dy);
        }
      }
      if (minNewY < 0) dy -= minNewY;
    };
    clampGroupY();

    const provisionalStart: Vec3 = [
      targetPipe.startPos[0] + dx,
      targetPipe.startPos[1] + dy,
      targetPipe.startPos[2] + dz,
    ];
    const provisionalEnd: Vec3 = [
      targetPipe.endPos[0] + dx,
      targetPipe.endPos[1] + dy,
      targetPipe.endPos[2] + dz,
    ];

    const freeEnds: Array<{ end: 'start' | 'end'; point: Vec3 }> = [];
    if (!targetPipe.startNodeUid || targetPipe.startLocked === false) {
      freeEnds.push({ end: 'start', point: provisionalStart });
    }
    if (!targetPipe.endNodeUid || targetPipe.endLocked === false) {
      freeEnds.push({ end: 'end', point: provisionalEnd });
    }

    const excludedNodes = new Set(group.nodeUids);
    let best: { end: 'start' | 'end'; cand: PortCandidate } | null = null;
    for (const fe of freeEnds) {
      const cand = bestPortCandidate(s.nodes, fe.point, s.snapDistanceMm, excludedNodes, new Set());
      if (!cand) continue;
      if (!best || cand.dist < best.cand.dist) best = { end: fe.end, cand };
    }

    if (mode === 'final' && best) {
      const point = best.end === 'start' ? provisionalStart : provisionalEnd;
      dx += best.cand.world[0] - point[0];
      dy += best.cand.world[1] - point[1];
      dz += best.cand.world[2] - point[2];
      clampGroupY();
    }

    let nextPipes = s.pipes.map((p) => {
      if (!group.pipeUids.has(p.uid)) return p;
      const detachStart = p.startNodeUid && p.startLocked === false;
      const detachEnd = p.endNodeUid && p.endLocked === false;
      return {
        ...p,
        startPos: [p.startPos[0] + dx, p.startPos[1] + dy, p.startPos[2] + dz] as Vec3,
        endPos: [p.endPos[0] + dx, p.endPos[1] + dy, p.endPos[2] + dz] as Vec3,
        ...(detachStart
          ? { startNodeUid: undefined, startPortId: undefined, startLocked: undefined, startInsertionMm: 0 }
          : {}),
        ...(detachEnd
          ? { endNodeUid: undefined, endPortId: undefined, endLocked: undefined, endInsertionMm: 0 }
          : {}),
      };
    });

    if (mode === 'final' && s.snapDistanceMm > 0) {
      nextPipes = nextPipes.map((p) =>
        p.uid === uid ? attachPipeEnds(p, s.nodes, 1.5, excludedNodes) : p
      );
    }

    const nextNodes = s.nodes.map((n) =>
      group.nodeUids.has(n.uid)
        ? {
            ...n,
            position: [
              round1(n.position[0] + dx),
              clampY(round1(n.position[1] + dy)),
              round1(n.position[2] + dz),
            ] as Vec3,
          }
        : n
    );

    const previews: SnapPreview[] = [];
    if (mode === 'live') {
      for (const fe of freeEnds) {
        const cand = bestPortCandidate(s.nodes, fe.point, s.snapDistanceMm, excludedNodes, new Set());
        if (cand) previews.push({ id: `pipe-${uid}-${fe.end}`, start: fe.point, end: cand.world });
      }
    }

    return { nodes: nextNodes, pipes: nextPipes, snapPreviews: previews };
  }

  // Einzelnes Rohr: nur starr verschieben, niemals die Länge ändern
  let nextStart: Vec3 = [
    targetPipe.startPos[0] + delta[0],
    targetPipe.startPos[1] + delta[1],
    targetPipe.startPos[2] + delta[2],
  ];
  let nextEnd: Vec3 = [
    targetPipe.endPos[0] + delta[0],
    targetPipe.endPos[1] + delta[1],
    targetPipe.endPos[2] + delta[2],
  ];

  const excludedNodes = new Set<string>();
  const startCand = bestPortCandidate(s.nodes, nextStart, s.snapDistanceMm, excludedNodes, new Set());
  const endCand = bestPortCandidate(
    s.nodes,
    nextEnd,
    s.snapDistanceMm,
    excludedNodes,
    startCand ? new Set([`${startCand.node.uid}:${startCand.port.id}`]) : new Set()
  );

  let best: { end: 'start' | 'end'; cand: PortCandidate } | null = null;
  if (startCand) best = { end: 'start', cand: startCand };
  if (endCand && (!best || endCand.dist < best.cand.dist)) best = { end: 'end', cand: endCand };

  if (mode === 'final') {
    let alignedBoth = false;

    // Wenn beide Enden nahe genug an Ports liegen und die Länge passt:
    // Rohr starr drehen und verschieben, ohne die Länge zu verändern.
    if (startCand && endCand) {
      const pipeVec = new THREE.Vector3(
        nextEnd[0] - nextStart[0],
        nextEnd[1] - nextStart[1],
        nextEnd[2] - nextStart[2]
      );
      const targetVec = new THREE.Vector3(
        endCand.world[0] - startCand.world[0],
        endCand.world[1] - startCand.world[1],
        endCand.world[2] - startCand.world[2]
      );
      const pipeLen = pipeVec.length();
      const targetLen = targetVec.length();

      if (pipeLen > 0.001 && Math.abs(pipeLen - targetLen) <= 1.5) {
        const quat = new THREE.Quaternion().setFromUnitVectors(
          pipeVec.clone().normalize(),
          targetVec.clone().normalize()
        );
        const rotated = pipeVec.clone().applyQuaternion(quat);
        nextStart = startCand.world;
        nextEnd = [
          nextStart[0] + rotated.x,
          nextStart[1] + rotated.y,
          nextStart[2] + rotated.z,
        ];
        alignedBoth = true;
      }
    }

    if (!alignedBoth && best) {
      const point = best.end === 'start' ? nextStart : nextEnd;
      const shift: Vec3 = [
        best.cand.world[0] - point[0],
        best.cand.world[1] - point[1],
        best.cand.world[2] - point[2],
      ];
      nextStart = [nextStart[0] + shift[0], nextStart[1] + shift[1], nextStart[2] + shift[2]];
      nextEnd = [nextEnd[0] + shift[0], nextEnd[1] + shift[1], nextEnd[2] + shift[2]];
    }
  }

  let nextPipe: PipeSegment = {
    ...targetPipe,
    startPos: nextStart,
    endPos: nextEnd,
    startNodeUid: undefined,
    startPortId: undefined,
    startLocked: undefined,
    startInsertionMm: 0,
    endNodeUid: undefined,
    endPortId: undefined,
    endLocked: undefined,
    endInsertionMm: 0,
  };

  if (mode === 'final' && s.snapDistanceMm > 0) {
    nextPipe = attachPipeEnds(nextPipe, s.nodes, 1.5, excludedNodes);
  }

  const previews: SnapPreview[] = [];
  if (mode === 'live') {
    if (startCand) {
      previews.push({ id: `pipe-${uid}-start`, start: nextStart, end: startCand.world });
    }
    if (endCand) {
      previews.push({ id: `pipe-${uid}-end`, start: nextEnd, end: endCand.world });
    }
  }

  return {
    pipes: s.pipes.map((p) => (p.uid === uid ? nextPipe : p)),
    snapPreviews: previews,
  };
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  meta: {
    name: 'Mein Rohrgestell',
    author: '',
    notes: '',
    createdAt: new Date().toISOString().slice(0, 10),
  },
  nodes: [],
  pipes: [],
  selectedDiameter: 25,
  selectedReducerPair: [40, 30],
  activePartColor: PART_COLORS[0].hex,
  activePipeColor: PIPE_COLORS[0].hex,
  selectedUid: null,
  selectedType: null,
  pendingPort: null,
  showDimensions: false,
  snapDistanceMm: 50,
  snapPreviews: [],
  moveConnectedGroup: true,
  cameraPreset: 'iso',
  cameraTick: 0,

  setMeta: (partial) => set((s) => ({ meta: { ...s.meta, ...partial } })),
  setSelectedDiameter: (d) => set({ selectedDiameter: d }),
  setSelectedReducerPair: (pair) => set({ selectedReducerPair: pair }),
  setActivePartColor: (hex) => set({ activePartColor: hex }),
  setActivePipeColor: (hex) => set({ activePipeColor: hex }),
  setShowDimensions: (v) => set({ showDimensions: v }),
  setSnapDistanceMm: (d) => set({ snapDistanceMm: Math.max(0, Math.round(d)) }),
  setMoveConnectedGroup: (v) => set({ moveConnectedGroup: v }),
  triggerCamera: (preset) => set((s) => ({ cameraPreset: preset, cameraTick: s.cameraTick + 1 })),

  selectItem: (uid, type) => set({ selectedUid: uid, selectedType: type }),
  setPendingPort: (ref) => set({ pendingPort: ref }),

  addNode: (catalogId, position, diameterMm, secondDiameterMm) => {
    const item = getCatalogItem(catalogId);
    if (!item) return null;
    const state = get();
    const d = diameterMm ?? (item.isReducer ? state.selectedReducerPair[0] : state.selectedDiameter);
    const d2 = secondDiameterMm ?? (item.isReducer ? state.selectedReducerPair[1] : undefined);
    const variant = item.getVariant(d, d2);
    const uid = nextUid('node');
    const snap = state.snapDistanceMm;

    const newNode: PlacedNode = {
      uid,
      catalogId: item.id,
      articleNumber: variant.articleNumber,
      diameterMm: d,
      secondDiameterMm: d2,
      position: [snapCoord(position[0], snap), Math.max(0, snapCoord(position[1], snap)), snapCoord(position[2], snap)],
      rotationEuler: [0, 0, 0],
      color: state.activePartColor,
      stlPath: variant.stlPath,
      ports: variant.ports,
    };

    set((s) => ({
      nodes: [...s.nodes, newNode],
      selectedUid: uid,
      selectedType: 'node',
    }));
    return uid;
  },

  moveNode: (uid, position) => {
    const patch = computeNodeMovePatch(get(), uid, position, 'final');
    if (patch) set(patch);
  },

  previewMoveNode: (uid, position) => {
    const patch = computeNodeMovePatch(get(), uid, position, 'live');
    if (patch) set(patch);
  },

  movePipe: (uid, newMid) => {
    const patch = computePipeMovePatch(get(), uid, newMid, 'final');
    if (patch) set(patch);
  },

  previewMovePipe: (uid, newMid) => {
    const patch = computePipeMovePatch(get(), uid, newMid, 'live');
    if (patch) set(patch);
  },

  dropSelectedToGround: () =>
    set((s) => {
      if (!s.selectedUid || !s.selectedType) return s;
      if (s.selectedType === 'node') {
        const target = s.nodes.find((n) => n.uid === s.selectedUid);
        if (!target || target.locked) return s;
      } else {
        const target = s.pipes.find((p) => p.uid === s.selectedUid);
        if (!target || target.locked) return s;
      }

      if (s.moveConnectedGroup) {
        const group = getConnectedComponent(
          s.pipes,
          s.selectedType === 'node' ? [s.selectedUid] : [],
          s.selectedType === 'pipe' ? [s.selectedUid] : []
        );
        const hasLockedNode = s.nodes.some((n) => group.nodeUids.has(n.uid) && n.locked);
        const hasLockedPipe = s.pipes.some((p) => group.pipeUids.has(p.uid) && p.locked);
        if (hasLockedNode || hasLockedPipe) return s;

        let minY = Infinity;
        for (const n of s.nodes) {
          if (group.nodeUids.has(n.uid)) minY = Math.min(minY, n.position[1]);
        }
        for (const p of s.pipes) {
          if (group.pipeUids.has(p.uid)) minY = Math.min(minY, p.startPos[1], p.endPos[1]);
        }
        if (!Number.isFinite(minY)) return s;

        return {
          nodes: s.nodes.map((n) =>
            group.nodeUids.has(n.uid)
              ? { ...n, position: [n.position[0], Math.max(0, Math.round((n.position[1] - minY) * 10) / 10), n.position[2]] as [number, number, number] }
              : n
          ),
          pipes: s.pipes.map((p) =>
            group.pipeUids.has(p.uid)
              ? {
                  ...p,
                  startPos: [p.startPos[0], p.startPos[1] - minY, p.startPos[2]] as [number, number, number],
                  endPos: [p.endPos[0], p.endPos[1] - minY, p.endPos[2]] as [number, number, number],
                }
              : p
          ),
        };
      }

      if (s.selectedType === 'node') {
        const uid = s.selectedUid;
        const nextNodes = s.nodes.map((n) =>
          n.uid === uid ? { ...n, position: [n.position[0], 0, n.position[2]] as [number, number, number] } : n
        );
        const nextPipes = s.pipes.map((p) => {
          let updated = { ...p };
          if (p.startNodeUid === uid) {
            updated.startNodeUid = undefined;
            updated.startPortId = undefined;
            updated.startLocked = undefined;
            updated.startInsertionMm = 0;
          }
          if (p.endNodeUid === uid) {
            updated.endNodeUid = undefined;
            updated.endPortId = undefined;
            updated.endLocked = undefined;
            updated.endInsertionMm = 0;
          }
          return updated;
        });
        return { nodes: nextNodes, pipes: nextPipes };
      }

      const uid = s.selectedUid;
      return {
        pipes: s.pipes.map((p) => {
          if (p.uid !== uid || p.locked) return p;
          const dy = -Math.min(p.startPos[1], p.endPos[1]);
          return {
            ...p,
            startPos: [p.startPos[0], p.startPos[1] + dy, p.startPos[2]],
            endPos: [p.endPos[0], p.endPos[1] + dy, p.endPos[2]],
            startNodeUid: undefined,
            startPortId: undefined,
            startLocked: undefined,
            startInsertionMm: 0,
            endNodeUid: undefined,
            endPortId: undefined,
            endLocked: undefined,
            endInsertionMm: 0,
          };
        }),
      };
    }),

  toggleLockSelected: () =>
    set((s) => {
      if (!s.selectedUid || !s.selectedType) return s;
      if (s.selectedType === 'node') {
        return {
          nodes: s.nodes.map((n) => (n.uid === s.selectedUid ? { ...n, locked: !n.locked } : n)),
        };
      }
      return {
        pipes: s.pipes.map((p) => (p.uid === s.selectedUid ? { ...p, locked: !p.locked } : p)),
      };
    }),

  togglePipeConnectionLock: (pipeUid, end) =>
    set((s) => ({
      pipes: s.pipes.map((p) => {
        if (p.uid !== pipeUid) return p;
        if (end === 'start') {
          return { ...p, startLocked: p.startLocked === false ? true : false };
        }
        return { ...p, endLocked: p.endLocked === false ? true : false };
      }),
    })),

  rotateNodeAxis: (uid, axis, deg) =>
    set((s) => {
      const target = s.nodes.find((n) => n.uid === uid);
      if (!target || target.locked) return s;

      const rad = (deg * Math.PI) / 180;
      const axisVec = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
      );
      const rotation = new THREE.Quaternion().setFromAxisAngle(axisVec, rad);
      const pivot = new THREE.Vector3(...target.position);

      const group = s.moveConnectedGroup
        ? getConnectedComponent(s.pipes, [uid], [])
        : { nodeUids: new Set([uid]), pipeUids: new Set<string>() };

      // Verbundene Baugruppe starr um den ausgewählten Knoten drehen.
      if (s.moveConnectedGroup && group.nodeUids.size > 1) {
        const hasLockedNode = s.nodes.some(
          (n) => group.nodeUids.has(n.uid) && n.uid !== uid && n.locked
        );
        const hasLockedPipe = s.pipes.some((p) => group.pipeUids.has(p.uid) && p.locked);
        if (hasLockedNode || hasLockedPipe) return s;

        let minY = Infinity;
        const rotatedNodes = s.nodes.map((n) => {
          if (!group.nodeUids.has(n.uid)) return n;
          const pos = new THREE.Vector3(...n.position).sub(pivot).applyQuaternion(rotation).add(pivot);
          const euler = new THREE.Euler(...n.rotationEuler, 'XYZ');
          const quat = new THREE.Quaternion().setFromEuler(euler).premultiply(rotation);
          const nextEuler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
          minY = Math.min(minY, pos.y);
          return {
            ...n,
            position: [pos.x, pos.y, pos.z] as Vec3,
            rotationEuler: [nextEuler.x, nextEuler.y, nextEuler.z] as Vec3,
          };
        });

        const shiftY = minY < 0 ? -minY : 0;
        const nextNodes = rotatedNodes.map((n) =>
          group.nodeUids.has(n.uid) && shiftY !== 0
            ? { ...n, position: [n.position[0], n.position[1] + shiftY, n.position[2]] as Vec3 }
            : n
        );
        const nextPipes = s.pipes.map((p) => {
          if (!group.pipeUids.has(p.uid)) return p;
          const start = new THREE.Vector3(...p.startPos).sub(pivot).applyQuaternion(rotation).add(pivot);
          const end = new THREE.Vector3(...p.endPos).sub(pivot).applyQuaternion(rotation).add(pivot);
          return {
            ...p,
            startPos: [start.x, start.y + shiftY, start.z] as Vec3,
            endPos: [end.x, end.y + shiftY, end.z] as Vec3,
          };
        });
        return { nodes: nextNodes, pipes: nextPipes };
      }

      // Einzelner Knoten: Drehung nur am Knoten; verbundene Rohre werden
      // starr mitgeführt bzw. gelöst, damit ihre Länge unverändert bleibt.
      const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      const rot: Vec3 = [...target.rotationEuler];
      rot[idx] = rot[idx] + rad;
      const rotatedNode: PlacedNode = { ...target, rotationEuler: rot };
      const nextNodes = s.nodes.map((n) => (n.uid === uid ? rotatedNode : n));

      const nextPipes = s.pipes.map((p) => {
        let updated = { ...p };

        if (p.startNodeUid === uid && p.startPortId) {
          const newPort = rotatedNode.ports.find((pt) => pt.id === p.startPortId);
          const otherLocked = Boolean(p.endNodeUid) && p.endLocked !== false;
          if (newPort && !otherLocked) {
            const newWorld = getWorldPort(rotatedNode, newPort).pos;
            const dx = newWorld[0] - p.startPos[0];
            const dy = newWorld[1] - p.startPos[1];
            const dz = newWorld[2] - p.startPos[2];
            updated.startPos = newWorld;
            updated.endPos = [p.endPos[0] + dx, p.endPos[1] + dy, p.endPos[2] + dz];
          } else {
            updated.startNodeUid = undefined;
            updated.startPortId = undefined;
            updated.startLocked = undefined;
            updated.startInsertionMm = 0;
          }
        }

        if (p.endNodeUid === uid && p.endPortId) {
          const newPort = rotatedNode.ports.find((pt) => pt.id === p.endPortId);
          const otherLocked = Boolean(p.startNodeUid) && p.startLocked !== false;
          if (newPort && !otherLocked) {
            const newWorld = getWorldPort(rotatedNode, newPort).pos;
            const dx = newWorld[0] - p.endPos[0];
            const dy = newWorld[1] - p.endPos[1];
            const dz = newWorld[2] - p.endPos[2];
            updated.endPos = newWorld;
            updated.startPos = [p.startPos[0] + dx, p.startPos[1] + dy, p.startPos[2] + dz];
          } else {
            updated.endNodeUid = undefined;
            updated.endPortId = undefined;
            updated.endLocked = undefined;
            updated.endInsertionMm = 0;
          }
        }

        return updated;
      });

      return { nodes: nextNodes, pipes: nextPipes };
    }),

  rotatePipeAxis: (uid, axis, deg) =>
    set((s) => {
      const target = s.pipes.find((p) => p.uid === uid);
      if (!target || target.locked) return s;

      const rad = (deg * Math.PI) / 180;
      const axisVec = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
      );
      const rotation = new THREE.Quaternion().setFromAxisAngle(axisVec, rad);
      const pivot = new THREE.Vector3(
        (target.startPos[0] + target.endPos[0]) / 2,
        (target.startPos[1] + target.endPos[1]) / 2,
        (target.startPos[2] + target.endPos[2]) / 2
      );

      const group = s.moveConnectedGroup
        ? getConnectedComponent(s.pipes, [], [uid])
        : { nodeUids: new Set<string>(), pipeUids: new Set([uid]) };

      // Verbundenes Rohr: die komplette Baugruppe starr um die Rohrmitte drehen.
      if (s.moveConnectedGroup && group.nodeUids.size > 0) {
        const hasLockedNode = s.nodes.some((n) => group.nodeUids.has(n.uid) && n.locked);
        const hasLockedPipe = s.pipes.some(
          (p) => group.pipeUids.has(p.uid) && p.uid !== uid && p.locked
        );
        if (hasLockedNode || hasLockedPipe) return s;

        let minY = Infinity;
        const nextNodes = s.nodes.map((n) => {
          if (!group.nodeUids.has(n.uid)) return n;
          const pos = new THREE.Vector3(...n.position).sub(pivot).applyQuaternion(rotation).add(pivot);
          const euler = new THREE.Euler(...n.rotationEuler, 'XYZ');
          const quat = new THREE.Quaternion().setFromEuler(euler).premultiply(rotation);
          const nextEuler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
          minY = Math.min(minY, pos.y);
          return {
            ...n,
            position: [pos.x, pos.y, pos.z] as Vec3,
            rotationEuler: [nextEuler.x, nextEuler.y, nextEuler.z] as Vec3,
          };
        });

        const rotatedPipes = s.pipes.map((p) => {
          if (!group.pipeUids.has(p.uid)) return p;
          const start = new THREE.Vector3(...p.startPos).sub(pivot).applyQuaternion(rotation).add(pivot);
          const end = new THREE.Vector3(...p.endPos).sub(pivot).applyQuaternion(rotation).add(pivot);
          minY = Math.min(minY, start.y, end.y);
          return {
            ...p,
            startPos: [start.x, start.y, start.z] as Vec3,
            endPos: [end.x, end.y, end.z] as Vec3,
          };
        });

        const shiftY = minY < 0 ? -minY : 0;
        if (shiftY === 0) return { nodes: nextNodes, pipes: rotatedPipes };

        return {
          nodes: nextNodes.map((n) =>
            group.nodeUids.has(n.uid)
              ? { ...n, position: [n.position[0], n.position[1] + shiftY, n.position[2]] as Vec3 }
              : n
          ),
          pipes: rotatedPipes.map((p) =>
            group.pipeUids.has(p.uid)
              ? {
                  ...p,
                  startPos: [p.startPos[0], p.startPos[1] + shiftY, p.startPos[2]] as Vec3,
                  endPos: [p.endPos[0], p.endPos[1] + shiftY, p.endPos[2]] as Vec3,
                }
              : p
          ),
        };
      }

      // Nicht verbundenes Rohr: nur das Rohr selbst um seinen Mittelpunkt drehen.
      const relStart: Vec3 = [
        target.startPos[0] - pivot.x,
        target.startPos[1] - pivot.y,
        target.startPos[2] - pivot.z,
      ];
      const relEnd: Vec3 = [
        target.endPos[0] - pivot.x,
        target.endPos[1] - pivot.y,
        target.endPos[2] - pivot.z,
      ];
      const rotStart = rotateVecAroundAxis(relStart, axis, rad);
      const rotEnd = rotateVecAroundAxis(relEnd, axis, rad);

      let nextStart: Vec3 = [
        pivot.x + rotStart[0],
        pivot.y + rotStart[1],
        pivot.z + rotStart[2],
      ];
      let nextEnd: Vec3 = [
        pivot.x + rotEnd[0],
        pivot.y + rotEnd[1],
        pivot.z + rotEnd[2],
      ];

      const minY = Math.min(nextStart[1], nextEnd[1]);
      if (minY < 0) {
        nextStart = [nextStart[0], nextStart[1] - minY, nextStart[2]];
        nextEnd = [nextEnd[0], nextEnd[1] - minY, nextEnd[2]];
      }

      return {
        pipes: s.pipes.map((p) =>
          p.uid === uid
            ? {
                ...p,
                startPos: nextStart,
                endPos: nextEnd,
                startNodeUid: undefined,
                startPortId: undefined,
                startLocked: undefined,
                startInsertionMm: 0,
                endNodeUid: undefined,
                endPortId: undefined,
                endLocked: undefined,
                endInsertionMm: 0,
              }
            : p
        ),
      };
    }),

  rotateSelectedAxis: (axis, deg) => {
    const s = get();
    if (!s.selectedUid || !s.selectedType) return;
    if (s.selectedType === 'node') {
      s.rotateNodeAxis(s.selectedUid, axis, deg);
    } else if (s.selectedType === 'pipe') {
      s.rotatePipeAxis(s.selectedUid, axis, deg);
    }
  },

  setItemColor: (uid, type, color) =>
    set((s) =>
      type === 'node'
        ? { nodes: s.nodes.map((n) => (n.uid === uid ? { ...n, color } : n)) }
        : { pipes: s.pipes.map((p) => (p.uid === uid ? { ...p, color } : p)) }
    ),

  deleteSelected: () =>
    set((s) => {
      if (!s.selectedUid) return s;
      if (s.selectedType === 'node') {
        const target = s.nodes.find((n) => n.uid === s.selectedUid);
        if (target?.locked) return s;
        return {
          nodes: s.nodes.filter((n) => n.uid !== s.selectedUid),
          pipes: s.pipes.filter((p) => p.startNodeUid !== s.selectedUid && p.endNodeUid !== s.selectedUid),
          selectedUid: null,
          selectedType: null,
          pendingPort: null,
        };
      }
      const targetPipe = s.pipes.find((p) => p.uid === s.selectedUid);
      if (targetPipe?.locked) return s;
      return {
        pipes: s.pipes.filter((p) => p.uid !== s.selectedUid),
        selectedUid: null,
        selectedType: null,
      };
    }),

  connectPorts: (a, b) => {
    if (a.nodeUid === b.nodeUid) return;
    const state = get();
    const nodeA = state.nodes.find((n) => n.uid === a.nodeUid);
    const nodeB = state.nodes.find((n) => n.uid === b.nodeUid);
    const portA = nodeA?.ports.find((p) => p.id === a.portId);
    const portB = nodeB?.ports.find((p) => p.id === b.portId);
    if (!nodeA || !nodeB || !portA || !portB) return;

    const worldA = getWorldPort(nodeA, portA);
    const worldB = getWorldPort(nodeB, portB);
    const dia = Number(portA.profileId.replace('round_', '')) || nodeA.diameterMm;

    const pipe: PipeSegment = {
      uid: nextUid('pipe'),
      profileId: portA.profileId,
      diameterMm: dia,
      startPos: worldA.pos,
      endPos: worldB.pos,
      startNodeUid: nodeA.uid,
      startPortId: portA.id,
      startLocked: true,
      endNodeUid: nodeB.uid,
      endPortId: portB.id,
      endLocked: true,
      startInsertionMm: portA.insertionDepthMm,
      endInsertionMm: portB.insertionDepthMm,
      color: state.activePipeColor,
    };

    set((s) => ({
      pipes: [...s.pipes, pipe],
      pendingPort: null,
      selectedUid: pipe.uid,
      selectedType: 'pipe',
    }));
  },

  addPipeFromPort: (from, lengthMm) => {
    const state = get();
    const node = state.nodes.find((n) => n.uid === from.nodeUid);
    const port = node?.ports.find((p) => p.id === from.portId);
    if (!node || !port) return;

    const pipeLengthMm = Math.max(1, Math.round(lengthMm));
    const world = getWorldPort(node, port);
    const endPos: [number, number, number] = [
      world.pos[0] + world.dir[0] * pipeLengthMm,
      world.pos[1] + world.dir[1] * pipeLengthMm,
      world.pos[2] + world.dir[2] * pipeLengthMm,
    ];
    const dia = Number(port.profileId.replace('round_', '')) || node.diameterMm;

    const pipe: PipeSegment = {
      uid: nextUid('pipe'),
      profileId: port.profileId,
      diameterMm: dia,
      startPos: world.pos,
      endPos,
      startNodeUid: node.uid,
      startPortId: port.id,
      startLocked: true,
      startInsertionMm: port.insertionDepthMm,
      endInsertionMm: 0,
      color: state.activePipeColor,
    };

    set((s) => ({
      pipes: [...s.pipes, pipe],
      pendingPort: null,
      selectedUid: pipe.uid,
      selectedType: 'pipe',
    }));
  },

  addFreePipe: (startPos, endPos, diameterMm) => {
    const state = get();
    const d = diameterMm ?? state.selectedDiameter;
    const pipe: PipeSegment = {
      uid: nextUid('pipe'),
      profileId: `round_${d}`,
      diameterMm: d,
      startPos,
      endPos,
      startInsertionMm: 0,
      endInsertionMm: 0,
      color: state.activePipeColor,
    };
    set((s) => ({
      pipes: [...s.pipes, pipe],
      selectedUid: pipe.uid,
      selectedType: 'pipe',
    }));
  },

  updatePipeLength: (uid, newLengthMm) =>
    set((s) => ({
      pipes: s.pipes.map((p) => {
        if (p.uid !== uid || p.locked) return p;
        const targetAxisLength = Math.max(1, Math.round(newLengthMm));
        const dx = p.endPos[0] - p.startPos[0];
        const dy = p.endPos[1] - p.startPos[1];
        const dz = p.endPos[2] - p.startPos[2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const nx = dx / len, ny = dy / len, nz = dz / len;
        return {
          ...p,
          endPos: [
            p.startPos[0] + nx * targetAxisLength,
            p.startPos[1] + ny * targetAxisLength,
            p.startPos[2] + nz * targetAxisLength,
          ],
          // Eine manuelle Längenänderung löst das bewegte Ende,
          // damit keine Verbindung mit falscher Geometrie bestehen bleibt.
          endNodeUid: undefined,
          endPortId: undefined,
          endLocked: undefined,
          endInsertionMm: 0,
        };
      }),
    })),

  loadExample: (id) => {
    const example = getExample(id);
    if (!example) return;
    const scene = example.build();
    set({
      meta: scene.meta,
      nodes: scene.nodes,
      pipes: scene.pipes,
      selectedUid: null,
      selectedType: null,
      pendingPort: null,
      snapPreviews: [],
    });
  },

  loadDemoFrame: () => get().loadExample('tischgestell'),

  clearProject: () => set({ nodes: [], pipes: [], selectedUid: null, selectedType: null, pendingPort: null, snapPreviews: [] }),

  exportProjectFile: () => {
    const s = get();
    return {
      version: 1,
      meta: s.meta,
      nodes: s.nodes,
      pipes: s.pipes,
    };
  },

  importProjectFile: (data) => {
    if (!data || data.version !== 1 || !Array.isArray(data.nodes) || !Array.isArray(data.pipes)) {
      throw new Error('Ungültiges Projektformat');
    }
    set({
      meta: data.meta ?? { name: 'Importiertes Gestell', author: '', notes: '', createdAt: new Date().toISOString().slice(0, 10) },
      nodes: data.nodes,
      pipes: data.pipes,
      selectedUid: null,
      selectedType: null,
      pendingPort: null,
      snapPreviews: [],
    });
  },
}));
