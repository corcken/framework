import { getCatalogItem } from './catalog';
import { PlacedNode, PipeSegment, ProjectMeta } from '../types/system';

const DIAMETER_MM = 25;
const PIPE_COLOR = '#94a3b8';
const FOOT_COLOR = '#334155';

function makeNode(
  uid: string,
  catalogId: string,
  position: [number, number, number],
  rotationEuler: [number, number, number],
  color: string
): PlacedNode {
  const item = getCatalogItem(catalogId);
  if (!item) throw new Error(`Unbekanntes Katalogteil: ${catalogId}`);
  const variant = item.getVariant(DIAMETER_MM);
  return {
    uid,
    catalogId: item.id,
    articleNumber: variant.articleNumber,
    diameterMm: DIAMETER_MM,
    position,
    rotationEuler,
    color,
    stlPath: variant.stlPath,
    ports: variant.ports,
  };
}

function makePipe(uid: string, a: PlacedNode, b: PlacedNode): PipeSegment {
  return {
    uid,
    profileId: `round_${DIAMETER_MM}`,
    diameterMm: DIAMETER_MM,
    startPos: a.position,
    endPos: b.position,
    startNodeUid: a.uid,
    endNodeUid: b.uid,
    startInsertionMm: 0,
    endInsertionMm: 0,
    color: PIPE_COLOR,
  };
}

interface FrameOptions {
  prefix: string;
  width: number;
  depth: number;
  levels: number[];
  connectorColor: string;
}

function buildFrame({ prefix, width, depth, levels, connectorColor }: FrameOptions): {
  nodes: PlacedNode[];
  pipes: PipeSegment[];
} {
  const nodes: PlacedNode[] = [];
  const pipes: PipeSegment[] = [];

  // 4 Ecken. Die Anschlüsse zeigen jeweils entlang der Rahmenseiten nach innen.
  const corners = [
    { x: -width / 2, z: -depth / 2 },
    { x: width / 2, z: -depth / 2 },
    { x: width / 2, z: depth / 2 },
    { x: -width / 2, z: depth / 2 },
  ];

  // 3-fach (oben): +Y zeigt nach unten, die beiden Querports liegen an den Rahmenkanten.
  const topRotationsY = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  // 4-fach (Zwischenebene): durchgehende Senkrechte, Querports nach innen.
  const middleRotationsY = [-Math.PI / 2, Math.PI, Math.PI / 2, 0];

  const levelNodes: PlacedNode[][] = levels.map((y, levelIndex) => {
    const isBottom = levelIndex === 0;
    const isTop = levelIndex === levels.length - 1;

    return corners.map((corner, cornerIndex) => {
      const catalogId = isBottom
        ? 'Fuss'
        : isTop
          ? 'Eckverbinder_3fach'
          : 'Eckverbinder_4fach';

      const rotationEuler: [number, number, number] = isBottom
        ? [0, 0, 0]
        : isTop
          ? [Math.PI, topRotationsY[cornerIndex], 0]
          : [0, middleRotationsY[cornerIndex], 0];

      return makeNode(
        `${prefix}_n${levelIndex}_${cornerIndex}`,
        catalogId,
        [corner.x, y, corner.z],
        rotationEuler,
        isBottom ? FOOT_COLOR : connectorColor
      );
    });
  });

  levelNodes.forEach((row) => nodes.push(...row));

  // Senkrechte Rohre zwischen den Ebenen
  for (let levelIndex = 1; levelIndex < levels.length; levelIndex += 1) {
    for (let cornerIndex = 0; cornerIndex < 4; cornerIndex += 1) {
      pipes.push(
        makePipe(
          `${prefix}_v${levelIndex}_${cornerIndex}`,
          levelNodes[levelIndex - 1][cornerIndex],
          levelNodes[levelIndex][cornerIndex]
        )
      );
    }
  }

  // Waagerechte Rohre je Ebene (die unterste Ebene sind Füße ohne Queranschluss)
  for (let levelIndex = 1; levelIndex < levels.length; levelIndex += 1) {
    const row = levelNodes[levelIndex];
    const edges: Array<[number, number]> = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ];
    edges.forEach(([a, b], edgeIndex) => {
      pipes.push(makePipe(`${prefix}_h${levelIndex}_${edgeIndex}`, row[a], row[b]));
    });
  }

  return { nodes, pipes };
}

function metaFor(name: string, notes: string): ProjectMeta {
  return {
    name,
    author: '',
    notes,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

export interface ExampleScene {
  meta: ProjectMeta;
  nodes: PlacedNode[];
  pipes: PipeSegment[];
}

export interface ExampleDefinition {
  id: string;
  name: string;
  dimensions: string;
  description: string;
  previewPath: string;
  build: () => ExampleScene;
}

export const EXAMPLE_DEFINITIONS: ExampleDefinition[] = [
  {
    id: 'tischgestell',
    name: 'Tischgestell',
    dimensions: '600 × 400 × 500 mm',
    description: 'Kompaktes Tischgestell mit vier Füßen und umlaufender Zarge.',
    previewPath: 'previews/examples/tischgestell.png',
    build: () => {
      const { nodes, pipes } = buildFrame({
        prefix: 'ex_tischgestell',
        width: 600,
        depth: 400,
        levels: [0, 500],
        connectorColor: '#f97316',
      });
      return { meta: metaFor('Tischgestell', 'Beispiel: kompaktes Tischgestell'), nodes, pipes };
    },
  },
  {
    id: 'regal',
    name: 'Regal',
    dimensions: '800 × 400 × 1200 mm',
    description: 'Regal mit drei Ebenen und durchgehenden Senkrechten.',
    previewPath: 'previews/examples/regal.png',
    build: () => {
      const { nodes, pipes } = buildFrame({
        prefix: 'ex_regal',
        width: 800,
        depth: 400,
        levels: [0, 400, 800, 1200],
        connectorColor: '#0f766e',
      });
      return { meta: metaFor('Regal', 'Beispiel: Regal mit drei Ebenen'), nodes, pipes };
    },
  },
  {
    id: 'tisch',
    name: 'Tisch',
    dimensions: '1200 × 600 × 750 mm',
    description: 'Großer Tisch mit vier Beinen und umlaufender Zarge.',
    previewPath: 'previews/examples/tisch.png',
    build: () => {
      const { nodes, pipes } = buildFrame({
        prefix: 'ex_tisch',
        width: 1200,
        depth: 600,
        levels: [0, 750],
        connectorColor: '#2563eb',
      });
      return { meta: metaFor('Tisch', 'Beispiel: großer Tisch'), nodes, pipes };
    },
  },
  {
    id: 'werkstattgestell',
    name: 'Werkstattgestell',
    dimensions: '1200 × 600 × 900 mm',
    description: 'Werkstattgestell mit zwei Ebenen für Maschinen und Material.',
    previewPath: 'previews/examples/werkstattgestell.png',
    build: () => {
      const { nodes, pipes } = buildFrame({
        prefix: 'ex_werkstatt',
        width: 1200,
        depth: 600,
        levels: [0, 300, 900],
        connectorColor: '#16a34a',
      });
      return {
        meta: metaFor('Werkstattgestell', 'Beispiel: Werkstattgestell mit zwei Ebenen'),
        nodes,
        pipes,
      };
    },
  },
];

export function getExample(id: string): ExampleDefinition | undefined {
  return EXAMPLE_DEFINITIONS.find((example) => example.id === id);
}
