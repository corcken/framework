/*
 * Modulares OpenSCAD Modell: Standfuß / Wandlager
 * Funktion: Sichere Befestigung eines Rohres an einer Wand oder dem Boden.
 * Mit 4 Senkkopf-Schraublöchern in der Basisplatte und einer Fixierschraube.
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(22.0, round(rohr_nennmass * 0.875));

// Basisplatte (Fuß)
basis_durchmesser = max(55.0, rohr_nennmass * 2.0);
basis_dicke = (rohr_nennmass <= 25) ? 5.0 : 6.0;
lochkreis_durchmesser = basis_durchmesser - 16.0;

// Bohrungen
loch_durchmesser_basis = (rohr_nennmass <= 25) ? 4.5 : 5.5;
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
rohr_standfuss();

module rohr_standfuss() {
    difference() {
        union() {
            basis_platte();
            rohr_aufnahme();
            verstaerkungs_kegel();
        }
        aussparung_rohr();
        bohrungen_basis_mit_senkung();
        bohrung_madenschraube();
    }
}

module basis_platte() {
    cylinder(d=basis_durchmesser, h=basis_dicke);
}

module rohr_aufnahme() {
    cylinder(d=aussen_durchmesser, h=basis_dicke + muffen_laenge);
}

module verstaerkungs_kegel() {
    kegel_verbreiterung = (rohr_nennmass <= 25) ? 10.0 : 16.0;
    cylinder(d1=aussen_durchmesser + kegel_verbreiterung, d2=aussen_durchmesser, h=basis_dicke + 12);
}

module aussparung_rohr() {
    translate([0, 0, basis_dicke])
        cylinder(d=innen_durchmesser, h=muffen_laenge + 2);
}

module bohrungen_basis_mit_senkung() {
    for (i = [0:3]) {
        rotate([0, 0, i * 90])
        translate([lochkreis_durchmesser/2, 0, 0]) {
            translate([0, 0, -1])
                cylinder(d=loch_durchmesser_basis, h=basis_dicke + 2);
            translate([0, 0, basis_dicke - 3])
                cylinder(d1=loch_durchmesser_basis, d2=loch_durchmesser_basis + 5.0, h=3.1);
        }
    }
}

module bohrung_madenschraube() {
    translate([aussen_durchmesser/2, 0, basis_dicke + (muffen_laenge/2)])
        rotate([0, -90, 0])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5);
}
