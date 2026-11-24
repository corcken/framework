import { create } from 'zustand';
import { getCatalogItem, PART_COLORS, PIPE_COLORS } from '../data/catalog';
import { PlacedNode, PipeSegment, ProjectFile, ProjectMeta } from '../types/system';
import { getWorldPort } from '../utils/geometry';

export type CameraPreset = 'iso' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

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
  isViewModalOpen: boolean;
  snapDistanceMm: number;
  cameraPreset: CameraPreset;
  cameraTick: number;

  setMeta: (partial: Partial<ProjectMeta>) => void;
  setSelectedDiameter: (d: number) => void;
  setSelectedReducerPair: (pair: [number, number]) => void;
  setActivePartColor: (hex: string) => void;
  setActivePipeColor: (hex: string) => void;
  setShowDimensions: (v: boolean) => void;
  setIsViewModalOpen: (v: boolean) => void;
  setSnapDistanceMm: (d: number) => void;
  triggerCamera: (preset: CameraPreset) => void;

  selectItem: (uid: string | null, type: 'node' | 'pipe' | null) => void;
  setPendingPort: (ref: PendingPortRef | null) => void;

  addNode: (catalogId: string, position: [number, number, number], diameterMm?: number, secondDiameterMm?: number) => string | null;
  moveNode: (uid: string, position: [number, number, number]) => void;
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
  isViewModalOpen: false,
  snapDistanceMm: 10,
  cameraPreset: 'iso',
  cameraTick: 0,

  setMeta: (partial) => set((s) => ({ meta: { ...s.meta, ...partial } })),
  setSelectedDiameter: (d) => set({ selectedDiameter: d }),
  setSelectedReducerPair: (pair) => set({ selectedReducerPair: pair }),
  setActivePartColor: (hex) => set({ activePartColor: hex }),
  setActivePipeColor: (hex) => set({ activePipeColor: hex }),
  setShowDimensions: (v) => set({ showDimensions: v }),
  setIsViewModalOpen: (v) => set({ isViewModalOpen: v }),
  setSnapDistanceMm: (d) => set({ snapDistanceMm: Math.max(0, Math.round(d)) }),
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
    set((s) => ({
      nodes: s.nodes.map((n) => (n.uid === uid ? { ...n, position } : n)),
    })),

  rotateNodeAxis: (uid, axis, deg) =>
    set((s) => {
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
        return {
          nodes: s.nodes.filter((n) => n.uid !== s.selectedUid),
          pipes: s.pipes.filter((p) => p.startNodeUid !== s.selectedUid && p.endNodeUid !== s.selectedUid),
          selectedUid: null,
          selectedType: null,
          pendingPort: null,
        };
      }
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
      endNodeUid: nodeB.uid,
      endPortId: portB.id,
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
        if (p.uid !== uid) return p;
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
