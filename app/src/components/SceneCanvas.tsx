import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, Html, OrbitControls, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PlacedNode, PipeSegment, ScenePhoto } from '../types/system';
import { useConfigStore } from '../store/useConfigStore';
import { getPipeAxisLengthMm, getWorldPort } from '../utils/geometry';
import { computeFrameBounds } from '../utils/geometry';
import { ViewCube } from './ViewCube';

const stlCache = new Map<string, THREE.BufferGeometry>();
const stlLoader = new STLLoader();

function useStlGeometry(path: string): THREE.BufferGeometry | null {
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(() => stlCache.get(path) ?? null);

  useEffect(() => {
    let active = true;
    if (stlCache.has(path)) {
      setGeom(stlCache.get(path)!);
      return;
    }
    stlLoader.load(
      path,
      (loaded) => {
        loaded.computeVertexNormals();
        stlCache.set(path, loaded);
        if (active) setGeom(loaded);
      },
      undefined,
      () => {
        // Fallback falls STL noch lädt/fehlt
      }
    );
    return () => {
      active = false;
    };
  }, [path]);

  return geom;
}

const CameraRig: React.FC = () => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const cameraPreset = useConfigStore((s) => s.cameraPreset);
  const cameraTick = useConfigStore((s) => s.cameraTick);

  const syncViewCube = () => {
    if (!controlsRef.current) return;
    const offset = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    window.dispatchEvent(new CustomEvent('viewcube-sync', { detail: { theta: sph.theta, phi: sph.phi } }));
  };

  useEffect(() => {
    if (cameraTick === 0) return;
    const target = new THREE.Vector3(0, 180, 0);
    const dirMap: Record<string, [number, number, number]> = {
      iso: [700, 380, 700],
      top: [0, 1, 0.001],
      bottom: [0, -1, 0.001],
      front: [0, 0, 1],
      back: [0, 0, -1],
      right: [1, 0, 0],
      left: [-1, 0, 0],
    };
    const rawDir = Array.isArray(cameraPreset) ? cameraPreset : (dirMap[cameraPreset] ?? dirMap.iso);
    const dir = new THREE.Vector3(rawDir[0], rawDir[1], rawDir[2]);
    if (dir.x === 0 && dir.z === 0) {
      dir.z = 0.001;
    }
    dir.normalize();
    const dist = !Array.isArray(cameraPreset) && cameraPreset === 'iso' ? 1060 : 950;
    camera.position.copy(target).addScaledVector(dir, dist);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
    syncViewCube();
  }, [cameraPreset, cameraTick, camera]);

  useEffect(() => {
    const handleOrbit = (e: Event) => {
      const { dTheta, dPhi } = (e as CustomEvent<{ dTheta: number; dPhi: number }>).detail;
      if (!controlsRef.current) return;
      const target = controlsRef.current.target;
      const offset = new THREE.Vector3().subVectors(camera.position, target);
      const sph = new THREE.Spherical().setFromVector3(offset);
      sph.theta += dTheta;
      sph.phi = THREE.MathUtils.clamp(sph.phi + dPhi, 0.01, Math.PI - 0.01);
      offset.setFromSpherical(sph);
      camera.position.copy(target).add(offset);
      controlsRef.current.update();
      syncViewCube();
    };
    window.addEventListener('viewcube-orbit', handleOrbit);
    syncViewCube();
    return () => window.removeEventListener('viewcube-orbit', handleOrbit);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      onChange={syncViewCube}
    />
  );
};

const thickLineGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.5, 12);
thickLineGeom.translate(0, 0.25, 0);

const StyledTransformControls: React.FC<{
  object: THREE.Object3D;
  onMouseUp: () => void;
  onObjectChange?: () => void;
}> = ({ object, onMouseUp, onObjectChange }) => {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const translateGizmo = ctrl._gizmo?.gizmo?.translate;
    if (!translateGizmo) return;
    translateGizmo.traverse((obj: any) => {
      if (!obj.isMesh) return;
      if (obj.name === 'X' || obj.name === 'Y' || obj.name === 'Z') {
        const params = obj.geometry?.parameters;
        if (params && params.radiusTop === 0.0075) {
          // Dünnen 3-eckigen Schaft durch volleren, runden Zylinder ersetzen
          obj.geometry = thickLineGeom;
        } else if (params && params.radiusTop === 0) {
          // Pfeilspitzen etwas kompakter machen
          obj.scale.set(0.82, 0.82, 0.82);
        }
      }
    });
  }, [object]);

  return (
    <TransformControls
      ref={controlsRef}
      object={object}
      mode="translate"
      size={0.62}
      onMouseUp={onMouseUp}
      onObjectChange={onObjectChange}
    />
  );
};

