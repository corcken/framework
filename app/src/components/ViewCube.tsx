import React from 'react';
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
  const triggerCamera = useConfigStore((s) => s.triggerCamera);

  return (
    <div className="viewcube-panel" title="Kamera-Ansichten">
      <div className="viewcube-header">
        <span>Ansicht</span>
        <button className="vc-iso-btn" onClick={() => triggerCamera('iso')} title="3D Isometrisch">
          3D
        </button>
      </div>
      <div className="viewcube-grid">
        <div />
        <button className="vc-btn" onClick={() => triggerCamera('top')} title="Top">Oben</button>
        <div />
        <button className="vc-btn" onClick={() => triggerCamera('left')} title="Left">Links</button>
        <button className="vc-btn vc-center" onClick={() => triggerCamera('front')} title="Front">Vorne</button>
        <button className="vc-btn" onClick={() => triggerCamera('right')} title="Right">Rechts</button>
        <button className="vc-btn" onClick={() => triggerCamera('back')} title="Back">Hinten</button>
        <button className="vc-btn" onClick={() => triggerCamera('bottom')} title="Bottom">Unten</button>
        <button className="vc-btn" onClick={() => triggerCamera('iso')} title="Iso">Iso</button>
      </div>
    </div>
  );
};

export { FACES };
