import { create } from 'zustand';
import { getCatalogItem, PART_COLORS, PIPE_COLORS } from '../data/catalog';
import { PlacedNode, PipeSegment, ProjectFile, ProjectMeta } from '../types/system';
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
  movePipe: (uid: string, newMid: [number, number, number]) => void;
  dropSelectedToGround: () => void;
  toggleLockSelected: () => void;
  togglePipeConnectionLock: (pipeUid: string, end: 'start' | 'end') => void;
  rotateNodeAxis: (uid: string, axis: 'x' | 'y' | 'z', deg: number) => void;
  setItemColor: (uid: string, type: 'node' | 'pipe', color: string) => void;
  deleteSelected: () => void;

  connectPorts: (a: PendingPortRef, b: PendingPortRef) => void;
  addPipeFromPort: (from: PendingPortRef, lengthMm: number) => void;
  addFreePipe: (startPos: [number, number, number], endPos: [number, number, number], diameterMm?: number) => void;
  updatePipeLength: (uid: string, newAxisLengthMm: number) => void;

  loadDemoFrame: () => void;
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
  snapDistanceMm: 10,
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

  moveNode: (uid, position) =>
    set((s) => {
      const targetNode = s.nodes.find((n) => n.uid === uid);
      if (!targetNode || targetNode.locked) return s;

      const group = s.moveConnectedGroup
        ? getConnectedComponent(s.pipes, [uid], [])
        : { nodeUids: new Set([uid]), pipeUids: new Set<string>() };

      if (s.moveConnectedGroup) {
        const hasLockedNode = s.nodes.some((n) => group.nodeUids.has(n.uid) && n.locked);
        const hasLockedPipe = s.pipes.some((p) => group.pipeUids.has(p.uid) && p.locked);
        if (hasLockedNode || hasLockedPipe) return s;
      }

      let finalPos: [number, number, number] = [
        Math.round(position[0] * 10) / 10,
        Math.max(0, Math.round(position[1] * 10) / 10),
        Math.round(position[2] * 10) / 10,
      ];

      const snapDist = s.snapDistanceMm;
      if (snapDist > 0) {
        const candidateNode: PlacedNode = { ...targetNode, position: finalPos };
        let bestDist = snapDist;
        let bestDelta: [number, number, number] | null = null;

        // 1. Gegen Ports externer Verbinder prüfen
        for (const myPort of candidateNode.ports) {
          const myWorld = getWorldPort(candidateNode, myPort).pos;
          for (const other of s.nodes) {
            if (group.nodeUids.has(other.uid)) continue;
            for (const otherPort of other.ports) {
              const otherWorld = getWorldPort(other, otherPort).pos;
              const d = Math.hypot(
                otherWorld[0] - myWorld[0],
                otherWorld[1] - myWorld[1],
                otherWorld[2] - myWorld[2]
              );
              if (d <= bestDist) {
                bestDist = d;
                bestDelta = [
                  otherWorld[0] - myWorld[0],
                  otherWorld[1] - myWorld[1],
                  otherWorld[2] - myWorld[2],
                ];
              }
            }
          }

          // 2. Gegen freie Rohrenden externer Rohre prüfen
          for (const pipe of s.pipes) {
            if (group.pipeUids.has(pipe.uid)) continue;
            if (!pipe.startNodeUid) {
              const dStart = Math.hypot(
                pipe.startPos[0] - myWorld[0],
                pipe.startPos[1] - myWorld[1],
                pipe.startPos[2] - myWorld[2]
              );
              if (dStart <= bestDist) {
                bestDist = dStart;
                bestDelta = [
                  pipe.startPos[0] - myWorld[0],
                  pipe.startPos[1] - myWorld[1],
                  pipe.startPos[2] - myWorld[2],
                ];
              }
            }
            if (!pipe.endNodeUid) {
              const dEnd = Math.hypot(
                pipe.endPos[0] - myWorld[0],
                pipe.endPos[1] - myWorld[1],
                pipe.endPos[2] - myWorld[2]
              );
              if (dEnd <= bestDist) {
                bestDist = dEnd;
                bestDelta = [
                  pipe.endPos[0] - myWorld[0],
                  pipe.endPos[1] - myWorld[1],
                  pipe.endPos[2] - myWorld[2],
                ];
              }
            }
          }
        }

        if (bestDelta) {
          finalPos = [
            Math.round((finalPos[0] + bestDelta[0]) * 10) / 10,
            Math.max(0, Math.round((finalPos[1] + bestDelta[1]) * 10) / 10),
            Math.round((finalPos[2] + bestDelta[2]) * 10) / 10,
          ];
        }
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
            Math.round((n.position[0] + dx) * 10) / 10,
            Math.max(0, Math.round((n.position[1] + dy) * 10) / 10),
            Math.round((n.position[2] + dz) * 10) / 10,
          ] as [number, number, number],
        };
      });

      const nodeMap = new Map(nextNodes.map((n) => [n.uid, n]));
      const nextPipes = s.pipes.map((p) => {
        if (s.moveConnectedGroup && group.pipeUids.has(p.uid)) {
          return {
            ...p,
            startPos: [
              Math.round((p.startPos[0] + dx) * 10) / 10,
              Math.round((p.startPos[1] + dy) * 10) / 10,
              Math.round((p.startPos[2] + dz) * 10) / 10,
            ] as [number, number, number],
            endPos: [
              Math.round((p.endPos[0] + dx) * 10) / 10,
              Math.round((p.endPos[1] + dy) * 10) / 10,
              Math.round((p.endPos[2] + dz) * 10) / 10,
            ] as [number, number, number],
          };
        }
        let updated = { ...p };
        if (p.startNodeUid === uid && p.startPortId) {
          if (p.startLocked === false) {
            // Geöffnetes Schloss: Rohr bleibt stehen, Verbindung löst sich
            updated.startNodeUid = undefined;
            updated.startPortId = undefined;
            updated.startLocked = undefined;
            updated.startInsertionMm = 0;
          } else {
            const n = nodeMap.get(uid);
            const port = n?.ports.find((pt) => pt.id === p.startPortId);
            if (n && port) updated.startPos = getWorldPort(n, port).pos;
          }
        }
        if (p.endNodeUid === uid && p.endPortId) {
          if (p.endLocked === false) {
            updated.endNodeUid = undefined;
            updated.endPortId = undefined;
            updated.endLocked = undefined;
            updated.endInsertionMm = 0;
          } else {
            const n = nodeMap.get(uid);
            const port = n?.ports.find((pt) => pt.id === p.endPortId);
            if (n && port) updated.endPos = getWorldPort(n, port).pos;
          }
        }
        return updated;
      });
      return { nodes: nextNodes, pipes: nextPipes };
    }),

  movePipe: (uid, newMid) =>
    set((s) => {
      const targetPipe = s.pipes.find((p) => p.uid === uid);
      if (!targetPipe || targetPipe.locked) return s;

      const oldMid: [number, number, number] = [
        (targetPipe.startPos[0] + targetPipe.endPos[0]) / 2,
        (targetPipe.startPos[1] + targetPipe.endPos[1]) / 2,
        (targetPipe.startPos[2] + targetPipe.endPos[2]) / 2,
      ];
      const delta: [number, number, number] = [
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
        if (hasLockedNode || hasLockedPipe) return s;

        const dx = delta[0];
        let dy = delta[1];
        const dz = delta[2];
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

        return {
          nodes: s.nodes.map((n) =>
            group.nodeUids.has(n.uid)
              ? {
                  ...n,
                  position: [
                    Math.round((n.position[0] + dx) * 10) / 10,
                    Math.max(0, Math.round((n.position[1] + dy) * 10) / 10),
                    Math.round((n.position[2] + dz) * 10) / 10,
                  ] as [number, number, number],
                }
              : n
          ),
          pipes: s.pipes.map((p) => {
            if (!group.pipeUids.has(p.uid)) return p;
            const detachStart = p.startNodeUid && p.startLocked === false;
            const detachEnd = p.endNodeUid && p.endLocked === false;
            return {
              ...p,
              startPos: [
                Math.round((p.startPos[0] + dx) * 10) / 10,
                Math.round((p.startPos[1] + dy) * 10) / 10,
                Math.round((p.startPos[2] + dz) * 10) / 10,
              ] as [number, number, number],
              endPos: [
                Math.round((p.endPos[0] + dx) * 10) / 10,
                Math.round((p.endPos[1] + dy) * 10) / 10,
                Math.round((p.endPos[2] + dz) * 10) / 10,
              ] as [number, number, number],
              ...(detachStart
                ? { startNodeUid: undefined, startPortId: undefined, startLocked: undefined, startInsertionMm: 0 }
                : {}),
              ...(detachEnd
                ? { endNodeUid: undefined, endPortId: undefined, endLocked: undefined, endInsertionMm: 0 }
                : {}),
            };
          }),
        };
      }

      let nextStart: [number, number, number] = [
        Math.round((targetPipe.startPos[0] + delta[0]) * 10) / 10,
        Math.round((targetPipe.startPos[1] + delta[1]) * 10) / 10,
        Math.round((targetPipe.startPos[2] + delta[2]) * 10) / 10,
      ];
      let nextEnd: [number, number, number] = [
        Math.round((targetPipe.endPos[0] + delta[0]) * 10) / 10,
        Math.round((targetPipe.endPos[1] + delta[1]) * 10) / 10,
        Math.round((targetPipe.endPos[2] + delta[2]) * 10) / 10,
      ];

      let startNodeUid: string | undefined;
      let startPortId: string | undefined;
      let startInsertionMm = 0;
      let endNodeUid: string | undefined;
      let endPortId: string | undefined;
      let endInsertionMm = 0;

      const snapDist = s.snapDistanceMm;
      if (snapDist > 0) {
        let bestDist = snapDist;
        let snapShift: [number, number, number] | null = null;
        let snappedEnd: 'start' | 'end' | null = null;

        for (const node of s.nodes) {
          for (const port of node.ports) {
            const worldPos = getWorldPort(node, port).pos;
            const dStart = Math.hypot(
              worldPos[0] - nextStart[0],
              worldPos[1] - nextStart[1],
              worldPos[2] - nextStart[2]
            );
            if (dStart <= bestDist) {
              bestDist = dStart;
              snappedEnd = 'start';
              snapShift = [
                worldPos[0] - nextStart[0],
                worldPos[1] - nextStart[1],
                worldPos[2] - nextStart[2],
              ];
            }
            const dEnd = Math.hypot(
              worldPos[0] - nextEnd[0],
              worldPos[1] - nextEnd[1],
              worldPos[2] - nextEnd[2]
            );
            if (dEnd <= bestDist) {
              bestDist = dEnd;
              snappedEnd = 'end';
              snapShift = [
                worldPos[0] - nextEnd[0],
                worldPos[1] - nextEnd[1],
                worldPos[2] - nextEnd[2],
              ];
            }
          }
        }

        if (snapShift && snappedEnd) {
          nextStart = [
            Math.round((nextStart[0] + snapShift[0]) * 10) / 10,
            Math.round((nextStart[1] + snapShift[1]) * 10) / 10,
            Math.round((nextStart[2] + snapShift[2]) * 10) / 10,
          ];
          nextEnd = [
            Math.round((nextEnd[0] + snapShift[0]) * 10) / 10,
            Math.round((nextEnd[1] + snapShift[1]) * 10) / 10,
            Math.round((nextEnd[2] + snapShift[2]) * 10) / 10,
          ];
        }

        for (const node of s.nodes) {
          for (const port of node.ports) {
            const worldPos = getWorldPort(node, port).pos;
            if (
              !startNodeUid &&
              Math.hypot(worldPos[0] - nextStart[0], worldPos[1] - nextStart[1], worldPos[2] - nextStart[2]) < 1.5
            ) {
              startNodeUid = node.uid;
              startPortId = port.id;
              startInsertionMm = port.insertionDepthMm;
            }
            if (
              !endNodeUid &&
              Math.hypot(worldPos[0] - nextEnd[0], worldPos[1] - nextEnd[1], worldPos[2] - nextEnd[2]) < 1.5
            ) {
              endNodeUid = node.uid;
              endPortId = port.id;
              endInsertionMm = port.insertionDepthMm;
            }
          }
        }
      }

      return {
        pipes: s.pipes.map((p) =>
          p.uid === uid
            ? {
                ...p,
                startPos: nextStart,
                endPos: nextEnd,
                startNodeUid,
                startPortId,
                startLocked: startNodeUid ? true : undefined,
                startInsertionMm,
                endNodeUid,
                endPortId,
                endLocked: endNodeUid ? true : undefined,
                endInsertionMm,
              }
            : p
        ),
      };
    }),

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
                  startPos: [p.startPos[0], Math.round((p.startPos[1] - minY) * 10) / 10, p.startPos[2]] as [number, number, number],
                  endPos: [p.endPos[0], Math.round((p.endPos[1] - minY) * 10) / 10, p.endPos[2]] as [number, number, number],
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
        const nodeMap = new Map(nextNodes.map((n) => [n.uid, n]));
        const nextPipes = s.pipes.map((p) => {
          let updated = { ...p };
          if (p.startNodeUid === uid && p.startPortId) {
            const n = nodeMap.get(uid);
            const port = n?.ports.find((pt) => pt.id === p.startPortId);
            if (n && port) updated.startPos = getWorldPort(n, port).pos;
          }
          if (p.endNodeUid === uid && p.endPortId) {
            const n = nodeMap.get(uid);
            const port = n?.ports.find((pt) => pt.id === p.endPortId);
            if (n && port) updated.endPos = getWorldPort(n, port).pos;
          }
          return updated;
        });
        return { nodes: nextNodes, pipes: nextPipes };
      }

      const uid = s.selectedUid;
      return {
        pipes: s.pipes.map((p) => {
          if (p.uid !== uid || p.locked) return p;
          const minY = Math.min(p.startPos[1], p.endPos[1]);
          return {
            ...p,
            startPos: [p.startPos[0], Math.round((p.startPos[1] - minY) * 10) / 10, p.startPos[2]],
            endPos: [p.endPos[0], Math.round((p.endPos[1] - minY) * 10) / 10, p.endPos[2]],
            startNodeUid: undefined,
            startPortId: undefined,
            startInsertionMm: 0,
            endNodeUid: undefined,
            endPortId: undefined,
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
      const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      const nextNodes = s.nodes.map((n) => {
        if (n.uid !== uid) return n;
        const rot: [number, number, number] = [...n.rotationEuler];
        rot[idx] = rot[idx] + rad;
        return { ...n, rotationEuler: rot };
      });
      // Aktualisiere verbundene Rohrendpunkte
      const nodeMap = new Map(nextNodes.map((n) => [n.uid, n]));
      const nextPipes = s.pipes.map((p) => {
        let updated = { ...p };
        if (p.startNodeUid && p.startPortId) {
          const n = nodeMap.get(p.startNodeUid);
          const port = n?.ports.find((pt) => pt.id === p.startPortId);
          if (n && port) updated.startPos = getWorldPort(n, port).pos;
        }
        if (p.endNodeUid && p.endPortId) {
          const n = nodeMap.get(p.endNodeUid);
          const port = n?.ports.find((pt) => pt.id === p.endPortId);
          if (n && port) updated.endPos = getWorldPort(n, port).pos;
        }
        return updated;
      });
      return { nodes: nextNodes, pipes: nextPipes };
    }),

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

    const world = getWorldPort(node, port);
    const endPos: [number, number, number] = [
      Math.round(world.pos[0] + world.dir[0] * lengthMm),
      Math.round(world.pos[1] + world.dir[1] * lengthMm),
      Math.round(world.pos[2] + world.dir[2] * lengthMm),
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

  updatePipeLength: (uid, newAxisLengthMm) =>
    set((s) => ({
      pipes: s.pipes.map((p) => {
        if (p.uid !== uid || p.locked) return p;
        const dx = p.endPos[0] - p.startPos[0];
        const dy = p.endPos[1] - p.startPos[1];
        const dz = p.endPos[2] - p.startPos[2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const nx = dx / len, ny = dy / len, nz = dz / len;
        return {
          ...p,
          endPos: [
            Math.round(p.startPos[0] + nx * newAxisLengthMm),
            Math.round(p.startPos[1] + ny * newAxisLengthMm),
            Math.round(p.startPos[2] + nz * newAxisLengthMm),
          ],
        };
      }),
    })),

  loadDemoFrame: () => {
    const d = 25;
    const w = 600;
    const depth = 400;
    const h = 500;
    const itemFuss = getCatalogItem('Fuss')!;
    const itemEck3 = getCatalogItem('Eckverbinder_3fach')!;
    const vFuss = itemFuss.getVariant(d);
    const vEck3 = itemEck3.getVariant(d);

    const f1: PlacedNode = { uid: 'demo_f1', catalogId: 'Fuss', articleNumber: vFuss.articleNumber, diameterMm: d, position: [-w / 2, 0, -depth / 2], rotationEuler: [0, 0, 0], color: '#334155', stlPath: vFuss.stlPath, ports: vFuss.ports };
    const f2: PlacedNode = { uid: 'demo_f2', catalogId: 'Fuss', articleNumber: vFuss.articleNumber, diameterMm: d, position: [w / 2, 0, -depth / 2], rotationEuler: [0, 0, 0], color: '#334155', stlPath: vFuss.stlPath, ports: vFuss.ports };
    const f3: PlacedNode = { uid: 'demo_f3', catalogId: 'Fuss', articleNumber: vFuss.articleNumber, diameterMm: d, position: [-w / 2, 0, depth / 2], rotationEuler: [0, 0, 0], color: '#334155', stlPath: vFuss.stlPath, ports: vFuss.ports };
    const f4: PlacedNode = { uid: 'demo_f4', catalogId: 'Fuss', articleNumber: vFuss.articleNumber, diameterMm: d, position: [w / 2, 0, depth / 2], rotationEuler: [0, 0, 0], color: '#334155', stlPath: vFuss.stlPath, ports: vFuss.ports };

    const c1: PlacedNode = { uid: 'demo_c1', catalogId: 'Eckverbinder_3fach', articleNumber: vEck3.articleNumber, diameterMm: d, position: [-w / 2, h, -depth / 2], rotationEuler: [Math.PI, 0, 0], color: '#f97316', stlPath: vEck3.stlPath, ports: vEck3.ports };
    const c2: PlacedNode = { uid: 'demo_c2', catalogId: 'Eckverbinder_3fach', articleNumber: vEck3.articleNumber, diameterMm: d, position: [w / 2, h, -depth / 2], rotationEuler: [Math.PI, Math.PI / 2, 0], color: '#f97316', stlPath: vEck3.stlPath, ports: vEck3.ports };
    const c3: PlacedNode = { uid: 'demo_c3', catalogId: 'Eckverbinder_3fach', articleNumber: vEck3.articleNumber, diameterMm: d, position: [-w / 2, h, depth / 2], rotationEuler: [Math.PI, -Math.PI / 2, 0], color: '#f97316', stlPath: vEck3.stlPath, ports: vEck3.ports };
    const c4: PlacedNode = { uid: 'demo_c4', catalogId: 'Eckverbinder_3fach', articleNumber: vEck3.articleNumber, diameterMm: d, position: [w / 2, h, depth / 2], rotationEuler: [Math.PI, Math.PI, 0], color: '#f97316', stlPath: vEck3.stlPath, ports: vEck3.ports };

    const ins = 22;
    const mkPipe = (uid: string, a: PlacedNode, b: PlacedNode, insA = ins, insB = ins): PipeSegment => ({
      uid,
      profileId: `round_${d}`,
      diameterMm: d,
      startPos: a.position,
      endPos: b.position,
      startNodeUid: a.uid,
      endNodeUid: b.uid,
      startInsertionMm: insA,
      endInsertionMm: insB,
      color: '#94a3b8',
    });

    set({
      meta: { name: 'Beispiel-Tischgestell (600×400×500)', author: '', notes: 'Demo mit Ø 25 mm Rohren', createdAt: new Date().toISOString().slice(0, 10) },
      nodes: [f1, f2, f3, f4, c1, c2, c3, c4],
      pipes: [
        mkPipe('dp1', f1, c1),
        mkPipe('dp2', f2, c2),
        mkPipe('dp3', f3, c3),
        mkPipe('dp4', f4, c4),
        mkPipe('dp5', c1, c2),
        mkPipe('dp6', c3, c4),
        mkPipe('dp7', c1, c3),
        mkPipe('dp8', c2, c4),
      ],
      selectedUid: null,
      selectedType: null,
      pendingPort: null,
    });
  },

  clearProject: () => set({ nodes: [], pipes: [], selectedUid: null, selectedType: null, pendingPort: null }),

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
    });
  },
}));