const NodeMesh: React.FC<{ node: PlacedNode }> = ({ node }) => {
  const geom = useStlGeometry(node.stlPath);
  const selectedUid = useConfigStore((s) => s.selectedUid);
  const selectedType = useConfigStore((s) => s.selectedType);
  const selectItem = useConfigStore((s) => s.selectItem);
  const moveNode = useConfigStore((s) => s.moveNode);
  const previewMoveNode = useConfigStore((s) => s.previewMoveNode);
  const pendingPort = useConfigStore((s) => s.pendingPort);
  const setPendingPort = useConfigStore((s) => s.setPendingPort);
  const connectPorts = useConfigStore((s) => s.connectPorts);

  const isSelected = selectedType === 'node' && selectedUid === node.uid;
  const [groupObj, setGroupObj] = useState<THREE.Group | null>(null);

  const handlePortClick = (e: any, portId: string) => {
    e.stopPropagation();
    if (!pendingPort) {
      setPendingPort({ nodeUid: node.uid, portId });
      return;
    }
    if (pendingPort.nodeUid === node.uid && pendingPort.portId === portId) {
      setPendingPort(null);
      return;
    }
    connectPorts(pendingPort, { nodeUid: node.uid, portId });
  };

  const content = (
    <group
      ref={setGroupObj}
      name="photo-model"
      position={node.position}
      rotation={node.rotationEuler}
      onClick={(e) => {
        e.stopPropagation();
        selectItem(node.uid, 'node');
      }}
    >
      {geom ? (
        <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial
            color={node.color}
            roughness={0.45}
            metalness={0.1}
            emissive={isSelected ? '#0284c7' : '#000000'}
            emissiveIntensity={isSelected ? 0.25 : 0}
          />
        </mesh>
      ) : (
        <mesh>
          <sphereGeometry args={[node.diameterMm * 0.7, 16, 16]} />
          <meshStandardMaterial color={node.color} />
        </mesh>
      )}

      {/* Klickbare Snap-Ports */}
      {node.ports.map((port) => {
        const isPending = pendingPort?.nodeUid === node.uid && pendingPort?.portId === port.id;
        const px = port.localPos[0] + port.localDir[0] * (node.diameterMm * 0.75);
        const py = port.localPos[1] + port.localDir[1] * (node.diameterMm * 0.75);
        const pz = port.localPos[2] + port.localDir[2] * (node.diameterMm * 0.75);

        return (
          <mesh
            key={port.id}
            position={[px, py, pz]}
            userData={{ photoHide: true }}
            onClick={(e) => handlePortClick(e, port.id)}
          >
            <sphereGeometry args={[Math.max(5, node.diameterMm * 0.22), 14, 14]} />
            <meshStandardMaterial
              color={isPending ? '#16a34a' : '#0284c7'}
              emissive={isPending ? '#16a34a' : '#0284c7'}
              emissiveIntensity={0.35}
            />
          </mesh>
        );
      })}
      {/* Lock-Anzeige */}
      {node.locked && (
        <Html center position={[0, node.diameterMm + 18, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[15, 0]}>
          <div className="lock-badge" title="Gesperrt">🔒</div>
        </Html>
      )}
    </group>
  );

  if (isSelected && !node.locked && groupObj) {
    return (
      <>
        {content}
        <StyledTransformControls
          object={groupObj}
          onObjectChange={() => {
            if (!groupObj) return;
            const p = groupObj.position;
            previewMoveNode(node.uid, [p.x, Math.max(0, p.y), p.z]);
          }}
          onMouseUp={() => {
            if (!groupObj) return;
            const p = groupObj.position;
            moveNode(node.uid, [p.x, Math.max(0, p.y), p.z]);
          }}
        />
      </>
    );
  }

  return content;
};

const PipeMesh: React.FC<{ pipe: PipeSegment }> = ({ pipe }) => {
  const selectedUid = useConfigStore((s) => s.selectedUid);
  const selectedType = useConfigStore((s) => s.selectedType);
  const selectItem = useConfigStore((s) => s.selectItem);
  const movePipe = useConfigStore((s) => s.movePipe);
  const previewMovePipe = useConfigStore((s) => s.previewMovePipe);
  const togglePipeConnectionLock = useConfigStore((s) => s.togglePipeConnectionLock);
  const showDimensions = useConfigStore((s) => s.showDimensions);

  const isSelected = selectedType === 'pipe' && selectedUid === pipe.uid;
  const [groupObj, setGroupObj] = useState<THREE.Group | null>(null);

  const { mid, quat, axisLen } = useMemo(() => {
    const start = new THREE.Vector3(...pipe.startPos);
    const end = new THREE.Vector3(...pipe.endPos);
    const diff = new THREE.Vector3().subVectors(end, start);
    const len = diff.length();
    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const q = new THREE.Quaternion();
    if (len > 0.001) {
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.clone().normalize());
    }
    return { mid: center, quat: q, axisLen: Math.max(1, len) };
  }, [pipe.startPos, pipe.endPos]);

  const lengthMm = getPipeAxisLengthMm(pipe);

  const content = (
    <group
      ref={setGroupObj}
      name="photo-model"
      position={mid}
      quaternion={quat}
      onClick={(e) => {
        e.stopPropagation();
        selectItem(pipe.uid, 'pipe');
      }}
    >
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[pipe.diameterMm / 2, pipe.diameterMm / 2, axisLen, 24]} />
        <meshStandardMaterial
          color={pipe.color}
          roughness={0.32}
          metalness={0.65}
          emissive={isSelected ? '#0284c7' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {/* Ein Schloss pro Verbindung, direkt am jeweiligen Rohrende */}
      {pipe.startNodeUid && (
        <Html
          center
          position={[0, -axisLen / 2 + Math.min(34, axisLen * 0.22), 0]}
          distanceFactor={950}
          zIndexRange={[15, 0]}
        >
          <button
            type="button"
            className={`conn-lock-btn ${pipe.startLocked === false ? 'unlocked' : 'locked'}`}
            onClick={(e) => {
              e.stopPropagation();
              togglePipeConnectionLock(pipe.uid, 'start');
            }}
            title={
              pipe.startLocked === false
                ? 'Anschluss Start entsperrt (klicken zum Sperren / gemeinsam verschieben)'
                : 'Anschluss Start gesperrt (klicken zum Öffnen / unabhängig verschieben)'
            }
          >
            {pipe.startLocked === false ? '🔓' : '🔒'}
          </button>
        </Html>
      )}

      {pipe.endNodeUid && (
        <Html
          center
          position={[0, axisLen / 2 - Math.min(34, axisLen * 0.22), 0]}
          distanceFactor={950}
          zIndexRange={[15, 0]}
        >
          <button
            type="button"
            className={`conn-lock-btn ${pipe.endLocked === false ? 'unlocked' : 'locked'}`}
            onClick={(e) => {
              e.stopPropagation();
              togglePipeConnectionLock(pipe.uid, 'end');
            }}
            title={
              pipe.endLocked === false
                ? 'Anschluss Ende entsperrt (klicken zum Sperren / gemeinsam verschieben)'
                : 'Anschluss Ende gesperrt (klicken zum Öffnen / unabhängig verschieben)'
            }
          >
            {pipe.endLocked === false ? '🔓' : '🔒'}
          </button>
        </Html>
      )}

      {showDimensions && (
        <Html center distanceFactor={950} style={{ pointerEvents: 'none' }} zIndexRange={[15, 0]}>
          <div className="dim-label">
            Ø{pipe.diameterMm} · {lengthMm} mm
          </div>
        </Html>
      )}
    </group>
  );

  if (isSelected && groupObj) {
    return (
      <>
        {content}
        <StyledTransformControls
          object={groupObj}
          onObjectChange={() => {
            if (!groupObj) return;
            const p = groupObj.position;
            previewMovePipe(pipe.uid, [p.x, p.y, p.z]);
          }}
          onMouseUp={() => {
            if (!groupObj) return;
            const p = groupObj.position;
            movePipe(pipe.uid, [p.x, p.y, p.z]);
          }}
        />
      </>
    );
  }

  return content;
};

