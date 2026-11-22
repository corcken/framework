/*
 * Modulares OpenSCAD Modell: Muffe 2 (Doppel-Lasche)
 * Variante: Durchgehende Muffe mit Doppel-Lasche (Gabelaufnahme für 5mm Scheibe).
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(24.0, round(rohr_nennmass * 0.875));

// Doppel-Laschen (Aufnahme für die Scheibe)
scheiben_dicke = 5.0;
spalt_breite = scheiben_dicke + 0.2;          // 5.2mm für leichtes Einschieben
laschen_dicke = (rohr_nennmass <= 25) ? 4.0 : 5.0;
laschen_ausladung = max(20.0, round(rohr_nennmass * 0.7));

// Bohrungen
loch_durchmesser_laschen = (rohr_nennmass <= 25) ? 5.2 : 5.5;
loch_abstand_von_mitte = (aussen_durchmesser / 2) + (laschen_ausladung * 0.45);
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
rohrverbinder_getrennte_befestigung();

module rohrverbinder_getrennte_befestigung() {
    difference() {
        grundform();
        aussparung_rohr();
        aussparung_spalt();
        bohrung_fuer_laschen();
        bohrung_fuer_rohr_madenschraube();
        kantenabrundung_laschen();
    }
}

module grundform() {
    union() {
        cylinder(d=aussen_durchmesser, h=muffen_laenge, center=true);
        translate([(aussen_durchmesser/2) + (laschen_ausladung/2) - 2, 0, 0])
            cube([laschen_ausladung + 4, spalt_breite + (laschen_dicke * 2), muffen_laenge], center=true);
    }
}

module aussparung_rohr() {
    cylinder(d=innen_durchmesser, h=muffen_laenge + 2, center=true);
}

module aussparung_spalt() {
    translate([(aussen_durchmesser/2) + (laschen_ausladung/2) + wanddicke, 0, 0])
        cube([laschen_ausladung + 10, spalt_breite, muffen_laenge + 2], center=true);
}

module bohrung_fuer_laschen() {
    translate([loch_abstand_von_mitte, 0, 0])
        rotate([90, 0, 0])
        cylinder(d=loch_durchmesser_laschen, h=spalt_breite + (laschen_dicke * 2) + 10, center=true);
}

module bohrung_fuer_rohr_madenschraube() {
    translate([-aussen_durchmesser/2, 0, 0])
        rotate([0, 90, 0])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
}

module kantenabrundung_laschen() {
    translate([(aussen_durchmesser/2) + laschen_ausladung + 3, 0, 0])
        rotate([0, 0, 45])
        cube([12, 35, muffen_laenge + 2], center=true);
}
