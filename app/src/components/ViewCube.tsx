import React, { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { CameraPreset, useConfigStore } from '../store/useConfigStore';

const FACES: Array<{ preset: CameraPreset; label: string; className: string; title: string }> = [
  { preset: 'front', label: 'Vorne', className: 'vc-face-front', title: 'Vorderansicht' },
  { preset: 'back', label: 'Hinten', className: 'vc-face-back', title: 'Rückansicht' },
  { preset: 'right', label: 'Rechts', className: 'vc-face-right', title: 'Rechte Seitenansicht' },
  { preset: 'left', label: 'Links', className: 'vc-face-left', title: 'Linke Seitenansicht' },
  { preset: 'top', label: 'Oben', className: 'vc-face-top', title: 'Draufsicht (Oben)' },
  { preset: 'bottom', label: 'Unten', className: 'vc-face-bottom', title: 'Unteransicht (Unten)' },
];

export const ViewCube: React.FC = () => {
  const triggerCamera = useConfigStore((s) => s.triggerCamera);
  const cubeRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const handleSync = (e: Event) => {
      const { rotX, rotY } = (e as CustomEvent<{ rotX: number; rotY: number }>).detail;
      if (cubeRef.current) {
        cubeRef.current.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      }
    };
    window.addEventListener('viewcube-sync', handleSync);
    return () => window.removeEventListener('viewcube-sync', handleSync);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    dragState.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.lastX;
    const dy = e.clientY - dragState.current.lastY;
    const totalDist = Math.hypot(e.clientX - dragState.current.startX, e.clientY - dragState.current.startY);
    if (totalDist > 4) {
      dragState.current.moved = true;
    }
    dragState.current.lastX = e.clientX;
    dragState.current.lastY = e.clientY;

    if (dragState.current.moved) {
      window.dispatchEvent(
        new CustomEvent('viewcube-orbit', {
          detail: {
            dTheta: -dx * 0.012,
            dPhi: -dy * 0.012,
          },
        })
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if not captured
    }
  };

  const handleFaceClick = (e: React.MouseEvent, preset: CameraPreset) => {
    e.stopPropagation();
    if (dragState.current.moved) return;
    triggerCamera(preset);
  };

  return (
    <div className="viewcube-widget" title="Würfel ziehen zum Drehen, Seite anklicken für Ansicht">
      <div
        className="vc-cube-scene"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          ref={cubeRef}
          className="vc-cube"
          style={{ transform: 'rotateX(-21deg) rotateY(-45deg)' }}
        >
          {FACES.map((f) => (
            <button
              key={f.preset}
              type="button"
              className={`vc-face ${f.className}`}
              onClick={(e) => handleFaceClick(e, f.preset)}
              title={f.title}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="vc-iso-reset-btn"
        onClick={() => triggerCamera('iso')}
        title="Zurück zur 3D-Isometrie"
      >
        <RotateCcw size={11} /> 3D
      </button>
    </div>
  );
};

export { FACES };
