import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';
import { CameraPreset, useConfigStore } from '../store/useConfigStore';

type FacetKind = 'face' | 'edge' | 'corner';

interface FacetDef {
  id: string;
  kind: FacetKind;
  dir: [number, number, number];
  preset: CameraPreset;
  label: string;
  geometry: THREE.BufferGeometry;
  outlineGeometry: THREE.BufferGeometry;
  texture?: THREE.CanvasTexture;
}

const S = 0.78;
const C = 0.50;

function createFaceTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function orderPointsCCW(pts: THREE.Vector3[], normal: THREE.Vector3): THREE.Vector3[] {
  const center = new THREE.Vector3();
  for (const p of pts) center.add(p);
  center.divideScalar(pts.length);

  const n = normal.clone().normalize();
  const ref = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const tangent = new THREE.Vector3().crossVectors(ref, n).normalize();
  const bitangent = new THREE.Vector3().crossVectors(n, tangent).normalize();

  return [...pts].sort((a, b) => {
    const da = new THREE.Vector3().subVectors(a, center);
    const db = new THREE.Vector3().subVectors(b, center);
    const angA = Math.atan2(da.dot(bitangent), da.dot(tangent));
    const angB = Math.atan2(db.dot(bitangent), db.dot(tangent));
    return angA - angB;
  });
}