let snapCloudTexture: THREE.Texture | null = null;
function getSnapCloudTexture(): THREE.Texture | null {
  if (snapCloudTexture) return snapCloudTexture;
  if (typeof document === 'undefined') return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Mehrere weiche Kreise ergeben eine wolkenartige, transparente Fläche.
  const blobs: Array<[number, number, number]> = [
    [64, 64, 46],
    [42, 56, 30],
    [87, 55, 28],
    [55, 88, 27],
    [82, 86, 24],
  ];
  for (const [x, y, r] of blobs) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.38)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  snapCloudTexture = texture;
  return texture;
}

const SnapPreviewClouds: React.FC = () => {
  const snapPreviews = useConfigStore((s) => s.snapPreviews);
  const cloudTexture = useMemo(() => getSnapCloudTexture(), []);

  if (!cloudTexture) return null;

  return (
    <>
      {snapPreviews.map((preview) => (
        <group key={preview.id}>
          {[preview.start, preview.end].map((point, index) => (
            <sprite key={index} position={point} scale={[120, 120, 1]} renderOrder={20}>
              <spriteMaterial
                map={cloudTexture}
                color="#ff3fa4"
                transparent
                opacity={0.66}
                depthWrite={false}
                depthTest={false}
              />
            </sprite>
          ))}
        </group>
      ))}
    </>
  );
};

