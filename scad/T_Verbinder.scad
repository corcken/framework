/*
 * Modulares OpenSCAD Modell: 90-Grad T-Verbinder (in einer Ebene)
 * Funktion: Verbindet ein durchgehendes Hauptrohr (X-Achse) mit einem
 *           im 90°-Winkel abgehenden Nebenrohr (Y-Achse).
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(22.0, round(rohr_nennmass * 0.875));
durchgangs_laenge = (muffen_laenge * 2) + aussen_durchmesser;

// Bohrungen für die Fixierschrauben
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
t_verbinder();

module t_verbinder() {
    difference() {
        grundform_t();
        aussparung_t();
        bohrungen_t();
    }
}

module grundform_t() {
    union() {
        // Durchgehendes Hauptrohr entlang X-Achse
        rotate([0, 90, 0])
            cylinder(d=aussen_durchmesser, h=durchgangs_laenge, center=true);
        // Abzweig entlang +Y-Achse
        rotate([-90, 0, 0])
            cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
    }
}

module aussparung_t() {
    union() {
        rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=durchgangs_laenge + 2, center=true);
        rotate([-90, 0, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);
    }
}

module bohrungen_t() {
    // Fixierschrauben auf Hauptrohr (links und rechts)
    translate([-(aussen_durchmesser/2 + muffen_laenge/2), 0, aussen_durchmesser/2])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    translate([ (aussen_durchmesser/2 + muffen_laenge/2), 0, aussen_durchmesser/2])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    // Fixierschraube auf Abzweig (+Y)
    translate([0, (aussen_durchmesser/2) + (muffen_laenge/2), aussen_durchmesser/2])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
}
