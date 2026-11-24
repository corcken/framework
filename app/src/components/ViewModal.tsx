import React, { useEffect } from 'react';
import { Compass, Magnet, RotateCcw, Ruler, X } from 'lucide-react';
import { CameraPreset, useConfigStore } from '../store/useConfigStore';

export const ViewModal: React.FC = () => {
  const isViewModalOpen = useConfigStore((s) => s.isViewModalOpen);
  const setIsViewModalOpen = useConfigStore((s) => s.setIsViewModalOpen);
  const triggerCamera = useConfigStore((s) => s.triggerCamera);
  const cameraPreset = useConfigStore((s) => s.cameraPreset);
  const snapDistanceMm = useConfigStore((s) => s.snapDistanceMm);
  const setSnapDistanceMm = useConfigStore((s) => s.setSnapDistanceMm);
  const showDimensions = useConfigStore((s) => s.showDimensions);
  const setShowDimensions = useConfigStore((s) => s.setShowDimensions);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isViewModalOpen) {
        setIsViewModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewModalOpen, setIsViewModalOpen]);

  if (!isViewModalOpen) return null;

  const handleFaceClick = (preset: CameraPreset) => {
    triggerCamera(preset);
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsViewModalOpen(false)}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Compass size={18} className="modal-title-icon" />
            <h2 className="modal-title">Ansicht &amp; Ausrichtung</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => setIsViewModalOpen(false)}
            title="Schließen (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Section 1: 3D Ansichtswürfel */}
          <div className="modal-section">
            <div className="modal-section-title">
              <span>Ansichtswürfel (Kamera-Blickwinkel)</span>
            </div>
            <p className="modal-section-sub">
              Klicke auf eine Seite des 3D-Würfels oder nutze die Schnellwahltasten, um die Perspektive zu wechseln.
            </p>

            <div className="cube-scene-wrapper">
              <div className="cube-3d">
                <button
                  type="button"
                  className={`cube-face face-front ${cameraPreset === 'front' ? 'active' : ''}`}
                  onClick={() => handleFaceClick('front')}
                  title="Vorderansicht"
                >
                  Vorne
                </button>
                <button
                  type="button"
                  className={`cube-face face-back ${cameraPreset === 'back' ? 'active' : ''}`}
                  onClick={() => handleFaceClick('back')}
                  title="Rückansicht"
                >
                  Hinten
                </button>
                <button
                  type="button"
                  className={`cube-face face-right ${cameraPreset === 'right' ? 'active' : ''}`}
                  onClick={() => handleFaceClick('right')}
                  title="Rechte Seitenansicht"
                >
                  Rechts
                </button>
                <button
                  type="button"
                  className={`cube-face face-left ${cameraPreset === 'left' ? 'active' : ''}`}
                  onClick={() => handleFaceClick('left')}
                  title="Linke Seitenansicht"
                >
                  Links
                </button>
                <button
                  type="button"
                  className={`cube-face face-top ${cameraPreset === 'top' ? 'active' : ''}`}
                  onClick={() => handleFaceClick('top')}
                  title="Draufsicht (Oben)"
                >
                  Oben
                </button>
                <button
                  type="button"
                  className={`cube-face face-bottom ${cameraPreset === 'bottom' ? 'active' : ''}`}
                  onClick={() => handleFaceClick('bottom')}
                  title="Unteransicht (Unten)"
                >
                  Unten
                </button>
              </div>
            </div>

            {/* Richtungs-Tasten */}
            <div className="view-buttons-grid">
              <button
                type="button"
                className={`view-nav-btn ${cameraPreset === 'top' ? 'active' : ''}`}
                onClick={() => handleFaceClick('top')}
              >
                Oben
              </button>
              <button
                type="button"
                className={`view-nav-btn ${cameraPreset === 'bottom' ? 'active' : ''}`}
                onClick={() => handleFaceClick('bottom')}
              >
                Unten
              </button>
              <button
                type="button"
                className={`view-nav-btn ${cameraPreset === 'left' ? 'active' : ''}`}
                onClick={() => handleFaceClick('left')}
              >
                Links
              </button>
              <button
                type="button"
                className={`view-nav-btn ${cameraPreset === 'right' ? 'active' : ''}`}
                onClick={() => handleFaceClick('right')}
              >
                Rechts
              </button>
              <button
                type="button"
                className={`view-nav-btn ${cameraPreset === 'front' ? 'active' : ''}`}
                onClick={() => handleFaceClick('front')}
              >
                Vorne
              </button>
              <button
                type="button"
                className={`view-nav-btn ${cameraPreset === 'back' ? 'active' : ''}`}
                onClick={() => handleFaceClick('back')}
              >
                Hinten
              </button>
              <button
                type="button"
                className={`view-nav-btn iso-btn ${cameraPreset === 'iso' ? 'active' : ''}`}
                onClick={() => handleFaceClick('iso')}
              >
                <RotateCcw size={12} /> 3D Isometrisch
              </button>
            </div>
          </div>

          <hr className="modal-divider" />

          {/* Section 2: Snap-in Schieberegler */}
          <div className="modal-section">
            <div className="modal-section-header">
              <div className="modal-section-title">
                <Magnet size={16} />
                <span>Snap-in (Einrast-Entfernung)</span>
              </div>
              <span className={`snap-indicator-badge ${snapDistanceMm === 0 ? 'off' : 'on'}`}>
                {snapDistanceMm === 0 ? '0 mm (Aus)' : `${snapDistanceMm} mm`}
              </span>
            </div>

            <p className="modal-section-sub">
              Bestimmt den Rasterabstand beim Verschieben und Platzieren von Bauteilen. Bei <strong>0 mm</strong> ist das Einrasten deaktiviert (freie, stufenlose Bewegung).
            </p>

            <div className="snap-slider-box">
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={snapDistanceMm}
                onChange={(e) => setSnapDistanceMm(Number(e.target.value))}
                className="snap-range-slider"
              />
              <div className="snap-slider-ticks">
                <span className={snapDistanceMm === 0 ? 'tick-active' : ''}>0 (Aus)</span>
                <span className={snapDistanceMm === 10 ? 'tick-active' : ''}>10 mm</span>
                <span className={snapDistanceMm === 25 ? 'tick-active' : ''}>25 mm</span>
                <span className={snapDistanceMm === 50 ? 'tick-active' : ''}>50 mm</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="snap-quick-pills">
              <span className="pills-label">Schnellwahl:</span>
              <button
                type="button"
                className={`snap-pill ${snapDistanceMm === 0 ? 'active' : ''}`}
                onClick={() => setSnapDistanceMm(0)}
              >
                Aus (0)
              </button>
              <button
                type="button"
                className={`snap-pill ${snapDistanceMm === 5 ? 'active' : ''}`}
                onClick={() => setSnapDistanceMm(5)}
              >
                5 mm
              </button>
              <button
                type="button"
                className={`snap-pill ${snapDistanceMm === 10 ? 'active' : ''}`}
                onClick={() => setSnapDistanceMm(10)}
              >
                10 mm
              </button>
              <button
                type="button"
                className={`snap-pill ${snapDistanceMm === 20 ? 'active' : ''}`}
                onClick={() => setSnapDistanceMm(20)}
              >
                20 mm
              </button>
              <button
                type="button"
                className={`snap-pill ${snapDistanceMm === 25 ? 'active' : ''}`}
                onClick={() => setSnapDistanceMm(25)}
              >
                25 mm
              </button>
              <button
                type="button"
                className={`snap-pill ${snapDistanceMm === 50 ? 'active' : ''}`}
                onClick={() => setSnapDistanceMm(50)}
              >
                50 mm
              </button>
            </div>
          </div>

          <hr className="modal-divider" />

          {/* Section 3: Rohrbemaßung Schnellschalter */}
          <div className="modal-section modal-section-inline">
            <div className="modal-inline-left">
              <Ruler size={16} />
              <div>
                <div className="modal-inline-title">Rohrbemaßung in 3D</div>
                <div className="modal-inline-sub">Maßbeschriftungen über den Rohren anzeigen</div>
              </div>
            </div>
            <button
              type="button"
              className={`btn ${showDimensions ? 'btn-primary' : 'btn-soft'}`}
              onClick={() => setShowDimensions(!showDimensions)}
            >
              {showDimensions ? 'Aktiviert (An)' : 'Deaktiviert (Aus)'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsViewModalOpen(false)}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