const DimensionLine: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  thin?: boolean;
}> = ({ start, end, thin }) => {
  const { mid, quat, len } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const diff = new THREE.Vector3().subVectors(e, s);
    const length = Math.max(0.01, diff.length());
    const q = new THREE.Quaternion();
    if (length > 0.001) {
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.clone().normalize());
    }
    return {
      mid: new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5),
      quat: q,
      len: length,
    };
  }, [start, end]);

  return (
    <mesh position={mid} quaternion={quat} raycast={() => null}>
      <cylinderGeometry args={[thin ? 0.6 : 1.3, thin ? 0.6 : 1.3, len, 8]} />
      <meshBasicMaterial color="#0f172a" />
    </mesh>
  );
};

const DimensionArrow: React.FC<{
  tip: [number, number, number];
  direction: [number, number, number];
}> = ({ tip, direction }) => {
  const { position, quat } = useMemo(() => {
    const dir = new THREE.Vector3(...direction);
    if (dir.lengthSq() < 0.000001) dir.set(0, 1, 0);
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const p = new THREE.Vector3(...tip).addScaledVector(dir, -7);
    return { position: p, quat: q };
  }, [tip, direction]);

  return (
    <mesh position={position} quaternion={quat} raycast={() => null}>
      <coneGeometry args={[4.5, 14, 12]} />
      <meshBasicMaterial color="#0f172a" />
    </mesh>
  );
};

