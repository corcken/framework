import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, Html, OrbitControls, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PlacedNode, PipeSegment } from '../types/system';
import { useConfigStore } from '../store/useConfigStore';
import { getPipeCutLengthMm, getWorldPort } from '../utils/geometry';
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

const NodeMesh: React.FC<{ node: PlacedNode }> = ({ node }) => {
  const geom = useStlGeometry(node.stlPath);
  const selectedUid = useConfigStore((s) => s.selectedUid);
  const selectedType = useConfigStore((s) => s.selectedType);
  const selectItem = useConfigStore((s) => s.selectItem);
  const moveNode = useConfigStore((s) => s.moveNode);
  const snapDistanceMm = useConfigStore((s) => s.snapDistanceMm);
  const pendingPort = useConfigStore((s) => s.pendingPort);
  const setPendingPort = useConfigStore((s) => s.setPendingPort);
  const connectPorts = useConfigStore((s) => s.connectPorts);

  const isSelected = selectedType === 'node' && selectedUid === node.uid;
  const groupRef = useRef<THREE.Group>(null);

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
      ref={groupRef}
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
    </group>
  );

  if (isSelected && groupRef.current) {
    return (
      <>
        {content}
        <TransformControls
          object={groupRef.current}
          mode="translate"
          translationSnap={snapDistanceMm > 0 ? snapDistanceMm : null}
          onMouseUp={() => {
            if (!groupRef.current) return;
            const p = groupRef.current.position;
            const snap = snapDistanceMm;
            const x = snap > 0 ? Math.round(p.x / snap) * snap : Math.round(p.x * 10) / 10;
            const y = snap > 0 ? Math.max(0, Math.round(p.y / snap) * snap) : Math.max(0, Math.round(p.y * 10) / 10);
            const z = snap > 0 ? Math.round(p.z / snap) * snap : Math.round(p.z * 10) / 10;
            moveNode(node.uid, [x, y, z]);
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
  const showDimensions = useConfigStore((s) => s.showDimensions);

  const isSelected = selectedType === 'pipe' && selectedUid === pipe.uid;

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

  const cutLen = getPipeCutLengthMm(pipe);

  return (
    <group
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
      {showDimensions && (
        <Html center distanceFactor={950} style={{ pointerEvents: 'none' }}>
          <div className="dim-label">
            Ø{pipe.diameterMm} · {cutLen} mm
          </div>
        </Html>
      )}
    </group>
  );
};

export const SceneCanvas: React.FC<{
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}> = ({ onCanvasReady }) => {
  const nodes = useConfigStore((s) => s.nodes);
  const pipes = useConfigStore((s) => s.pipes);
  const selectItem = useConfigStore((s) => s.selectItem);
  const addNode = useConfigStore((s) => s.addNode);
  const addFreePipe = useConfigStore((s) => s.addFreePipe);
  const snapDistanceMm = useConfigStore((s) => s.snapDistanceMm);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);

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
        onCreated={({ gl, camera }) => {
          onCanvasReady(gl.domElement);
          cameraRef.current = camera;
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
          fadeDistance={100000}
          fadeStrength={0}
          infiniteGrid
          position={[0, -0.5, 0]}
        />

        {nodes.map((n) => (
          <NodeMesh key={n.uid} node={n} />
        ))}
        {pipes.map((p) => (
          <PipeMesh key={p.uid} pipe={p} />
        ))}

        <CameraRig />
      </Canvas>

      <ViewCube />
    </div>
  );
};
