import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Box,
  ChevronDown,
  ChevronRight,
  Download,
  FileArchive,
  FileText,
  FolderOpen,
  Layers,
  Lock,
  Magnet,
  RotateCw,
  Ruler,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import {
  CATALOG_CATEGORIES,
  CATALOG_ITEMS,
  PART_COLORS,
  PIPE_COLORS,
  REDUCER_PAIRS,
  ROUND_DIAMETERS,
} from './data/catalog';
import { useConfigStore } from './store/useConfigStore';
import { SceneCanvas } from './components/SceneCanvas';
import { buildBom, downloadZipBundle, generatePdfDoc } from './utils/exportPdfZip';
import { computeFrameBounds, estimateFrameLoad, getPipeAxisLengthMm } from './utils/geometry';

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const meta = useConfigStore((s) => s.meta);
  const setMeta = useConfigStore((s) => s.setMeta);
  const nodes = useConfigStore((s) => s.nodes);
  const pipes = useConfigStore((s) => s.pipes);
  const selectedDiameter = useConfigStore((s) => s.selectedDiameter);
  const setSelectedDiameter = useConfigStore((s) => s.setSelectedDiameter);
  const selectedReducerPair = useConfigStore((s) => s.selectedReducerPair);
  const setSelectedReducerPair = useConfigStore((s) => s.setSelectedReducerPair);
  const activePartColor = useConfigStore((s) => s.activePartColor);
  const setActivePartColor = useConfigStore((s) => s.setActivePartColor);
  const activePipeColor = useConfigStore((s) => s.activePipeColor);
  const setActivePipeColor = useConfigStore((s) => s.setActivePipeColor);
  const selectedUid = useConfigStore((s) => s.selectedUid);
  const selectedType = useConfigStore((s) => s.selectedType);
  const pendingPort = useConfigStore((s) => s.pendingPort);
  const setPendingPort = useConfigStore((s) => s.setPendingPort);
  const showDimensions = useConfigStore((s) => s.showDimensions);
  const setShowDimensions = useConfigStore((s) => s.setShowDimensions);
  const snapDistanceMm = useConfigStore((s) => s.snapDistanceMm);
  const setSnapDistanceMm = useConfigStore((s) => s.setSnapDistanceMm);

  const addNode = useConfigStore((s) => s.addNode);
  const addFreePipe = useConfigStore((s) => s.addFreePipe);
  const addPipeFromPort = useConfigStore((s) => s.addPipeFromPort);
  const rotateNodeAxis = useConfigStore((s) => s.rotateNodeAxis);
  const setItemColor = useConfigStore((s) => s.setItemColor);
  const updatePipeLength = useConfigStore((s) => s.updatePipeLength);
  const dropSelectedToGround = useConfigStore((s) => s.dropSelectedToGround);
  const toggleLockSelected = useConfigStore((s) => s.toggleLockSelected);
  const togglePipeConnectionLock = useConfigStore((s) => s.togglePipeConnectionLock);
  const deleteSelected = useConfigStore((s) => s.deleteSelected);
  const loadDemoFrame = useConfigStore((s) => s.loadDemoFrame);
  const clearProject = useConfigStore((s) => s.clearProject);
  const exportProjectFile = useConfigStore((s) => s.exportProjectFile);
  const importProjectFile = useConfigStore((s) => s.importProjectFile);

  const [portPipeLen, setPortPipeLen] = useState(400);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [infoModal, setInfoModal] = useState<'bom' | 'statics' | null>(null);
  const [busyZip, setBusyZip] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && infoModal) setInfoModal(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [infoModal]);

  // Zustand für ausklappbare Kategorien (standardmäßig alle geöffnet)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of CATALOG_CATEGORIES) {
      init[c.id] = true;
    }
    return init;
  });

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const allCategoriesOpen = CATALOG_CATEGORIES.every((c) => openCategories[c.id]);

  const toggleAllCategories = () => {
    const nextState = !allCategoriesOpen;
    const next: Record<string, boolean> = {};
    for (const c of CATALOG_CATEGORIES) {
      next[c.id] = targetStateNext(nextState);
    }
    setOpenCategories(next);
  };

  function targetStateNext(s: boolean) {
    return s;
  }

  const selectedNode = selectedType === 'node' ? nodes.find((n) => n.uid === selectedUid) : undefined;
  const selectedPipe = selectedType === 'pipe' ? pipes.find((p) => p.uid === selectedUid) : undefined;
  const isSelectedLocked = Boolean(selectedNode?.locked || selectedPipe?.locked);
  const showRightSidebar = Boolean(selectedNode || selectedPipe || pendingPort);

  const { nodeRows, pipeRows } = buildBom(nodes, pipes);
  const bounds = computeFrameBounds(nodes, pipes);
  const load = estimateFrameLoad(nodes, pipes);

  const handleSaveJson = () => {
    const data = exportProjectFile();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(meta.name || 'gestell').replace(/[^a-zA-Z0-9_-]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        importProjectFile(parsed);
      } catch {
        alert('Die Datei konnte nicht als gültiges Gestell-Projekt geladen werden.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportPdf = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    const doc = generatePdfDoc(meta, nodes, pipes, dataUrl);
    const safeName = (meta.name || 'gestell').replace(/[^a-zA-Z0-9_-]+/g, '_');
    doc.save(`${safeName}_Zeichnung_Stueckliste.pdf`);
  };

  const handleExportZip = async () => {
    setBusyZip(true);
    try {
      const dataUrl = canvasRef.current?.toDataURL('image/png');
      await downloadZipBundle(exportProjectFile(), dataUrl);
    } finally {
      setBusyZip(false);
    }
  };

  const searchQuery = catalogSearch.trim().toLowerCase();

  const pipeMatchesSearch = useMemo(() => {
    if (!searchQuery) return true;
    return (
      'rundrohr'.includes(searchQuery) ||
      'rohr'.includes(searchQuery) ||
      '500'.includes(searchQuery) ||
      'profil'.includes(searchQuery)
    );
  }, [searchQuery]);

  const filteredCatalog = useMemo(() => {
    return CATALOG_ITEMS.filter((item) => {
      if (!searchQuery) return true;
      return (
        item.name.toLowerCase().includes(searchQuery) ||
        item.articleCode.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery)
      );
    });
  }, [searchQuery]);

  const itemsByCategory = useMemo(() => {
    const map: Record<string, typeof CATALOG_ITEMS> = {};
    for (const cat of CATALOG_CATEGORIES) {
      map[cat.id] = [];
    }
    for (const item of filteredCatalog) {
      if (!map[item.category]) {
        map[item.category] = [];
      }
      map[item.category].push(item);
    }
    return map;
  }, [filteredCatalog]);

  const visibleCategories = useMemo(() => {
    return CATALOG_CATEGORIES.filter((cat) => {
      if (!searchQuery) return true;
      if (cat.id === 'rohre') return pipeMatchesSearch;
      return (itemsByCategory[cat.id]?.length ?? 0) > 0;
    });
  }, [searchQuery, pipeMatchesSearch, itemsByCategory]);

  const isCategoryOpen = (catId: string) => {
    if (searchQuery) return true;
    return openCategories[catId] ?? true;
  };

  return (
    <div className="app-shell">
      {/* Kopfzeile */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">
            <Box size={20} className="brand-icon" />
            <span>Gestell-Konfigurator</span>
          </div>
          <input
            className="meta-input"
            value={meta.name}
            onChange={(e) => setMeta({ name: e.target.value })}
            placeholder="Projektname..."
            title="Projektname für PDF-Kopf"
          />
          <input
            className="meta-input meta-author"
            value={meta.author}
            onChange={(e) => setMeta({ author: e.target.value })}
            placeholder="Autor (optional)"
            title="Autor für PDF-Kopf"
          />
        </div>

        <div className="topbar-actions">
          <button className="btn btn-soft" onClick={loadDemoFrame} title="Beispiel-Gestell laden">
            <Sparkles size={15} /> Beispiel
          </button>
          <div
            className="topbar-snap-control"
            title="Snap-in Entfernung beim Platzieren und Verschieben (0 = Aus)"
          >
            <Magnet size={14} className={snapDistanceMm > 0 ? 'snap-icon-on' : 'snap-icon-off'} />
            <span className="snap-label">Snap-in:</span>
            <input
              type="range"
              min={0}
              max={200}
              step={1}
              value={snapDistanceMm}
              onChange={(e) => setSnapDistanceMm(Number(e.target.value))}
              className="topbar-snap-slider"
            />
            <button
              type="button"
              className={`snap-val-badge ${snapDistanceMm === 0 ? 'off' : 'on'}`}
              onClick={() => setSnapDistanceMm(snapDistanceMm === 0 ? 10 : 0)}
              title={snapDistanceMm === 0 ? 'Snap-in aktivieren (10 mm)' : 'Snap-in ausschalten (0)'}
            >
              {snapDistanceMm === 0 ? 'Aus' : `${snapDistanceMm} mm`}
            </button>
          </div>
          <button
            type="button"
            className={`btn ${showDimensions ? 'btn-active' : 'btn-soft'}`}
            onClick={() => setShowDimensions(!showDimensions)}
            title={`Rohrbemaßung in 3D-Ansicht ${showDimensions ? 'ausschalten' : 'einschalten'}`}
          >
            <Ruler size={15} />
            <span>Rohrbemaßung</span>
            <span className={`toggle-pill ${showDimensions ? 'on' : 'off'}`}>
              {showDimensions ? 'An' : 'Aus'}
            </span>
          </button>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => setInfoModal('bom')}
            title="Stückliste anzeigen"
          >
            <Download size={15} /> Stückliste
          </button>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => setInfoModal('statics')}
            title="Statik &amp; Belastbarkeit anzeigen"
          >
            <ShieldAlert size={15} /> Statik
          </button>
          <button
            type="button"
            className={`btn ${isSelectedLocked ? 'btn-warn-active' : 'btn-soft'}`}
            onClick={toggleLockSelected}
            disabled={!selectedUid}
            title={isSelectedLocked ? 'Objekt entsperren' : 'Ausgewähltes Objekt sperren (Lock)'}
          >
            {isSelectedLocked ? <Lock size={15} /> : <Unlock size={15} />}
            <span>{isSelectedLocked ? 'Gesperrt' : 'Sperren'}</span>
          </button>
          <button
            type="button"
            className="btn btn-soft"
            onClick={dropSelectedToGround}
            disabled={!selectedUid || isSelectedLocked}
            title="Ausgewähltes Objekt auf Höhe 0 (Boden) setzen"
          >
            <ArrowDownToLine size={15} /> Höhe 0
          </button>
          <button className="btn btn-soft" onClick={() => fileInputRef.current?.click()} title="Projekt-JSON laden">
            <FolderOpen size={15} /> Laden
          </button>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleUploadJson} />
          <button className="btn btn-soft" onClick={handleSaveJson} title="Projekt als JSON speichern">
            <Save size={15} /> Speichern
          </button>
          <button className="btn btn-primary" onClick={handleExportPdf} title="Bemaßungszeichnung + Stückliste als PDF">
            <FileText size={15} /> PDF
          </button>
          <button
            className="btn btn-success"
            onClick={handleExportZip}
            disabled={busyZip}
            title="PDF + Stückliste + verwendete STLs als ZIP"
          >
            <FileArchive size={15} /> {busyZip ? 'Packe ZIP...' : 'ZIP (inkl. STLs)'}
          </button>
          <button className="btn btn-danger-ghost" onClick={clearProject} title="Szene leeren">
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* Hauptbereich */}
      <div className={`workspace ${showRightSidebar ? '' : 'no-right-sidebar'}`}>
        {/* Linke Sidebar: Katalog */}
        <aside className="sidebar-left">
          <div className="panel-section">
            <div className="section-title">1. Rohr-Durchmesser (mixbar)</div>
            <div className="dia-pills">
              {ROUND_DIAMETERS.map((d) => (
                <button
                  key={d}
                  className={`dia-btn ${selectedDiameter === d ? 'active' : ''}`}
                  onClick={() => setSelectedDiameter(d)}
                >
                  Ø {d} mm
                </button>
              ))}
            </div>
            <div className="future-hint">
              Profilsystem: Rundrohr (erweiterbar für Vierkant &amp; Alu-Systemprofil)
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">2. Farben</div>
            <div className="color-row">
              <span>Verbinder:</span>
              <div className="swatches">
                {PART_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`swatch ${activePartColor === c.hex ? 'active' : ''}`}
                    style={{ background: c.hex }}
                    title={c.name}
                    onClick={() => setActivePartColor(c.hex)}
                  />
                ))}
              </div>
            </div>
            <div className="color-row">
              <span>Rohre:</span>
              <div className="swatches">
                {PIPE_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`swatch ${activePipeColor === c.hex ? 'active' : ''}`}
                    style={{ background: c.hex }}
                    title={c.name}
                    onClick={() => setActivePipeColor(c.hex)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">3. Bauteile (Drag &amp; Drop oder Klick)</div>
            <div className="catalog-search-row">
              <input
                className="search-box"
                type="search"
                placeholder="Bauteil suchen..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
              <button
                type="button"
                className="category-toggle-all-btn"
                onClick={toggleAllCategories}
                title={allCategoriesOpen ? 'Alle Kategorien einklappen' : 'Alle Kategorien ausklappen'}
              >
                {allCategoriesOpen ? 'Alle einklappen' : 'Alle ausklappen'}
              </button>
            </div>

            {visibleCategories.length === 0 ? (
              <div className="category-empty-search">
                Keine Bauteile für &quot;{catalogSearch}&quot; gefunden.
              </div>
            ) : (
              <div className="category-accordion">
                {visibleCategories.map((cat) => {
                  const isOpen = isCategoryOpen(cat.id);
                  const items = itemsByCategory[cat.id] || [];
                  const isPipeCategory = cat.id === 'rohre';
                  const count = isPipeCategory ? 1 : items.length;

                  return (
                    <div key={cat.id} className={`category-group ${isOpen ? 'is-open' : 'is-closed'}`}>
                      <button
                        type="button"
                        className="category-header"
                        onClick={() => toggleCategory(cat.id)}
                        aria-expanded={isOpen}
                        title={cat.description}
                      >
                        <span className="category-title-wrap">
                          {isOpen ? (
                            <ChevronDown size={14} className="cat-chevron" />
                          ) : (
                            <ChevronRight size={14} className="cat-chevron" />
                          )}
                          <span className="category-name">{cat.name}</span>
                        </span>
                        <span className="category-count-badge">{count}</span>
                      </button>

                      {isOpen && (
                        <div className="category-content">
                          {isPipeCategory && (
                            <div
                              className="catalog-card pipe-card"
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  'application/x-gestell-item',
                                  JSON.stringify({ kind: 'pipe', diameterMm: selectedDiameter })
                                )
                              }
                              onClick={() => addFreePipe([-250, 20, 0], [250, 20, 0], selectedDiameter)}
                            >
                              <div className="pipe-badge">Ø {selectedDiameter}</div>
                              <div className="catalog-info">
                                <div className="catalog-name">Rundrohr (500 mm)</div>
                                <div className="catalog-sub">Ziehen oder Port-zu-Port klicken</div>
                              </div>
                            </div>
                          )}

                          {!isPipeCategory &&
                            items.map((item) => {
                              const variant = item.isReducer
                                ? item.getVariant(selectedReducerPair[0], selectedReducerPair[1])
                                : item.getVariant(selectedDiameter);

                              return (
                                <React.Fragment key={item.id}>
                                  {item.isReducer && (
                                    <div className="reducer-select-row">
                                      <span>Adapter-Paar:</span>
                                      <select
                                        value={`${selectedReducerPair[0]}_${selectedReducerPair[1]}`}
                                        onChange={(e) => {
                                          const [g, k] = e.target.value.split('_').map(Number);
                                          setSelectedReducerPair([g, k]);
                                        }}
                                      >
                                        {REDUCER_PAIRS.map(([g, k]) => (
                                          <option key={`${g}_${k}`} value={`${g}_${k}`}>
                                            {g} → {k} mm
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  <div
                                    className="catalog-card"
                                    draggable
                                    onDragStart={(e) =>
                                      e.dataTransfer.setData(
                                        'application/x-gestell-item',
                                        JSON.stringify({ kind: 'node', catalogId: item.id, diameterMm: selectedDiameter })
                                      )
                                    }
                                    onClick={() => addNode(item.id, [0, 0, 0])}
                                    title={`${item.description} – In 3D-Szene ziehen oder klicken`}
                                  >
                                    <img src={variant.previewPath} alt={item.name} className="catalog-thumb" />
                                    <div className="catalog-info">
                                      <div className="catalog-name">{item.name}</div>
                                      <div className="catalog-sub">{variant.articleNumber}</div>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* 3D Viewport */}
        <main className="viewport-area">
          <SceneCanvas onCanvasReady={(c) => (canvasRef.current = c)} />

          {/* Statusleiste unten im Viewport */}
          <div className="viewport-hud">
            <span>
              Maße: <strong>{bounds.width} × {bounds.depth} × {bounds.height} mm</strong>
            </span>
            <span>
              Teile: <strong>{nodes.length} Verbinder</strong> · <strong>{pipes.length} Rohre</strong>
            </span>
            {pendingPort ? (
              <span className="hud-port-hint">
                Port gewählt – zweiten Port anklicken zum Verbinden oder rechts Länge eingeben!
                <button className="hud-cancel" onClick={() => setPendingPort(null)}>Abbrechen</button>
              </span>
            ) : (
              <span className="hud-tip">Tipp: Blauen Port anklicken, um Rohre exakt anzudocken.</span>
            )}
          </div>
        </main>

        {/* Rechte Sidebar: Immer Bauteil, ausgeblendet wenn nichts ausgewählt */}
        {showRightSidebar && (
          <aside className="sidebar-right">
            <div className="sidebar-right-header">
              <Layers size={14} /> Bauteil
            </div>

            <div className="tab-content">
              {pendingPort && (
                <div className="box-highlight">
                  <div className="section-title">Rohr ab Port spannen</div>
                  <div className="inline-row">
                    <input
                      type="number"
                      min={50}
                      max={4000}
                      step={10}
                      value={portPipeLen}
                      onChange={(e) => setPortPipeLen(Number(e.target.value))}
                    />
                    <span>mm</span>
                    <button
                      className="btn btn-primary"
                      onClick={() => addPipeFromPort(pendingPort, portPipeLen)}
                    >
                      Anfügen
                    </button>
                  </div>
                </div>
              )}

              {selectedNode && (
                <div className="prop-card">
                  <div className="section-title">Ausgewählter Verbinder</div>
                  <div className="prop-line"><span>Artikel-Nr.:</span><strong>{selectedNode.articleNumber}</strong></div>
                  <div className="prop-line">
                    <span>Position (mm):</span>
                    <code>{selectedNode.position.join(', ')}</code>
                  </div>

                  <div className="section-title" style={{ marginTop: 10 }}>Drehen (90°)</div>
                  <div className="rot-grid">
                    <button className="btn btn-soft" onClick={() => rotateNodeAxis(selectedNode.uid, 'x', 90)}>
                      <RotateCw size={13} /> X +90°
                    </button>
                    <button className="btn btn-soft" onClick={() => rotateNodeAxis(selectedNode.uid, 'y', 90)}>
                      <RotateCw size={13} /> Y +90°
                    </button>
                    <button className="btn btn-soft" onClick={() => rotateNodeAxis(selectedNode.uid, 'z', 90)}>
                      <RotateCw size={13} /> Z +90°
                    </button>
                  </div>

                  <div className="section-title" style={{ marginTop: 10 }}>Farbe ändern</div>
                  <div className="swatches">
                    {PART_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        className={`swatch ${selectedNode.color === c.hex ? 'active' : ''}`}
                        style={{ background: c.hex }}
                        onClick={() => setItemColor(selectedNode.uid, 'node', c.hex)}
                      />
                    ))}
                  </div>

                  <div className="inline-btn-row" style={{ marginTop: 12 }}>
                    <button
                      className={`btn ${selectedNode.locked ? 'btn-warn-active' : 'btn-soft'}`}
                      onClick={toggleLockSelected}
                      title={selectedNode.locked ? 'Verbinder entsperren' : 'Verbinder sperren'}
                    >
                      {selectedNode.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      {selectedNode.locked ? 'Gesperrt' : 'Sperren'}
                    </button>
                    <button
                      className="btn btn-soft"
                      onClick={dropSelectedToGround}
                      disabled={selectedNode.locked}
                      title="Verbinder auf Höhe Y = 0 setzen"
                    >
                      <ArrowDownToLine size={14} /> Höhe 0
                    </button>
                  </div>

                  <button
                    className="btn btn-danger"
                    style={{ marginTop: 8, width: '100%' }}
                    onClick={deleteSelected}
                    disabled={selectedNode.locked}
                  >
                    <Trash2 size={14} /> Bauteil löschen
                  </button>
                </div>
              )}

              {selectedPipe && (
                <div className="prop-card">
                  <div className="section-title">Ausgewähltes Rohr</div>
                  <div className="prop-line"><span>Durchmesser:</span><strong>Ø {selectedPipe.diameterMm} mm</strong></div>
                  <div className="prop-line"><span>Achsmaß:</span><strong>{getPipeAxisLengthMm(selectedPipe)} mm</strong></div>

                  <div className="section-title" style={{ marginTop: 10 }}>Länge anpassen (mm)</div>
                  <div className="inline-row">
                    <input
                      type="number"
                      min={30}
                      max={4000}
                      step={10}
                      value={getPipeAxisLengthMm(selectedPipe)}
                      onChange={(e) => updatePipeLength(selectedPipe.uid, Math.max(30, Number(e.target.value)))}
                    />
                    <span>mm</span>
                  </div>

                  <div className="section-title" style={{ marginTop: 10 }}>Farbe ändern</div>
                  <div className="swatches">
                    {PIPE_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        className={`swatch ${selectedPipe.color === c.hex ? 'active' : ''}`}
                        style={{ background: c.hex }}
                        onClick={() => setItemColor(selectedPipe.uid, 'pipe', c.hex)}
                      />
                    ))}
                  </div>

                  {(selectedPipe.startNodeUid || selectedPipe.endNodeUid) && (
                    <div style={{ marginTop: 12 }}>
                      <div className="section-title">Anschlusspunkte (Schlösser)</div>
                      <div className="inline-btn-row">
                        {selectedPipe.startNodeUid && (
                          <button
                            type="button"
                            className={`btn ${selectedPipe.startLocked === false ? 'btn-soft' : 'btn-warn-active'}`}
                            onClick={() => togglePipeConnectionLock(selectedPipe.uid, 'start')}
                            title="Start-Anschluss sperren/entsperren"
                          >
                            {selectedPipe.startLocked === false ? <Unlock size={13} /> : <Lock size={13} />}
                            Start {selectedPipe.startLocked === false ? 'Offen' : 'Zu'}
                          </button>
                        )}
                        {selectedPipe.endNodeUid && (
                          <button
                            type="button"
                            className={`btn ${selectedPipe.endLocked === false ? 'btn-soft' : 'btn-warn-active'}`}
                            onClick={() => togglePipeConnectionLock(selectedPipe.uid, 'end')}
                            title="End-Anschluss sperren/entsperren"
                          >
                            {selectedPipe.endLocked === false ? <Unlock size={13} /> : <Lock size={13} />}
                            Ende {selectedPipe.endLocked === false ? 'Offen' : 'Zu'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="inline-btn-row" style={{ marginTop: 12 }}>
                    <button
                      className={`btn ${selectedPipe.locked ? 'btn-warn-active' : 'btn-soft'}`}
                      onClick={toggleLockSelected}
                      title={selectedPipe.locked ? 'Rohr entsperren' : 'Rohr sperren'}
                    >
                      {selectedPipe.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      {selectedPipe.locked ? 'Gesperrt' : 'Sperren'}
                    </button>
                    <button
                      className="btn btn-soft"
                      onClick={dropSelectedToGround}
                      disabled={selectedPipe.locked}
                      title="Rohr auf Höhe Y = 0 setzen"
                    >
                      <ArrowDownToLine size={14} /> Höhe 0
                    </button>
                  </div>

                  <button
                    className="btn btn-danger"
                    style={{ marginTop: 8, width: '100%' }}
                    onClick={deleteSelected}
                    disabled={selectedPipe.locked}
                  >
                    <Trash2 size={14} /> Rohr löschen
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Modal: Stückliste / Statik */}
      {infoModal && (
        <div className="info-modal-backdrop" onClick={() => setInfoModal(null)}>
          <div className="info-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="info-modal-header">
              <div className="info-modal-tabs">
                <button
                  type="button"
                  className={`btn ${infoModal === 'bom' ? 'btn-primary' : 'btn-soft'}`}
                  onClick={() => setInfoModal('bom')}
                >
                  <Download size={14} /> Stückliste
                </button>
                <button
                  type="button"
                  className={`btn ${infoModal === 'statics' ? 'btn-primary' : 'btn-soft'}`}
                  onClick={() => setInfoModal('statics')}
                >
                  <ShieldAlert size={14} /> Statik
                </button>
              </div>
              <button
                type="button"
                className="info-modal-close"
                onClick={() => setInfoModal(null)}
                title="Schließen (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            <div className="info-modal-body">
              {infoModal === 'bom' && (
                <div>
                  <div className="section-title">Rohr-Zuschnittliste</div>
                  {pipeRows.length === 0 ? (
                    <p className="muted-text">Noch keine Rohre im Gestell.</p>
                  ) : (
                    <table className="bom-table">
                      <thead>
                        <tr>
                          <th>Ø</th>
                          <th>Schnittlänge</th>
                          <th>Menge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pipeRows.map((r, i) => (
                          <tr key={i}>
                            <td>Ø {r.diameterMm} mm</td>
                            <td><strong>{r.cutLengthMm} mm</strong></td>
                            <td>{r.count}×</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div className="section-title" style={{ marginTop: 18 }}>3D-Druckteile (Verbinder)</div>
                  {nodeRows.length === 0 ? (
                    <p className="muted-text">Noch keine Verbinder platziert.</p>
                  ) : (
                    <table className="bom-table">
                      <thead>
                        <tr>
                          <th>Art.-Nr.</th>
                          <th>Teil</th>
                          <th>Menge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nodeRows.map((r, i) => (
                          <tr key={i}>
                            <td><code>{r.articleNumber}</code></td>
                            <td>
                              <div>{r.name}</div>
                              <a className="stl-dl" href={r.stlPath} download>
                                {r.stlPath.split('/').pop()}
                              </a>
                            </td>
                            <td>{r.count}×</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {infoModal === 'statics' && (
                <div>
                  <div className="section-title">Belastbarkeits-Schätzung</div>
                  <div className="stat-box">
                    <div className="prop-line"><span>Max. Spannweite:</span><strong>{load.maxSpanMm} mm (Ø {load.maxSpanDiameterMm})</strong></div>
                    <div className="prop-line"><span>Richtwert Einzellast (Mitte):</span><strong>~ {load.estimatedSafeCenterLoadKg} kg</strong></div>
                    <div className="prop-line"><span>Richtwert Gesamtgestell:</span><strong>~ {load.estimatedFrameLoadKg} kg</strong></div>
                  </div>

                  {load.warnings.length > 0 && (
                    <ul className="warn-list">
                      {load.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}

                  <div className="disclaimer-box">
                    <strong>Haftungsausschluss:</strong> Diese Berechnung ist nur eine grobe, unverbindliche Überschlagsrechnung (Annahme: Alu-Rohr + gedruckter Verbinder). Sie ersetzt keine statische Prüfung. Druckmaterial (PLA/PETG/ASA), Infill, Wandstärke und Layerhaftung beeinflussen die Tragfähigkeit stark. Nutzung auf eigene Verantwortung – keine Haftung.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