const OverallDimensions: React.FC = () => {
  const nodes = useConfigStore((s) => s.nodes);
  const pipes = useConfigStore((s) => s.pipes);

  const bounds = useMemo(() => computeFrameBounds(nodes, pipes), [nodes, pipes]);
  if (nodes.length === 0 && pipes.length === 0) return null;

  const { min, max, width, depth, height } = bounds;
  const offset = Math.max(70, Math.min(180, Math.max(width, depth, height) * 0.08));
  const baseY = Math.max(0, min[1]);
  const zLine = max[2] + offset;
  const xLine = max[0] + offset;
  const yLineX = min[0] - offset;
  const yLineZ = min[2];

  const widthStart: [number, number, number] = [min[0], baseY, zLine];
  const widthEnd: [number, number, number] = [max[0], baseY, zLine];
  const depthStart: [number, number, number] = [xLine, baseY, min[2]];
  const depthEnd: [number, number, number] = [xLine, baseY, max[2]];
  const heightStart: [number, number, number] = [yLineX, min[1], yLineZ];
  const heightEnd: [number, number, number] = [yLineX, max[1], yLineZ];

  return (
    <group raycast={() => null}>
      <DimensionLine start={widthStart} end={widthEnd} />
      <DimensionLine start={depthStart} end={depthEnd} />
      <DimensionLine start={heightStart} end={heightEnd} />

      <DimensionLine start={[min[0], baseY, max[2]]} end={widthStart} thin />
      <DimensionLine start={[max[0], baseY, max[2]]} end={widthEnd} thin />
      <DimensionLine start={[max[0], baseY, max[2]]} end={depthEnd} thin />
      <DimensionLine start={[max[0], baseY, min[2]]} end={depthStart} thin />
      <DimensionLine start={[min[0], min[1], yLineZ]} end={heightStart} thin />
      <DimensionLine start={[min[0], max[1], yLineZ]} end={heightEnd} thin />

      <DimensionArrow tip={widthStart} direction={[-1, 0, 0]} />
      <DimensionArrow tip={widthEnd} direction={[1, 0, 0]} />
      <DimensionArrow tip={depthStart} direction={[0, 0, -1]} />
      <DimensionArrow tip={depthEnd} direction={[0, 0, 1]} />
      <DimensionArrow tip={heightStart} direction={[0, -1, 0]} />
      <DimensionArrow tip={heightEnd} direction={[0, 1, 0]} />

      <Html center position={[widthStart[0] + width / 2, baseY + 12, zLine]} distanceFactor={950} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div className="overall-dim-label">Breite: {width} mm</div>
      </Html>
      <Html center position={[xLine, baseY + 12, depthStart[2] + depth / 2]} distanceFactor={950} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div className="overall-dim-label">Tiefe: {depth} mm</div>
      </Html>
      <Html center position={[yLineX, (min[1] + max[1]) / 2, yLineZ]} distanceFactor={950} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div className="overall-dim-label">Höhe: {height} mm</div>
      </Html>
    </group>
  );
};

