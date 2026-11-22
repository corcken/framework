/*
 * Modulares OpenSCAD Modell: 90-Grad Kreuzverbinder mit Deckel
 * Variante: Ein durchgehendes Rohr (unten) und ein Rohr mit Deckel/Endanschlag (oben).
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(40.0, round(rohr_nennmass * 1.625));

// Abstand der beiden Rohre auf der Z-Achse (übereinander)
z_abstand = innen_durchmesser + wanddicke;

// Bohrungen für die Fixierschrauben
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
kreuzverbinder_mit_deckel();

module kreuzverbinder_mit_deckel() {
    difference() {
        grundform_kreuz_mit_deckel();
        aussparung_rohrkanaele();
        bohrungen_madenschrauben();
    }
}

module grundform_kreuz_mit_deckel() {
    union() {
        translate([0, 0, z_abstand/2]) {
            rotate([0, 90, 0])
                cylinder(d=aussen_durchmesser, h=muffen_laenge, center=true);
            translate([muffen_laenge/2, 0, 0])
                sphere(d=aussen_durchmesser);
        }
        translate([0, 0, -z_abstand/2])
            rotate([90, 0, 0])
            cylinder(d=aussen_durchmesser, h=muffen_laenge, center=true);
        cube([aussen_durchmesser, aussen_durchmesser, z_abstand], center=true);
    }
}

module aussparung_rohrkanaele() {
    union() {
        translate([0, 0, z_abstand/2])
            translate([-muffen_laenge/2 - 1, 0, 0])
            rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + 1);
        translate([0, 0, -z_abstand/2])
            rotate([90, 0, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + 2, center=true);
    }
}

module bohrungen_madenschrauben() {
    translate([muffen_laenge/3, 0, z_abstand/2 + aussen_durchmesser/2])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    translate([0, muffen_laenge/3, -z_abstand/2 - aussen_durchmesser/2])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
}
