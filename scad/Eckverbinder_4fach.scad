/*
 * ENTWURF: 4-Wege Eckverbinder (3D-T-Ecke)
 * Funktion: Verbindet 4 Rohre (X, Y, +Z, -Z) – ideal für Zwischenböden an Ecken.
 */

$fn = 100;

rohr_nennmass = 40.0;
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(22.0, round(rohr_nennmass * 0.875));
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

eckverbinder_4fach();

module eckverbinder_4fach() {
    difference() {
        union() {
            // Durchgehende Z-Achse (Standrohr)
            cylinder(d=aussen_durchmesser, h=(muffen_laenge * 2) + aussen_durchmesser, center=true);
            // X-Abgang
            rotate([0, 90, 0])
                cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
            // Y-Abgang
            rotate([-90, 0, 0])
                cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
        }
        // Hohlräume
        cylinder(d=innen_durchmesser, h=(muffen_laenge * 2) + aussen_durchmesser + 2, center=true);
        rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);
        rotate([-90, 0, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);

        // Fixierbohrungen
        translate([(aussen_durchmesser/2) + (muffen_laenge/2), 0, aussen_durchmesser/2])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
        translate([0, (aussen_durchmesser/2) + (muffen_laenge/2), aussen_durchmesser/2])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
        translate([-aussen_durchmesser/2, 0, (aussen_durchmesser/2) + (muffen_laenge/2)])
            rotate([0, 90, 0])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
        translate([-aussen_durchmesser/2, 0, -(aussen_durchmesser/2) - (muffen_laenge/2)])
            rotate([0, 90, 0])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    }
}