export const SceneCanvas: React.FC<{
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  captureRef?: React.MutableRefObject<(() => ScenePhoto | null) | null>;
}> = ({ onCanvasReady, captureRef }) => {
  const nodes = useConfigStore((s) => s.nodes);
  const pipes = useConfigStore((s) => s.pipes);
  const selectItem = useConfigStore((s) => s.selectItem);
  const addNode = useConfigStore((s) => s.addNode);
  const addFreePipe = useConfigStore((s) => s.addFreePipe);
  const snapDistanceMm = useConfigStore((s) => s.snapDistanceMm);
  const showDimensions = useConfigStore((s) => s.showDimensions);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Erzeugt eine farbige 3D-Ansicht ohne Arbeitsraster, Bemaßung und Helfer.
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = () => {
      const gl = glRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!gl || !scene || !camera) return null;

      const changed: Array<{ object: THREE.Object3D; visible: boolean }> = [];
      const hiddenObjects = new Set<THREE.Object3D>();
      const hide = (object: THREE.Object3D) => {
        if (hiddenObjects.has(object)) return;
        hiddenObjects.add(object);
        changed.push({ object, visible: object.visible });
        object.visible = false;
      };

      scene.children.forEach((child) => {
        const isLight = (child as THREE.Light).isLight === true;
        const isModel =
          child.name === 'photo-model' || child.children.some((c) => c.name === 'photo-model');
        if (!isLight && !isModel) hide(child);
      });
      scene.traverse((object) => {
        if (object.userData?.photoHide || (object as { isTransformControlsRoot?: boolean }).isTransformControlsRoot) {
          hide(object);
        }
      });

      // Auswahl-Hervorhebung (Emissive) für ein neutrales Foto kurz deaktivieren.
      const changedMaterials: Array<{ material: THREE.MeshStandardMaterial; intensity: number }> = [];
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          const standard = material as THREE.MeshStandardMaterial;
          if (typeof standard.emissiveIntensity === 'number' && standard.emissiveIntensity > 0) {
            changedMaterials.push({ material: standard, intensity: standard.emissiveIntensity });
            standard.emissiveIntensity = 0;
          }
        }
      });

      // Eigene Kamera, damit das komplette Gestell mittig und unbeschnitten zu sehen ist.
      const bounds = computeFrameBounds(nodes, pipes);
      const center = new THREE.Vector3(
        (bounds.min[0] + bounds.max[0]) / 2,
        (bounds.min[1] + bounds.max[1]) / 2,
        (bounds.min[2] + bounds.max[2]) / 2
      );
      const aspect = Math.max(0.1, gl.domElement.width / gl.domElement.height);
      const fov = 38;
      const vFov = THREE.MathUtils.degToRad(fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const dir = new THREE.Vector3(1, 0.7, 1).normalize();
      const forward = dir.clone().negate();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      const tanH = Math.tan(hFov / 2);
      const tanV = Math.tan(vFov / 2);

      // Passgenaue Distanz aus den projizierten Bounding-Box-Ecken bestimmen.
      let distance = 1;
      for (const x of [bounds.min[0], bounds.max[0]]) {
        for (const y of [bounds.min[1], bounds.max[1]]) {
          for (const z of [bounds.min[2], bounds.max[2]]) {
            const rel = new THREE.Vector3(x, y, z).sub(center);
            const w = rel.dot(dir);
            distance = Math.max(
              distance,
              w + Math.abs(rel.dot(right)) / tanH,
              w + Math.abs(rel.dot(up)) / tanV
            );
          }
        }
      }
      distance *= 1.05;

      const photoCamera = new THREE.PerspectiveCamera(fov, aspect, 1, 100000);
      photoCamera.position.copy(center).addScaledVector(dir, distance);
      photoCamera.lookAt(center);
      photoCamera.updateProjectionMatrix();

      gl.render(scene, photoCamera);
      const dataUrl = gl.domElement.toDataURL('image/png');
      const width = gl.domElement.width;
      const height = gl.domElement.height;

      changed.forEach(({ object, visible }) => {
        object.visible = visible;
      });
      changedMaterials.forEach(({ material, intensity }) => {
        material.emissiveIntensity = intensity;
      });
      gl.render(scene, camera);

      return { dataUrl, width, height };
    };

    return () => {
      captureRef.current = null;
    };
  }, [captureRef, nodes, pipes]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-gestell-item');
    if (!raw || !wrapperRef.current || !cameraRef.current) return;

    const payload = JSON.parse(raw) as { kind: 'node' | 'pipe'; catalogId?: string; diameterMm?: number };
    const rect = wrapperRef.current.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, cameraRef.current);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, hit);

    const snap = snapDistanceMm;
    const x = snap > 0 ? Math.round(hit.x / snap) * snap : Math.round(hit.x * 10) / 10;
    const z = snap > 0 ? Math.round(hit.z / snap) * snap : Math.round(hit.z * 10) / 10;

    if (payload.kind === 'node' && payload.catalogId) {
      addNode(payload.catalogId, [x, 0, z]);
    } else if (payload.kind === 'pipe') {
      addFreePipe([x - 250, 20, z], [x + 250, 20, z], payload.diameterMm);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="canvas-wrapper"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [700, 560, 700], fov: 45, near: 5, far: 15000 }}
        onCreated={({ gl, camera, scene }) => {
          onCanvasReady(gl.domElement);
          cameraRef.current = camera;
          glRef.current = gl;
          sceneRef.current = scene;
        }}
        onPointerMissed={() => selectItem(null, null)}
      >
        <color attach="background" args={['#f8fafc']} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[600, 1000, 500]} intensity={1.1} castShadow />
        <directionalLight position={[-500, 400, -400]} intensity={0.45} />

        <Grid
          args={[6000, 6000]}
          cellSize={50}
          cellThickness={0.6}
          cellColor="#cbd5e1"
          sectionSize={250}
          sectionThickness={1.2}
          sectionColor="#94a3b8"
          fadeDistance={20000}
          fadeStrength={0}
          position={[0, -0.5, 0]}
        />

        {nodes.map((n) => (
          <NodeMesh key={n.uid} node={n} />
        ))}
        {pipes.map((p) => (
          <PipeMesh key={p.uid} pipe={p} />
        ))}

        <SnapPreviewClouds />

        {showDimensions && <OverallDimensions />}

        <CameraRig />
      </Canvas>

      <ViewCube />
    </div>
  );
};
