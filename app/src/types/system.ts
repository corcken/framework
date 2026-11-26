export type ProfileFamily = 'round' | 'square' | 'alu_profile';

export interface ProfileSpec {
  id: string;
  family: ProfileFamily;
  label: string;
  outerDiameterMm: number;
  wallMm: number;
  slotType?: string; // z.B. 'Nut 6 B-Typ', 'Nut 8 I-Typ' für spätere Aluschienen
}

export interface PortDef {
  id: string;
  label: string;
  /** Lokale Position relativ zum Bauteil-Ursprung in mm (Three.js Y-up) */
  localPos: [number, number, number];
  /** Lokaler Richtungsvektor (Einheitsvektor) in Three.js Y-up */
  localDir: [number, number, number];
  /** Profil-ID, z.B. 'round_20', 'round_40' */
  profileId: string;
  /** Einstecktiefe in mm (für exakte Rohrschnittlänge) */
  insertionDepthMm: number;
}

export interface CatalogVariantInfo {
  articleNumber: string;
  stlPath: string;
  previewPath: string;
  ports: PortDef[];
  /** Optionaler visueller Offset des STL-Meshes in mm */
  meshOffset?: [number, number, number];
}

export type ItemCategory =
  | 'rohre'
  | 'ecken_winkel'
  | 't_kreuz'
  | 'muffen_adapter'
  | 'halterungen'
  | 'abschluss_fuss';

export interface CategoryDef {
  id: ItemCategory;
  name: string;
  description?: string;
}

export interface CatalogItem {
  id: string;
  articleCode: string;
  name: string;
  category: ItemCategory;
  profileFamily: ProfileFamily;
  description: string;
  isReducer?: boolean;
  getVariant: (diameterMm: number, secondDiameterMm?: number) => CatalogVariantInfo;
}

export interface PlacedNode {
  uid: string;
  catalogId: string;
  articleNumber: string;
  diameterMm: number;
  secondDiameterMm?: number;
  position: [number, number, number]; // mm in Three.js Y-up
  rotationEuler: [number, number, number]; // radians
  color: string;
  stlPath: string;
  ports: PortDef[];
  locked?: boolean;
}

export interface PipeSegment {
  uid: string;
  profileId: string;
  diameterMm: number;
  startPos: [number, number, number]; // mm (Mittelpunkt / Knoten)
  endPos: [number, number, number];   // mm (Mittelpunkt / Knoten)
  startNodeUid?: string;
  startPortId?: string;
  startLocked?: boolean;
  endNodeUid?: string;
  endPortId?: string;
  endLocked?: boolean;
  /** Einstecktiefe am Start – nur Information, beeinflusst die Rohrlänge nicht. */
  startInsertionMm: number;
  /** Einstecktiefe am Ende – nur Information, beeinflusst die Rohrlänge nicht. */
  endInsertionMm: number;
  color: string;
  locked?: boolean;
}

export interface ProjectMeta {
  name: string;
  author: string;
  notes: string;
  createdAt: string;
}

export interface ProjectFile {
  version: 1;
  meta: ProjectMeta;
  nodes: PlacedNode[];
  pipes: PipeSegment[];
}

/** Farbige 3D-Ansicht für den PDF-Export (ohne Arbeitsraster/Helfer). */
export interface ScenePhoto {
  dataUrl: string;
  width: number;
  height: number;
}
