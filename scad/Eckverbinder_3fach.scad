/*
 * Modulares OpenSCAD Modell: 3-Wege 90-Grad Eckverbinder (Würfelecke)
 * Funktion: Verbindet drei Rohre in X-, Y- und Z-Richtung für Gestelle und Rahmen.
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
eckverbinder_3fach();

module eckverbinder_3fach() {
    difference() {
        grundform_3fach();
        aussparung_3fach();
        bohrungen_3fach();
    }
}

module grundform_3fach() {
    union() {
        sphere(d=aussen_durchmesser);
        // X-Achse
        rotate([0, 90, 0])
            cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
        // Y-Achse
        rotate([-90, 0, 0])
            cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
        // Z-Achse
        cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
    }
}

module aussparung_3fach() {
    union() {
        sphere(d=innen_durchmesser);
        rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);
        rotate([-90, 0, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);
        cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);
    }
}

module bohrungen_3fach() {
    // X-Muffe (Bohrung von +Z)
    translate([(aussen_durchmesser/2) + (muffen_laenge/2), 0, aussen_durchmesser/2])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    // Y-Muffe (Bohrung von +Z)
    translate([0, (aussen_durchmesser/2) + (muffen_laenge/2), aussen_durchmesser/2])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    // Z-Muffe (Bohrung von +X)
    translate([aussen_durchmesser/2, 0, (aussen_durchmesser/2) + (muffen_laenge/2)])
        rotate([0, 90, 0])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
}
