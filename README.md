# Rohrverbinder & 3D-Gestell-Konfigurator

Modulares OpenSCAD-Baukastensystem für 3D-gedruckte Rohrverbinder (**20, 25, 30, 40 mm**) inklusive interaktivem **Three.js-Gestellkonfigurator** mit Stückliste, Bemaßungszeichnung (PDF) und STL-ZIP-Export.

## Struktur

- `scad/` – 20 parametrisierte OpenSCAD-Modelle
- `stl/` – 82 fertig gerenderte STL-Dateien (`20mm/`, `25mm/`, `30mm/`, `40mm/`, `reduzierer/`)
- `previews/` – gerenderte 3D-Vorschaubilder
- `build.ps1` – PowerShell-Skript zum Neugenerieren aller STLs & Vorschaubilder via OpenSCAD CLI
- `katalog.html` – Statischer HTML-Katalog aller Verbinder
- `app/` – React + Three.js + TypeScript Gestell-Konfigurator (Vite)

## Konfigurator lokal starten

```bash
cd app
npm install
npm run dev
```

## Production-Build (für GitHub Pages / Subdomain)

```bash
cd app
npm run build
```

Die fertige statische Web-App liegt anschließend in `app/dist/`.
