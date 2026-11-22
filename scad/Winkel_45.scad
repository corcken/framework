/*
 * Modulares OpenSCAD Modell: 45-Grad Winkelverbinder (135° Innenwinkel)
 * Funktion: Verbindet zwei Rohre im 45°-Winkel (z. B. für Verstrebungen).
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(22.0, round(rohr_nennmass * 0.875));

// Bohrungen für die Fixierschrauben
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
winkel_45_grad();

module winkel_45_grad() {
    difference() {
        grundform_45();
        aussparung_45();
        bohrungen_45();
    }
}

module grundform_45() {
    union() {
        sphere(d=aussen_durchmesser);
        // Muffe 1 entlang +X
        rotate([0, 90, 0])
            cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
        // Muffe 2 um 45° gedreht in der XY-Ebene
        rotate([0, 0, 45])
            rotate([0, 90, 0])
            cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
    }
}

module aussparung_45() {
    union() {
        sphere(d=innen_durchmesser);
        rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);
        rotate([0, 0, 45])
            rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);
    }
}

module bohrungen_45() {
    translate([(aussen_durchmesser/2) + (muffen_laenge/2), 0, aussen_durchmesser/2])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    rotate([0, 0, 45])
        translate([(aussen_durchmesser/2) + (muffen_laenge/2), 0, aussen_durchmesser/2])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
}
