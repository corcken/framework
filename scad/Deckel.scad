/*
 * Modulares OpenSCAD Modell: Rohrdeckel / Endkappe
 * Funktion: Verschließt das Ende eines Rohres mit einem abgerundeten Abschluss.
 * Mit seitlicher Bohrung für eine Fixierschraube.
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(22.0, round(rohr_nennmass * 0.875));

// Bohrung
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
rohr_deckel();

module rohr_deckel() {
    difference() {
        grundform_deckel();
        aussparung_rohr();
        bohrung_madenschraube();
    }
}

module grundform_deckel() {
    union() {
        cylinder(d=aussen_durchmesser, h=muffen_laenge);
        translate([0, 0, muffen_laenge])
            sphere(d=aussen_durchmesser);
    }
}

module aussparung_rohr() {
    translate([0, 0, -1])
        cylinder(d=innen_durchmesser, h=muffen_laenge + 1);
}

module bohrung_madenschraube() {
    translate([aussen_durchmesser/2, 0, muffen_laenge / 2])
        rotate([0, -90, 0])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5);
}
