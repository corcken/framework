/*
 * Modulares OpenSCAD Modell: Rohrendstück mit axialer Lasche
 * Variante: Axiale Lasche ("längs abgehend") für Gabel- bzw. Halterbefestigung (kompatibel zu Muffe 2).
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : 4.0;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(25.0, rohr_nennmass + 5.0);

// Längs-Scheibe (Lasche / Zunge)
scheiben_dicke = 5.0;                         // 5mm passend für Muffe2
scheiben_breite = min(35.0, max(20.0, round(rohr_nennmass * 0.875)));
scheiben_laenge = max(20.0, round(rohr_nennmass * 0.75));
uebergangs_laenge = max(8.0, round(rohr_nennmass * 0.3));

// Bohrungen
loch_durchmesser_scheibe = (rohr_nennmass <= 25) ? 5.2 : 6.2;
loch_durchmesser_muffe = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
rohr_verbinder_laengs();

module rohr_verbinder_laengs() {
    union() {
        rohr_muffe_mit_boden();
        anschluss_lasche();
    }
}

module rohr_muffe_mit_boden() {
    difference() {
        cylinder(d=aussen_durchmesser, h=muffen_laenge);
        translate([0, 0, -1])
            cylinder(d=innen_durchmesser, h=muffen_laenge - wanddicke + 1);
        translate([0, 0, (muffen_laenge - wanddicke) / 2])
            rotate([90, 0, 0])
            cylinder(d=loch_durchmesser_muffe, h=aussen_durchmesser + 2, center=true);
    }
}

module anschluss_lasche() {
    translate([0, 0, muffen_laenge - wanddicke]) {
        difference() {
            union() {
                hull() {
                    cylinder(d=aussen_durchmesser, h=wanddicke);
                    translate([0, 0, wanddicke + uebergangs_laenge])
                        cube([scheiben_breite, scheiben_dicke, 0.1], center=true);
                }
                hull() {
                    translate([0, 0, wanddicke + uebergangs_laenge])
                        cube([scheiben_breite, scheiben_dicke, 0.1], center=true);
                    translate([0, 0, wanddicke + uebergangs_laenge + scheiben_laenge])
                        rotate([90, 0, 0])
                        cylinder(d=scheiben_breite, h=scheiben_dicke, center=true);
                }
            }
            translate([0, 0, wanddicke + uebergangs_laenge + scheiben_laenge])
                rotate([90, 0, 0])
                cylinder(d=loch_durchmesser_scheibe, h=scheiben_dicke + 2, center=true);
        }
    }
}
