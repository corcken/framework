/*
 * ENTWURF: 45-Grad T-Abzweig
 * Funktion: Durchgehendes Hauptrohr (X-Achse) mit einem 45°-Abzweig in der XY-Ebene.
 * Ideal für Diagonalstreben zur Aussteifung von Gestellen.
 */

$fn = 100;

rohr_nennmass = 40.0;
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(22.0, round(rohr_nennmass * 0.875));
durchgangs_laenge = (muffen_laenge * 2) + (aussen_durchmesser * 1.4);
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

t_verbinder_45();

module t_verbinder_45() {
    difference() {
        union() {
            // Durchgehendes Hauptrohr (X-Achse)
            rotate([0, 90, 0])
                cylinder(d=aussen_durchmesser, h=durchgangs_laenge, center=true);
            // 45°-Abzweig
            rotate([0, 0, 45])
                rotate([0, 90, 0])
                cylinder(d=aussen_durchmesser, h=muffen_laenge + aussen_durchmesser);
        }
        // Hohlräume
        rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=durchgangs_laenge + 2, center=true);
        rotate([0, 0, 45])
            rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);

        // Fixierbohrungen
        translate([-(durchgangs_laenge/2 - muffen_laenge/2), 0, aussen_durchmesser/2])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
        translate([ (durchgangs_laenge/2 - muffen_laenge/2), 0, aussen_durchmesser/2])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
        rotate([0, 0, 45])
            translate([aussen_durchmesser + (muffen_laenge/2), 0, aussen_durchmesser/2])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    }
}
