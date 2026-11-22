import { CatalogItem, PortDef, ProfileSpec } from '../types/system';

export const ROUND_DIAMETERS = [20, 25, 30, 40] as const;

export const REDUCER_PAIRS: Array<[number, number]> = [
  [40, 30],
  [40, 25],
  [40, 20],
  [30, 25],
  [30, 20],
  [25, 20],
];

export const PROFILE_SPECS: Record<string, ProfileSpec> = {
  round_20: { id: 'round_20', family: 'round', label: 'Rundrohr Ø 20 mm', outerDiameterMm: 20, wallMm: 1.5 },
  round_25: { id: 'round_25', family: 'round', label: 'Rundrohr Ø 25 mm', outerDiameterMm: 25, wallMm: 1.5 },
  round_30: { id: 'round_30', family: 'round', label: 'Rundrohr Ø 30 mm', outerDiameterMm: 30, wallMm: 2.0 },
  round_40: { id: 'round_40', family: 'round', label: 'Rundrohr Ø 40 mm', outerDiameterMm: 40, wallMm: 2.0 },
  // Vorbereitet für spätere Erweiterung:
  // square_20: { id: 'square_20', family: 'square', label: 'Vierkantrohr 20×20 mm', outerDiameterMm: 20, wallMm: 1.5 },
  // alu_2020_b: { id: 'alu_2020_b', family: 'alu_profile', label: 'Alu-Profil 20×20 B-Typ Nut 6', outerDiameterMm: 20, wallMm: 2.0, slotType: 'B-Typ Nut 6' },
};

export const PART_COLORS = [
  { name: 'Anthrazit', hex: '#334155' },
  { name: 'Schwarz', hex: '#1e293b' },
  { name: 'Lichtgrau', hex: '#cbd5e1' },
  { name: 'Weiß', hex: '#f8fafc' },
  { name: 'Signalorange', hex: '#f97316' },
  { name: 'Kobaltblau', hex: '#2563eb' },
  { name: 'Smaragdgrün', hex: '#16a34a' },
  { name: 'Signalrot', hex: '#dc2626' },
];

export const PIPE_COLORS = [
  { name: 'Alu-Silber', hex: '#94a3b8' },
  { name: 'Edelstahl', hex: '#cbd5e1' },
  { name: 'Schwarz eloxiert', hex: '#1e293b' },
  { name: 'Anthrazit', hex: '#475569' },
];

export function calcWanddicke(d: number): number {
  return d <= 25 ? 3.5 : d <= 30 ? 4.0 : 4.5;
}

export function calcAussen(d: number): number {
  return d + 0.2 + calcWanddicke(d) * 2;
}

export function calcMuffe(d: number): number {
  return Math.max(22, Math.round(d * 0.875));
}

