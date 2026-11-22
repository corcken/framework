param(
    [int[]]$Diameters = @(20, 25, 30, 40),
    [string]$OpenScad = "C:\Program Files\OpenSCAD\openscad.com"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OpenScad)) {
    throw "OpenSCAD nicht gefunden unter: $OpenScad"
}

$scadFiles = Get-ChildItem -Path "scad\*.scad" | Where-Object { $_.BaseName -ne "Reduziermuffe" } | Sort-Object Name
New-Item -ItemType Directory -Force -Path "previews" | Out-Null
Get-ChildItem -Path "previews\*.png" -ErrorAction SilentlyContinue | Remove-Item -Force

# Paare für Reduziermuffen berechnen (groß > klein)
$sortedDias = $Diameters | Sort-Object -Descending
$reducerPairs = @()
for ($i = 0; $i -lt $sortedDias.Count; $i++) {
    for ($j = $i + 1; $j -lt $sortedDias.Count; $j++) {
        $reducerPairs += ,@($sortedDias[$i], $sortedDias[$j])
    }
}

$total = ($scadFiles.Count * $Diameters.Count) + $reducerPairs.Count
$count = 0

foreach ($file in $scadFiles) {
    $baseName = $file.BaseName
    $pngPath = "previews\$baseName.png"
    & $OpenScad -o $pngPath --imgsize=600,450 --autocenter --viewall -D "rohr_nennmass=40.0" $file.FullName 2>&1 | Out-Null

    foreach ($d in $Diameters) {
        $count++
        $outDir = "stl\${d}mm"
        New-Item -ItemType Directory -Force -Path $outDir | Out-Null
        $stlPath = "$outDir\${baseName}_${d}mm.stl"

        Write-Host "[$count/$total] Generiere $stlPath ..."
        & $OpenScad -o $stlPath -D "rohr_nennmass=$d.0" $file.FullName 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $stlPath)) {
            throw "Fehler beim Generieren von $stlPath"
        }
    }
}

# Reduziermuffen generieren
$reducerScad = "scad\Reduziermuffe.scad"
if (Test-Path $reducerScad) {
    & $OpenScad -o "previews\Reduziermuffe.png" --imgsize=600,450 --autocenter --viewall -D "rohr_gross=40.0" -D "rohr_klein=30.0" $reducerScad 2>&1 | Out-Null
    $redOutDir = "stl\reduzierer"
    New-Item -ItemType Directory -Force -Path $redOutDir | Out-Null

    foreach ($pair in $reducerPairs) {
        $count++
        $gross = $pair[0]
        $klein = $pair[1]
        $stlPath = "$redOutDir\Reduziermuffe_${gross}_${klein}mm.stl"

        Write-Host "[$count/$total] Generiere $stlPath ..."
        & $OpenScad -o $stlPath -D "rohr_gross=$gross.0" -D "rohr_klein=$klein.0" $reducerScad 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $stlPath)) {
            throw "Fehler beim Generieren von $stlPath"
        }
    }
}

Write-Host "Fertig! $count STL-Dateien erfolgreich erzeugt."