function buildPolygonGeometry(
  pts: THREE.Vector3[],
  normal: THREE.Vector3,
  uAxis?: THREE.Vector3,
  vAxis?: THREE.Vector3
): { geometry: THREE.BufferGeometry; outlineGeometry: THREE.BufferGeometry } {
  const ordered = uAxis && vAxis ? pts : orderPointsCCW(pts, normal);
  const n = normal.clone().normalize();

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (let i = 1; i < ordered.length - 1; i++) {
    const tri = [ordered[0], ordered[i], ordered[i + 1]];
    for (const v of tri) {
      positions.push(v.x, v.y, v.z);
      normals.push(n.x, n.y, n.z);
      if (uAxis && vAxis) {
        const u = (v.dot(uAxis) / (S * 2)) + 0.5;
        const vv = (v.dot(vAxis) / (S * 2)) + 0.5;
        uvs.push(u, vv);
      } else {
        uvs.push(0.5, 0.5);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  const outlinePts: number[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    const b = ordered[(i + 1) % ordered.length];
    outlinePts.push(a.x * 1.003, a.y * 1.003, a.z * 1.003);
    outlinePts.push(b.x * 1.003, b.y * 1.003, b.z * 1.003);
  }
  const outlineGeometry = new THREE.BufferGeometry();
  outlineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(outlinePts, 3));

  return { geometry, outlineGeometry };
}

function dirToLabel(dx: number, dy: number, dz: number): string {
  const parts: string[] = [];
  if (dx === 1) parts.push('Rechts');
  if (dx === -1) parts.push('Links');
  if (dy === 1) parts.push('Oben');
  if (dy === -1) parts.push('Unten');
  if (dz === 1) parts.push('Vorne');
  if (dz === -1) parts.push('Hinten');
  return parts.join(' · ');
}

function buildAllFacets(): FacetDef[] {
  const facets: FacetDef[] = [];

  // 1. 6 Main Faces
  const mainFaces: Array<{
    preset: CameraPreset;
    label: string;
    n: [number, number, number];
    u: [number, number, number];
    v: [number, number, number];
  }> = [
    { preset: 'front', label: 'Vorne', n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { preset: 'back', label: 'Hinten', n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
    { preset: 'right', label: 'Rechts', n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    { preset: 'left', label: 'Links', n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { preset: 'top', label: 'Oben', n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
    { preset: 'bottom', label: 'Unten', n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  ];

  const octUV: Array<[number, number]> = [
    [-C, -S], [C, -S], [S, -C], [S, C],
    [C, S], [-C, S], [-S, C], [-S, -C],
  ];

  for (const f of mainFaces) {
    const nVec = new THREE.Vector3(...f.n);
    const uVec = new THREE.Vector3(...f.u);
    const vVec = new THREE.Vector3(...f.v);
    const pts = octUV.map(([u, v]) =>
      nVec.clone().addScaledVector(uVec, u).addScaledVector(vVec, v)
    );
    const { geometry, outlineGeometry } = buildPolygonGeometry(pts, nVec, uVec, vVec);
    facets.push({
      id: `face_${f.label}`,
      kind: 'face',
      dir: f.n,
      preset: f.preset,
      label: f.label,
      geometry,
      outlineGeometry,
      texture: createFaceTexture(f.label),
    });
  }

  // 2. 12 Chamfered Edges
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const sum = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        if (sum !== 2) continue;

        const normal = new THREE.Vector3(dx, dy, dz);
        const pts: THREE.Vector3[] = [];
        // Two nonzero axes, one zero axis
        const zeroAxis = dx === 0 ? 0 : dy === 0 ? 1 : 2;
        const dirs = [dx, dy, dz];
        const nonZeroAxes = [0, 1, 2].filter((a) => a !== zeroAxis);

        for (const kSign of [-1, 1]) {
          // Point 1: first nonzero = 1, second nonzero = S
          const p1 = [0, 0, 0];
          p1[nonZeroAxes[0]] = dirs[nonZeroAxes[0]] * 1.0;
          p1[nonZeroAxes[1]] = dirs[nonZeroAxes[1]] * S;
          p1[zeroAxis] = kSign * C;
          pts.push(new THREE.Vector3(...p1));

          // Point 2: first nonzero = S, second nonzero = 1
          const p2 = [0, 0, 0];
          p2[nonZeroAxes[0]] = dirs[nonZeroAxes[0]] * S;
          p2[nonZeroAxes[1]] = dirs[nonZeroAxes[1]] * 1.0;
          p2[zeroAxis] = kSign * C;
          pts.push(new THREE.Vector3(...p2));
        }

        const { geometry, outlineGeometry } = buildPolygonGeometry(pts, normal);
        facets.push({
          id: `edge_${dx}_${dy}_${dz}`,
          kind: 'edge',
          dir: [dx, dy, dz],
          preset: [dx, dy, dz],
          label: dirToLabel(dx, dy, dz),
          geometry,
          outlineGeometry,
        });
      }
    }
  }

  // 3. 8 Chamfered Corners
  for (const dx of [-1, 1]) {
    for (const dy of [-1, 1]) {
      for (const dz of [-1, 1]) {
        const normal = new THREE.Vector3(dx, dy, dz);
        const pts = [
          new THREE.Vector3(dx * 1.0, dy * S, dz * C),
          new THREE.Vector3(dx * 1.0, dy * C, dz * S),
          new THREE.Vector3(dx * S, dy * 1.0, dz * C),
          new THREE.Vector3(dx * C, dy * 1.0, dz * S),
          new THREE.Vector3(dx * S, dy * C, dz * 1.0),
          new THREE.Vector3(dx * C, dy * S, dz * 1.0),
        ];
        const { geometry, outlineGeometry } = buildPolygonGeometry(pts, normal);
        facets.push({
          id: `corner_${dx}_${dy}_${dz}`,
          kind: 'corner',
          dir: [dx, dy, dz],
          preset: [dx, dy, dz],
          label: dirToLabel(dx, dy, dz),
          geometry,
          outlineGeometry,
        });
      }
    }
  }

  return facets;
}

const CubeSceneContent: React.FC<{
  dragMovedRef: React.MutableRefObject<boolean>;
  onHoverChange: (label: string | null) => void;
}> = ({ dragMovedRef, onHoverChange }) => {
  const { camera } = useThree();
  const triggerCamera = useConfigStore((s) => s.triggerCamera);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const facets = useMemo(() => buildAllFacets(), []);

  useEffect(() => {
    // Initial isometric position matching [700, 380, 700]
    const initDir = new THREE.Vector3(700, 380, 700).normalize();
    camera.position.copy(initDir.multiplyScalar(4.1));
    camera.lookAt(0, 0, 0);

    const handleSync = (e: Event) => {
      const { theta, phi } = (e as CustomEvent<{ theta: number; phi: number }>).detail;
      camera.position.setFromSphericalCoords(4.1, phi, theta);
      camera.lookAt(0, 0, 0);
    };
    window.addEventListener('viewcube-sync', handleSync);
    return () => window.removeEventListener('viewcube-sync', handleSync);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 6, 5]} intensity={0.65} />
      <directionalLight position={[-4, -3, -5]} intensity={0.25} />
      <group>
        {facets.map((f) => {
          const isHovered = hoveredId === f.id;
          const baseColor =
            f.kind === 'face'
              ? '#ffffff'
              : f.kind === 'edge'
              ? '#e2e8f0'
              : '#cbd5e1';

          return (
            <group key={f.id}>
              <mesh
                geometry={f.geometry}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredId(f.id);
                  onHoverChange(f.label);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  setHoveredId((prev) => (prev === f.id ? null : prev));
                  onHoverChange(null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragMovedRef.current) return;
                  triggerCamera(f.preset);
                }}
              >
                <meshStandardMaterial
                  map={f.texture}
                  color={isHovered ? '#38bdf8' : baseColor}
                  roughness={0.55}
                  metalness={0.05}
                />
              </mesh>
              <lineSegments geometry={f.outlineGeometry}>
                <lineBasicMaterial color={isHovered ? '#0284c7' : '#94a3b8'} />
              </lineSegments>
            </group>
          );
        })}
      </group>
    </>
  );
};

export const ViewCube: React.FC = () => {
  const triggerCamera = useConfigStore((s) => s.triggerCamera);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  const dragMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    dragMovedRef.current = false;
    dragState.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.lastX;
    const dy = e.clientY - dragState.current.lastY;
    const totalDist = Math.hypot(e.clientX - dragState.current.startX, e.clientY - dragState.current.startY);
    if (totalDist > 4) {
      if (!dragState.current.moved) {
        dragState.current.moved = true;
        dragMovedRef.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    }
    dragState.current.lastX = e.clientX;
    dragState.current.lastY = e.clientY;

    if (dragState.current.moved) {
      window.dispatchEvent(
        new CustomEvent('viewcube-orbit', {
          detail: {
            dTheta: -dx * 0.015,
            dPhi: -dy * 0.015,
          },
        })
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current.active = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    setTimeout(() => {
      dragMovedRef.current = false;
    }, 30);
  };

  return (
    <div className="viewcube-widget" title="Ziehen zum Drehen · Fläche, Kante oder Ecke anklicken">
      <div
        className="vc-canvas-wrap"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ fov: 36, near: 0.1, far: 50 }}
          gl={{ alpha: true, antialias: true }}
        >
          <CubeSceneContent dragMovedRef={dragMovedRef} onHoverChange={setHoverLabel} />
        </Canvas>
      </div>
      <div className="vc-footer-row">
        <span className="vc-hover-label">{hoverLabel || 'Ansicht'}</span>
        <button
          type="button"
          className="vc-iso-reset-btn"
          onClick={() => triggerCamera('iso')}
          title="Zurück zur 3D-Isometrie"
        >
          <RotateCcw size={11} /> 3D
        </button>
      </div>
    </div>
  );
};
