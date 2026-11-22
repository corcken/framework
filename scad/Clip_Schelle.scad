/*
 * ENTWURF: Aufklipsbare Rohrschelle (C-Form) mit Universal-2-Loch-Flansch
 * Funktion: Lässt sich nachträglich auf ein montiertes Rohr aufklipsen.
 *           Dient als universelle Basis für Handy-/Tablethalter, Arme, etc.
 */

$fn = 100;

rohr_nennmass = 40.0;
toleranz = 0.15;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : 4.0;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
schelle_hoehe = max(22.0, round(rohr_nennmass * 0.75));

// Öffnungswinkel der C-Schelle (ca. 70% umschlossen für guten Schnapp-Halt)
oeffnung_breite = rohr_nennmass * 0.78;

// Universal-Flansch (2× M5 Löcher im 20mm Abstand)
flansch_breite = max(32.0, rohr_nennmass * 0.9);
flansch_dicke = 5.0;
loch_abstand = 20.0;
loch_durchmesser = 5.2;

clip_schelle();

module clip_schelle() {
    difference() {
        union() {
            // C-Ring Grundkörper
            cylinder(d=aussen_durchmesser, h=schelle_hoehe, center=true);
            // Flansch-Platte auf +X
            translate([(aussen_durchmesser/2) + (flansch_dicke/2) - 1, 0, 0])
                cube([flansch_dicke + 2, flansch_breite, schelle_hoehe], center=true);
        }
        // Innenbohrung
        cylinder(d=innen_durchmesser, h=schelle_hoehe + 2, center=true);
        // Öffnungsschlitz auf -X zum Aufklipsen
        translate([-aussen_durchmesser/2, 0, 0])
            cube([aussen_durchmesser, oeffnung_breite, schelle_hoehe + 2], center=true);
        // 2× M5 Montagelöcher im Flansch
        for (y = [-loch_abstand/2, loch_abstand/2]) {
            translate([(aussen_durchmesser/2) + flansch_dicke/2, y, 0])
                rotate([0, 90, 0])
                cylinder(d=loch_durchmesser, h=flansch_dicke + 6, center=true);
        }
    }
}