function pId(d: number): string {
  return `round_${d}`;
}

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'Eckverbinder',
    articleCode: 'ECK2',
    name: '90°-Eckverbinder (2-fach)',
    category: 'verbinder',
    profileFamily: 'round',
    description: 'Verbindet zwei Rohre im 90°-Winkel in einer Ebene.',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const ports: PortDef[] = [
        { id: 'x', label: '+X', localPos: [0, 0, 0], localDir: [1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'z', label: '-Z', localPos: [0, 0, 0], localDir: [0, 0, -1], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-ECK2`,
        stlPath: `stl/${d}mm/Eckverbinder_${d}mm.stl`,
        previewPath: `previews/Eckverbinder.png`,
        ports,
      };
    },
  },
  {
    id: 'Eckverbinder_3fach',
    articleCode: 'ECK3',
    name: '90°-Eckverbinder (3-fach)',
    category: 'verbinder',
    profileFamily: 'round',
    description: '3-Wege-Würfelecke (X, Y, Z) für stabile Gestellecken.',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const ports: PortDef[] = [
        { id: 'x', label: '+X', localPos: [0, 0, 0], localDir: [1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'z', label: '-Z', localPos: [0, 0, 0], localDir: [0, 0, -1], profileId: pId(d), insertionDepthMm: m },
        { id: 'y', label: '+Y', localPos: [0, 0, 0], localDir: [0, 1, 0], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-ECK3`,
        stlPath: `stl/${d}mm/Eckverbinder_3fach_${d}mm.stl`,
        previewPath: `previews/Eckverbinder_3fach.png`,
        ports,
      };
    },
  },
  {
    id: 'Eckverbinder_4fach',
    articleCode: 'ECK4',
    name: '4-Wege-Eckverbinder (3D-T)',
    category: 'verbinder',
    profileFamily: 'round',
    description: 'Durchgehendes Standrohr (oben/unten) mit 2× 90°-Abgängen für Zwischenböden.',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const ports: PortDef[] = [
        { id: 'x', label: '+X', localPos: [0, 0, 0], localDir: [1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'z', label: '-Z', localPos: [0, 0, 0], localDir: [0, 0, -1], profileId: pId(d), insertionDepthMm: m },
        { id: 'y_up', label: '+Y', localPos: [0, 0, 0], localDir: [0, 1, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'y_dn', label: '-Y', localPos: [0, 0, 0], localDir: [0, -1, 0], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-ECK4`,
        stlPath: `stl/${d}mm/Eckverbinder_4fach_${d}mm.stl`,
        previewPath: `previews/Eckverbinder_4fach.png`,
        ports,
      };
    },
  },
  {
    id: 'T_Verbinder',
    articleCode: 'TV90',
    name: '90°-T-Verbinder',
    category: 'verbinder',
    profileFamily: 'round',
    description: 'Durchgehendes Hauptrohr mit 90°-Abzweig in einer Ebene.',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const ports: PortDef[] = [
        { id: 'x_pos', label: '+X', localPos: [0, 0, 0], localDir: [1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'x_neg', label: '-X', localPos: [0, 0, 0], localDir: [-1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'z_neg', label: '-Z', localPos: [0, 0, 0], localDir: [0, 0, -1], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-TV90`,
        stlPath: `stl/${d}mm/T_Verbinder_${d}mm.stl`,
        previewPath: `previews/T_Verbinder.png`,
        ports,
      };
    },
  },
  {
    id: 'T_Verbinder_45',
    articleCode: 'TV45',
    name: '45°-T-Abzweig',
    category: 'verbinder',
    profileFamily: 'round',
    description: 'Durchgehendes Hauptrohr mit 45°-Abzweig für Diagonalstreben.',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const s = Math.SQRT1_2;
      const ports: PortDef[] = [
        { id: 'x_pos', label: '+X', localPos: [0, 0, 0], localDir: [1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'x_neg', label: '-X', localPos: [0, 0, 0], localDir: [-1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'diag', label: '45°', localPos: [0, 0, 0], localDir: [s, 0, -s], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-TV45`,
        stlPath: `stl/${d}mm/T_Verbinder_45_${d}mm.stl`,
        previewPath: `previews/T_Verbinder_45.png`,
        ports,
      };
    },
  },
  {
    id: 'Winkel_45',
    articleCode: 'W45',
    name: '45°-Winkelverbinder',
    category: 'verbinder',
    profileFamily: 'round',
    description: 'Verbindet zwei Rohre im 45°-Winkel.',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const s = Math.SQRT1_2;
      const ports: PortDef[] = [
        { id: 'x', label: '+X', localPos: [0, 0, 0], localDir: [1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'diag', label: '45°', localPos: [0, 0, 0], localDir: [s, 0, -s], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-W45`,
        stlPath: `stl/${d}mm/Winkel_45_${d}mm.stl`,
        previewPath: `previews/Winkel_45.png`,
        ports,
      };
    },
  },
  {
    id: 'Kreuzverbinder_eben',
    articleCode: 'KRE',
    name: '4-Wege-Kreuz (eben)',
    category: 'verbinder',
    profileFamily: 'round',
    description: '4 Rohre in einer Ebene (+).',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const ports: PortDef[] = [
        { id: 'x_pos', label: '+X', localPos: [0, 0, 0], localDir: [1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'x_neg', label: '-X', localPos: [0, 0, 0], localDir: [-1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'z_pos', label: '+Z', localPos: [0, 0, 0], localDir: [0, 0, 1], profileId: pId(d), insertionDepthMm: m },
        { id: 'z_neg', label: '-Z', localPos: [0, 0, 0], localDir: [0, 0, -1], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-KRE`,
        stlPath: `stl/${d}mm/Kreuzverbinder_eben_${d}mm.stl`,
        previewPath: `previews/Kreuzverbinder_eben.png`,
        ports,
      };
    },
  },
  {
    id: 'Kreuzverbinder',
    articleCode: 'KRV',
    name: '90°-Kreuzverbinder (versetzt)',
    category: 'verbinder',
    profileFamily: 'round',
    description: 'Zwei durchgehende Rohre versetzt übereinander.',
    getVariant: (d) => {
      const m = Math.max(40, Math.round(d * 1.625)) / 2;
      const zAbstand = d + 0.2 + calcWanddicke(d);
      const ports: PortDef[] = [
        { id: 'top_x1', label: 'Oben +X', localPos: [0, zAbstand / 2, 0], localDir: [1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'top_x2', label: 'Oben -X', localPos: [0, zAbstand / 2, 0], localDir: [-1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'bot_z1', label: 'Unten +Z', localPos: [0, -zAbstand / 2, 0], localDir: [0, 0, 1], profileId: pId(d), insertionDepthMm: m },
        { id: 'bot_z2', label: 'Unten -Z', localPos: [0, -zAbstand / 2, 0], localDir: [0, 0, -1], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-KRV`,
        stlPath: `stl/${d}mm/Kreuzverbinder_${d}mm.stl`,
        previewPath: `previews/Kreuzverbinder.png`,
        ports,
      };
    },
  },
  {
    id: 'Kreuzverbinder_mit_Deckel',
    articleCode: 'KRD',
    name: '90°-Kreuzverbinder m. Deckel',
    category: 'verbinder',
    profileFamily: 'round',
    description: 'Versetzter Kreuzverbinder, oberes Rohr einseitig geschlossen.',
    getVariant: (d) => {
      const m = Math.max(40, Math.round(d * 1.625)) / 2;
      const zAbstand = d + 0.2 + calcWanddicke(d);
      const ports: PortDef[] = [
        { id: 'top_x2', label: 'Oben -X', localPos: [0, zAbstand / 2, 0], localDir: [-1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'bot_z1', label: 'Unten +Z', localPos: [0, -zAbstand / 2, 0], localDir: [0, 0, 1], profileId: pId(d), insertionDepthMm: m },
        { id: 'bot_z2', label: 'Unten -Z', localPos: [0, -zAbstand / 2, 0], localDir: [0, 0, -1], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-KRD`,
        stlPath: `stl/${d}mm/Kreuzverbinder_mit_Deckel_${d}mm.stl`,
        previewPath: `previews/Kreuzverbinder_mit_Deckel.png`,
        ports,
      };
    },
  },
  {
    id: 'Gelenkverbinder',
    articleCode: 'GEL',
    name: 'Gelenkverbinder (2-teilig)',
    category: 'verbinder',
    profileFamily: 'round',
    description: 'Scharnier-Verbinder (Gabel + Zunge) für variable Winkel.',
    getVariant: (d) => {
      const m = Math.max(24, calcMuffe(d));
      const ports: PortDef[] = [
        { id: 'p1', label: 'Ende 1', localPos: [0, 0, 0], localDir: [1, 0, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'p2', label: 'Ende 2', localPos: [0, 0, 0], localDir: [-1, 0, 0], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-GEL`,
        stlPath: `stl/${d}mm/Gelenkverbinder_${d}mm.stl`,
        previewPath: `previews/Gelenkverbinder.png`,
        ports,
      };
    },
  },
  {
    id: 'Verbinder_gerade',
    articleCode: 'GER',
    name: '180°-Geradverbinder',
    category: 'abschluss',
    profileFamily: 'round',
    description: 'Verlängerungsmuffe in einer Linie mit Mittelanschlag.',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const ports: PortDef[] = [
        { id: 'y_pos', label: '+Y', localPos: [0, 1.5, 0], localDir: [0, 1, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'y_neg', label: '-Y', localPos: [0, -1.5, 0], localDir: [0, -1, 0], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-GER`,
        stlPath: `stl/${d}mm/Verbinder_gerade_${d}mm.stl`,
        previewPath: `previews/Verbinder_gerade.png`,
        ports,
      };
    },
  },
  {
    id: 'Reduziermuffe',
    articleCode: 'RED',
    name: 'Reduziermuffe (Adapter)',
    category: 'abschluss',
    profileFamily: 'round',
    isReducer: true,
    description: 'Adapter zwischen zwei unterschiedlichen Rohrdurchmessern.',
    getVariant: (gross, klein = 30) => {
      const mGross = 35;
      const mKlein = 30;
      const uebergang = 18;
      const ports: PortDef[] = [
        { id: 'gross', label: `Ø${gross}`, localPos: [0, 0, 0], localDir: [0, -1, 0], profileId: pId(gross), insertionDepthMm: mGross },
        { id: 'klein', label: `Ø${klein}`, localPos: [0, mGross + uebergang + mKlein, 0], localDir: [0, 1, 0], profileId: pId(klein), insertionDepthMm: mKlein },
      ];
      return {
        articleNumber: `RV-${gross}${klein}-RED`,
        stlPath: `stl/reduzierer/Reduziermuffe_${gross}_${klein}mm.stl`,
        previewPath: `previews/Reduziermuffe.png`,
        ports,
      };
    },
  },
  {
    id: 'Fuss',
    articleCode: 'FUSS',
    name: 'Standfuß / Wandlager',
    category: 'abschluss',
    profileFamily: 'round',
    description: 'Standfuß mit 4 Senklöchern und Verstärkungskegel.',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const basisDicke = d <= 25 ? 5 : 6;
      const ports: PortDef[] = [
        { id: 'top', label: '+Y', localPos: [0, basisDicke, 0], localDir: [0, 1, 0], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-FUSS`,
        stlPath: `stl/${d}mm/Fuss_${d}mm.stl`,
        previewPath: `previews/Fuss.png`,
        ports,
      };
    },
  },
  {
    id: 'Deckel',
    articleCode: 'DEC',
    name: 'Rohrdeckel / Endkappe',
    category: 'abschluss',
    profileFamily: 'round',
    description: 'Abgerundete Endkappe zum Verschließen eines Rohrendes.',
    getVariant: (d) => {
      const m = calcMuffe(d);
      const ports: PortDef[] = [
        { id: 'bot', label: '-Y', localPos: [0, m, 0], localDir: [0, -1, 0], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-DEC`,
        stlPath: `stl/${d}mm/Deckel_${d}mm.stl`,
        previewPath: `previews/Deckel.png`,
        ports,
      };
    },
  },
  {
    id: 'Muffe1',
    articleCode: 'MUF1',
    name: 'Muffe 1 (parallele Scheibe)',
    category: 'muffen',
    profileFamily: 'round',
    description: 'Durchgehende Muffe mit paralleler Befestigungsscheibe.',
    getVariant: (d) => {
      const m = Math.max(25, d) / 2;
      const ports: PortDef[] = [
        { id: 'y_pos', label: '+Y', localPos: [0, 0, 0], localDir: [0, 1, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'y_neg', label: '-Y', localPos: [0, 0, 0], localDir: [0, -1, 0], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-MUF1`,
        stlPath: `stl/${d}mm/Muffe1_${d}mm.stl`,
        previewPath: `previews/Muffe1.png`,
        ports,
      };
    },
  },
  {
    id: 'Muffe2',
    articleCode: 'MUF2',
    name: 'Muffe 2 (Doppel-Lasche)',
    category: 'muffen',
    profileFamily: 'round',
    description: 'Durchgehende Muffe mit Gabelaufnahme für 5 mm Laschen.',
    getVariant: (d) => {
      const m = Math.max(24, calcMuffe(d)) / 2;
      const ports: PortDef[] = [
        { id: 'y_pos', label: '+Y', localPos: [0, 0, 0], localDir: [0, 1, 0], profileId: pId(d), insertionDepthMm: m },
        { id: 'y_neg', label: '-Y', localPos: [0, 0, 0], localDir: [0, -1, 0], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-MUF2`,
        stlPath: `stl/${d}mm/Muffe2_${d}mm.stl`,
        previewPath: `previews/Muffe2.png`,
        ports,
      };
    },
  },
  {
    id: 'Endstueck1',
    articleCode: 'END1',
    name: 'Endstück 1 (axiale Lasche)',
    category: 'muffen',
    profileFamily: 'round',
    description: 'Rohrendstück mit axialer 5 mm Befestigungslasche.',
    getVariant: (d) => {
      const m = Math.max(25, d + 5);
      const ports: PortDef[] = [
        { id: 'bot', label: '-Y', localPos: [0, m, 0], localDir: [0, -1, 0], profileId: pId(d), insertionDepthMm: m },
      ];
      return {
        articleNumber: `RV-${d}-END1`,
        stlPath: `stl/${d}mm/Endstueck1_${d}mm.stl`,
        previewPath: `previews/Endstueck1.png`,
        ports,
      };
    },
  },
  {
    id: 'Clip_Schelle',
    articleCode: 'CLIP',
    name: 'C-Schelle (Universal-Flansch)',
    category: 'muffen',
    profileFamily: 'round',
    description: 'Aufklipsbare Rohrschelle mit 2× M5 Universal-Flansch.',
    getVariant: (d) => ({
      articleNumber: `RV-${d}-CLIP`,
      stlPath: `stl/${d}mm/Clip_Schelle_${d}mm.stl`,
      previewPath: `previews/Clip_Schelle.png`,
      ports: [
        { id: 'pipe', label: 'Rohr', localPos: [0, 0, 0], localDir: [0, 1, 0], profileId: pId(d), insertionDepthMm: 0 },
      ],
    }),
  },
  {
    id: 'Plattenhalter',
    articleCode: 'PLAT',
    name: 'Platten- & Regalbodenhalter',
    category: 'muffen',
    profileFamily: 'round',
    description: 'Verstärkte Rohrmuffe mit 6 mm Auflageplatte & 3 Rippen.',
    getVariant: (d) => ({
      articleNumber: `RV-${d}-PLAT`,
      stlPath: `stl/${d}mm/Plattenhalter_${d}mm.stl`,
      previewPath: `previews/Plattenhalter.png`,
      ports: [
        { id: 'pipe', label: 'Rohr', localPos: [0, 0, 0], localDir: [0, 1, 0], profileId: pId(d), insertionDepthMm: 0 },
      ],
    }),
  },
  {
    id: 'Kabelclip',
    articleCode: 'KABL',
    name: 'Kabelclip (aufklipsbar)',
    category: 'muffen',
    profileFamily: 'round',
    description: 'Schnapp-Clip für saubere Kabelführung am Rohr.',
    getVariant: (d) => ({
      articleNumber: `RV-${d}-KABL`,
      stlPath: `stl/${d}mm/Kabelclip_${d}mm.stl`,
      previewPath: `previews/Kabelclip.png`,
      ports: [
        { id: 'pipe', label: 'Rohr', localPos: [0, 0, 0], localDir: [0, 1, 0], profileId: pId(d), insertionDepthMm: 0 },
      ],
    }),
  },
];

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG_ITEMS.find((item) => item.id === id);
}
