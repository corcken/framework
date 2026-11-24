import React from 'react';
import { Compass, RotateCcw } from 'lucide-react';
import { CameraPreset, useConfigStore } from '../store/useConfigStore';

const FACES: Array<{ preset: CameraPreset; label: string; title: string }> = [
  { preset: 'top', label: 'Oben', title: 'Draufsicht (Top)' },
  { preset: 'front', label: 'Vorne', title: 'Vorderansicht (Front)' },
  { preset: 'right', label: 'Rechts', title: 'Seitenansicht Rechts' },
  { preset: 'left', label: 'Links', title: 'Seitenansicht Links' },
  { preset: 'back', label: 'Hinten', title: 'Rückansicht (Back)' },
  { preset: 'bottom', label: 'Unten', title: 'Unteransicht (Bottom)' },
];

export const ViewCube: React.FC = () => {
  const setIsViewModalOpen = useConfigStore((s) => s.setIsViewModalOpen);
  const triggerCamera = useConfigStore((s) => s.triggerCamera);

  return (
    <div className="viewcube-trigger-wrap" title="Ansicht & Kamera-Einstellungen">
      <button
        type="button"
        className="viewcube-trigger-btn"
        onClick={() => setIsViewModalOpen(true)}
      >
        <Compass size={15} />
        <span>Ansicht</span>
      </button>
      <button
        type="button"
        className="viewcube-quick-iso"
        onClick={() => triggerCamera('iso')}
        title="3D Isometrisch"
      >
        <RotateCcw size={12} />
      </button>
    </div>
  );
};

export { FACES };
